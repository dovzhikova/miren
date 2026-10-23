import { CheckIcon, DropletIcon, XIcon } from "lucide-react";
import type { ProgressVerdict, SuitabilityVerdict } from "@/lib/types";
import { cn } from "@/lib/utils";

const copy: Record<
  SuitabilityVerdict | ProgressVerdict,
  { label: string; tone: "suits" | "patch" | "skip"; icon: "check" | "drop" | "x" }
> = {
  suits: { label: "Suits you", tone: "suits", icon: "check" },
  "patch-test": { label: "Patch-test first", tone: "patch", icon: "drop" },
  skip: { label: "Skip", tone: "skip", icon: "x" },
  keep: { label: "Keep", tone: "suits", icon: "check" },
  switch: { label: "Switch", tone: "skip", icon: "x" },
};

const toneClass = {
  suits: "bg-[var(--suits-bg)] text-[var(--suits)]",
  patch: "bg-[var(--patch-bg)] text-[var(--patch)]",
  skip: "bg-[var(--skip-bg)] text-[var(--skip)]",
};

export function VerdictBadge({
  verdict,
  className,
}: {
  verdict: SuitabilityVerdict | ProgressVerdict;
  className?: string;
}) {
  const item = copy[verdict];
  const Icon = item.icon === "check" ? CheckIcon : item.icon === "drop" ? DropletIcon : XIcon;
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold leading-none",
        toneClass[item.tone],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {item.label}
    </span>
  );
}
