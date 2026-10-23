import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col gap-3 py-10">
      <p className="micro">GlowCheck</p>
      <h1 className="font-display text-[28px] leading-[1.15] font-bold">That page is not on the shelf</h1>
      <p className="text-[15px] text-[var(--ink-2)]">The scan, the shop, and the routine are the whole app.</p>
      <Link href="/" className="btn-primary mt-2 w-full">
        Back home
      </Link>
    </div>
  );
}
