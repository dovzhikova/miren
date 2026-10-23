import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { bandLabel } from "@/lib/concerns";
import { sampleBaselineScan } from "@/lib/youcam/mock";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: "Scan before the cart",
    body: "A selfie goes to YouCam Skin Analysis. You get a score per concern, in plain language, with moles and eyelid shape taken out.",
  },
  {
    title: "Ask if it suits you",
    body: "The demo shelf is generic on purpose. Each product is checked against the low scores, and against the ones a formula would make worse.",
  },
  {
    title: "Scan again later",
    body: "The second photo is compared on YouCam's raw score. Each product in the routine gets keep, patch-test, or switch.",
  },
];

export default function HomePage() {
  const example = sampleBaselineScan();
  const priorities = example.concerns.slice(0, 3);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">Skin check for the moment before you pay</p>
        <h1 className="max-w-3xl font-heading text-4xl leading-tight tracking-tight sm:text-5xl">
          Know if it suits you before you buy. Know if it worked after you use it.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          GlowCheck sends one selfie to YouCam Skin AI, matches a small shelf to the concerns that actually scored low, and checks those same concerns again later.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/scan" className={cn(buttonVariants({ size: "lg" }), "h-11 px-4")} data-testid="start-scan">
            Check my skin
          </Link>
          <Link href="/shop" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-4")}>
            Browse the shelf
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <Card key={step.title}>
            <CardHeader>
              <CardDescription>0{index + 1}</CardDescription>
              <CardTitle>{step.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{step.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>What a result looks like</CardTitle>
            <CardDescription>Sample fixture, not a person. The lowest scores are the ones worth shopping for.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {priorities.map((concern) => (
              <div key={concern.id} className="flex items-baseline justify-between gap-3 border-b pb-3 last:border-0">
                <div>
                  <p className="font-medium">{concern.label}</p>
                  <p className="text-sm text-muted-foreground">{bandLabel(concern.uiScore)}</p>
                </div>
                <p className="font-heading text-2xl tabular-nums">{concern.uiScore}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Not a thin wrapper</CardTitle>
            <CardDescription>The API call is the start. The product is the decision.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>Overall on the sample is {example.overall}. Skin type reads {example.skinType}. Higher means healthier-looking, which is the opposite of a “problem percentage.”</p>
            <p>Color products can be tried on with YouCam Makeup. Treatments preview through Skin Simulation, without pretending an oiliness slider reduces oil — that control adds shine.</p>
            <Link href="/scan" className="underline underline-offset-4">
              Run it on the sample photo
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
