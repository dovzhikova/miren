import { Badge } from "@/components/ui/badge";
import type { ProgressVerdict, SuitabilityVerdict } from "@/lib/types";

const copy: Record<SuitabilityVerdict | ProgressVerdict, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  suits: { label: "Suits you", variant: "default" },
  skip: { label: "Skip", variant: "destructive" },
  keep: { label: "Keep", variant: "default" },
  switch: { label: "Switch", variant: "destructive" },
  "patch-test": { label: "Patch-test", variant: "outline" },
};

export function VerdictBadge({ verdict }: { verdict: SuitabilityVerdict | ProgressVerdict }) {
  const item = copy[verdict];
  return <Badge variant={item.variant}>{item.label}</Badge>;
}
