import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-xl">
          Cosmetic read, not a diagnosis. Scores come from YouCam Skin Analysis, where a higher number means healthier-looking skin. See a dermatologist for anything medical.
        </p>
        <div className="flex gap-4">
          <Link href="/scan" className="hover:text-foreground">
            Scan
          </Link>
          <Link href="/shop" className="hover:text-foreground">
            Shelf
          </Link>
          <Link href="/progress" className="hover:text-foreground">
            Routine
          </Link>
        </div>
      </div>
    </footer>
  );
}
