import type { Metadata } from "next";
import { ProgressView } from "@/components/progress-view";

export const metadata: Metadata = {
  title: "Routine",
  description: "Compare a later scan with your baseline and keep, patch-test, or switch each product.",
};

export default function ProgressPage() {
  return <ProgressView />;
}
