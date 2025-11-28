import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { McpServer } from "skybridge/server";
import { getNutritionData, sumNutrition, calculatePerServing } from "./services/nutrition-api.js";
import type {
  RecipeInput,
  IngredientWithNutrition,
  RecipeStructuredContent,
  RecipeMeta,
  NutritionBreakdownItem,
  ShoppingListSection,
  ShoppingListResult,
  IngredientCategory,
} from "./types/index.js";

const server = new McpServer(
  {
    name: "personal-chef-app",
    version: "1.0.0",
  },
  { capabilities: {} },
);

const ingredientSchema = z.object({
  name: z.string().describe("Ingredient name"),
  quantity: z.number().describe("Quantity of the ingredient"),
  unit: z.string().describe("Unit of measurement (e.g., cups, tbsp, lbs, pieces)"),
  category: z
    .enum(["produce", "meat_seafood", "dairy_eggs", "bakery", "frozen", "pantry", "spices"])
    .describe("Store section category for shopping list organization"),
  notes: z.string().optional().describe("Optional preparation notes (e.g., 'diced', 'minced')"),
});

const instructionSchema = z.object({
  step: z.number().describe("Step number"),
  text: z.string().describe("Instruction text"),
  time_minutes: z.number().optional().describe("Time for this step in minutes"),
  tip: z.string().optional().describe("Optional tip for this step"),
});

const substitutionSchema = z.object({
  original: z.string().describe("Original ingredient"),
  substitute: z.string().describe("Substitute ingredient"),
  notes: z.string().optional().describe("Notes about the substitution"),
});

