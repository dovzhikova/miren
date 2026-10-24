import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { newState, newStoredState, restoreState } from "@/lib/state";
import { sampleBaselineScan } from "@/lib/youcam/mock";
import type { Scan } from "@/lib/types";

const demo = sampleBaselineScan();
const live: Scan = { ...demo, id: "real", source: "camera", mode: "live", engine: "youcam-skin-analysis-v2.1", profile: "hd" };
let storage: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  storage = new Map();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
});
afterEach(() => vi.unstubAllGlobals());
function saved() { return JSON.parse(storage.get("glowcheck.v2")!); }

describe("workspace state", () => {
  it("migrates legacy generated live results into demo without copying personal routines", () => {
    const generated = { ...live, id: "generated", engine: "sample-follow-up", source: "sample" as const };
    const state = restoreState({ ...newState(), scans: [generated, live], baselineId: live.id, routine: [{ productId: "advanced", baselineScanId: live.id, startedAt: live.createdAt }] }, true);
    expect(state.workspaces.mock.scans[0].mode).toBe("mock");
    expect(state.workspaces.mock.scans[0].auth).toBe("none");
    expect(state.workspaces.mock.routine).toEqual([]);
    expect(state.workspaces.live.scans.map((scan) => scan.id)).toEqual(["real"]);
    expect(state.workspaces.live.routine).toHaveLength(1);
  });
  it("starts new products at the latest scan and preserves baselines beyond twelve scans", async () => {
    const store = await import("@/lib/store");
    store.addScan(live);
    store.addScan({ ...live, id: "product-start" });
    store.addToCart("advanced");
    expect(store.checkout()).toBe(true);
    for (let i = 0; i < 20; i++) store.addScan({ ...live, id: `later-${i}` });
    const state = saved().workspaces.live;
    expect(state.routine[0].baselineScanId).toBe("product-start");
    expect(state.scans.map((scan: Scan) => scan.id)).toContain("product-start");
    expect(state.scans.map((scan: Scan) => scan.id)).toContain("real");
    expect(state.scans).toHaveLength(14);
  });
  it("isolates carts, routines, habits, and saved products when switching mode", async () => {
    const store = await import("@/lib/store");
    store.addScan(live);
    store.addToCart("advanced");
    store.toggleSaved("advanced");
    store.startHabit("gentle-cleanse");
    store.addScan(demo);
    const state = saved();
    expect(state.workspace).toBe("mock");
    expect(state.workspaces.mock.cart).toEqual([]);
    expect(state.workspaces.mock.habitIds).toEqual([]);
    expect(state.workspaces.mock.savedProductIds).toEqual([]);
    expect(state.workspaces.live.cart).toHaveLength(1);
    expect(state.workspaces.live.savedProductIds).toEqual(["advanced"]);
    store.setWorkspace("live");
    expect(saved().workspaces.live.cart).toHaveLength(1);
  });
  it("restores both histories on reload and recovers malformed records", () => {
    const stored = newStoredState();
    stored.workspaces.live.scans = [live];
    stored.workspaces.mock.scans = [demo];
    expect(restoreState(stored).workspaces.live.scans[0].id).toBe("real");
    expect(restoreState({ version: 2, workspaces: { live: { scans: [{ id: "bad" }] } } }).workspaces.live.scans).toEqual([]);
  });
});
