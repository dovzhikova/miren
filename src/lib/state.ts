import { scanWorkspace, type Workspace } from "@/lib/scan-kind";
import { CONCERN_IDS, type AppState, type Scan } from "@/lib/types";

export function newState(): AppState {
  return { scans: [], baselineId: null, cart: [], routine: [], habitIds: [], habitChecks: {}, savedProductIds: [] };
}

export type StoredState = { version: 2; workspace: Workspace; workspaces: Record<Workspace, AppState> };
export function newStoredState(): StoredState {
  return { version: 2, workspace: "mock", workspaces: { mock: newState(), live: newState() } };
}

function isScan(value: unknown): value is Scan {
  if (!value || typeof value !== "object") return false;
  const scan = value as Scan;
  return typeof scan.id === "string" && typeof scan.engine === "string" && typeof scan.createdAt === "string" &&
    Number.isFinite(Date.parse(scan.createdAt)) && Number.isFinite(scan.overall) &&
    ["live", "mock"].includes(scan.mode) && ["camera", "upload", "sample"].includes(scan.source) &&
    Array.isArray(scan.filtered) && Array.isArray(scan.concerns) && scan.concerns.length > 0 &&
    scan.concerns.every((row) => row && CONCERN_IDS.includes(row.id) && Number.isFinite(row.uiScore) &&
      (row.rawScore == null || Number.isFinite(row.rawScore)) && typeof row.label === "string");
}

function readState(value: unknown, workspace: Workspace): AppState {
  const result = newState();
  if (!value || typeof value !== "object") return result;
  const state = value as Partial<AppState>;
  result.scans = (Array.isArray(state.scans) ? state.scans : []).filter(isScan).filter((scan) => scanWorkspace(scan) === workspace)
    .map((scan) => ({ ...scan, mode: workspace, auth: workspace === "mock" ? "none" : scan.auth,
      concerns: scan.concerns.map((row) => ({ ...row, rawScore: row.rawScore ?? null })) }));
  result.baselineId = typeof state.baselineId === "string"
    ? state.baselineId : result.scans.at(-1)?.id ?? null;
  result.cart = (Array.isArray(state.cart) ? state.cart : []).filter((line) => line && typeof line.productId === "string" && Number.isInteger(line.qty) && line.qty > 0 && line.qty <= 99);
  result.routine = (Array.isArray(state.routine) ? state.routine : []).filter((item) => item && typeof item.productId === "string" && typeof item.baselineScanId === "string" && typeof item.startedAt === "string");
  result.habitIds = (Array.isArray(state.habitIds) ? state.habitIds : []).filter((id) => typeof id === "string");
  result.savedProductIds = (Array.isArray(state.savedProductIds) ? state.savedProductIds : []).filter((id) => typeof id === "string");
  for (const [id, days] of Object.entries(state.habitChecks ?? {})) {
    if (Array.isArray(days)) result.habitChecks[id] = [...new Set(days.filter((day) => typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)))];
  }
  return result;
}

export function restoreState(value: unknown, legacy = false): StoredState {
  const result = newStoredState();
  if (!value || typeof value !== "object") return result;
  if (legacy) {
    const old = value as Partial<AppState>;
    result.workspaces.mock = readState(old, "mock");
    result.workspaces.live = readState(old, "live");
    // Carry routine entries only into the workspace that owns their original scan.
    for (const workspace of ["mock", "live"] as const) {
      const state = result.workspaces[workspace];
      if (!state.scans.some((scan) => scan.id === state.baselineId)) state.baselineId = state.scans.at(-1)?.id ?? null;
      state.routine = state.routine.filter((item) => state.scans.some((scan) => scan.id === item.baselineScanId));
    }
    const latest = (Array.isArray(old.scans) ? old.scans : []).find(isScan);
    result.workspace = latest ? scanWorkspace(latest) : "mock";
    const other = result.workspace === "mock" ? "live" : "mock";
    result.workspaces[other].cart = [];
    result.workspaces[other].habitIds = [];
    result.workspaces[other].habitChecks = {};
    return result;
  }
  const saved = value as Partial<StoredState>;
  if (saved.version !== 2) return result;
  result.workspace = saved.workspace === "live" ? "live" : "mock";
  result.workspaces.mock = readState(saved.workspaces?.mock, "mock");
  result.workspaces.live = readState(saved.workspaces?.live, "live");
  return result;
}

/** Keep recent scans plus every baseline still referenced by the workspace. */
export function retainScans(state: AppState, incoming: Scan): Scan[] {
  const scans = [incoming, ...state.scans.filter((scan) => scan.id !== incoming.id)];
  const referenced = new Set([state.baselineId, ...state.routine.map((item) => item.baselineScanId)]);
  return scans.filter((scan, index) => index < 12 || referenced.has(scan.id));
}
