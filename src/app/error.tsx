"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col gap-3 py-10">
      <p className="micro">Miren</p>
      <h1 className="font-display text-[28px] leading-[1.15] font-bold">Something broke on this page</h1>
      <p className="text-[15px] text-[var(--ink-2)]">Your scans are still in this browser. Try the page again.</p>
      <button type="button" className="btn-primary mt-2 w-full" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
