"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductMark } from "@/components/product-mark";
import { VerdictBadge } from "@/components/verdict-badge";
import { concernLabel } from "@/lib/concerns";
import { formatPrice, getProduct } from "@/lib/catalog";
import { dataUrlToFile, requestTryOn, type TryOnResult } from "@/lib/photos";
import { latestScan } from "@/lib/progress";
import { addToCart, useGlow } from "@/lib/store";
import { suitProduct } from "@/lib/suitability";
import { cn } from "@/lib/utils";

export function ProductView({ slug }: { slug: string }) {
  const product = getProduct(slug);
  const { ready, state } = useGlow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TryOnResult | null>(null);

  if (!product) return null;
  if (!ready) return <Skeleton className="h-80 w-full" />;

  const scan = latestScan(state);
  const suit = suitProduct(product, scan);
  const inCart = state.cart.some((line) => line.productId === product.slug);
  const photo = scan?.previewDataUrl;

  async function preview() {
    if (!photo) return;
    const file = dataUrlToFile(photo);
    if (!file) {
      setError("The saved photo could not be read. Scan again.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setResult(await requestTryOn(file, product!.slug));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The preview failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <ProductMark name={product.name} />
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{product.tracksSkin ? "Treatment" : "Color"}</p>
          <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="text-muted-foreground">
            {formatPrice(product.price)} · {product.size}
          </p>
          <p className="max-w-xl">{product.summary}</p>
          <p className="text-sm text-muted-foreground">{product.howToUse}</p>
          <p className="text-sm text-muted-foreground">In the bottle: {product.ingredients}</p>
          {product.concerns.length > 0 && (
            <p className="text-sm">Matched to {product.concerns.map((id) => concernLabel(id)).join(", ")}.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-11"
              disabled={inCart}
              data-testid="add-to-cart"
              onClick={() => {
                addToCart(product.slug);
                toast.success(`${product.name} is in the cart`);
              }}
            >
              {inCart ? "In the cart" : "Add to cart"}
            </Button>
            <Link href="/cart" className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
              Review the cart
            </Link>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Does this product suit me?</CardTitle>
            <VerdictBadge verdict={suit.verdict} />
          </div>
          <CardDescription>{suit.title}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {suit.reasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
          {!scan && (
            <Link href="/scan" className={cn(buttonVariants({ variant: "outline" }), "mt-2 w-fit")}>
              Scan to check it
            </Link>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{product.tryOn.label}</CardTitle>
          <CardDescription>
            {product.tryOn.kind === "makeup"
              ? "Live mode calls YouCam AI Makeup Virtual Try-On. Sample mode shows your photo and the exact effect payload."
              : "Live mode calls YouCam AI Skin Simulation. Oiliness is not sent: that slider adds shine, which is the wrong direction for a treatment preview."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!photo ? (
            <Alert>
              <AlertTitle>A face is required</AlertTitle>
              <AlertDescription>Scan first. The preview uses the photo already on this device.</AlertDescription>
            </Alert>
          ) : (
            <Button type="button" className="h-11 w-fit" onClick={preview} disabled={busy} data-testid="try-on">
              {busy ? "Asking YouCam…" : product.tryOn.label}
            </Button>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Preview failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {result && photo && (
            <div className="grid gap-4 sm:grid-cols-2">
              <figure className="flex flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.resultUrl || photo}
                  alt={result.resultUrl ? "YouCam try-on result" : "Your scan photo with a sample preview treatment"}
                  className={cn(
                    "aspect-[3/4] w-full rounded-xl object-cover",
                    !result.resultUrl && result.kind === "makeup" && "saturate-125 contrast-105",
                    !result.resultUrl && result.kind !== "makeup" && "brightness-105 contrast-105",
                  )}
                />
                <figcaption className="text-sm text-muted-foreground">
                  {result.resultUrl
                    ? "Rendered by YouCam."
                    : "Sample preview. This is your photo, not a YouCam render. The payload is what live mode sends."}
                </figcaption>
              </figure>
              <pre className="overflow-x-auto rounded-xl bg-muted p-3 text-xs leading-relaxed">{JSON.stringify(result.preview, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
