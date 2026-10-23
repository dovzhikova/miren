"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { VerdictBadge } from "@/components/verdict-badge";
import { getProduct } from "@/lib/catalog";
import { baselineScan, buildSampleFollowUp, compareScans, latestScan, routineCalls } from "@/lib/progress";
import { addScan, removeFromRoutine, useGlow } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ProgressView() {
  const { ready, state } = useGlow();

  if (!ready) return <Skeleton className="h-80 w-full" />;

  const baseline = baselineScan(state);
  const latest = latestScan(state);
  if (!baseline || !latest) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No baseline yet</EmptyTitle>
          <EmptyDescription>The tracker needs a first scan. Later photos are compared with YouCam&apos;s raw score, not the friendlier UI score.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/scan" className={buttonVariants({ className: "h-11" })}>
            Take the first scan
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  const same = baseline.id === latest.id;
  const deltas = same ? [] : compareScans(baseline, latest);
  const calls = routineCalls(state);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Is it working?</p>
        <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">Keep, patch-test, or switch</h1>
        <p className="max-w-2xl text-muted-foreground">
          Baseline {new Date(baseline.createdAt).toLocaleDateString()} · latest {new Date(latest.createdAt).toLocaleDateString()}. A move of 3 or more raw points is the call. Under two weeks, a small move stays a patch-test.
        </p>
      </div>

      {same && (
        <Card>
          <CardHeader>
            <CardTitle>One scan is a starting point</CardTitle>
            <CardDescription>Rescan with a new selfie, or load the sample follow-up to see the verdicts without waiting two weeks.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The sample follow-up is labeled. Lines, pores, dryness, texture, and redness improve. Breakouts get worse. With a YouCam key, a real second photo replaces it.
          </CardContent>
          <CardFooter className="gap-2">
            <Button
              type="button"
              data-testid="sample-followup"
              onClick={() => addScan(buildSampleFollowUp(baseline))}
            >
              Load sample follow-up
            </Button>
            <Link href="/scan" className={buttonVariants({ variant: "outline" })}>
              Rescan
            </Link>
          </CardFooter>
        </Card>
      )}

      {!same && (
        <div className="flex flex-col gap-3">
          {deltas.map((delta) => {
            const width = Math.max(8, Math.min(100, delta.latestRaw));
            return (
              <Card key={delta.id} size="sm">
                <CardHeader>
                  <div className="flex items-baseline justify-between gap-3">
                    <CardTitle>{delta.label}</CardTitle>
                    <span className={cn("tabular-nums", delta.delta > 0 ? "text-primary" : delta.delta < 0 ? "text-destructive" : "text-muted-foreground")}>
                      {delta.delta > 0 ? "+" : ""}
                      {delta.delta} raw
                    </span>
                  </div>
                  <CardDescription>
                    UI score {delta.baselineUi} → {delta.latestUi}. Raw {delta.baselineRaw} → {delta.latestRaw}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={width} aria-label={`${delta.label} latest raw score`}>
                    <ProgressLabel className="sr-only">{delta.label}</ProgressLabel>
                    <ProgressValue className="sr-only" />
                  </Progress>
                </CardContent>
              </Card>
            );
          })}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => addScan(buildSampleFollowUp(baseline))}>
              Load another sample follow-up
            </Button>
            <Link href="/scan" className={buttonVariants({ variant: "outline" })}>
              Rescan for real
            </Link>
          </div>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-2xl">Products on trial</h2>
        {calls.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>Nothing is on trial</EmptyTitle>
              <EmptyDescription>The cart check is what puts a product here, tied to the baseline scan.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link href="/shop" className={buttonVariants({ variant: "outline" })}>
                Find a match
              </Link>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {calls.map((call) => {
              const product = getProduct(call.productId);
              if (!product) return null;
              return (
                <Card key={call.productId}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>{product.name}</CardTitle>
                      <VerdictBadge verdict={call.verdict} />
                    </div>
                    <CardDescription>{call.title}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>{call.summary}</p>
                  </CardContent>
                  <CardFooter>
                    <Button type="button" variant="ghost" onClick={() => removeFromRoutine(product.slug)}>
                      Remove from routine
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
