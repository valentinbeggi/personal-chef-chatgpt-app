import { cn } from "@/utils";
import type { Instruction } from "@/types";
import { formatTime } from "@/utils/units";
import { Clock, Lightbulb, Check, ChefHat } from "lucide-react";
import { useState } from "react";

interface InstructionsTabProps {
  instructions: Instruction[];
  chefTips?: string[];
  messages: Record<string, string>;
}

export function InstructionsTab({ instructions, chefTips, messages }: InstructionsTabProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (step: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(step)) {
        next.delete(step);
      } else {
        next.add(step);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 py-4">
      {/* Steps */}
      <ol className="relative space-y-4">
        {instructions.map((instruction, index) => {
          const isCompleted = completedSteps.has(instruction.step);
          const isLast = index === instructions.length - 1;

          return (
            <li key={instruction.step} className="relative pl-10">
              {/* Vertical connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-[15px] top-8 w-0.5 h-[calc(100%-8px)]",
                    isCompleted ? "bg-primary/30" : "bg-border",
                  )}
                />
              )}

              {/* Step number badge */}
              <button
                onClick={() => toggleStep(instruction.step)}
                className={cn(
                  "absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  "text-sm font-bold border-2",
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground animate-pulse"
                    : "bg-background border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:scale-110",
                )}
                style={!isCompleted ? { transition: "all 0.2s ease" } : { animationDuration: "2s" }}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : instruction.step}
              </button>

              {/* Step content */}
              <div className={cn("space-y-2 transition-opacity", isCompleted && "opacity-60")}>
                <div className="flex items-start gap-2">
                  <p
                    className={cn(
                      "text-foreground leading-relaxed flex-1",
                      isCompleted && "line-through decoration-muted-foreground/50",
                    )}
                  >
                    {instruction.text}
                  </p>
                  {instruction.time_minutes && (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs">
                      <Clock className="w-3 h-3" />
                      {formatTime(instruction.time_minutes)}
                    </span>
                  )}
                </div>

                {/* Step tip */}
                {instruction.tip && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">{instruction.tip}</p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Chef Tips Section */}
      {chefTips && chefTips.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border relative">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
            <ChefHat className="w-4 h-4 text-primary animate-bounce" style={{ animationDuration: "2.5s" }} />
            <span>{messages["labels.chefTips"]}</span>
          </h3>
          <ul className="space-y-2">
            {chefTips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
