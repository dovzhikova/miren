"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkIcon, CalendarCheckIcon, ScanFaceIcon, ShoppingBagIcon, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlow } from "@/lib/store";

const links = [
  { href: "/scan", label: "Scan", icon: ScanFaceIcon },
  { href: "/shop", label: "Shelf", icon: ShoppingBagIcon },
  { href: "/habits", label: "Habits", icon: CalendarCheckIcon },
  { href: "/progress", label: "Routine", icon: SparklesIcon },
  { href: "/saved", label: "Saved", icon: BookmarkIcon },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { state, workspace, setWorkspace } = useGlow();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded focus:bg-white focus:p-3">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-[760px] items-center gap-3 px-5">
          <Link href="/" className="shrink-0 font-display text-[17px] font-bold tracking-[-0.03em]">GlowCheck</Link>
          <label className="min-w-0 text-[12px] font-semibold">
            <span className="sr-only">Data mode</span>
            <select aria-label="Data mode" value={workspace} onChange={(event) => setWorkspace(event.target.value as "mock" | "live")} className="h-11 max-w-full rounded-[8px] bg-[var(--surface-2)] px-2">
              <option value="mock">Demo data</option>
              <option value="live">My scans</option>
            </select>
          </label>
          <nav aria-label="Main" className="ml-auto hidden items-center sm:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} aria-current={active(link.href) ? "page" : undefined} className={cn("grid min-h-11 place-items-center px-2 text-[13px] font-medium text-[var(--meta)]", active(link.href) && "text-[var(--ink)] underline underline-offset-4")}>
                {link.label}
              </Link>
            ))}
          </nav>
          <Link href="/cart" className="relative ml-auto grid size-11 shrink-0 place-items-center rounded-full sm:ml-0" aria-label={`Cart, ${state.cart.length} ${state.cart.length === 1 ? "item" : "items"}`}>
            <ShoppingBagIcon className="size-5" aria-hidden />
            {state.cart.length > 0 && <span className="num absolute top-0 right-0 rounded-full bg-[var(--ink)] px-1.5 text-[11px] leading-4 font-semibold text-white">{state.cart.length}</span>}
          </Link>
        </div>
      </header>
      <nav aria-label="Mobile" className="mobile-nav fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white sm:hidden">
        <div className="mx-auto grid max-w-[440px] grid-cols-5">
          {links.map(({ icon: Icon, ...link }) => (
            <Link key={link.href} href={link.href} aria-current={active(link.href) ? "page" : undefined} className={cn("flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-medium text-[var(--meta)]", active(link.href) && "bg-[var(--surface-2)] font-bold text-[var(--ink)]")}>
              <Icon className="size-5" aria-hidden />{link.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
