import type { Recipe, RecipeMeta, NutritionData, TabId, UnitSystem } from "@/types";
import { RecipeHeader } from "./RecipeHeader";
import { TabBar } from "./TabBar";
import { IngredientsTab } from "./IngredientsTab";
import { InstructionsTab } from "./InstructionsTab";
import { NutritionTab } from "./NutritionTab";
import { RecipeActions } from "./RecipeActions";
import { SettingsBar } from "./SettingsBar";
import { ChefHat, Sparkles } from "lucide-react";

interface RecipeCardProps {
  recipe: Recipe;
  meta: RecipeMeta;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  unitSystem: UnitSystem;
  onUnitSystemChange: (system: UnitSystem) => void;
  servings: number;
  onServingsChange: (servings: number) => void;
  onShoppingList: () => void;
  messages: Record<string, string>;
}

export function RecipeCard({
  recipe,
  meta,
  activeTab,
  onTabChange,
  unitSystem,
  onUnitSystemChange,
  servings,
  onServingsChange,
  onShoppingList,
  messages,
}: RecipeCardProps) {
  // Scale factor for nutrition when servings change
  const scaleFactor = servings / recipe.servings;

  // Per-serving nutrition stays the same (it's per serving, not total)
  const scaledNutrition: NutritionData = {
    calories: meta.nutrition_per_serving.calories,
    protein_g: meta.nutrition_per_serving.protein_g,
    carbs_g: meta.nutrition_per_serving.carbs_g,
    fat_g: meta.nutrition_per_serving.fat_g,
    fiber_g: meta.nutrition_per_serving.fiber_g,
    sugar_g: meta.nutrition_per_serving.sugar_g,
    sodium_mg: meta.nutrition_per_serving.sodium_mg,
  };

  // Scale the breakdown (individual ingredient calories scale with quantity)
  const scaledBreakdown = meta.nutrition_breakdown.map((item) => ({
    ...item,
    calories: item.calories * scaleFactor,
  }));

  return (
    <div className="relative bg-card rounded-2xl border-2 border-primary/20 shadow-xl overflow-hidden">
      {/* Animated cooking steam effect at top */}
      <div className="absolute top-0 left-0 right-0 h-2 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-60">
          <div
            className="h-full bg-gradient-to-r from-primary/30 via-accent/40 to-primary/30 animate-pulse"
            style={{ animationDuration: "2s" }}
          />
        </div>
        {/* Floating steam bubbles */}
        <div
          className="absolute top-0 left-1/4 w-1 h-1 bg-primary/40 rounded-full animate-bounce"
          style={{ animationDelay: "0s", animationDuration: "2.5s" }}
        />
        <div
          className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce"
          style={{ animationDelay: "0.8s", animationDuration: "2.2s" }}
        />
        <div
          className="absolute top-0 right-1/4 w-1 h-1 bg-primary/40 rounded-full animate-bounce"
          style={{ animationDelay: "1.6s", animationDuration: "2.8s" }}
        />
      </div>

      {/* Floating cooking icons */}
      <div className="absolute top-4 right-4 opacity-20 pointer-events-none z-0">
        <ChefHat className="w-8 h-8 text-primary animate-bounce" style={{ animationDuration: "3s" }} />
      </div>
      <div className="absolute top-8 right-12 opacity-15 pointer-events-none z-0">
        <Sparkles
          className="w-5 h-5 text-accent animate-pulse"
          style={{ animationDelay: "1s", animationDuration: "2s" }}
        />
      </div>

      {/* Header Section */}
      <div className="relative p-5 bg-gradient-to-br from-card via-card to-accent/5">
        <RecipeHeader recipe={recipe} nutrition={scaledNutrition} scaledServings={servings} messages={messages} />
      </div>

      {/* Tab Navigation */}
      <TabBar activeTab={activeTab} onTabChange={onTabChange} messages={messages} />

      {/* Tab Content */}
      <div className="px-5 min-h-[200px]">
        {activeTab === "ingredients" && (
          <IngredientsTab
            ingredients={meta.recipe.ingredients}
            unitSystem={unitSystem}
            originalServings={recipe.servings}
            scaledServings={servings}
            messages={messages}
          />
        )}
        {activeTab === "instructions" && (
          <InstructionsTab instructions={recipe.instructions} chefTips={recipe.chef_tips} messages={messages} />
        )}
        {activeTab === "nutrition" && (
          <NutritionTab nutrition={scaledNutrition} breakdown={scaledBreakdown} messages={messages} />
        )}
      </div>

      {/* Actions Section */}
      <div className="px-5 pb-5">
        <RecipeActions onShoppingList={onShoppingList} messages={messages} />

        <SettingsBar
          unitSystem={unitSystem}
          onUnitSystemChange={onUnitSystemChange}
          servings={servings}
          originalServings={recipe.servings}
          onServingsChange={onServingsChange}
          messages={messages}
        />
      </div>
    </div>
  );
}
