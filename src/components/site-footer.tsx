import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] pb-[var(--mobile-nav-height)]">
      <p className="mx-auto w-full max-w-[960px] px-5 py-6 text-[12px] leading-[1.4] text-[var(--meta)]">
        Cosmetic read, not a diagnosis. My scans use YouCam Skin Analysis; Demo data uses generated example scores. Higher means healthier-looking skin. See a dermatologist for anything medical.
      </p>
      <Link prefetch={false} href="/privacy" className="mx-auto mb-6 flex min-h-11 w-full max-w-[960px] items-center px-5 text-[13px] underline">Privacy and data</Link>
    </footer>
  );
}
