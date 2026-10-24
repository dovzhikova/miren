import { unzipSync } from "fflate";
import { GlowError } from "@/lib/errors";
import type { Scan } from "@/lib/types";
import { getAuthorization, youcamBase, youcamCredentials } from "@/lib/youcam/auth";
import { analysisProfile, type PreparedImage } from "@/lib/youcam/image";
import { parseYoucamResult, youcamErrorMessage } from "@/lib/youcam/parse";

export type TaskKind = "skin-analysis" | "makeup-vto" | "skin-simulation";

const TASK_PATH: Record<TaskKind, string> = {
  "skin-analysis": "/s2s/v2.1/task/skin-analysis",
  "makeup-vto": "/s2s/v2.0/task/makeup-vto",
  "skin-simulation": "/s2s/v2.0/task/skin-simulation",
};

// Moles are not a Skin Analysis action. Eyelid droop is available as
// hd_droopy_upper_eyelid / hd_droopy_lower_eyelid but is not requested:
// this shelf cannot treat eyelid shape, so those scores are never shopped.
const HD_ACTIONS = [
  "hd_wrinkle",
  "hd_pore",
  "hd_texture",
  "hd_acne",
  "hd_oiliness",
  "hd_radiance",
  "hd_eye_bag",
  "hd_age_spot",
  "hd_dark_circle",
  "hd_firmness",
  "hd_moisture",
  "hd_redness",
  "hd_tear_trough",
  "hd_skin_type",
];

const SD_ACTIONS = [
  "wrinkle",
  "pore",
  "texture",
  "acne",
  "oiliness",
  "radiance",
  "eye_bag",
  "age_spot",
  "dark_circle_v2",
  "firmness",
  "moisture",
  "redness",
  "tear_trough",
  "skin_type",
];

type AuthState = { header: string; auth: "v2-api-key" | "v1-rsa" };

function envelope(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const record = body as Record<string, unknown>;
  const nested = record.data ?? record.result;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested as Record<string, unknown>;
  return record;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 300) };
  }
}

function errorCode(body: unknown): string | undefined {
  const data = envelope(body);
  const record = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const code = data.error ?? data.error_code ?? record.error_code ?? record.error;
  return typeof code === "string" ? code : undefined;
}

function errorText(body: unknown): string | undefined {
  const data = envelope(body);
  const message = data.error_message ?? data.message;
  return typeof message === "string" ? message : undefined;
}

export function taskStatusOf(body: unknown): string {
  const data = envelope(body);
  const status = data.task_status ?? data.status;
  return typeof status === "string" ? status : "running";
}

export function extractMediaUrl(body: unknown): string | null {
  const data = envelope(body);
  const results = data.results;
  if (!results) return null;
  if (typeof results === "string") return results;
  if (Array.isArray(results)) {
    for (const item of results) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      if (typeof record.url === "string") return record.url;
      if (typeof record.download_url === "string") return record.download_url;
      if (Array.isArray(record.data)) {
        const nested = record.data.find((entry) => entry && typeof entry === "object" && typeof (entry as { url?: unknown }).url === "string") as
          | { url: string }
          | undefined;
        if (nested) return nested.url;
      }
    }
    return null;
  }
  if (typeof results === "object") {
    const record = results as Record<string, unknown>;
    if (typeof record.url === "string") return record.url;
    if (typeof record.download_url === "string") return record.download_url;
  }
  return null;
}

async function youcamFetch(auth: AuthState, path: string, init?: RequestInit): Promise<{ response: Response; body: unknown; auth: AuthState }> {
  const send = async (header: string) => {
    const response = await fetch(`${youcamBase()}${path}`, {
      ...init,
      headers: {
        Authorization: header,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(25_000),
    });
    const body = await readBody(response);
    return { response, body };
  };

  let result = await send(auth.header);
  if (result.response.status === 401 && auth.auth === "v1-rsa") {
    const apiKey = youcamCredentials().apiKey;
    auth = { header: `Bearer ${apiKey}`, auth: "v2-api-key" };
    result = await send(auth.header);
  }
  if (!result.response.ok) {
    const code = errorCode(result.body);
    throw new GlowError(youcamErrorMessage(code, errorText(result.body)), result.response.status || 502, code);
  }
  return { ...result, auth };
}

function uploadHeaders(headers: Record<string, string> | undefined, contentType: string): Headers {
  const allowed = new Headers();
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (/^(content-type|content-length|content-md5|x-amz-)/i.test(key)) allowed.set(key, String(value));
  }
  if (!allowed.has("content-type")) allowed.set("content-type", contentType);
  return allowed;
}

export async function uploadImage(image: PreparedImage, auth: AuthState): Promise<{ fileId: string; auth: AuthState }> {
  const started = await youcamFetch(auth, "/s2s/v2.0/file", {
    method: "POST",
    body: JSON.stringify({
      files: [
        {
          content_type: image.contentType,
          file_name: image.filename,
          file_size: image.bytes.length,
        },
      ],
    }),
  });
  const data = envelope(started.body);
  const files = Array.isArray(data.files) ? data.files : [];
  const file = files[0] as { file_id?: string; requests?: { method?: string; url?: string; headers?: Record<string, string> }[] } | undefined;
  const request = file?.requests?.[0];
  if (!file?.file_id || !request?.url) {
    throw new GlowError("YouCam did not return an upload URL for this photo.", 502);
  }

  const upload = await fetch(request.url, {
    method: request.method || "PUT",
    headers: uploadHeaders(request.headers, image.contentType),
    body: new Uint8Array(image.bytes),
    signal: AbortSignal.timeout(25_000),
  });
  if (!upload.ok) {
    throw new GlowError("The photo did not finish uploading to YouCam. Try again.", 502, "error_upload");
  }
  return { fileId: file.file_id, auth: started.auth };
}

