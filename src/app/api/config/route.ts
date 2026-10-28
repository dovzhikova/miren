import { connection } from "next/server";
import { liveAccessConfigured, sessionCookie } from "@/lib/live-access";
import { YOUCAM_APIS } from "@/lib/youcam/apis";
import { youcamCredentials } from "@/lib/youcam/auth";

export async function GET(request: Request) {
  await connection();
  const live = liveAccessConfigured();
  const cookie = sessionCookie(request);
  return Response.json({
    mode: live ? "live" : "mock",
    liveAvailable: live,
    youcamConfigured: youcamCredentials().live,
    apis: [...YOUCAM_APIS],
  }, { headers: { "Cache-Control": "no-store", ...(cookie ? { "Set-Cookie": cookie } : {}) } });
}

export async function DELETE() {
  return Response.json({ deleted: true }, { headers: { "Cache-Control": "no-store", "Set-Cookie": "glowcheck_session=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0" } });
}
