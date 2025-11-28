import { cn } from "@/utils";
import type { NutritionData, NutritionBreakdownItem } from "@/types";

interface NutritionTabProps {
  nutrition: NutritionData;
  breakdown: NutritionBreakdownItem[];
  messages: Record<string, string>;
}

interface MacroCardProps {
  label: string;
  value: number;
  unit: string;
  color: string;
  percentage?: number;
}

function MacroCard({ label, value, unit, color, percentage }: MacroCardProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl p-4 border", "bg-gradient-to-br", color)}>
      <div className="relative z-10">
        <p className="text-sm font-medium opacity-80">{label}</p>
        <p className="text-2xl font-bold mt-1 tabular-nums">
          {Math.round(value)}
          <span className="text-sm font-normal ml-1">{unit}</span>
        </p>
        {percentage !== undefined && <p className="text-xs opacity-70 mt-1">{percentage}% DV</p>}
      </div>
      {/* Decorative circle */}
      <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-10 bg-current" />
    </div>
  );
}

export function NutritionTab({ nutrition, breakdown, messages }: NutritionTabProps) {
  // Daily value percentages (approximate based on 2000 cal diet)
  const dailyValues = {
    calories: Math.round((nutrition.calories / 2000) * 100),
    protein: Math.round((nutrition.protein_g / 50) * 100),
    carbs: Math.round((nutrition.carbs_g / 300) * 100),
    fat: Math.round((nutrition.fat_g / 65) * 100),
    fiber: nutrition.fiber_g ? Math.round((nutrition.fiber_g / 25) * 100) : undefined,
    sodium: nutrition.sodium_mg ? Math.round((nutrition.sodium_mg / 2300) * 100) : undefined,
  };

  return (
    <div className="space-y-6 py-4">
      {/* Per Serving Header */}
      <p className="text-sm text-muted-foreground text-center">{messages["labels.perServing"]}</p>

      {/* Main Macros Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MacroCard
          label={messages["labels.calories"]}
          value={nutrition.calories}
          unit="kcal"
          color="from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/20 border-orange-200 dark:border-orange-800/50 text-orange-700 dark:text-orange-300"
          percentage={dailyValues.calories}
        />
        <MacroCard
          label={messages["labels.protein"]}
          value={nutrition.protein_g}
          unit="g"
          color="from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300"
          percentage={dailyValues.protein}
        />
        <MacroCard
          label={messages["labels.carbs"]}
          value={nutrition.carbs_g}
          unit="g"
          color="from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300"
          percentage={dailyValues.carbs}
        />
        <MacroCard
          label={messages["labels.fat"]}
          value={nutrition.fat_g}
          unit="g"
          color="from-rose-50 to-rose-100/50 dark:from-rose-950/40 dark:to-rose-900/20 border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300"
          percentage={dailyValues.fat}
        />
      </div>

      {/* Secondary Nutrients */}
      {(nutrition.fiber_g || nutrition.sugar_g || nutrition.sodium_mg) && (
        <div className="grid grid-cols-3 gap-2">
          {nutrition.fiber_g !== undefined && (
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">{messages["labels.fiber"]}</p>
              <p className="text-lg font-semibold text-foreground">{Math.round(nutrition.fiber_g)}g</p>
            </div>
          )}
          {nutrition.sugar_g !== undefined && (
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">{messages["labels.sugar"]}</p>
              <p className="text-lg font-semibold text-foreground">{Math.round(nutrition.sugar_g)}g</p>
            </div>
          )}
          {nutrition.sodium_mg !== undefined && (
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">{messages["labels.sodium"]}</p>
              <p className="text-lg font-semibold text-foreground">{Math.round(nutrition.sodium_mg)}mg</p>
            </div>
          )}
        </div>
      )}

      {/* Calorie Breakdown */}
      {breakdown.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
            {messages["nutrition.breakdown"]}
          </h3>

          <div className="space-y-3">
            {breakdown.slice(0, 6).map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground truncate flex-1 mr-2">{item.ingredient_name}</span>
                  <span className="text-muted-foreground tabular-nums flex-shrink-0">
                    {Math.round(item.calories)} cal ({Math.round(item.percentage_of_total)}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
                    style={{ width: `${Math.min(item.percentage_of_total, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
