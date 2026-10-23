"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductMark } from "@/components/product-mark";
import { VerdictBadge } from "@/components/verdict-badge";
import { concernLabel } from "@/lib/concerns";
import { formatPrice, listProducts } from "@/lib/catalog";
import { latestScan } from "@/lib/progress";
import { useGlow } from "@/lib/store";
import { suitProduct, verdictRank } from "@/lib/suitability";
import type { ConcernId } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ShopView() {
  const { ready, state } = useGlow();
  const [filter, setFilter] = useState<ConcernId | "all">("all");
  const scan = latestScan(state);

  const filters = useMemo(() => {
    const ids = new Set<ConcernId>();
    for (const product of listProducts()) {
      for (const concern of product.concerns) ids.add(concern);
    }
    return [...ids];
  }, []);

  if (!ready) return <Skeleton className="h-80 w-full" />;

  const products = listProducts()
    .filter((product) => filter === "all" || product.concerns.includes(filter))
    .map((product) => ({ product, suit: suitProduct(product, scan) }))
    .sort((a, b) => verdictRank(a.suit.verdict) - verdictRank(b.suit.verdict) || a.product.name.localeCompare(b.product.name));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Demo shelf · no brand names</p>
        <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">Does it earn a place in the routine?</h1>
        <p className="max-w-2xl text-muted-foreground">
          {scan
            ? "Sorted from your latest scan. Suits you means a low score this product actually treats. Skip means the scan says you don't need it, or it would make something worse."
            : "Scan first if you want each product checked against your skin. Without a scan, every treatment stays a patch-test."}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button type="button" size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
          All
        </Button>
        {filters.map((id) => (
          <Button key={id} type="button" size="sm" variant={filter === id ? "default" : "outline"} onClick={() => setFilter(id)}>
            {concernLabel(id)}
          </Button>
        ))}
      </div>

      {products.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Nothing on the shelf for that</EmptyTitle>
            <EmptyDescription>Try another concern, or look at the full shelf.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(({ product, suit }) => (
            <Card key={product.slug}>
              <ProductMark name={product.name} />
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{product.name}</CardTitle>
                  <VerdictBadge verdict={suit.verdict} />
                </div>
                <CardDescription>
                  {formatPrice(product.price)} · {product.size}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>{product.summary}</p>
              </CardContent>
              <CardFooter>
                <Link href={`/shop/${product.slug}`} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                  {scan ? suit.title : "See the check"}
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
