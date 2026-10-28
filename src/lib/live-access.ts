import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { checkBotId } from "botid/server";
import { mirenEnv } from "@/lib/env";
import { GlowError } from "@/lib/errors";
import { youcamCredentials } from "@/lib/youcam/auth";
import type { TaskKind } from "@/lib/youcam/client";
import type { Scan } from "@/lib/types";

export const COOKIE = "miren_session";
const HOUR = 3600;
const DAY = 24 * HOUR;

type Session = { purpose: "session"; id: string; expires: number };
type Task = { purpose: "task"; sessionId: string; taskId: string; kind: TaskKind; source: Scan["source"]; profile?: Scan["profile"]; createdAt: string; expires: number };

function secret() { return mirenEnv("SESSION_SECRET") ?? ""; }
function redisPair(url: string | undefined, token: string | undefined) {
  return url && token && /^https:\/\//.test(url) ? { url, token } : undefined;
}
// Explicit Upstash names win. Vercel Marketplace injects the same REST URL and token as KV_REST_API_*.
export function redisRestCredentials() {
  return redisPair(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN)
    ?? redisPair(process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN);
}
export function liveAccessConfigured(): boolean {
  return youcamCredentials().live && secret().length >= 32 && Boolean(redisRestCredentials());
}
function sign(value: Session | Task): string {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}
function verify(token: string): Session | Task | null {
  if (token.length > 4096 || secret().length < 32) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session | Task;
    return typeof claims.expires === "number" && claims.expires > Date.now() ? claims : null;
  } catch { return null; }
}
// The pre-rename cookie is still read so live scans started before the rename can finish polling.
const LEGACY_COOKIE = "glowcheck_session";
function sessionFrom(request: Request): Session | null {
  const parts = request.headers.get("cookie")?.split(";").map((part) => part.trim()) ?? [];
  const named = (name: string) => parts.find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
  const raw = named(COOKIE) ?? named(LEGACY_COOKIE);
  const claims = raw ? verify(raw) : null;
  return claims?.purpose === "session" && typeof claims.id === "string" ? claims : null;
}
export function sessionCookie(request: Request): string | undefined {
  if (!liveAccessConfigured() || sessionFrom(request)) return undefined;
  const claims: Session = { purpose: "session", id: randomUUID(), expires: Date.now() + DAY * 1000 };
  return `${COOKIE}=${sign(claims)}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${DAY}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}

// Check all counters before incrementing any. EVAL is atomic across serverless instances.
const LIMIT_SCRIPT = `
for i,key in ipairs(KEYS) do
  if tonumber(redis.call('GET', key) or '0') >= tonumber(ARGV[(i-1)*2+1]) then return i end
end
for i,key in ipairs(KEYS) do
  local count = redis.call('INCR', key)
  if count == 1 then redis.call('EXPIRE', key, tonumber(ARGV[(i-1)*2+2])) end
end
return 0`;
function positiveLimit(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
async function reserve(sessionId: string, polling: boolean) {
  const now = Math.floor(Date.now() / 1000);
  const rules = polling
    ? [{ key: `poll:${sessionId}:${Math.floor(now / 60)}`, limit: 60, ttl: 120 }]
    : [
      { key: `session:${sessionId}:${Math.floor(now / HOUR)}`, limit: positiveLimit(mirenEnv("TASKS_PER_HOUR"), 5), ttl: HOUR + 60 },
      { key: `global:${Math.floor(now / DAY)}`, limit: positiveLimit(mirenEnv("TASKS_PER_DAY"), 100), ttl: DAY + 60 },
    ];
  let response: Response;
  try {
    const redis = redisRestCredentials();
    if (!redis) throw new Error("Quota unavailable");
    response = await fetch(redis.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${redis.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", LIMIT_SCRIPT, rules.length, ...rules.map((rule) => `miren:v1:${rule.key}`), ...rules.flatMap((rule) => [rule.limit, rule.ttl])]),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const body = await response.json() as { result?: unknown; error?: unknown };
    if (!response.ok || body.error || !Number.isInteger(body.result) || Number(body.result) < 0 || Number(body.result) > rules.length) throw new Error("Quota unavailable");
    if (body.result !== 0) throw new GlowError("The live request limit has been reached. Try later or use Demo data.", 429, "live-limit");
  } catch (error) {
    if (error instanceof GlowError) throw error;
    throw new GlowError("Personal scans are temporarily unavailable. Please try later.", 503, "quota-unavailable");
  }
}
// BotID needs Vercel's OIDC token, so it runs only on Vercel deployments. Elsewhere the session and quota checks still apply.
async function rejectBots() {
  if (process.env.VERCEL !== "1") return;
  let verdict: Awaited<ReturnType<typeof checkBotId>>;
  try {
    verdict = await checkBotId();
  } catch {
    throw new GlowError("Personal scans are temporarily unavailable. Please try later.", 503, "bot-check-unavailable");
  }
  if (verdict.isBot) throw new GlowError("Open Miren in a browser to use personal scans.", 403, "bot");
}
/** Cheap checks for a paid task start: configuration, origin, session, and bot detection. No quota is spent. */
export async function liveSession(request: Request): Promise<string> {
  if (!liveAccessConfigured()) throw new GlowError("Personal scans are unavailable right now. Switch to Demo data to explore the app.", 503, "live-unavailable");
  const origin = request.headers.get("origin");
  // Browsers send Origin on every POST, so a task start without one did not come from this page.
  if ((request.method === "POST" && !origin) || (origin && origin !== new URL(request.url).origin)) throw new GlowError("Open Miren directly to use personal scans.", 403);
  const session = sessionFrom(request);
  if (!session) throw new GlowError("Reload this page before starting a personal scan.", 403);
  if (request.method === "POST") await rejectBots();
  return session.id;
}
/** Spends one task start from the session and deployment quotas. Call after the photo is known to be usable. */
export async function reserveTaskStart(sessionId: string) {
  await reserve(sessionId, false);
}
export async function authorizeLive(request: Request, polling = false): Promise<string> {
  const sessionId = await liveSession(request);
  await reserve(sessionId, polling);
  return sessionId;
}
export function issueTask(task: Omit<Task, "purpose" | "expires">): string {
  return sign({ ...task, purpose: "task", expires: Date.now() + 20 * 60_000 });
}
export function readTask(request: Request): Task {
  const token = new URL(request.url).searchParams.get("token");
  const claims = token ? verify(token) : null;
  const session = sessionFrom(request);
  if (claims?.purpose !== "task" || !session || claims.sessionId !== session.id ||
      !["skin-analysis", "makeup-vto", "skin-simulation"].includes(claims.kind) || typeof claims.taskId !== "string") {
    throw new GlowError("This preview or scan has expired. Start it again from this browser.", 403, "invalid-task");
  }
  return claims;
}
