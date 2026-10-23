"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingBagIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlow } from "@/lib/store";

const links = [
  { href: "/scan", label: "Scan" },
  { href: "/shop", label: "Shelf" },
  { href: "/progress", label: "Routine" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { state } = useGlow();
  const [mode, setMode] = useState<"mock" | "live" | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config")
      .then((response) => response.json())
      .then((data: { mode?: "mock" | "live" }) => {
        if (!cancelled) setMode(data.mode === "live" ? "live" : "mock");
      })
      .catch(() => {
        if (!cancelled) setMode("mock");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/92 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[440px] items-center gap-1 px-5">
        <Link href="/" className="font-display text-[17px] font-bold tracking-[-0.02em] text-[var(--brand)]">
          GlowCheck
        </Link>
        {mode && (
          <span className="rounded-full bg-[var(--brand-tint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--brand)]">
            {mode === "live" ? "Live" : "Sample"}
          </span>
        )}
        <nav className="ml-auto flex items-center">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-2 py-2 text-[13px] font-medium text-[var(--meta)]",
                  active && "bg-[var(--brand-tint)] text-[var(--brand)]",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/cart"
            className="relative ml-1 grid size-11 place-items-center rounded-full text-[var(--ink)]"
            aria-label={`Cart, ${state.cart.length} items`}
          >
            <ShoppingBagIcon className="size-5" />
            {state.cart.length > 0 && (
              <span className="num absolute mt-3 ml-3 rounded-full bg-[var(--brand)] px-1 text-[10px] leading-4 font-semibold text-white">
                {state.cart.length}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