server.widget(
  "recipe",
  {
    description: "Interactive recipe card with nutrition info, ingredients, and instructions",
  },
  {
    description:
      "Use this tool when the user asks for a recipe. Generate a complete recipe with all ingredients, step-by-step instructions, and cooking details. The recipe will be displayed as an interactive card with nutrition information fetched from a real API.",
    inputSchema: {
      name: z.string().describe("Recipe name"),
      description: z.string().describe("Brief description of the dish"),
      cuisine: z.string().describe("Cuisine type (e.g., Italian, Mexican, Asian)"),
      servings: z.number().describe("Number of servings"),
      prep_time_minutes: z.number().describe("Preparation time in minutes"),
      cook_time_minutes: z.number().describe("Cooking time in minutes"),
      difficulty: z.enum(["easy", "medium", "hard"]).describe("Recipe difficulty level"),
      ingredients: z.array(ingredientSchema).describe("List of ingredients with quantities and categories"),
      instructions: z.array(instructionSchema).describe("Step-by-step cooking instructions"),
      tags: z.array(z.string()).describe("Recipe tags (e.g., 'quick', 'healthy', 'comfort food')"),
      dietary_info: z.array(z.string()).describe("Dietary information (e.g., 'gluten-free', 'vegetarian', 'low-carb')"),
      chef_tips: z.array(z.string()).optional().describe("Optional chef tips for best results"),
      substitutions: z.array(substitutionSchema).optional().describe("Optional ingredient substitutions"),
    },
  },
  async (input: RecipeInput): Promise<CallToolResult> => {
    try {
      const ingredientsWithNutrition: IngredientWithNutrition[] = await Promise.all(
        input.ingredients.map(async (ing, index) => {
          const nutrition = await getNutritionData(ing.name, ing.quantity, ing.unit);
          const id = `ing-${index}-${ing.name.toLowerCase().replace(/\s+/g, "-")}`;
          return { ...ing, id, nutrition };
        }),
      );

      const allNutrition = ingredientsWithNutrition.map((ing) => ing.nutrition);
      const totalNutrition = sumNutrition(allNutrition);
      const nutritionPerServing = calculatePerServing(totalNutrition, input.servings);

      const nutritionBreakdown: NutritionBreakdownItem[] = ingredientsWithNutrition
        .filter((ing) => ing.nutrition.calories > 0)
        .map((ing) => ({
          ingredient_name: ing.name,
          calories: ing.nutrition.calories,
          percentage_of_total:
            totalNutrition.calories > 0 ? Math.round((ing.nutrition.calories / totalNutrition.calories) * 100) : 0,
        }))
        .sort((a, b) => b.percentage_of_total - a.percentage_of_total);

      const structuredContent: RecipeStructuredContent = {
        name: input.name,
        description: input.description,
        cuisine: input.cuisine,
        total_time_minutes: input.prep_time_minutes + input.cook_time_minutes,
        servings: input.servings,
        difficulty: input.difficulty,
        nutrition_per_serving: nutritionPerServing,
        ingredient_count: input.ingredients.length,
        tags: input.tags,
        dietary_info: input.dietary_info,
      };

      const meta: RecipeMeta = {
        recipe: {
          name: input.name,
          description: input.description,
          cuisine: input.cuisine,
          servings: input.servings,
          prep_time_minutes: input.prep_time_minutes,
          cook_time_minutes: input.cook_time_minutes,
          difficulty: input.difficulty,
          ingredients: ingredientsWithNutrition,
          instructions: input.instructions,
          tags: input.tags,
          dietary_info: input.dietary_info,
          chef_tips: input.chef_tips,
          substitutions: input.substitutions,
        },
        nutrition_per_serving: nutritionPerServing,
        nutrition_breakdown: nutritionBreakdown,
      };

      return {
        _meta: meta as unknown as Record<string, unknown>,
        structuredContent: structuredContent as unknown as Record<string, unknown>,
        content: [
          {
            type: "text",
            text: `${input.name}: ${input.description}. ${input.servings} servings, ${input.prep_time_minutes + input.cook_time_minutes} minutes total. ${nutritionPerServing.calories} calories per serving.`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error generating recipe: ${error}` }],
        isError: true,
      };
    }
  },
);

const SECTION_CONFIG: Record<IngredientCategory, { name: string; emoji: string; order: number }> = {
  produce: { name: "Produce", emoji: "🥬", order: 1 },
  meat_seafood: { name: "Meat & Seafood", emoji: "🥩", order: 2 },
  dairy_eggs: { name: "Dairy & Eggs", emoji: "🥛", order: 3 },
  bakery: { name: "Bakery", emoji: "🥖", order: 4 },
  frozen: { name: "Frozen", emoji: "🧊", order: 5 },
  pantry: { name: "Pantry", emoji: "🥫", order: 6 },
  spices: { name: "Spices", emoji: "🧂", order: 7 },
};

server.tool(
  "generate_shopping_list",
  "Organizes recipe ingredients into a shopping list grouped by store section. Call this from the recipe widget to generate a formatted shopping list.",
  {
    recipe_name: z.string().describe("Name of the recipe"),
    original_servings: z.number().describe("Original number of servings in the recipe"),
    desired_servings: z.number().describe("Desired number of servings to shop for"),
    ingredients: z
      .array(
        z.object({
          id: z.string().describe("Unique identifier for the ingredient"),
          name: z.string(),
          quantity: z.number(),
          unit: z.string(),
          category: z.enum(["produce", "meat_seafood", "dairy_eggs", "bakery", "frozen", "pantry", "spices"]),
        }),
      )
      .describe("List of ingredients to include in the shopping list"),
  },
  async ({ recipe_name, original_servings, desired_servings, ingredients }): Promise<CallToolResult> => {
    try {
      const scaleFactor = desired_servings / original_servings;

      const sectionMap = new Map<IngredientCategory, ShoppingListSection>();

      for (const ing of ingredients) {
        const config = SECTION_CONFIG[ing.category];

        if (!sectionMap.has(ing.category)) {
          sectionMap.set(ing.category, {
            name: config.name,
            category: ing.category,
            emoji: config.emoji,
            order: config.order,
            items: [],
          });
        }

        const scaledQuantity = Math.round(ing.quantity * scaleFactor * 100) / 100;
        const displayQuantity = formatQuantity(scaledQuantity);

        sectionMap.get(ing.category)!.items.push({
          id: ing.id,
          name: ing.name,
          quantity: scaledQuantity,
          unit: ing.unit,
          display: `${displayQuantity} ${ing.unit} ${ing.name}`,
          checked: false,
        });
      }

      const sections = Array.from(sectionMap.values()).sort((a, b) => a.order - b.order);

      const result: ShoppingListResult = {
        recipe_name,
        servings: desired_servings,
        sections,
        total_items: ingredients.length,
      };

      return {
        structuredContent: result as unknown as Record<string, unknown>,
        content: [
          {
            type: "text",
            text: `Shopping list for ${recipe_name} (${desired_servings} servings): ${ingredients.length} items across ${sections.length} store sections.`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error generating shopping list: ${error}` }],
        isError: true,
      };
    }
  },
);

function formatQuantity(quantity: number): string {
  if (quantity === Math.floor(quantity)) {
    return quantity.toString();
  }

  const fractions: Record<number, string> = {
    0.25: "¼",
    0.33: "⅓",
    0.5: "½",
    0.67: "⅔",
    0.75: "¾",
  };

  const decimal = quantity - Math.floor(quantity);
  const roundedDecimal = Math.round(decimal * 100) / 100;

  for (const [value, symbol] of Object.entries(fractions)) {
    if (Math.abs(roundedDecimal - parseFloat(value)) < 0.05) {
      const whole = Math.floor(quantity);
      return whole > 0 ? `${whole}${symbol}` : symbol;
    }
  }

  return quantity.toFixed(2).replace(/\.?0+$/, "");
}

export default server;
