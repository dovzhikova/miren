import type { Scan } from "@/lib/types";

async function drawFile(file: File, maxEdge: number, quality: number): Promise<{ canvas: HTMLCanvasElement; blob: Blob } | null> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return null;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return null;
  return { canvas, blob };
}

export async function shrinkPhoto(file: File): Promise<File> {
  try {
    const drawn = await drawFile(file, 1600, 0.9);
    if (!drawn) return file;
    return new File([drawn.blob], "glowcheck.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function previewDataUrl(file: File): Promise<string | undefined> {
  try {
    const drawn = await drawFile(file, 480, 0.72);
    if (!drawn) return undefined;
    return drawn.canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return undefined;
  }
}

export function dataUrlToFile(dataUrl: string, name = "scan.jpg"): File | null {
  const parts = dataUrl.split(",");
  if (parts.length < 2) return null;
  const mime = /data:(.*?);/.exec(parts[0])?.[1] || "image/jpeg";
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], name, { type: mime });
}

async function readJson(response: Response) {
  const data = (await response.json().catch(() => ({}))) as { error?: string; status?: string; taskId?: string; scan?: Scan; resultUrl?: string | null; mode?: string; preview?: unknown; kind?: string };
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export async function analyzePhoto(file: File, source: Scan["source"]): Promise<Scan> {
  const prepared = await shrinkPhoto(file);
  const form = new FormData();
  form.set("image", prepared);
  form.set("source", source);
  let data = await readJson(await fetch("/api/analyze", { method: "POST", body: form }));
  for (let attempt = 0; data.status === "running" && data.taskId && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    data = await readJson(await fetch(`/api/task?kind=skin-analysis&taskId=${encodeURIComponent(data.taskId)}&source=${source}`));
  }
  if (!data.scan) throw new Error("This is taking longer than usual. Try the photo again.");
  return data.scan;
}

export type TryOnResult = {
  mode: string;
  kind?: string;
  resultUrl: string | null;
  preview: unknown;
};

export async function requestTryOn(file: File, product: string): Promise<TryOnResult> {
  const prepared = await shrinkPhoto(file);
  const form = new FormData();
  form.set("image", prepared);
  form.set("product", product);
  let data = await readJson(await fetch("/api/try-on", { method: "POST", body: form }));
  const preview = data.preview;
  const kind = data.kind === "makeup" ? "makeup-vto" : "skin-simulation";
  for (let attempt = 0; data.status === "running" && data.taskId && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const taskId = data.taskId;
    data = await readJson(await fetch(`/api/task?kind=${kind}&taskId=${encodeURIComponent(taskId)}`));
    data.preview = data.preview ?? preview;
    data.kind = data.kind ?? (kind === "makeup-vto" ? "makeup" : "simulation");
  }
  if (data.status !== "success") throw new Error("The preview is taking too long. Try again.");
  return {
    mode: data.mode || "mock",
    kind: data.kind,
    resultUrl: data.resultUrl ?? null,
    preview: data.preview ?? preview,
  };
}
