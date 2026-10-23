import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { bandLabel } from "@/lib/concerns";
import type { ConcernScore } from "@/lib/types";

export function ConcernScores({ concerns }: { concerns: ConcernScore[] }) {
  if (!concerns.length) return null;
  return (
    <Accordion>
      {concerns.map((concern) => (
        <AccordionItem key={concern.id} value={concern.id}>
          <AccordionTrigger>
            <span className="flex w-full flex-col gap-2 pr-3">
              <span className="flex items-baseline justify-between gap-3">
                <span>{concern.label}</span>
                <span className="text-muted-foreground tabular-nums">{concern.uiScore}</span>
              </span>
              <Progress value={concern.uiScore} aria-label={`${concern.label} score ${concern.uiScore}, ${bandLabel(concern.uiScore)}`}>
                <ProgressLabel className="sr-only">{concern.label}</ProgressLabel>
                <ProgressValue className="sr-only" />
              </Progress>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p>{concern.explanation}</p>
            <p className="mt-2 text-muted-foreground">{concern.direction} The adjusted score is {concern.uiScore}. The raw score, used later to see if a product worked, is {concern.rawScore}.</p>
            {concern.maskUrl && (
              <p className="mt-2">
                <a href={concern.maskUrl} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                  Detection mask
                </a>
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
