import { afterEach, describe, expect, it, vi } from "vitest";
import { authorizeLive, liveAccessConfigured, redisRestCredentials, sessionCookie } from "@/lib/live-access";

const SECRET = "a-test-only-secret-with-more-than-32-characters";

function liveEnv() {
  vi.stubEnv("YOUCAM_API_KEY", "test-only-key");
  vi.stubEnv("YOUCAM_PUBLIC_KEY", "");
  vi.stubEnv("GLOWCHECK_FORCE_MOCK", "0");
  vi.stubEnv("GLOWCHECK_SESSION_SECRET", SECRET);
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("redisRestCredentials", () => {
  it("stays closed when neither pair is complete", () => {
    liveEnv();
    expect(redisRestCredentials()).toBeUndefined();
    expect(liveAccessConfigured()).toBe(false);

    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    expect(redisRestCredentials()).toBeUndefined();
    vi.stubEnv("KV_REST_API_URL", "http://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token");
    expect(redisRestCredentials()).toBeUndefined();
    expect(liveAccessConfigured()).toBe(false);
  });

  it("accepts the Marketplace KV pair when Upstash names are unset", () => {
    liveEnv();
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token");
    expect(redisRestCredentials()).toEqual({ url: "https://kv.example", token: "kv-token" });
    expect(liveAccessConfigured()).toBe(true);
  });

  it("keeps live mode off without YouCam or a long session secret", () => {
    liveEnv();
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token");
    vi.stubEnv("YOUCAM_API_KEY", "");
    expect(liveAccessConfigured()).toBe(false);
    vi.stubEnv("YOUCAM_API_KEY", "test-only-key");
    vi.stubEnv("GLOWCHECK_SESSION_SECRET", "too-short");
    expect(liveAccessConfigured()).toBe(false);
  });

  it("prefers Upstash names when both pairs are present", () => {
    liveEnv();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "upstash-token");
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token");
    expect(redisRestCredentials()).toEqual({ url: "https://upstash.example", token: "upstash-token" });
    expect(liveAccessConfigured()).toBe(true);
  });

  it("falls back to a complete KV pair when the Upstash pair is incomplete", () => {
    liveEnv();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.example");
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token");
    expect(redisRestCredentials()).toEqual({ url: "https://kv.example", token: "kv-token" });
  });

  it("sends the winning pair on the quota request", async () => {
    liveEnv();
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token");
    const seen: { url: string; authorization: string }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      seen.push({ url: String(input), authorization: headers.get("authorization") ?? "" });
      return Response.json({ result: 0 });
    }));
    const cookie = sessionCookie(new Request("http://localhost"))!.split(";")[0];
    await authorizeLive(new Request("http://localhost", { headers: { cookie } }));
    expect(seen).toEqual([{ url: "https://kv.example", authorization: "Bearer kv-token" }]);

    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "upstash-token");
    await authorizeLive(new Request("http://localhost", { headers: { cookie } }));
    expect(seen[1]).toEqual({ url: "https://upstash.example", authorization: "Bearer upstash-token" });
  });
});
