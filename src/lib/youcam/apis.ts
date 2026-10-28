/** Names returned by GET /api/config. Keep this list and that route in lockstep. */
export const YOUCAM_APIS = [
  "AI Skin Analysis v2.1",
  "AI Makeup Virtual Try-On",
  "AI Skin Simulation",
] as const;

export type YoucamApi = (typeof YOUCAM_APIS)[number];
