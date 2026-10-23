import { GlowError } from "@/lib/errors";
import { completeTryOn, fetchTask, scanFromTaskBody, type TaskKind } from "@/lib/youcam/client";
import { youcamCredentials } from "@/lib/youcam/auth";
import type { Scan } from "@/lib/types";

export const maxDuration = 60;

const KINDS = new Set<TaskKind>(["skin-analysis", "makeup-vto", "skin-simulation"]);

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function GET(request: Request) {
  if (!youcamCredentials().live) {
    return json({ error: "Sample mode finishes in one step. There is no live task to check." }, 400);
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const taskId = url.searchParams.get("taskId");
  const sourceParam = url.searchParams.get("source");
  const source: Scan["source"] = sourceParam === "camera" || sourceParam === "sample" ? sourceParam : "upload";

  if (!kind || !KINDS.has(kind as TaskKind) || !taskId) {
    return json({ error: "Missing task." }, 400);
  }

  try {
    if (kind === "skin-analysis") {
      const result = await fetchTask("skin-analysis", taskId);
      if (result.status === "error") return json({ error: "YouCam could not finish this photo." }, 422);
      if (result.status !== "success") return json({ mode: "live", status: "running", taskId, auth: result.auth.auth });
      const scan = await scanFromTaskBody(result.body, { source, auth: result.auth.auth });
      return json({ mode: "live", status: "success", scan, auth: result.auth.auth });
    }

    const finished = await completeTryOn(kind as "makeup-vto" | "skin-simulation", taskId);
    if (finished.status === "running") return json({ mode: "live", status: "running", taskId, auth: finished.auth });
    return json({ mode: "live", status: "success", resultUrl: finished.resultUrl, taskId, auth: finished.auth });
  } catch (error) {
    if (error instanceof GlowError) return json({ error: error.message, code: error.code }, error.status);
    console.error("task poll failed");
    return json({ error: "Could not check that YouCam task." }, 502);
  }
}
