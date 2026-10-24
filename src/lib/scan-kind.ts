import type { Scan } from "@/lib/types";

export type Workspace = Scan["mode"];

/** Legacy generated follow-ups inherited live metadata. Treat their origin as authoritative. */
export function isDemoScan(scan: Scan): boolean {
  return scan.mode === "mock" || scan.source === "sample" || /mock|sample|demo/i.test(scan.engine);
}

export function scanWorkspace(scan: Scan): Workspace {
  return isDemoScan(scan) ? "mock" : "live";
}
