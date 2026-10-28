import type { Metadata } from "next";
import { ResultsView } from "@/components/results-view";

export const metadata: Metadata = {
  title: "Results",
  description: "Per-concern skin scores and the products that match them.",
};

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <ResultsView preferBaseline={params.demo === "1"} />;
}
