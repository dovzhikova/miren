import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/product-view";
import { getProduct, listProducts } from "@/lib/catalog";

export function generateStaticParams() {
  return listProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  return { title: product?.name ?? "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getProduct(slug)) notFound();
  return <ProductView slug={slug} />;
}
