"use client";

import Link from "next/link";
import { latestScan } from "@/lib/progress";
import { useGlow } from "@/lib/store";

const steps = ["Skin AI scan", "Matched products", "Try-on", "Re-scan tracker"];

export function HomeView() {
  const { ready, state } = useGlow();
  const latest = ready ? latestScan(state) : null;
  const photo = latest?.previewDataUrl || "/demo/sample-face.jpg";
  // Relative age is read at render; the stored timestamp does not change underneath it.
  // eslint-disable-next-line react-hooks/purity
  const days = latest ? Math.max(0, Math.round((Date.now() - Date.parse(latest.createdAt)) / 86_400_000)) : 0;
  const when = latest?.mode === "mock" ? (latest.engine === "sample-follow-up" ? "Generated follow-up" : "Demo scan") : days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;

  return (
    <div className="flex flex-col gap-8">
      <section className="grid items-center gap-8 lg:min-h-[calc(100dvh-9rem)] lg:grid-cols-2 lg:gap-12">
        <div className="overflow-hidden rounded-[28px] bg-[var(--pack)] lg:h-[min(760px,calc(100dvh-10rem))]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Sample face used for the skin scan" className="h-[220px] w-full object-cover object-[center_18%] sm:h-[280px] lg:h-full" />
        </div>
        <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            <span className="inline-flex rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[12px] font-semibold text-[var(--ink)]">Powered by YouCam Skin AI</span>
            <span className="inline-flex rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[12px] font-semibold text-[var(--ink)]">Makeup VTO</span>
          </div>
          <h1 className="font-display text-[36px] leading-[1.05] font-bold text-[var(--ink)] sm:text-[52px]">
            Is this product working on <em className="italic">my</em> face?
          </h1>
          <p className="max-w-[36rem] text-[17px] leading-snug text-[var(--ink-2)]">
            YouCam Skin AI scan, then matched products, a try-on, and a re-scan tracker.
          </p>
          <div className="flex w-full max-w-md flex-col gap-3">
            <Link href="/scan" className="btn-primary btn-lg w-full" data-testid="start-scan">
              Take a selfie
            </Link>
            <Link href="/scan#upload" className="btn-secondary h-12 w-full">
              Upload a photo
            </Link>
          </div>
          <ol className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            {steps.map((step, index) => (
              <li key={step} className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
                {index > 0 && <span aria-hidden className="text-[var(--meta)]">→</span>}
                <span className="rounded-full bg-[var(--surface-2)] px-3 py-1">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {latest && (
        <Link href="/results" className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--surface-warm)] p-4">
          <div>
            <p className="micro">Last scan</p>
            <p className="mt-1 text-[15px] font-semibold text-[var(--ink)]">
              {when} · Overall <span className="num">{latest.overall}</span>
            </p>
          </div>
          <span className="text-[13px] font-semibold text-[var(--ink)]">Open</span>
        </Link>
      )}
    </div>
  );
}