export function skinTaskBody(fileId: string, profile: "hd" | "sd") {
  return {
    src_file_id: fileId,
    dst_actions: profile === "hd" ? HD_ACTIONS : SD_ACTIONS,
    format: "json",
    ...(profile === "hd" ? { miniserver_args: { enable_mask_overlay: true } } : {}),
  };
}

async function scoreInfoFromZip(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new GlowError("YouCam finished, but the result archive would not download.", 502);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const files = unzipSync(bytes);
  const entry = Object.keys(files).find((name) => name.endsWith("score_info.json"));
  if (!entry) throw new GlowError("YouCam's result archive had no score file.", 502);
  return JSON.parse(new TextDecoder().decode(files[entry]));
}

export async function fetchTask(kind: TaskKind, taskId: string, auth?: AuthState) {
  const state = auth ?? (await getAuthorization());
  const result = await youcamFetch(state, `${TASK_PATH[kind]}/${encodeURIComponent(taskId)}`);
  return { body: result.body, auth: result.auth, status: taskStatusOf(result.body) };
}

async function waitForTask(kind: TaskKind, taskId: string, auth: AuthState, budgetMs: number) {
  const deadline = Date.now() + budgetMs;
  let current = await fetchTask(kind, taskId, auth);
  while (current.status === "running" && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    current = await fetchTask(kind, taskId, current.auth);
  }
  if (current.status === "error") {
    const code = errorCode(current.body);
    throw new GlowError(youcamErrorMessage(code, errorText(current.body)), 422, code);
  }
  return current;
}

export async function runSkinAnalysis(image: PreparedImage, options?: { source?: Scan["source"] }): Promise<
  | { status: "success"; scan: Scan; auth: AuthState["auth"] }
  | { status: "running"; taskId: string; auth: AuthState["auth"] }
> {
  let auth = await getAuthorization();
  const uploaded = await uploadImage(image, auth);
  auth = uploaded.auth;
  const profile = analysisProfile(image.width, image.height);
  const created = await youcamFetch(auth, TASK_PATH["skin-analysis"], {
    method: "POST",
    body: JSON.stringify(skinTaskBody(uploaded.fileId, profile)),
  });
  const taskId = envelope(created.body).task_id;
  if (typeof taskId !== "string" || !taskId) throw new GlowError("YouCam did not return a task id.", 502);
  const finished = await waitForTask("skin-analysis", taskId, created.auth, 8_000);
  if (finished.status !== "success") {
    return { status: "running", taskId, auth: finished.auth.auth };
  }
  const scan = await scanFromTaskBody(finished.body, {
    source: options?.source ?? "upload",
    auth: finished.auth.auth,
  });
  scan.profile = profile;
  return { status: "success", scan, auth: finished.auth.auth };
}

export async function scanFromTaskBody(body: unknown, extras: Pick<Scan, "source" | "auth">): Promise<Scan> {
  const mediaUrl = extractMediaUrl(body);
  const data = envelope(body);
  const results = data.results;
  const hasOutput = Boolean(results && typeof results === "object" && Array.isArray((results as { output?: unknown }).output));
  const payload = !hasOutput && mediaUrl ? await scoreInfoFromZip(mediaUrl) : body;
  const scan = parseYoucamResult(payload, {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: extras.source,
    mode: "live",
    auth: extras.auth,
    engine: "youcam-skin-analysis-v2.1",
  });
  if (!scan.concerns.length) throw new GlowError("YouCam returned no usable concern scores. Please try another photo.", 502, "invalid-result");
  return scan;
}

export async function runTryOn(image: PreparedImage, kind: "makeup-vto" | "skin-simulation", payload: Record<string, unknown>) {
  let auth = await getAuthorization();
  const uploaded = await uploadImage(image, auth);
  auth = uploaded.auth;
  const created = await youcamFetch(auth, TASK_PATH[kind], {
    method: "POST",
    body: JSON.stringify({ ...payload, src_file_id: uploaded.fileId }),
  });
  const taskId = envelope(created.body).task_id;
  if (typeof taskId !== "string" || !taskId) throw new GlowError("YouCam did not return a try-on task id.", 502);
  const finished = await waitForTask(kind, taskId, created.auth, 8_000);
  if (finished.status !== "success") {
    return { status: "running" as const, taskId, auth: finished.auth.auth };
  }
  const resultUrl = extractMediaUrl(finished.body);
  if (!resultUrl) throw new GlowError("YouCam finished the try-on but did not return an image.", 502);
  return { status: "success" as const, resultUrl, taskId, auth: finished.auth.auth };
}

export async function completeTryOn(kind: "makeup-vto" | "skin-simulation", taskId: string) {
  const finished = await fetchTask(kind, taskId);
  if (finished.status === "error") {
    const code = errorCode(finished.body);
    throw new GlowError(youcamErrorMessage(code, errorText(finished.body)), 422, code);
  }
  if (finished.status !== "success") return { status: "running" as const, taskId, auth: finished.auth.auth };
  const resultUrl = extractMediaUrl(finished.body);
  if (!resultUrl) throw new GlowError("YouCam finished the try-on but did not return an image.", 502);
  return { status: "success" as const, resultUrl, taskId, auth: finished.auth.auth };
}
