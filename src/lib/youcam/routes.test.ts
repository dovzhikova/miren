import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as analyze } from "@/app/api/analyze/route";
import { POST as tryOn } from "@/app/api/try-on/route";
import { GET as task } from "@/app/api/task/route";
import { issueTask, sessionCookie, authorizeLive, readTask } from "@/lib/live-access";
import { scanFromTaskBody } from "@/lib/youcam/client";
import { __resetYoucamAuthForTests } from "@/lib/youcam/auth";

const base = "http://localhost";
let cookie: string;
let quotaResult: number;
let analysisRunning: boolean;
let previewRunning: boolean;
let jumpPollClock: boolean;
let network: string[];
const scores = { data: { task_status: "success", results: { output: [{ type: "hd_wrinkle", raw_score: 55.4, ui_score: 70 }] } } };

beforeEach(() => {
  vi.stubEnv("YOUCAM_API_KEY", "test-only-key");
  vi.stubEnv("YOUCAM_PUBLIC_KEY", "");
  vi.stubEnv("GLOWCHECK_FORCE_MOCK", "0");
  vi.stubEnv("GLOWCHECK_SESSION_SECRET", "a-test-only-secret-with-more-than-32-characters");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://quota.example");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "quota-test-token");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
  cookie = sessionCookie(new Request(base))!.split(";")[0];
  quotaResult = 0;
  analysisRunning = previewRunning = jumpPollClock = false;
  network = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    network.push(url);
    if (url === "https://quota.example") return Response.json({ result: quotaResult });
    if (url.endsWith("/s2s/v2.0/file")) return Response.json({ data: { files: [{ file_id: "file-1", requests: [{ method: "PUT", url: "https://upload.example/file", headers: { "Content-Type": "image/jpeg" } }] }] } });
    if (url.includes("upload.example")) {
      const image = await sharp(Buffer.from(init?.body as Uint8Array)).metadata();
      expect(Math.min(image.width!, image.height!)).toBeGreaterThanOrEqual(480);
      return new Response(null, { status: 200 });
    }
    if (init?.method === "POST" && url.includes("/task/")) return Response.json({ data: { task_id: "task-1" } });
    if (url.includes("skin-analysis/task-1") && jumpPollClock) vi.setSystemTime(Date.now() + 9000);
    if (url.includes("skin-analysis/task-1")) return Response.json(analysisRunning ? { data: { task_status: "running" } } : scores);
    if (url.includes("skin-simulation/task-1") || url.includes("makeup-vto/task-1")) return Response.json(previewRunning ? { data: { task_status: "running" } } : { data: { task_status: "success", results: [{ url: "https://render.example/preview.jpg" }] } });
    throw new Error(`Unexpected test request: ${url}`);
  }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); __resetYoucamAuthForTests(); });
async function photoRequest(path: string, options: { mode?: string; source?: string; product?: string; width?: number; height?: number; session?: string } = {}) {
  const jpeg = await sharp({ create: { width: options.width ?? 1200, height: options.height ?? 1600, channels: 3, background: "#bd9384" } }).jpeg().toBuffer();
  const form = new FormData();
  form.set("image", new File([new Uint8Array(jpeg)], "portrait.jpg", { type: "image/jpeg" }));
  form.set("mode", options.mode ?? "live");
  form.set("source", options.source ?? "upload");
  if (options.product) form.set("product", options.product);
  return new Request(base + path, { method: "POST", body: form, headers: { cookie: options.session ?? cookie, origin: base } });
}

