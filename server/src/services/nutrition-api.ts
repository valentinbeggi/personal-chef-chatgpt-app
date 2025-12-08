import type { NutritionData } from "../types/index.js";

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_API_KEY = "iXOubyS8NOynAZ94xczNyGeXOFTj2quIFN5Egh8h"; // Free demo key, works for basic usage

interface USDAFoodNutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

interface USDAFood {
  fdcId: number;
  description: string;
  foodNutrients: USDAFoodNutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
}

interface USDASearchResponse {
  foods: USDAFood[];
  totalHits: number;
}

// USDA nutrient IDs for the data we need
const NUTRIENT_IDS = {
  calories: 1008, // Energy (kcal)
  protein: 1003, // Protein
  carbs: 1005, // Carbohydrate, by difference
  fat: 1004, // Total lipid (fat)
  fiber: 1079, // Fiber, total dietary
  sugar: 2000, // Sugars, total including NLEA
  sodium: 1093, // Sodium, Na
} as const;

/**
 * Search for a food item and get its nutrition data
 */
export async function getNutritionData(ingredientName: string, quantity: number, unit: string): Promise<NutritionData> {
  try {
    // Search for the ingredient
    const searchQuery = `${quantity} ${unit} ${ingredientName}`.trim();
    const response = await fetch(
      `${USDA_API_BASE}/foods/search?query=${encodeURIComponent(searchQuery)}&pageSize=1&api_key=${USDA_API_KEY}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      console.warn(`USDA API error for "${ingredientName}": ${response.status}`);
      return getEmptyNutrition();
    }

    const data: USDASearchResponse = await response.json();

    if (!data.foods || data.foods.length === 0) {
      console.warn(`No USDA data found for "${ingredientName}"`);
      return getEmptyNutrition();
    }

    const food = data.foods[0];
    const nutrients = extractNutrients(food.foodNutrients);

    // USDA data is typically per 100g, so we need to scale based on quantity
    // For simplicity, we'll use a rough conversion factor
    const scaleFactor = estimateScaleFactor(quantity, unit);

    return {
      calories: Math.round(nutrients.calories * scaleFactor),
      protein_g: Math.round(nutrients.protein * scaleFactor * 10) / 10,
      carbs_g: Math.round(nutrients.carbs * scaleFactor * 10) / 10,
      fat_g: Math.round(nutrients.fat * scaleFactor * 10) / 10,
      fiber_g: Math.round(nutrients.fiber * scaleFactor * 10) / 10,
      sugar_g: Math.round(nutrients.sugar * scaleFactor * 10) / 10,
      sodium_mg: Math.round(nutrients.sodium * scaleFactor),
    };
  } catch (error) {
    console.error(`Error fetching nutrition for "${ingredientName}":`, error);
    return getEmptyNutrition();
  }
}

/**
 * Extract relevant nutrients from USDA food data
 */
function extractNutrients(foodNutrients: USDAFoodNutrient[]): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
} {
  const nutrients = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  };

  for (const nutrient of foodNutrients) {
    switch (nutrient.nutrientId) {
      case NUTRIENT_IDS.calories:
        nutrients.calories = nutrient.value;
        break;
      case NUTRIENT_IDS.protein:
        nutrients.protein = nutrient.value;
        break;
      case NUTRIENT_IDS.carbs:
        nutrients.carbs = nutrient.value;
        break;
      case NUTRIENT_IDS.fat:
        nutrients.fat = nutrient.value;
        break;
      case NUTRIENT_IDS.fiber:
        nutrients.fiber = nutrient.value;
        break;
      case NUTRIENT_IDS.sugar:
        nutrients.sugar = nutrient.value;
        break;
      case NUTRIENT_IDS.sodium:
        nutrients.sodium = nutrient.value;
        break;
    }
  }

  return nutrients;
}

/**
 * Estimate scale factor to convert from USDA's per-100g basis
 * to the actual ingredient quantity
 */
function estimateScaleFactor(quantity: number, unit: string): number {
  const unitLower = unit.toLowerCase();

  // Approximate weight in grams for common units
  const gramEquivalents: Record<string, number> = {
    // Weight units
    g: 1,
    gram: 1,
    grams: 1,
    kg: 1000,
    kilogram: 1000,
    oz: 28.35,
    ounce: 28.35,
    ounces: 28.35,
    lb: 453.59,
    lbs: 453.59,
    pound: 453.59,
    pounds: 453.59,

    // Volume units (approximate for typical ingredients)
    ml: 1,
    milliliter: 1,
    l: 1000,
    liter: 1000,
    cup: 240,
    cups: 240,
    tbsp: 15,
    tablespoon: 15,
    tablespoons: 15,
    tsp: 5,
    teaspoon: 5,
    teaspoons: 5,
    fl_oz: 30,
    "fluid ounce": 30,

    // Count-based (rough averages)
    piece: 100,
    pieces: 100,
    slice: 30,
    slices: 30,
    clove: 3,
    cloves: 3,
    bunch: 100,
    head: 500,
    large: 150,
    medium: 100,
    small: 50,
    whole: 100,
  };

  const gramsPerUnit = gramEquivalents[unitLower] || 100;
  const totalGrams = quantity * gramsPerUnit;

  // USDA data is per 100g, so divide by 100
  return totalGrams / 100;
}

/**
 * Return empty nutrition data (used when API fails)
 */
function getEmptyNutrition(): NutritionData {
  return {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
  };
}

/**
 * Batch fetch nutrition data for multiple ingredients
 */
export async function getBatchNutritionData(
  ingredients: Array<{ name: string; quantity: number; unit: string }>,
): Promise<NutritionData[]> {
  // Fetch all ingredients in parallel
  const promises = ingredients.map((ing) => getNutritionData(ing.name, ing.quantity, ing.unit));

  return Promise.all(promises);
}

/**
 * Calculate total nutrition from an array of nutrition data
 */
export function sumNutrition(nutritionArray: NutritionData[]): NutritionData {
  return nutritionArray.reduce(
    (total, item) => ({
      calories: total.calories + item.calories,
      protein_g: Math.round((total.protein_g + item.protein_g) * 10) / 10,
      carbs_g: Math.round((total.carbs_g + item.carbs_g) * 10) / 10,
      fat_g: Math.round((total.fat_g + item.fat_g) * 10) / 10,
      fiber_g: Math.round((total.fiber_g + item.fiber_g) * 10) / 10,
      sugar_g: Math.round((total.sugar_g + item.sugar_g) * 10) / 10,
      sodium_mg: total.sodium_mg + item.sodium_mg,
    }),
    getEmptyNutrition(),
  );
}

/**
 * Calculate per-serving nutrition
 */
export function calculatePerServing(totalNutrition: NutritionData, servings: number): NutritionData {
  if (servings <= 0) return totalNutrition;

  return {
    calories: Math.round(totalNutrition.calories / servings),
    protein_g: Math.round((totalNutrition.protein_g / servings) * 10) / 10,
    carbs_g: Math.round((totalNutrition.carbs_g / servings) * 10) / 10,
    fat_g: Math.round((totalNutrition.fat_g / servings) * 10) / 10,
    fiber_g: Math.round((totalNutrition.fiber_g / servings) * 10) / 10,
    sugar_g: Math.round((totalNutrition.sugar_g / servings) * 10) / 10,
    sodium_mg: Math.round(totalNutrition.sodium_mg / servings),
  };
}

