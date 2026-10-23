"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col gap-3 py-10">
      <h1 className="font-heading text-3xl">Something broke on this page</h1>
      <p className="text-muted-foreground">Your scans are still in this browser. Try the page again.</p>
      <Button type="button" className="w-fit" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
