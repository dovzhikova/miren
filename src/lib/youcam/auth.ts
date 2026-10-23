import { constants, publicEncrypt } from "node:crypto";
import { GlowError } from "@/lib/errors";

const TOKEN_TTL_MS = 15 * 60 * 1000;

let cached: { token: string; expiresAt: number; apiKey: string } | null = null;

export function youcamBase(): string {
  return (process.env.YOUCAM_API_BASE || "https://yce-api-01.makeupar.com").replace(/\/$/, "");
}

export function youcamCredentials() {
  const apiKey = process.env.YOUCAM_API_KEY?.trim() ?? "";
  const publicKey = process.env.YOUCAM_PUBLIC_KEY?.trim() ?? "";
  const forceMock = process.env.GLOWCHECK_FORCE_MOCK === "1";
  return {
    apiKey,
    publicKey,
    live: Boolean(apiKey) && !forceMock,
  };
}

export function toPublicKeyPem(raw: string): string {
  let value = raw.trim().replace(/^["']|["']$/g, "");
  value = value.replace(/\\n/g, "\n");
  if (value.includes("BEGIN PUBLIC KEY")) return value;
  const body = value.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----/g, "").replace(/\s+/g, "");
  if (body.length < 64) {
    throw new GlowError(
      "YOUCAM_PUBLIC_KEY is not an RSA public key. Paste the secret key from the YouCam console, as base64 or as a PEM.",
      500,
      "invalid-public-key",
    );
  }
  const lines = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

export function buildIdToken(clientId: string, publicKey: string, timestamp = Date.now()): string {
  const payload = `client_id=${clientId}&timestamp=${timestamp}`;
  try {
    const encrypted = publicEncrypt(
      { key: toPublicKeyPem(publicKey), padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(payload, "utf8"),
    );
    return encrypted.toString("base64");
  } catch (error) {
    if (error instanceof GlowError) throw error;
    throw new GlowError(
      "YOUCAM_PUBLIC_KEY could not encrypt the YouCam id token. Check that it is the RSA public key from the console.",
      500,
      "invalid-public-key",
    );
  }
}

function readAccessToken(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const nested = [record.result, record.data, record];
  for (const item of nested) {
    if (item && typeof item === "object" && "access_token" in item) {
      const token = (item as { access_token?: unknown }).access_token;
      if (typeof token === "string" && token.trim()) return token;
    }
  }
  return null;
}

async function requestAccessToken(apiKey: string, publicKey: string, timestamp: number): Promise<string | null> {
  const response = await fetch(`${youcamBase()}/s2s/v1.0/client/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: apiKey,
      id_token: buildIdToken(apiKey, publicKey, timestamp),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) return null;
  return readAccessToken(body);
}

async function exchangeAccessToken(apiKey: string, publicKey: string): Promise<string> {
  if (cached && cached.apiKey === apiKey && cached.expiresAt > Date.now()) return cached.token;
  const millis = Date.now();
  const fromMillis = await requestAccessToken(apiKey, publicKey, millis);
  const token = fromMillis ?? (await requestAccessToken(apiKey, publicKey, Math.floor(millis / 1000)));
  if (!token) {
    throw new GlowError("YouCam refused the RSA handshake.", 401, "rsa-handshake-failed");
  }
  cached = { token, apiKey, expiresAt: Date.now() + TOKEN_TTL_MS };
  return token;
}

export async function getAuthorization(): Promise<{ header: string; auth: "v2-api-key" | "v1-rsa" }> {
  const { apiKey, publicKey } = youcamCredentials();
  if (!apiKey) throw new GlowError("Missing YOUCAM_API_KEY.", 500);
  if (!publicKey) return { header: `Bearer ${apiKey}`, auth: "v2-api-key" };
  try {
    const token = await exchangeAccessToken(apiKey, publicKey);
    return { header: `Bearer ${token}`, auth: "v1-rsa" };
  } catch (error) {
    if (error instanceof GlowError && error.code === "invalid-public-key") throw error;
    return { header: `Bearer ${apiKey}`, auth: "v2-api-key" };
  }
}

export function __resetYoucamAuthForTests() {
  cached = null;
}
