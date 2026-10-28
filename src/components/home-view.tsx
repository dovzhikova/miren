"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { YoucamApis } from "@/components/youcam-apis";
import { SHELF_COUNT } from "@/lib/catalog";
import { startTenSecondDemo } from "@/lib/demo-launch";
import { DISAMBIGUATION, SHOPIFY_GATE_LINE } from "@/lib/honesty";
import { latestScan } from "@/lib/progress";
import { useGlow } from "@/lib/store";

const steps = ["Match", "Try-on/Simulate", "Re-scan verdict"];

export function HomeView() {
  const router = useRouter();
  const { ready, state, workspace } = useGlow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const latest = ready ? latestScan(state) : null;
  const photo = latest?.previewDataUrl || "/demo/sample-face.jpg";
  // Relative age is read at render; the stored timestamp does not change underneath it.
  // eslint-disable-next-line react-hooks/purity
  const days = latest ? Math.max(0, Math.round((Date.now() - Date.parse(latest.createdAt)) / 86_400_000)) : 0;
  const when = latest?.mode === "mock" ? (latest.engine === "sample-follow-up" ? "Generated follow-up" : "Demo scan") : days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;

  async function onDemo() {
    setBusy(true);
    setError("");
    try {
      await startTenSecondDemo();
      router.push("/results?demo=1");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The demo did not start.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 min-[390px]:gap-8">
      <section className="grid items-center gap-3 min-[390px]:gap-8 lg:min-h-[calc(100dvh-9rem)] lg:grid-cols-2 lg:gap-12">
        <div className="overflow-hidden rounded-[20px] bg-[var(--pack)] min-[390px]:rounded-[28px] lg:h-[min(760px,calc(100dvh-10rem))]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Sample face used for the demo" className="h-[132px] w-full object-cover object-[center_18%] min-[390px]:h-[220px] sm:h-[280px] lg:h-full" />
        </div>
        <div className="flex min-w-0 flex-col items-center gap-2 text-center min-[390px]:gap-5 lg:items-start lg:text-left">
          <YoucamApis demo={workspace === "mock"} />
          <h1 className="font-display text-[26px] leading-[1.08] font-bold text-[var(--ink)] min-[390px]:text-[36px] min-[390px]:leading-[1.05] sm:text-[52px]">
            Is this product working on <em className="italic">my</em> face?
          </h1>
          <p className="max-w-[36rem] text-[14px] leading-snug text-[var(--ink-2)] min-[390px]:text-[17px]">
            {SHOPIFY_GATE_LINE}
          </p>
          <p className="text-[13px] font-semibold text-[var(--ink)]">{SHELF_COUNT}-product shelf.</p>
          <div className="flex w-full max-w-md flex-col gap-2 min-[390px]:gap-3">
            <button type="button" className="btn-primary btn-lg w-full max-[389px]:h-12 max-[389px]:text-[16px]" data-testid="try-demo" onClick={() => void onDemo()} disabled={busy}>
              {busy ? "Loading example scores…" : "Try the demo in 10 seconds"}
            </button>
            <p className="text-[13px] leading-snug text-[var(--ink-2)]">Try demo (example scores). No YouCam call.</p>
            <Link href="/scan?live=1" className="btn-secondary h-12 w-full">
              My scans (live YouCam)
            </Link>
            <Link href="/merchant" className="btn-ghost h-11 w-full">
              GlowCheck for Shopify
            </Link>
          </div>
          {error && <p role="alert" className="text-[13px] text-[var(--skip)]">{error}</p>}
          <ol className="grid w-full max-w-md grid-cols-1 gap-1.5 sm:flex sm:w-auto sm:max-w-none sm:flex-wrap sm:items-center sm:justify-center lg:justify-start">
            {steps.map((step, index) => (
              <li key={step} className="flex min-w-0 items-center justify-center gap-1.5 text-[13px] font-semibold text-[var(--ink)] sm:justify-start">
                {index > 0 && <span aria-hidden className="hidden text-[var(--meta)] sm:inline">→</span>}
                <span className="w-full rounded-full bg-[var(--surface-2)] px-3 py-1 text-center sm:w-auto">{step}</span>
              </li>
            ))}
          </ol>
          <p className="max-w-[36rem] text-[12px] leading-snug text-[var(--meta)]">{DISAMBIGUATION}</p>
        </div>
      </section>

      {latest && (
        <Link href="/results" className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--surface-warm)] p-4">
          <div>
            <p className="micro">Last scan</p>
            <p className="mt-1 text-[15px] font-semibold text-[var(--ink)]">
              {when} · Overall <span className="num">{latest.overall}</span>
              {latest.mode === "mock" ? " · Demo scores, not YouCam" : ""}
            </p>
          </div>
          <span className="text-[13px] font-semibold text-[var(--ink)]">Open</span>
        </Link>
      )}
    </div>
  );
}
