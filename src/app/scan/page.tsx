import type { Metadata } from "next";
import { ScanStudio } from "@/components/scan-studio";

export const metadata: Metadata = {
  title: "Scan",
  description: "Upload or capture a selfie. Demo mode shows example scores and does not call YouCam.",
};

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ demo?: string; live?: string }> }) {
  const params = await searchParams;
  return <ScanStudio autoDemo={params.demo === "1"} preferLive={params.live === "1"} />;
}
