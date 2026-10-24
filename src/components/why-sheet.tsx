"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { XIcon } from "lucide-react";

export function WhySheet({ open, title, onClose, children, returnFocus }: { open: boolean; title: string; onClose: () => void; children: ReactNode; returnFocus?: RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) {
      trigger.current = returnFocus?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      dialog?.showModal();
    }
    if (!open && dialog?.open) {
      dialog.close();
      trigger.current?.focus();
    }
  }, [open, returnFocus]);
  return (
    <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[85dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[16px] bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom))] text-[var(--ink)] backdrop:bg-black/40">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="font-display text-[22px] leading-[1.2] font-bold">{title}</h2>
        <button type="button" className="grid size-11 shrink-0 place-items-center rounded-[8px] bg-[var(--surface-2)]" onClick={onClose} aria-label="Close"><XIcon className="size-4" aria-hidden /></button>
      </div>
      <div className="flex flex-col gap-3 text-[15px] leading-[1.45] text-[var(--ink-2)]">{children}</div>
    </dialog>
  );
}
