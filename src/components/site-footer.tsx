import Link from "next/link";
import { YoucamApis } from "@/components/youcam-apis";
import { SHOPIFY_GATE_LINE } from "@/lib/honesty";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] pb-[var(--mobile-nav-height)]">
      <div className="mx-auto flex w-full max-w-[960px] min-w-0 flex-col gap-3 px-5 py-6">
        <YoucamApis />
        <p className="text-[12px] leading-[1.4] text-[var(--meta)]">
          Cosmetic read, not a diagnosis. Higher means healthier-looking skin on this photo. See a dermatologist for anything medical.
        </p>
        <p className="text-[12px] leading-[1.4] text-[var(--ink-2)]">{SHOPIFY_GATE_LINE}</p>
        <nav aria-label="About" className="flex flex-col">
          <Link prefetch={false} href="/about" className="flex min-h-11 items-center text-[13px] underline">About and methods</Link>
          <Link prefetch={false} href="/merchant" className="flex min-h-11 items-center text-[13px] underline">For Shopify merchants</Link>
          <Link prefetch={false} href="/privacy" className="flex min-h-11 items-center text-[13px] underline">Privacy and data</Link>
        </nav>
      </div>
    </footer>
  );
}
