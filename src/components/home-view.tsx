"use client";

import Link from "next/link";
import { ClockIcon, LockIcon, ScanFaceIcon } from "lucide-react";
import { latestScan } from "@/lib/progress";
import { useGlow } from "@/lib/store";

const trusts = [
  { icon: ScanFaceIcon, text: "13 cosmetic concern scores" },
  { icon: LockIcon, text: "Photo saved on this device" },
  { icon: ClockIcon, text: "A routine you can track" },
];

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
      <div className="flex flex-col gap-3">
        <p className="micro">YouCam Skin AI</p>
        <h1 className="font-display text-[28px] leading-[1.15] font-bold text-[var(--ink)]">Check the match. Track the changes.</h1>
      </div>

      <div className="relative mx-auto h-[300px] w-[240px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="Face framed for a skin scan" className="h-full w-full rounded-[50%] object-cover ring-1 ring-[var(--ink)]" />
      </div>

      <ul className="flex flex-col gap-3">
        {trusts.map((row) => (
          <li key={row.text} className="flex items-center gap-3 text-[13px] text-[var(--meta)]">
            <row.icon className="size-4 text-[var(--ink-2)]" aria-hidden />
            {row.text}
          </li>
        ))}
      </ul>

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

      <div className="sticky-bar flex flex-col gap-2">
        <Link href="/scan" className="btn-primary w-full" data-testid="start-scan">
          {latest ? "Take a follow-up scan" : "Take a selfie"}
        </Link>
        <Link href="/scan#upload" className="btn-ghost grid h-11 place-items-center">
          Upload a photo
        </Link>
      </div>
    </div>
  );
}
