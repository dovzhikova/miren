import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col gap-3 py-10">
      <h1 className="font-heading text-3xl">That page is not on the shelf</h1>
      <p className="text-muted-foreground">The scan, the shop, and the routine are the whole app.</p>
      <Link href="/" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
        Back home
      </Link>
    </div>
  );
}
