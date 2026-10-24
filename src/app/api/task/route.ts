import { authorizeLive, readTask } from "@/lib/live-access";
import { GlowError } from "@/lib/errors";
import { completeTryOn, fetchTask, scanFromTaskBody } from "@/lib/youcam/client";
import { youcamCredentials } from "@/lib/youcam/auth";

export const maxDuration = 60;


function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function GET(request: Request) {
  if (!youcamCredentials().live) {
    return json({ error: "Sample mode finishes in one step. There is no live task to check." }, 400);
  }

  try {
    const { kind, taskId, source, profile, createdAt } = readTask(request);
    await authorizeLive(request, true);
    const taskToken = new URL(request.url).searchParams.get("token");
    if (kind === "skin-analysis") {
      const result = await fetchTask("skin-analysis", taskId);
      if (result.status === "error") return json({ error: "YouCam could not finish this photo." }, 422);
      if (result.status !== "success") return json({ mode: "live", status: "running", taskToken, auth: result.auth.auth });
      const scan = await scanFromTaskBody(result.body, { source, auth: result.auth.auth });
      return json({ mode: "live", status: "success", scan: { ...scan, profile, createdAt }, auth: result.auth.auth });
    }

    const finished = await completeTryOn(kind as "makeup-vto" | "skin-simulation", taskId);
    if (finished.status === "running") return json({ mode: "live", status: "running", taskToken, auth: finished.auth });
    return json({ mode: "live", status: "success", resultUrl: finished.resultUrl, taskId, auth: finished.auth });
  } catch (error) {
    if (error instanceof GlowError) return json({ error: error.message, code: error.code }, error.status);
    console.error("task poll failed");
    return json({ error: "Could not check that YouCam task." }, 502);
  }
}
