import { cn } from "@/lib/utils";

export function scoreTone(score: number): "suits" | "patch" | "skip" {
  if (score >= 75) return "suits";
  if (score >= 50) return "patch";
  return "skip";
}

const fill = {
  suits: "bg-[var(--suits)]",
  patch: "bg-[var(--patch)]",
  skip: "bg-[var(--skip)]",
};

export function ScoreBar({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const tone = scoreTone(value);
  const width = Math.max(4, Math.min(100, value));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-[var(--surface-2)]" aria-hidden>
        <div className={cn("h-full rounded-[3px]", fill[tone])} style={{ width: `${width}%` }} />
      </div>
      <span className="num w-8 text-right text-[13px] font-semibold text-[var(--ink)]" aria-label={`${label} ${value} out of 100`}>
        {value}
      </span>
    </div>
  );
}
