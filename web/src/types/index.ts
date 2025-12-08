// ===========================
// Shared Types (aligned with server)
// ===========================

export type IngredientCategory = "produce" | "meat_seafood" | "dairy_eggs" | "bakery" | "frozen" | "pantry" | "spices";

export type Difficulty = "easy" | "medium" | "hard";

export type UnitSystem = "imperial" | "metric";

// ===========================
// Nutrition Types
// ===========================

export interface NutritionData {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

export interface NutritionBreakdownItem {
  ingredient_name: string;
  calories: number;
  percentage_of_total: number;
}

// ===========================
// Ingredient Types
// ===========================

export interface Ingredient {
  id: string;
  englishName: string; // English name (used for nutrition API lookup)
  quantity: number;
  unit: string;
  category: IngredientCategory;
  notes?: string;
  displayName: string; // Localized name for display (in user's language)
  nutrition: NutritionData;
}

// ===========================
// Instruction Types
// ===========================

export interface Instruction {
  step: number;
  text: string;
  time_minutes?: number;
  tip?: string;
}

// ===========================
// Recipe Types
// ===========================

export interface Substitution {
  original: string;
  substitute: string;
  notes?: string;
}

export interface Recipe {
  name: string;
  description: string;
  cuisine: string;
  servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  difficulty: Difficulty;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: string[];
  dietary_info: string[];
  chef_tips?: string[];
  substitutions?: Substitution[];
}

// ===========================
// Tool Response Types
// ===========================

export interface RecipeStructuredContent {
  name: string;
  description: string;
  cuisine: string;
  total_time_minutes: number;
  servings: number;
  difficulty: Difficulty;
  nutrition_per_serving: NutritionData;
  ingredient_count: number;
  tags: string[];
  dietary_info: string[];
}

export interface RecipeMeta {
  recipe: Recipe;
  nutrition_per_serving: NutritionData;
  nutrition_breakdown: NutritionBreakdownItem[];
}

// ===========================
// Shopping List Types
// ===========================

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  display: string;
  checked: boolean;
}

export interface ShoppingSection {
  name: string;
  category: IngredientCategory;
  emoji: string;
  order: number;
  items: ShoppingItem[];
}

export interface ShoppingList {
  recipe_name: string;
  servings: number;
  sections: ShoppingSection[];
}

// ===========================
// Widget State Types
// ===========================

export type ViewMode = "recipe" | "shopping-list";

export type TabId = "ingredients" | "instructions" | "nutrition";

export interface WidgetPreferences {
  unitSystem: UnitSystem;
  servingsMultiplier: number;
}

export interface WidgetState {
  view: ViewMode;
  activeTab: TabId;
  preferences: WidgetPreferences;
  shoppingList?: ShoppingList;
}
