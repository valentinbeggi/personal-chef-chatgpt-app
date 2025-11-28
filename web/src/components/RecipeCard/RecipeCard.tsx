import type { Recipe, RecipeMeta, NutritionData, TabId, UnitSystem } from "@/types";
import { RecipeHeader } from "./RecipeHeader";
import { TabBar } from "./TabBar";
import { IngredientsTab } from "./IngredientsTab";
import { InstructionsTab } from "./InstructionsTab";
import { NutritionTab } from "./NutritionTab";
import { RecipeActions } from "./RecipeActions";
import { SettingsBar } from "./SettingsBar";

interface RecipeCardProps {
  recipe: Recipe;
  meta: RecipeMeta;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  unitSystem: UnitSystem;
  onUnitSystemChange: (system: UnitSystem) => void;
  servings: number;
  onServingsChange: (servings: number) => void;
  onElevate: () => void;
  onSimplify: () => void;
  onShoppingList: () => void;
  isShoppingListLoading: boolean;
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
  onElevate,
  onSimplify,
  onShoppingList,
  isShoppingListLoading,
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
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header Section */}
      <div className="p-5">
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
        <RecipeActions
          recipeName={recipe.name}
          onElevate={onElevate}
          onSimplify={onSimplify}
          onShoppingList={onShoppingList}
          isShoppingListLoading={isShoppingListLoading}
          messages={messages}
        />

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
