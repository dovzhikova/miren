"use client";

import Link from "next/link";
import { useState } from "react";
import { WhySheet } from "@/components/why-sheet";
import {
  CATEGORY_LABEL,
  EVIDENCE_LABEL,
  HABITS,
  HABIT_DISCLAIMER,
  SUPPLEMENT_CAUTION,
  clinicianFlags,
  habitAction,
  habitBecause,
  habitStreak,
  habitsByCategory,
  localDateISO,
  matchedConcerns,
  normalizeSkinType,
  topHabits,
  weekDates,
  type Habit,
} from "@/lib/habits";
import { startHabit, stopHabit, toggleHabitCheck, useGlow } from "@/lib/store";
import type { Scan } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY_LABEL = ["M", "T", "W", "T", "F", "S", "S"];

export function HabitsSection({ scan }: { scan: Scan }) {
  const { state } = useGlow();
  const [openId, setOpenId] = useState<string | null>(null);
  const top = topHabits(scan, 3);
  const flags = clinicianFlags(scan);
  const open = top.find((row) => row.habit.id === openId)?.habit ?? HABITS.find((habit) => habit.id === openId) ?? null;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="micro">Beyond the shelf</p>
        <h2 className="mt-1 font-display text-[22px] leading-[1.2] font-bold">Three habits to start</h2>
        <p className="mt-2 text-[13px] leading-[1.4] text-[var(--meta)]">{HABIT_DISCLAIMER}</p>
      </div>

      {flags.map((flag) => (
        <div key={flag.id} className="rounded-[16px] bg-[var(--surface-warm)] px-4 py-3">
          <p className="text-[15px] font-semibold">{flag.title}</p>
          <p className="mt-1 text-[13px] leading-[1.4] text-[var(--ink-2)]">{flag.body}</p>
        </div>
      ))}

      <div className="flex flex-col gap-2">
        {top.map((row) => {
          const active = state.habitIds.includes(row.habit.id);
          return (
            <article key={row.habit.id} className="rounded-[16px] bg-[var(--surface-warm)] px-4 py-3">
              <p className="micro">{CATEGORY_LABEL[row.habit.category]}</p>
              <p className="mt-1 text-[16px] font-semibold">{row.habit.title}</p>
              <p className="mt-1 text-[13px] leading-snug text-[var(--ink-2)]">{habitAction(row.habit)}</p>
              <p className="mt-1 text-[12px] text-[var(--meta)]">{habitBecause(row.habit, scan)}</p>
              <div className="mt-2 flex items-center gap-3">
                <EvidenceChip level={row.habit.evidence} />
                {active ? (
                  <Link href="/habits" className="text-[13px] font-semibold text-[var(--ink)]">
                    In your habits
                  </Link>
                ) : (
                  <button type="button" className="text-[13px] font-semibold text-[var(--ink)]" onClick={() => startHabit(row.habit.id)}>
                    Start
                  </button>
                )}
                <button type="button" className="text-[13px] font-semibold text-[var(--meta)]" onClick={() => setOpenId(row.habit.id)}>
                  Why
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <Link href="/habits" className="btn-secondary w-fit">
        Manage habits
      </Link>

      <HabitWhySheet habit={open} scan={scan} onClose={() => setOpenId(null)} />
    </section>
  );
}

export function HabitLog({ scan }: { scan: Scan }) {
  const { state } = useGlow();
  const active = HABITS.filter((habit) => state.habitIds.includes(habit.id));
  const today = localDateISO();
  const days = weekDates(today);
  const checkedDays = days.filter((day) => active.some((habit) => (state.habitChecks[habit.id] ?? []).includes(day))).length;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className="micro">Alongside the products</p>
        <h2 className="mt-1 font-display text-[22px] leading-[1.2] font-bold">Habits you started</h2>
        <p className="mt-2 text-[13px] leading-[1.4] text-[var(--ink-2)]">
          {active.length
            ? `${checkedDays} of 7 days checked in this week. The next scan still measures the photo, not the check-in.`
            : "Nothing started yet. A check-in does not change the score. It only records what you tried."}
        </p>
      </div>
      {active.length > 0 && (
        <ul className="flex flex-col gap-2">
          {active.map((habit) => (
            <li key={habit.id} className="text-[15px] font-semibold">
              {habit.title}
              <span className="mt-0.5 block text-[12px] font-normal text-[var(--meta)]">{habitBecause(habit, scan)}</span>
            </li>
          ))}
        </ul>
      )}
      <Link href="/habits" className="btn-secondary w-fit">
        Manage habits
      </Link>
    </section>
  );
}

export function HabitsHub({ scan }: { scan: Scan | null }) {
  const { state } = useGlow();
  const [openId, setOpenId] = useState<string | null>(null);
  const today = localDateISO();
  const suggested = scan ? topHabits(scan, 4).filter((row) => !state.habitIds.includes(row.habit.id)) : [];
  const active = HABITS.filter((habit) => state.habitIds.includes(habit.id));
  const groups = scan ? habitsByCategory(scan) : [];
  const flags = scan ? clinicianFlags(scan) : [];
  const open = HABITS.find((habit) => habit.id === openId) ?? null;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="micro">Habits</p>
        <h1 className="mt-1 font-display text-[28px] leading-[1.15] font-bold">What you are actually doing</h1>
        <p className="mt-2 text-[13px] leading-[1.4] text-[var(--meta)]">{HABIT_DISCLAIMER}</p>
      </div>

      {!scan && (
        <div className="rounded-[16px] bg-[var(--surface-warm)] px-4 py-3">
          <p className="text-[15px] font-semibold">Scan first for a personal list</p>
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">You can still start a habit. The suggestions get specific after a photo.</p>
          <Link href="/scan" className="btn-primary mt-3 w-full">
            Take a selfie
          </Link>
        </div>
      )}

      {flags.map((flag) => (
        <div key={flag.id} className="rounded-[16px] bg-[var(--surface-warm)] px-4 py-3">
          <p className="text-[15px] font-semibold">{flag.title}</p>
          <p className="mt-1 text-[13px] leading-[1.4] text-[var(--ink-2)]">{flag.body}</p>
        </div>
      ))}

      <section className="flex flex-col gap-3">
        <p className="micro">Active</p>
        {active.length === 0 && <p className="text-[15px] text-[var(--ink-2)]">Nothing started. Pick one suggestion and do that, not all of them.</p>}
        {active.map((habit) => {
          const checks = state.habitChecks[habit.id] ?? [];
          const streak = habitStreak(checks, today);
          return (
            <article key={habit.id} className="rounded-[16px] bg-[var(--surface-warm)] px-4 py-3">
              <p className="text-[16px] font-semibold">{habit.title}</p>
              <p className="mt-1 text-[13px] text-[var(--ink-2)]">{habitAction(habit)}</p>
              <WeekDots habitId={habit.id} checks={checks} today={today} />
              <p className="mt-2 text-[12px] text-[var(--meta)]">
                {streak >= 2 ? `${streak} days in a row` : checks.includes(today) ? "Checked in today" : "Not yet today"}
              </p>
              <div className="mt-2 flex gap-3">
                <button type="button" className="text-[13px] font-semibold text-[var(--meta)]" onClick={() => setOpenId(habit.id)}>
                  Why
                </button>
                <button type="button" className="text-[13px] font-semibold text-[var(--ink)]" onClick={() => stopHabit(habit.id)}>
                  Stop
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {scan && (
        <section className="flex flex-col gap-3">
          <div>
            <p className="micro">Suggested</p>
            <h2 className="mt-1 font-display text-[22px] font-bold">From this scan</h2>
          </div>
          {suggested.length === 0 && <p className="text-[15px] text-[var(--ink-2)]">The top suggestions are already in Active.</p>}
          {suggested.map((row) => (
            <article key={row.habit.id} className="border-b border-[var(--line)] pb-3">
              <p className="micro">{CATEGORY_LABEL[row.habit.category]}</p>
              <p className="mt-1 text-[16px] font-semibold">{row.habit.title}</p>
              <p className="mt-1 text-[13px] text-[var(--ink-2)]">{habitAction(row.habit)}</p>
              {row.habit.supplement && <p className="mt-1 text-[12px] leading-[1.4] text-[var(--ink-2)]">{SUPPLEMENT_CAUTION}</p>}
              <p className="mt-1 text-[12px] text-[var(--meta)]">{habitBecause(row.habit, scan)}</p>
              <div className="mt-2 flex items-center gap-3">
                <EvidenceChip level={row.habit.evidence} />
                <button type="button" className="rounded-[8px] bg-[var(--brand)] px-3 py-2 text-[13px] font-semibold text-white" onClick={() => startHabit(row.habit.id)}>
                  Start
                </button>
                <button type="button" className="text-[13px] font-semibold text-[var(--meta)]" onClick={() => setOpenId(row.habit.id)}>
                  Why
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {groups.length > 0 && (
        <section className="flex flex-col">
          <p className="micro mb-1">More ideas</p>
          {groups.map((group) => (
            <details key={group.category} className="group border-b border-[var(--line)]">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 [&::-webkit-details-marker]:hidden">
                <span className="font-display text-[17px] font-semibold">{CATEGORY_LABEL[group.category]}</span>
                <span className="num text-[13px] text-[var(--meta)]">{group.items.length}</span>
              </summary>
              {group.category === "supplements" && <p className="pb-2 text-[13px] leading-[1.4] text-[var(--ink-2)]">{SUPPLEMENT_CAUTION}</p>}
              <ul className="flex flex-col pb-2">
                {group.items.map((row) => (
                  <li key={row.habit.id} className="flex min-h-11 items-center gap-3 py-2">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenId(row.habit.id)}>
                      <span className="block text-[15px] font-semibold">{row.habit.title}</span>
                      <span className="block text-[12px] text-[var(--meta)]">{habitAction(row.habit)}</span>
                    </button>
                    {state.habitIds.includes(row.habit.id) ? (
                      <button type="button" className="text-[13px] font-semibold text-[var(--meta)]" onClick={() => stopHabit(row.habit.id)}>
                        Stop
                      </button>
                    ) : (
                      <button type="button" className="text-[13px] font-semibold text-[var(--ink)]" onClick={() => startHabit(row.habit.id)}>
                        Start
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      )}

      <HabitWhySheet habit={open} scan={scan} onClose={() => setOpenId(null)} />
    </div>
  );
}

function WeekDots({ habitId, checks, today }: { habitId: string; checks: string[]; today: string }) {
  const days = weekDates(today);
  return (
    <div className="mt-3 flex gap-1.5" aria-label="This week">
      {days.map((day, index) => {
        const on = checks.includes(day);
        const isToday = day === today;
        return (
          <button
            key={day}
            type="button"
            disabled={!isToday}
            aria-pressed={isToday ? on : undefined}
            aria-label={isToday ? (on ? "Clear today’s check-in" : "Check in today") : `${DAY_LABEL[index]} ${on ? "checked" : "open"}`}
            onClick={() => toggleHabitCheck(habitId, today)}
            className={cn(
              "grid size-8 place-items-center rounded-full text-[11px] font-semibold",
              on ? "bg-[var(--brand)] text-white" : "bg-white text-[var(--meta)]",
              !isToday && "opacity-70",
            )}
          >
            {DAY_LABEL[index]}
          </button>
        );
      })}
    </div>
  );
}

function EvidenceChip({ level }: { level: Habit["evidence"] }) {
  return <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-2)]">{EVIDENCE_LABEL[level]}</span>;
}

function HabitWhySheet({ habit, scan, onClose }: { habit: Habit | null; scan: Scan | null; onClose: () => void }) {
  const matched = habit && scan ? matchedConcerns(habit, scan) : [];
  const skinType = normalizeSkinType(scan?.skinType);
  const skinMatch = Boolean(habit?.skinTypes && skinType && habit.skinTypes.includes(skinType));
  return (
    <WhySheet open={Boolean(habit)} title={habit?.title ?? "Habit"} onClose={onClose}>
      {habit && (
        <>
          <EvidenceChip level={habit.evidence} />
          <p>{habitAction(habit)}</p>
          <p>{habit.why}</p>
          {matched.length > 0 && (
            <p>
              On this photo: {matched.map((item) => `${item.label.toLowerCase()} ${item.uiScore}`).join(", ")}. Higher means healthier-looking.
            </p>
          )}
          {skinMatch && scan?.skinType && <p>Also matched because this scan reads as {scan.skinType.toLowerCase()} skin.</p>}
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
