import type { ReactNode } from "react";
import { XIcon } from "lucide-react";

export function WhySheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(14,14,44,0.4)]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-in sheet-shadow w-full max-w-[440px] rounded-t-[28px] bg-white px-5 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--line)]" />
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="font-display text-[22px] leading-[1.2] font-bold text-[var(--ink)]">{title}</h2>
          <button type="button" className="grid size-11 place-items-center rounded-full bg-[var(--surface-2)]" onClick={onClose} aria-label="Close">
            <XIcon className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3 text-[15px] leading-[1.45] text-[var(--ink-2)]">{children}</div>
      </div>
    </div>
  );
}
