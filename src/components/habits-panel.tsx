"use client";

import { useState } from "react";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { WhySheet } from "@/components/why-sheet";
import {
  CATEGORY_LABEL,
  EVIDENCE_LABEL,
  HABIT_DISCLAIMER,
  SUPPLEMENT_CAUTION,
  clinicianFlags,
  habitsByCategory,
  matchedConcerns,
  normalizeSkinType,
  topHabits,
  type Habit,
} from "@/lib/habits";
import { toggleHabit, useGlow } from "@/lib/store";
import type { Scan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HabitsSection({ scan }: { scan: Scan }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const top = topHabits(scan);
  const groups = habitsByCategory(scan);
  const flags = clinicianFlags(scan);
  const open = groups.flatMap((group) => group.items).find((row) => row.habit.id === openId)?.habit ?? top.find((row) => row.habit.id === openId)?.habit ?? null;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="micro">Beyond the shelf</p>
        <h2 className="mt-1 font-display text-[22px] leading-[1.2] font-bold">Habits for this skin</h2>
        <p className="mt-2 text-[13px] leading-[1.4] text-[var(--meta)]">{HABIT_DISCLAIMER}</p>
      </div>

      {flags.map((flag) => (
        <div key={flag.id} className="rounded-[16px] bg-[var(--surface-warm)] px-4 py-3">
          <p className="text-[15px] font-semibold">{flag.title}</p>
          <p className="mt-1 text-[13px] leading-[1.4] text-[var(--ink-2)]">{flag.body}</p>
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <p className="micro">Daily wins</p>
        {top.map((row) => (
          <button
            key={row.habit.id}
            type="button"
            className="rounded-[16px] bg-[var(--surface-warm)] px-4 py-3 text-left"
            onClick={() => setOpenId(row.habit.id)}
          >
            <span className="micro">{CATEGORY_LABEL[row.habit.category]}</span>
            <span className="mt-1 block text-[16px] font-semibold">{row.habit.title}</span>
            <span className="mt-1 line-clamp-3 block text-[13px] leading-snug text-[var(--ink-2)]">{row.habit.why}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {groups.map((group) => (
          <details key={group.category} className="group border-b border-[var(--line)]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 [&::-webkit-details-marker]:hidden">
              <span className="font-display text-[17px] font-semibold">{CATEGORY_LABEL[group.category]}</span>
              <span className="num text-[13px] text-[var(--meta)]">{group.items.length}</span>
            </summary>
            {group.category === "supplements" && (
              <p className="pb-2 text-[13px] leading-[1.4] text-[var(--ink-2)]">{SUPPLEMENT_CAUTION}</p>
            )}
            <div className="flex flex-col pb-2">
              {group.items.map((row) => (
                <HabitRow key={row.habit.id} habit={row.habit} onOpen={() => setOpenId(row.habit.id)} />
              ))}
            </div>
          </details>
        ))}
      </div>

      <HabitWhySheet habit={open} scan={scan} onClose={() => setOpenId(null)} />
    </section>
  );
}

export function HabitLog({ scan }: { scan: Scan }) {
  const { state } = useGlow();
  const groups = habitsByCategory(scan);
  const checked = groups.flatMap((group) => group.items).filter((row) => state.habitIds.includes(row.habit.id));

  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className="micro">Alongside the products</p>
        <h2 className="mt-1 font-display text-[22px] leading-[1.2] font-bold">Habits you are trying</h2>
        <p className="mt-2 text-[13px] leading-[1.4] text-[var(--ink-2)]">
          {checked.length
            ? `Logged with this stretch: ${checked.map((row) => row.habit.title).join(", ")}. Read the arrows as the photo, next to what you tried. They do not prove a habit caused the change.`
            : "Optional. Check a habit you are actually doing. The next scan still measures the photo, not the checkbox."}
        </p>
      </div>
      {groups.map((group) => (
        <div key={group.category}>
          <p className="micro mb-1">{CATEGORY_LABEL[group.category]}</p>
          <ul className="flex flex-col">
            {group.items.map((row) => {
              const on = state.habitIds.includes(row.habit.id);
              return (
                <li key={row.habit.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    className="flex min-h-11 w-full items-center gap-3 text-left"
                    onClick={() => toggleHabit(row.habit.id)}
                  >
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-[6px] border border-[var(--line)]",
                        on && "border-[var(--brand)] bg-[var(--brand)] text-white",
                      )}
                    >
                      {on ? <CheckIcon className="size-3.5" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold">{row.habit.title}</span>
                      <span className="block text-[12px] text-[var(--meta)]">{EVIDENCE_LABEL[row.habit.evidence]}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function HabitRow({ habit, index, onOpen }: { habit: Habit; index?: number; onOpen: () => void }) {
  return (
    <button type="button" className="flex min-h-11 w-full items-center gap-3 py-2 text-left" onClick={onOpen}>
      {index != null && <span className="num w-5 text-[15px] font-semibold text-[var(--ink)]">{index}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-snug font-semibold">{habit.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="micro">{CATEGORY_LABEL[habit.category]}</span>
          <EvidenceChip level={habit.evidence} />
        </span>
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-[var(--meta)]" />
    </button>
  );
}

function EvidenceChip({ level }: { level: Habit["evidence"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        level === "strong" && "bg-[var(--surface-2)] text-[var(--ink)]",
        level === "moderate" && "bg-[var(--surface-2)] text-[var(--ink-2)]",
        level === "low" && "bg-[var(--surface-2)] text-[var(--meta)]",
      )}
    >
      {EVIDENCE_LABEL[level]}
    </span>
  );
}

function HabitWhySheet({ habit, scan, onClose }: { habit: Habit | null; scan: Scan; onClose: () => void }) {
  const matched = habit ? matchedConcerns(habit, scan) : [];
  const skinType = normalizeSkinType(scan.skinType);
  const skinMatch = Boolean(habit?.skinTypes && skinType && habit.skinTypes.includes(skinType));
  return (
    <WhySheet open={Boolean(habit)} title={habit?.title ?? "Habit"} onClose={onClose}>
      {habit && (
        <>
          <EvidenceChip level={habit.evidence} />
          <p>{habit.why}</p>
          {matched.length > 0 && (
            <p>
              On this photo: {matched.map((item) => `${item.label.toLowerCase()} ${item.uiScore}`).join(", ")}. Higher means healthier-looking.
            </p>
          )}
          {skinMatch && scan.skinType && <p>Also matched because this scan reads as {scan.skinType.toLowerCase()} skin.</p>}
          {habit.supplement && <p>{SUPPLEMENT_CAUTION}</p>}
          <p className="text-[13px]">
            <span className="micro mr-2">Source</span>
            <a href={habit.href} className="text-[var(--brand)] underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
              {habit.source}
            </a>
          </p>
          <p className="text-[13px] text-[var(--meta)]">{HABIT_DISCLAIMER}</p>
        </>
      )}
    </WhySheet>
  );
}
