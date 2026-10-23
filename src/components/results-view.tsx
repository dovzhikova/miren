"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ConcernScores } from "@/components/concern-scores";
import { ProductMark } from "@/components/product-mark";
import { VerdictBadge } from "@/components/verdict-badge";
import { formatPrice, getProduct, productsForConcern } from "@/lib/catalog";
import { useGlow } from "@/lib/store";
import { suitProduct } from "@/lib/suitability";
import { cn } from "@/lib/utils";

export function ResultsView() {
  const { ready, state, setBaseline } = useGlow();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!ready) return <Skeleton className="h-80 w-full" />;

  const scan = state.scans.find((item) => item.id === selectedId) ?? state.scans[0];
  if (!scan) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No scan yet</EmptyTitle>
          <EmptyDescription>Take a photo or use the sample face. The shelf has nothing to match until then.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/scan" className={buttonVariants({ className: "h-11" })}>
            Start a scan
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  const priorities = scan.concerns.slice(0, 3);
  const matches = priorities.flatMap((concern) => productsForConcern(concern.id)).filter((product, index, list) => list.findIndex((item) => item.slug === product.slug) === index).slice(0, 3);
  const removed = [...new Set(scan.filtered.map((item) => (item.reason === "mole" ? "a mole" : "eyelid shape")))];
  const isBaseline = state.baselineId === scan.id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {scan.mode === "mock" ? "Sample fixture shaped like YouCam Skin Analysis v2.1" : "YouCam AI Skin Analysis v2.1"}
          {scan.auth === "v1-rsa" ? " · RSA access token" : scan.auth === "v2-api-key" ? " · API key bearer" : ""}
        </p>
        <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">What this photo says</h1>
        <p className="max-w-2xl text-muted-foreground">
          Higher is healthier-looking. The big number is YouCam&apos;s adjusted UI score. The routine tracker compares the raw score, which their docs say to keep over time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <Card className="items-center text-center">
          <CardHeader className="items-center">
            <CardDescription>Overall</CardDescription>
            <CardTitle className="font-heading text-5xl tabular-nums">{scan.overall}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {scan.skinType && <p>Skin type reads {scan.skinType}.</p>}
            {scan.skinAge != null && <p>Skin age estimate {scan.skinAge}. That is a cosmetic read, not a birthday.</p>}
            <p className="mt-2">Raw overall {scan.overallRaw}.</p>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-3">
          {scan.previewDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={scan.previewDataUrl} alt="Face used for this scan" className="h-40 w-32 rounded-xl object-cover" />
          )}
          <Alert>
            <AlertTitle>Moles and eyelid shape stay off the shelf</AlertTitle>
            <AlertDescription>
              A cream here cannot treat either one, so they are filtered before matching.
              {removed.length > 0 ? ` This result included ${removed.join(" and ")}. Removed.` : " This result did not include them."}
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
            {isBaseline ? (
              <p className="text-sm text-muted-foreground">This scan is the baseline later checks are measured against.</p>
            ) : (
              <Button type="button" variant="outline" onClick={() => setBaseline(scan.id)}>
                Use as the new baseline
              </Button>
            )}
            <Link href="/shop" className={buttonVariants({ variant: "outline" })}>
              Shop the matches
            </Link>
          </div>
        </div>
      </div>

      {state.scans.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {state.scans.map((item) => (
            <Button key={item.id} type="button" size="sm" variant={item.id === scan.id ? "default" : "outline"} onClick={() => setSelectedId(item.id)}>
              {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              {item.source === "sample" ? " sample" : ""}
            </Button>
          ))}
        </div>
      )}

      <ConcernScores concerns={scan.concerns} />

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-2xl">Start with the lowest scores</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {matches.map((product) => {
            const suit = suitProduct(product, scan);
            return (
              <Card key={product.slug}>
                <ProductMark name={product.name} />
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{product.name}</CardTitle>
                    <VerdictBadge verdict={suit.verdict} />
                  </div>
                  <CardDescription>{formatPrice(product.price)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-sm">{suit.reasons[0]}</p>
                  <Link href={`/shop/${product.slug}`} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                    Check this product
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {matches.length === 0 && getProduct("soft-lip-tint") && (
          <p className="text-sm text-muted-foreground">No treatment matched these scores. The shelf still has color products that do not claim to change them.</p>
        )}
      </section>
    </div>
  );
}
