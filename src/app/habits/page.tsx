"use client";

import { HabitsHub } from "@/components/habits-panel";
import { latestScan } from "@/lib/progress";
import { useGlow } from "@/lib/store";

export default function HabitsPage() {
  const { ready, state } = useGlow();
  if (!ready) return <div className="h-80 animate-pulse rounded-[20px] bg-[var(--surface-2)]" />;
  return <HabitsHub scan={latestScan(state)} />;
}
