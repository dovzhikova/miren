"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAllData } from "@/lib/store";
import { WhySheet } from "@/components/why-sheet";

export function PrivacyView() {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-[28px] font-bold">Privacy and data</h1>
      <p>GlowCheck stores scores, thumbnails, source photos, saved products, routines, and habit check-ins in this browser. Demo data and personal scans have separate histories.</p>
      <p>In My scans, your photo passes through the GlowCheck server to YouCam for cosmetic analysis or a preview. GlowCheck does not keep a server photo archive. YouCam processes the uploaded image under its own policies.</p>
      <a className="min-h-11 text-[var(--brand)] underline" href="https://www.perfectcorp.com/consumer/privacy-policy" target="_blank" rel="noreferrer">Read YouCam’s privacy policy</a>
      <p>Demo data uses generated scores. Adding an API key does not turn demo photos or follow-ups into measured results.</p>
      <p>Deleting here clears both histories and the source photos saved by GlowCheck in this browser. It cannot delete material already processed by YouCam, copies in other browsers, or browser backups.</p>
      <button type="button" className="btn-secondary" onClick={() => setConfirm(true)}>Delete my photos and history</button>
      {error && <p role="alert">{error}</p>}
      <WhySheet open={confirm} title="Delete this browser’s data?" onClose={() => { if (!busy) setConfirm(false); }}>
        <p>This removes demo and personal scans, photos, routines, saved products, and habit check-ins. This cannot be undone.</p>
        <button type="button" className="btn-primary" disabled={busy} onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await deleteAllData();
            router.replace("/");
          } catch {
            setError("Browser storage could not be cleared. Close other GlowCheck tabs and try again.");
            setConfirm(false);
            setBusy(false);
          }
        }}>{busy ? "Deleting…" : "Delete all local data"}</button>
      </WhySheet>
    </div>
  );
}
