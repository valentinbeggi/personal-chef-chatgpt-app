// ============================================
// Recipe Input Schema (from ChatGPT model)
// ============================================

export interface IngredientInput {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  notes?: string;
}

export interface InstructionInput {
  step: number;
  text: string;
  time_minutes?: number;
  tip?: string;
}

export interface SubstitutionInput {
  original: string;
  substitute: string;
  notes?: string;
}

export type IngredientCategory = "produce" | "meat_seafood" | "dairy_eggs" | "bakery" | "frozen" | "pantry" | "spices";

export type Difficulty = "easy" | "medium" | "hard";

export interface RecipeInput {
  name: string;
  description: string;
  cuisine: string;
  servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  difficulty: Difficulty;
  ingredients: IngredientInput[];
  instructions: InstructionInput[];
  tags: string[];
  dietary_info: string[];
  chef_tips?: string[];
  substitutions?: SubstitutionInput[];
}

// ============================================
// Nutrition Data
// ============================================

export interface NutritionData {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

// Ingredient with an ID (generated server-side) and nutrition data
export interface IngredientWithNutrition {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  notes?: string;
  nutrition: NutritionData;
}

export interface NutritionBreakdownItem {
  ingredient_name: string;
  calories: number;
  percentage_of_total: number;
}

// ============================================
// Structured Content (model sees this)
// ============================================

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

// ============================================
// Meta (widget only)
// ============================================

export interface RecipeMeta {
  recipe: {
    name: string;
    description: string;
    cuisine: string;
    servings: number;
    prep_time_minutes: number;
    cook_time_minutes: number;
    difficulty: Difficulty;
    ingredients: IngredientWithNutrition[];
    instructions: InstructionInput[];
    tags: string[];
    dietary_info: string[];
    chef_tips?: string[];
    substitutions?: SubstitutionInput[];
  };
  nutrition_per_serving: NutritionData;
  nutrition_breakdown: NutritionBreakdownItem[];
}

// ============================================
// Shopping List
// ============================================

export interface ShoppingListInput {
  recipe_name: string;
  original_servings: number;
  desired_servings: number;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    category: IngredientCategory;
  }>;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  display: string;
  checked: boolean;
}

export interface ShoppingListSection {
  name: string;
  category: IngredientCategory;
  emoji: string;
  order: number;
  items: ShoppingListItem[];
}

export interface ShoppingListResult {
  recipe_name: string;
  servings: number;
  sections: ShoppingListSection[];
  total_items: number;
}
