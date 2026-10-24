"use client";
import Link from "next/link";
import { getProduct, formatPrice } from "@/lib/catalog";
import { useGlow, toggleSaved } from "@/lib/store";
import { ProductPhoto } from "@/components/product-photo";

export function SavedView() {
  const { ready, state, workspace } = useGlow();
  if (!ready) return <p role="status">Loading saved products…</p>;
  const products = state.savedProductIds.flatMap((id) => { const product = getProduct(id); return product ? [product] : []; });
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-[28px] font-bold">Saved products</h1>
      <p className="text-[13px] text-[var(--meta)]">{workspace === "mock" ? "Demo collection" : "Your personal collection"}, saved in this browser.</p>
      {!products.length && <><p>No products saved yet.</p><Link href="/shop" className="btn-secondary">Browse the shelf</Link></>}
      {products.map((product) => (
        <article key={product.slug} className="flex gap-4 border-b border-[var(--line)] pb-4">
          <ProductPhoto product={product} className="h-24 w-20 shrink-0 object-contain" />
          <div className="min-w-0">
            <Link href={`/shop/${product.slug}`} className="font-semibold underline">{product.name}</Link>
            <p className="mt-1 text-[13px]">{product.brand} · {formatPrice(product.price)}</p>
            <button type="button" className="mt-2 min-h-11 text-[13px] font-semibold" onClick={() => toggleSaved(product.slug)}>Remove from Saved</button>
          </div>
        </article>
      ))}
    </div>
  );
}
