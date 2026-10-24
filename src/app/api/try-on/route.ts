import { authorizeLive, issueTask } from "@/lib/live-access";
import { getProduct } from "@/lib/catalog";
import { GlowError } from "@/lib/errors";
import { youcamCredentials } from "@/lib/youcam/auth";
import { runTryOn } from "@/lib/youcam/client";
import { prepareUpload } from "@/lib/youcam/image";

export const maxDuration = 60;

const MAX_BYTES = 8_000_000;

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Send a photo and a product." }, 400);
  }

  const slug = form.get("product");
  const image = form.get("image");
  if (typeof slug !== "string") return json({ error: "Choose a product to preview." }, 400);
  const product = getProduct(slug);
  if (!product) return json({ error: "That product is not on the shelf." }, 404);
  if (!(image instanceof File) || image.size <= 0) return json({ error: "Add the scan photo to preview this." }, 400);
  if (image.type && !/^image\/(jpeg|png|webp|jpg)$/.test(image.type)) return json({ error: "Use a JPEG, PNG, or WebP photo." }, 400);
  if (image.size > MAX_BYTES) return json({ error: "Use a photo under 8 MB." }, 400);

  const preview = {
    api: product.tryOn.kind === "makeup" ? "AI Makeup Virtual Try-On" : "AI Skin Simulation",
    endpoint: product.tryOn.kind === "makeup" ? "POST /s2s/v2.0/task/makeup-vto" : "POST /s2s/v2.0/task/skin-simulation",
    ...(product.tryOn.kind === "makeup"
      ? { version: "1.0", effects: product.tryOn.effects }
      : product.tryOn.simulation),
  };

  if (form.get("mode") === "mock" || !youcamCredentials().live) {
    if (form.get("mode") === "live") return json({ error: "Personal previews are unavailable right now. Switch to Demo data to explore the app." }, 503);
    return json({
      mode: "mock",
      status: "success",
      kind: product.tryOn.kind,
      resultUrl: null,
      preview,
    });
  }

  try {
    const prepared = await prepareUpload(Buffer.from(await image.arrayBuffer()));
    const sessionId = await authorizeLive(request);
    const payload =
      product.tryOn.kind === "makeup"
        ? { version: "1.0", effects: product.tryOn.effects }
        : { ...(product.tryOn.simulation ?? {}) };
    const kind = product.tryOn.kind === "makeup" ? "makeup-vto" : "skin-simulation";
    const outcome = await runTryOn(prepared, kind, payload);
    if (outcome.status === "running") {
      return json({ mode: "live", status: "running", taskToken: issueTask({ sessionId, taskId: outcome.taskId, kind, source: "upload", createdAt: new Date().toISOString() }), kind: product.tryOn.kind, auth: outcome.auth, preview });
    }
    return json({
      mode: "live",
      status: "success",
      kind: product.tryOn.kind,
      resultUrl: outcome.resultUrl,
      taskId: outcome.taskId,
      auth: outcome.auth,
      preview,
    });
  } catch (error) {
    if (error instanceof GlowError) return json({ error: error.message, code: error.code }, error.status);
    console.error("try-on failed");
    return json({ error: "YouCam could not render this preview." }, 502);
  }
}
