import sharp from "sharp";
import { zipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetYoucamAuthForTests } from "@/lib/youcam/auth";
import { fetchTask, runSkinAnalysis, scanFromTaskBody, skinTaskBody } from "@/lib/youcam/client";
import { analysisProfile } from "@/lib/youcam/image";
import { POST } from "@/app/api/analyze/route";

const successOutput = {
  status: 200,
  data: {
    task_status: "success",
    results: {
      output: [
        { type: "hd_acne", region: "whole", raw_score: 60, ui_score: 76 },
        { type: "mole", region: "cheek", raw_score: 20, ui_score: 30 },
        { type: "hd_skin_type", region: "whole", label: "Dry" },
        { type: "all", score: 76 },
      ],
    },
  },
};

afterEach(() => {
  __resetYoucamAuthForTests();
  vi.unstubAllGlobals();
  delete process.env.YOUCAM_API_KEY;
  delete process.env.YOUCAM_PUBLIC_KEY;
  delete process.env.MIREN_FORCE_MOCK;
});

describe("live YouCam client", () => {
  it("uploads, creates a v2.1 task, and polls until success", async () => {
    process.env.YOUCAM_API_KEY = "test-key";
    const calls: { url: string; method: string; body?: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        calls.push({ url: String(url), method, body: typeof init?.body === "string" ? init.body : undefined });
        if (String(url).endsWith("/s2s/v2.0/file")) {
          return Response.json({
            status: 200,
            data: {
              files: [
                {
                  file_id: "file-1",
                  requests: [{ method: "PUT", url: "https://upload.example/put", headers: { "Content-Type": "image/jpeg", "x-amz-meta": "1" } }],
                },
              ],
            },
          });
        }
        if (String(url).includes("upload.example")) return new Response(null, { status: 200 });
        if (String(url).endsWith("/s2s/v2.1/task/skin-analysis") && method === "POST") {
          return Response.json({ status: 200, data: { task_id: "task-1" } });
        }
        if (String(url).includes("/s2s/v2.1/task/skin-analysis/task-1")) return Response.json(successOutput);
        return new Response("missing", { status: 500 });
      }),
    );

    const outcome = await runSkinAnalysis({
      bytes: Buffer.from("jpeg-bytes"),
      contentType: "image/jpeg",
      width: 1200,
      height: 1600,
      filename: "miren-selfie.jpg",
    });

    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.scan.concerns.map((item) => item.id)).toEqual(["acne"]);
    expect(outcome.scan.filtered[0].reason).toBe("mole");
    expect(outcome.scan.skinType).toBe("Dry");
    expect(outcome.auth).toBe("v2-api-key");
    expect(calls.map((call) => `${call.method} ${new URL(call.url).pathname}`)).toEqual([
      "POST /s2s/v2.0/file",
      "PUT /put",
      "POST /s2s/v2.1/task/skin-analysis",
      "GET /s2s/v2.1/task/skin-analysis/task-1",
    ]);
    const task = JSON.parse(calls[2].body ?? "{}") as { dst_actions: string[]; format: string; src_file_id: string };
    expect(task.src_file_id).toBe("file-1");
    expect(task.format).toBe("json");
    expect(task.dst_actions).toEqual(skinTaskBody("file-1", "hd").dst_actions);
    expect(task.dst_actions.some((action) => /mole|eyelid/i.test(action))).toBe(false);
    expect(analysisProfile(1200, 1600)).toBe("hd");
    expect(analysisProfile(800, 1000)).toBe("sd");
  });
});

describe("mock analyze route", () => {
  it("returns a full scan without credentials", async () => {
    process.env.MIREN_FORCE_MOCK = "1";
    process.env.YOUCAM_API_KEY = "should-not-be-used";
    const jpeg = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#d7b09a" },
    })
      .jpeg()
      .toBuffer();
    const form = new FormData();
    form.set("image", new File([new Uint8Array(jpeg)], "face.jpg", { type: "image/jpeg" }));
    form.set("scenario", "baseline");
    form.set("source", "upload");
    const response = await POST(new Request("http://localhost/api/analyze", { method: "POST", body: form }));
    const body = (await response.json()) as { mode: string; status: string; scan: { concerns: { id: string }[]; filtered: { reason: string }[] } };
    expect(response.status).toBe(200);
    expect(body.mode).toBe("mock");
    expect(body.status).toBe("success");
    expect(body.scan.concerns.some((item) => item.id === "wrinkle")).toBe(true);
    expect(body.scan.filtered.map((item) => item.reason)).toContain("mole");
  });

  it("rejects a missing photo", async () => {
    const response = await POST(new Request("http://localhost/api/analyze", { method: "POST", body: new FormData() }));
    expect(response.status).toBe(400);
  });
});

describe("provider responses", () => {
  const archived = { data: { task_status: "success", results: { url: "https://result.example/out.zip" } } };
  const serveZip = (files: Record<string, Uint8Array>) => vi.stubGlobal("fetch", vi.fn(async () => new Response(zipSync(files))));
  const json = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

  it("reads scores from the result archive", async () => {
    serveZip({ "out/score_info.json": json(successOutput), "out/mask.png": new Uint8Array(10) });
    const scan = await scanFromTaskBody(archived, { source: "upload", auth: "v2-api-key" });
    expect(scan.concerns.map((item) => item.id)).toContain("acne");
  });

  it("refuses an archive whose score file is implausibly large", async () => {
    serveZip({ "score_info.json": new Uint8Array(2_000_001) });
    await expect(scanFromTaskBody(archived, { source: "upload", auth: "v2-api-key" })).rejects.toThrow("no score file");
  });

  it("reports provider credential failures as a bad gateway, and photo problems as unprocessable", async () => {
    process.env.YOUCAM_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error_code: "InvalidApiKey" }, { status: 401 })));
    await expect(fetchTask("skin-analysis", "task-1")).rejects.toMatchObject({ status: 502 });
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error_code: "error_no_face" }, { status: 400 })));
    await expect(fetchTask("skin-analysis", "task-1")).rejects.toMatchObject({ status: 422, code: "error_no_face" });
  });
});
