import { CLOSED_LOOP } from "@/lib/honesty";
import { YOUCAM_APIS } from "@/lib/youcam/apis";

export function YoucamApis({ demo = false }: { demo?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-1.5" data-testid="youcam-apis">
        {YOUCAM_APIS.map((api) => (
          <li key={api} className="inline-flex rounded-full border border-[var(--line)] bg-white px-2 py-0.5 text-[11px] font-semibold leading-snug text-[var(--ink)] min-[390px]:px-3 min-[390px]:py-1 min-[390px]:text-[12px]">
            {api}
          </li>
        ))}
      </ul>
      <p className="text-[13px] leading-snug font-semibold text-[var(--ink)]">{CLOSED_LOOP}</p>
      {demo ? <p className="text-[12px] leading-snug text-[var(--ink-2)]">Demo mode: these APIs are not called. Scores and previews are examples.</p> : null}
    </div>
  );
}
