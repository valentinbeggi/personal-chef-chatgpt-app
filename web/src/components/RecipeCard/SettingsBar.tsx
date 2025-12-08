import { cn } from "@/utils";
import type { UnitSystem } from "@/types";
import { Minus, Plus } from "lucide-react";

interface SettingsBarProps {
  unitSystem: UnitSystem;
  onUnitSystemChange: (system: UnitSystem) => void;
  servings: number;
  originalServings: number;
  onServingsChange: (servings: number) => void;
  messages: Record<string, string>;
}

export function SettingsBar({
  unitSystem,
  onUnitSystemChange,
  servings,
  originalServings,
  onServingsChange,
  messages,
}: SettingsBarProps) {
  const minServings = 1;
  const maxServings = originalServings * 4;

  const decreaseServings = () => {
    if (servings > minServings) {
      onServingsChange(servings - 1);
    }
  };

  const increaseServings = () => {
    if (servings < maxServings) {
      onServingsChange(servings + 1);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
      {/* Unit System Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{messages["units.label"]}:</span>
        <div className="inline-flex rounded-lg bg-muted p-1">
          <button
            onClick={() => onUnitSystemChange("imperial")}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              unitSystem === "imperial"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {messages["units.imperial"]}
          </button>
          <button
            onClick={() => onUnitSystemChange("metric")}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              unitSystem === "metric"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {messages["units.metric"]}
          </button>
        </div>
      </div>

      {/* Servings Control */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {messages["labels.servings"]?.replace("{count, plural, one {# serving} other {# servings}}", "") ||
            "Servings"}
          :
        </span>
        <div className="inline-flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={decreaseServings}
            disabled={servings <= minServings}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
              "hover:bg-background hover:shadow-sm",
              "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none",
            )}
            aria-label="Decrease servings"
          >
            <Minus className="w-4 h-4" />
          </button>

          <span className="w-8 text-center text-sm font-semibold tabular-nums">{servings}</span>

          <button
            onClick={increaseServings}
            disabled={servings >= maxServings}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
              "hover:bg-background hover:shadow-sm",
              "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none",
            )}
            aria-label="Increase servings"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Reset indicator */}
        {servings !== originalServings && (
          <button
            onClick={() => onServingsChange(originalServings)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
          >
            (reset to {originalServings})
          </button>
        )}
      </div>
    </div>
  );
}

