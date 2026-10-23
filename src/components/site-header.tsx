"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingBagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4">
        <Link href="/" className="font-heading text-lg tracking-tight">
          GlowCheck
        </Link>
        {mode && (
          <Badge variant={mode === "live" ? "default" : "outline"} className="hidden sm:inline-flex">
            {mode === "live" ? "YouCam live" : "Sample mode"}
          </Badge>
        )}
        <nav className="ml-auto flex items-center gap-0.5 sm:gap-1">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground",
                  active && "bg-muted text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/cart" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-1")} aria-label={`Cart, ${state.cart.length} items`}>
            <ShoppingBagIcon data-icon="inline-start" />
            <span className="tabular-nums">{state.cart.length}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
