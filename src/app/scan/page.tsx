import type { Metadata } from "next";
import { ScanStudio } from "@/components/scan-studio";

export const metadata: Metadata = {
  title: "Scan",
  description: "Upload or capture a selfie for YouCam Skin Analysis.",
};

export default function ScanPage() {
  return <ScanStudio />;
}
