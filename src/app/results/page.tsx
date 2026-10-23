import type { Metadata } from "next";
import { ResultsView } from "@/components/results-view";

export const metadata: Metadata = {
  title: "Results",
  description: "Per-concern skin scores and the products that match them.",
};

export default function ResultsPage() {
  return <ResultsView />;
}
