import { connection } from "next/server";
import { youcamCredentials } from "@/lib/youcam/auth";

export async function GET() {
  await connection();
  const { live, publicKey } = youcamCredentials();
  return Response.json({
    mode: live ? "live" : "mock",
    rsaConfigured: Boolean(publicKey),
    apis: ["AI Skin Analysis v2.1", "AI Makeup Virtual Try-On", "AI Skin Simulation"],
  });
}
