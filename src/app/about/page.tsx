import type { Metadata } from "next";
import Link from "next/link";
import { YoucamApis } from "@/components/youcam-apis";
import { honestyPoints, SHOPIFY_GATE_LINE } from "@/lib/honesty";

export const metadata: Metadata = {
  title: "About",
  description: "How GlowCheck uses YouCam, what the demo does not prove, and how the Shopify cart gate works.",
};

export default function AboutPage() {
  return (
    <article className="flex max-w-[40rem] flex-col gap-4 pb-8">
      <p className="micro">Methods and honesty</p>
      <h1 className="font-display text-[32px] leading-[1.15] font-bold">About GlowCheck</h1>
      <p className="text-[15px] leading-snug text-[var(--ink-2)]">{SHOPIFY_GATE_LINE}</p>
      <YoucamApis />
      <ul className="flex flex-col gap-3 text-[15px] leading-snug text-[var(--ink)]">
        {honestyPoints().map((point) => (
          <li key={point} className="rounded-[12px] bg-[var(--surface-2)] px-4 py-3">{point}</li>
        ))}
      </ul>
      <p className="text-[14px] leading-snug text-[var(--ink-2)]">
        Privacy: Demo mode does not send a photo to YouCam. My scans send a photo through this server only when Live YouCam is connected. Scores and photos stay in this browser until you delete them. GlowCheck does not keep a server photo archive.
      </p>
      <div className="flex flex-col gap-2">
        <Link href="/scan?demo=1" className="btn-primary w-full">Try the demo</Link>
        <Link href="/merchant" className="btn-secondary w-full">GlowCheck for Shopify</Link>
        <Link href="/privacy" className="inline-flex h-11 items-center text-[14px] underline">Privacy and data</Link>
      </div>
    </article>
  );
}