describe("paid route boundaries", () => {
  it("analyzes a real-size portrait through the file upload and provider task", async () => {
    const response = await analyze(await photoRequest("/api/analyze"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.scan.mode).toBe("live");
    expect(body.scan.profile).toBe("hd");
    expect(body.scan.concerns[0].rawScore).toBe(55.4);
    expect(network.filter((url) => url.includes("upload.example"))).toHaveLength(1);
  });
  it.each(["nighttimerepair", "color-block-cinnabar"])("renders %s using an API-quality portrait", async (product) => {
    const response = await tryOn(await photoRequest("/api/try-on", { product }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.resultUrl).toBe("https://render.example/preview.jpg");
    expect(body.kind).toBe(product === "nighttimerepair" ? "simulation" : "makeup");
  });
  it("rejects the old portrait thumbnail before reserving quota or creating a paid task", async () => {
    const response = await tryOn(await photoRequest("/api/try-on", { product: "nighttimerepair", width: 360, height: 480 }));
    expect(response.status).toBe(400);
    expect(network).toEqual([]);
  });
  it("keeps demo analysis and previews local even when live credentials exist", async () => {
    expect((await analyze(await photoRequest("/api/analyze", { mode: "mock" }))).status).toBe(200);
    expect((await tryOn(await photoRequest("/api/try-on", { mode: "mock", product: "nighttimerepair" }))).status).toBe(200);
    const sample = await analyze(await photoRequest("/api/analyze", { mode: "live", source: "sample" }));
    expect((await sample.json()).scan.mode).toBe("mock");
    expect(network).toEqual([]);
  });
  it("fails closed if durable quota protection is unconfigured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const response = await analyze(await photoRequest("/api/analyze"));
    expect(response.status).toBe(503);
    expect(network).toEqual([]);
  });
  it("reserves quota with Marketplace KV credentials when Upstash names are unset", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", "https://quota.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-test-token");
    const kvCookie = sessionCookie(new Request(base))!.split(";")[0];
    const response = await analyze(await photoRequest("/api/analyze", { session: kvCookie }));
    expect(response.status).toBe(200);
    expect(network).toContain("https://quota.example");
  });
  it("blocks over-quota jobs before any YouCam call", async () => {
    quotaResult = 2;
    const response = await tryOn(await photoRequest("/api/try-on", { product: "nighttimerepair" }));
    expect(response.status).toBe(429);
    expect(network).toEqual(["https://quota.example"]);
  });
  it("fails closed when the quota service is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect((await analyze(await photoRequest("/api/analyze"))).status).toBe(503);
  });
  it("rejects cross-origin calls and missing sessions", async () => {
    const request = await photoRequest("/api/analyze");
    request.headers.set("origin", "https://unrelated.example");
    expect((await analyze(request)).status).toBe(403);
    expect((await analyze(await photoRequest("/api/analyze", { session: "invalid" }))).status).toBe(403);
    expect(network).toEqual([]);
  });
  it("binds task polling to the signed session and rejects tampering", async () => {
    const owner = new Request(base, { headers: { cookie } });
    const sessionId = await authorizeLive(owner);
    const token = issueTask({ sessionId, taskId: "task-1", kind: "skin-analysis", source: "camera", profile: "hd", createdAt: new Date().toISOString() });
    const response = await task(new Request(`${base}/api/task?token=${encodeURIComponent(token)}`, { headers: { cookie } }));
    expect(response.status).toBe(200);
    expect((await response.json()).scan.profile).toBe("hd");
    const other = sessionCookie(new Request(base))!.split(";")[0];
    expect((await task(new Request(`${base}/api/task?token=${token}`, { headers: { cookie: other } }))).status).toBe(403);
    expect(() => readTask(new Request(`${base}/api/task?token=${token}changed`, { headers: { cookie } }))).toThrow();
    vi.useFakeTimers();
    vi.advanceTimersByTime(21 * 60_000);
    expect(() => readTask(new Request(`${base}/api/task?token=${token}`, { headers: { cookie } }))).toThrow();
  });
  it("resumes delayed live scans using the original timestamp and profile", async () => {
    analysisRunning = true;
    const request = await photoRequest("/api/analyze");
    vi.useFakeTimers();
    const started = new Date().toISOString();
    jumpPollClock = true;
    const response = await analyze(request);
    const body = await response.json();
    expect(body.status).toBe("running");
    expect(body.taskToken).toBeTruthy();
    analysisRunning = false;
    const finished = await task(new Request(`${base}/api/task?token=${encodeURIComponent(body.taskToken)}`, { headers: { cookie } }));
    const result = await finished.json();
    expect(result.scan.profile).toBe("hd");
    expect(result.scan.createdAt).toBe(started);
  });
});

it("rejects provider success payloads without usable measurements", async () => {
  await expect(scanFromTaskBody({ data: { task_status: "success", results: { output: [] } } }, { source: "upload", auth: "v2-api-key" })).rejects.toThrow("no usable concern scores");
});
