import { cn } from "@/utils";
import type { Ingredient, UnitSystem, IngredientCategory } from "@/types";
import { formatMeasurement, scaleQuantity } from "@/utils/units";
import { Check } from "lucide-react";
import { useState } from "react";

interface IngredientsTabProps {
  ingredients: Ingredient[];
  unitSystem: UnitSystem;
  originalServings: number;
  scaledServings: number;
  messages: Record<string, string>;
}

const categoryConfig: Record<IngredientCategory, { emoji: string; order: number }> = {
  produce: { emoji: "🥬", order: 1 },
  meat_seafood: { emoji: "🥩", order: 2 },
  dairy_eggs: { emoji: "🥛", order: 3 },
  bakery: { emoji: "🥖", order: 4 },
  frozen: { emoji: "🧊", order: 5 },
  pantry: { emoji: "🥫", order: 6 },
  spices: { emoji: "🧂", order: 7 },
};

interface IngredientGroup {
  category: IngredientCategory;
  items: Ingredient[];
}

function groupIngredients(ingredients: Ingredient[]): IngredientGroup[] {
  const groups: Record<string, Ingredient[]> = {};

  ingredients.forEach((ingredient) => {
    const category = ingredient.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(ingredient);
  });

  return Object.entries(groups)
    .map(([category, items]) => ({
      category: category as IngredientCategory,
      items,
    }))
    .sort((a, b) => (categoryConfig[a.category]?.order || 99) - (categoryConfig[b.category]?.order || 99));
}

export function IngredientsTab({
  ingredients,
  unitSystem,
  originalServings,
  scaledServings,
  messages,
}: IngredientsTabProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const groups = groupIngredients(ingredients);

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 py-4">
      {groups.map(({ category, items }) => {
        const config = categoryConfig[category];
        const categoryLabel = messages[`shopping.sections.${category}`] || category;

        return (
          <div key={category} className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wide">
              <span>{config.emoji}</span>
              <span>{categoryLabel}</span>
            </h3>

            <ul className="space-y-1">
              {items.map((ingredient) => {
                const isChecked = checkedItems.has(ingredient.id);
                const scaledQty = scaleQuantity(ingredient.quantity, originalServings, scaledServings);
                const measurement = formatMeasurement(scaledQty, ingredient.unit, unitSystem);

                return (
                  <li key={ingredient.id}>
                    <button
                      onClick={() => toggleItem(ingredient.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left",
                        "hover:bg-muted/60 active:bg-muted",
                        isChecked && "opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                          isChecked ? "bg-primary border-primary" : "border-muted-foreground/30",
                        )}
                      >
                        {isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
                      </span>

                      <span className={cn("flex-1", isChecked && "line-through")}>
                        <span className="font-medium text-foreground">{measurement}</span>{" "}
                        <span className="text-foreground/90">{ingredient.name}</span>
                        {ingredient.notes && <span className="text-muted-foreground">, {ingredient.notes}</span>}
                      </span>

                      {ingredient.nutrition?.calories && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {Math.round((ingredient.nutrition.calories * scaledServings) / originalServings)} cal
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
