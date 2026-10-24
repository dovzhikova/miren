"use client";

import { useSyncExternalStore } from "react";
import type { AppState, CartLine, RoutineItem, Scan } from "@/lib/types";

const STORAGE_KEY = "glowcheck.v1";

export const emptyState: AppState = {
  scans: [],
  baselineId: null,
  cart: [],
  routine: [],
  habitIds: [],
  habitChecks: {},
};

type Snapshot = {
  hydrated: boolean;
  state: AppState;
};

const serverSnapshot: Snapshot = { hydrated: false, state: emptyState };
let snapshot: Snapshot = serverSnapshot;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(next: AppState) {
  snapshot = { hydrated: true, state: next };
  persist(next);
  listeners.forEach((listener) => listener());
}

function persist(value: AppState) {
  if (typeof window === "undefined") return;
  const save = (next: AppState) => localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  try {
    if (JSON.stringify(value).length > 1_800_000) {
      value = {
        ...value,
        scans: value.scans.map((scan, index) => (index < 2 ? scan : { ...scan, previewDataUrl: undefined })),
      };
      snapshot = { hydrated: true, state: value };
    }
    save(value);
  } catch {
    value = {
      ...value,
      scans: value.scans.map((scan, index) => (index === 0 ? scan : { ...scan, previewDataUrl: undefined })),
    };
    snapshot = { hydrated: true, state: value };
    try {
      save(value);
    } catch {
      /* Scores stay in memory for this visit. */
    }
  }
}

function readStorage(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      scans: Array.isArray(parsed.scans) ? parsed.scans : [],
      baselineId: typeof parsed.baselineId === "string" ? parsed.baselineId : null,
      cart: Array.isArray(parsed.cart) ? (parsed.cart as CartLine[]) : [],
      routine: Array.isArray(parsed.routine) ? (parsed.routine as RoutineItem[]) : [],
      habitIds: Array.isArray(parsed.habitIds) ? parsed.habitIds.filter((id): id is string => typeof id === "string") : [],
      habitChecks: readHabitChecks(parsed.habitChecks),
    };
  } catch {
    return emptyState;
  }
}

function readHabitChecks(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object") return {};
  const checks: Record<string, string[]> = {};
  for (const [id, days] of Object.entries(value)) {
    if (!Array.isArray(days)) continue;
    const dates = days.filter((day): day is string => typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day));
    if (dates.length) checks[id] = [...new Set(dates)];
  }
  return checks;
}

function ensureClient() {
  if (snapshot.hydrated || typeof window === "undefined") return;
  snapshot = { hydrated: true, state: readStorage() };
}

function getSnapshot() {
  ensureClient();
  return snapshot;
}

export function addScan(scan: Scan) {
  ensureClient();
  const scans = [scan, ...snapshot.state.scans.filter((item) => item.id !== scan.id)].slice(0, 12);
  emit({
    ...snapshot.state,
    scans,
    baselineId: snapshot.state.baselineId ?? scan.id,
  });
}

export function setBaseline(scanId: string) {
  ensureClient();
  if (!snapshot.state.scans.some((scan) => scan.id === scanId)) return;
  emit({ ...snapshot.state, baselineId: scanId });
}

export function addToCart(productId: string) {
  ensureClient();
  if (snapshot.state.cart.some((line) => line.productId === productId)) return;
  emit({ ...snapshot.state, cart: [...snapshot.state.cart, { productId, qty: 1 }] });
}

export function removeFromCart(productId: string) {
  ensureClient();
  emit({ ...snapshot.state, cart: snapshot.state.cart.filter((line) => line.productId !== productId) });
}

export function setQty(productId: string, qty: number) {
  ensureClient();
  if (qty <= 0) {
    emit({ ...snapshot.state, cart: snapshot.state.cart.filter((line) => line.productId !== productId) });
    return;
  }
  emit({
    ...snapshot.state,
    cart: snapshot.state.cart.map((line) => (line.productId === productId ? { ...line, qty } : line)),
  });
}

export function startHabit(habitId: string) {
  ensureClient();
  if (snapshot.state.habitIds.includes(habitId)) return;
  emit({ ...snapshot.state, habitIds: [...snapshot.state.habitIds, habitId] });
}

export function stopHabit(habitId: string) {
  ensureClient();
  emit({ ...snapshot.state, habitIds: snapshot.state.habitIds.filter((id) => id !== habitId) });
}

export function toggleHabitCheck(habitId: string, day: string) {
  ensureClient();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  if (!snapshot.state.habitIds.includes(habitId)) return;
  const current = snapshot.state.habitChecks[habitId] ?? [];
  const next = current.includes(day) ? current.filter((item) => item !== day) : [...current, day];
  emit({ ...snapshot.state, habitChecks: { ...snapshot.state.habitChecks, [habitId]: next } });
}

export function toggleHabit(habitId: string) {
  ensureClient();
  const habitIds = snapshot.state.habitIds.includes(habitId)
    ? snapshot.state.habitIds.filter((id) => id !== habitId)
    : [...snapshot.state.habitIds, habitId];
  emit({ ...snapshot.state, habitIds });
}

export function removeFromRoutine(productId: string) {
  ensureClient();
  emit({ ...snapshot.state, routine: snapshot.state.routine.filter((item) => item.productId !== productId) });
}

export function checkout(productIds?: string[]) {
  ensureClient();
  const latest = snapshot.state.scans[0];
  if (!latest) return false;
  const chosen = new Set(productIds ?? snapshot.state.cart.map((line) => line.productId));
  const baselineScanId = snapshot.state.baselineId ?? latest.id;
  const routine = [...snapshot.state.routine];
  for (const productId of chosen) {
    if (!snapshot.state.cart.some((line) => line.productId === productId)) continue;
    if (routine.some((item) => item.productId === productId)) continue;
    routine.push({ productId, startedAt: new Date().toISOString(), baselineScanId });
  }
  emit({
    ...snapshot.state,
    routine,
    cart: snapshot.state.cart.filter((line) => !chosen.has(line.productId)),
  });
  return true;
}

export function useGlow() {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
  return {
    ready: current.hydrated,
    state: current.state,
    addScan,
    setBaseline,
    addToCart,
    removeFromCart,
    removeFromRoutine,
    toggleHabit,
    startHabit,
    stopHabit,
    toggleHabitCheck,
    checkout,
  };
}
