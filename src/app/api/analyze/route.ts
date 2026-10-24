import { authorizeLive, issueTask } from "@/lib/live-access";
import { analysisProfile } from "@/lib/youcam/image";
import { GlowError } from "@/lib/errors";
import { youcamCredentials } from "@/lib/youcam/auth";
import { runSkinAnalysis } from "@/lib/youcam/client";
import { prepareUpload } from "@/lib/youcam/image";
import { buildMockScan } from "@/lib/youcam/mock";
import type { Scan } from "@/lib/types";

export const maxDuration = 60;

const MAX_BYTES = 8_000_000;

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function fail(error: unknown) {
  if (error instanceof GlowError) return json({ error: error.message, code: error.code }, error.status);
  console.error("analyze failed");
  return json({ error: "Something went wrong reading that photo. Try again." }, 500);
}

function sourceOf(value: FormDataEntryValue | null): Scan["source"] {
  return value === "camera" || value === "sample" ? value : "upload";
}

function scenarioOf(value: FormDataEntryValue | null): "baseline" | "followup" | "auto" {
  if (value === "baseline" || value === "followup") return value;
  return "auto";
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Send a photo as form data." }, 400);
  }

  const image = form.get("image");
  if (!(image instanceof File)) return json({ error: "Add a photo first." }, 400);
  if (image.size <= 0) return json({ error: "That file is empty." }, 400);
  if (image.size > MAX_BYTES) return json({ error: "Use a photo under 8 MB." }, 400);
  if (image.type && !/^image\/(jpeg|png|webp|jpg)$/.test(image.type)) {
    return json({ error: "Use a JPEG, PNG, or WebP photo." }, 400);
  }

  const bytes = Buffer.from(await image.arrayBuffer());
  const source = sourceOf(form.get("source"));

  if (source === "sample" || form.get("mode") === "mock" || !youcamCredentials().live) {
    if (source !== "sample" && form.get("mode") === "live") return json({ error: "Personal scans are unavailable right now. Switch to Demo data to explore the app." }, 503);
    // The sample portrait is a fixed example. Its scores do not depend on which JPEG bytes we ship.
    const requested = scenarioOf(form.get("scenario"));
    const scenario = source === "sample" && requested === "auto" ? "baseline" : requested;
    const scan = buildMockScan(bytes, { scenario, source });
    return json({ mode: "mock", status: "success", scan });
  }

  try {
    const prepared = await prepareUpload(bytes);
    const sessionId = await authorizeLive(request);
    const createdAt = new Date().toISOString();
    const outcome = await runSkinAnalysis(prepared, { source });
    if (outcome.status === "running") {
      return json({ mode: "live", status: "running", taskToken: issueTask({ sessionId, taskId: outcome.taskId, kind: "skin-analysis", source, profile: analysisProfile(prepared.width, prepared.height), createdAt }), auth: outcome.auth });
    }
    return json({ mode: "live", status: "success", scan: { ...outcome.scan, source, createdAt }, auth: outcome.auth });
  } catch (error) {
    return fail(error);
  }
}
