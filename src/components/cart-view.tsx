"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { VerdictBadge } from "@/components/verdict-badge";
import { formatPrice, getProduct } from "@/lib/catalog";
import { latestScan } from "@/lib/progress";
import { checkout, removeFromCart, useGlow } from "@/lib/store";
import { suitProduct } from "@/lib/suitability";
import { cn } from "@/lib/utils";

export function CartView() {
  const router = useRouter();
  const { ready, state } = useGlow();
  const [open, setOpen] = useState(false);
  const scan = latestScan(state);

  if (!ready) return <Skeleton className="h-64 w-full" />;

  const lines = state.cart
    .map((line) => {
      const product = getProduct(line.productId);
      if (!product) return null;
      return { product, suit: suitProduct(product, scan) };
    })
    .filter((line): line is NonNullable<typeof line> => Boolean(line));

  const skips = lines.filter((line) => line.suit.verdict === "skip");
  const keepers = lines.filter((line) => line.suit.verdict !== "skip");
  const total = lines.reduce((sum, line) => sum + line.product.price, 0);

  function buy(ids?: string[]) {
    const ok = checkout(ids);
    if (!ok) {
      toast.error("Scan first so the routine has a baseline.");
      return;
    }
    setOpen(false);
    toast.success("Added to your routine. Nothing was charged.");
    router.push("/progress");
  }

  if (!lines.length) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>The cart is empty</EmptyTitle>
          <EmptyDescription>Add a product after the suitability check. Checkout here is a demo — nothing is charged.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/shop" className={buttonVariants({ className: "h-11" })}>
            Browse the shelf
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">Check the cart before you buy</h1>
        <p className="max-w-2xl text-muted-foreground">
          Each line is checked against your latest scan. Skip means leave it. Patch-test means it can go in the routine, with a follow-up scan to judge it.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {lines.map(({ product, suit }) => (
          <Card key={product.slug}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle>{product.name}</CardTitle>
                <VerdictBadge verdict={suit.verdict} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p>{suit.reasons[0]}</p>
              <p className="text-sm text-muted-foreground">{formatPrice(product.price)}</p>
            </CardContent>
            <CardFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => removeFromCart(product.slug)}>
                Remove
              </Button>
              <Link href={`/shop/${product.slug}`} className={cn(buttonVariants({ variant: "ghost" }))}>
                Details
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-2xl tabular-nums">{formatPrice(total)}</p>
          <p className="text-sm text-muted-foreground">Demo total. No payment is taken.</p>
        </div>
        {!scan ? (
          <Link href="/scan" className={cn(buttonVariants(), "h-11")}>
            Scan before checkout
          </Link>
        ) : skips.length ? (
          <Button type="button" className="h-11" data-testid="checkout" onClick={() => setOpen(true)}>
            Review {skips.length} mismatch{skips.length === 1 ? "" : "es"}
          </Button>
        ) : (
          <Button type="button" className="h-11" data-testid="checkout" onClick={() => buy()}>
            Add to my routine
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Some of this does not suit the scan</DialogTitle>
            <DialogDescription>
              {skips.map((line) => line.product.name).join(", ")} {skips.length === 1 ? "is" : "are"} marked skip. You can leave {skips.length === 1 ? "it" : "them"} out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={keepers.length === 0}
              onClick={() => buy(keepers.map((line) => line.product.slug))}
            >
              Add the matches only
            </Button>
            <Button type="button" onClick={() => buy()}>
              Add everything anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
