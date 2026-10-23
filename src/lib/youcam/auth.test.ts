import { constants, generateKeyPairSync, privateDecrypt } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetYoucamAuthForTests, buildIdToken, getAuthorization, toPublicKeyPem } from "@/lib/youcam/auth";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

function decrypt(token: string) {
  return privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(token, "base64")).toString("utf8");
}

afterEach(() => {
  __resetYoucamAuthForTests();
  vi.unstubAllGlobals();
  delete process.env.YOUCAM_API_KEY;
  delete process.env.YOUCAM_PUBLIC_KEY;
});

describe("YouCam RSA handshake", () => {
  it("encrypts client_id and a millisecond timestamp with the public key", () => {
    const token = buildIdToken("key-123", publicKey, 1_700_000_000_000);
    expect(decrypt(token)).toBe("client_id=key-123&timestamp=1700000000000");
  });

  it("accepts the secret key without PEM armor", () => {
    const body = publicKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, "");
    expect(toPublicKeyPem(body)).toContain("BEGIN PUBLIC KEY");
    expect(decrypt(buildIdToken("key-123", body, 10))).toBe("client_id=key-123&timestamp=10");
  });

  it("retries the handshake with a unix timestamp in seconds", async () => {
    process.env.YOUCAM_API_KEY = "key-123";
    process.env.YOUCAM_PUBLIC_KEY = publicKey;
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as { id_token: string };
        const plain = decrypt(body.id_token);
        seen.push(plain);
        const timestamp = plain.split("timestamp=")[1];
        if (timestamp.length > 10) return new Response(JSON.stringify({ error: "bad" }), { status: 400 });
        return Response.json({ status: 200, result: { access_token: "access-from-rsa" } });
      }),
    );
    const auth = await getAuthorization();
    expect(auth).toEqual({ header: "Bearer access-from-rsa", auth: "v1-rsa" });
    expect(seen).toHaveLength(2);
    expect(seen[1].split("timestamp=")[1].length).toBe(10);
  });

  it("falls back to the V2 API-key bearer when the handshake is refused", async () => {
    process.env.YOUCAM_API_KEY = "key-123";
    process.env.YOUCAM_PUBLIC_KEY = publicKey;
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    const auth = await getAuthorization();
    expect(auth).toEqual({ header: "Bearer key-123", auth: "v2-api-key" });
  });
});
