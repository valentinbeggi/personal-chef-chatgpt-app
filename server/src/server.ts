import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { McpServer } from "skybridge/server";
import { Resend } from "resend";
import { env } from "./env.js";
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

const resend = new Resend(env.RESEND_API_KEY);

const server = new McpServer(
  {
    name: "personal-chef",
    version: "1.0.0",
  },
  { capabilities: {} },
);

const ingredientSchema = z.object({
  englishName: z
    .string()
    .describe(
      "Ingredient name in English (required for USDA nutrition API lookup, e.g., 'chicken breast', 'olive oil').",
    ),
  quantity: z.number().describe("Quantity of the ingredient"),
  unit: z.string().describe("Unit of measurement (e.g., cups, tbsp, lbs, pieces)"),
  category: z
    .enum(["produce", "meat_seafood", "dairy_eggs", "bakery", "frozen", "pantry", "spices"])
    .describe("Store section category for shopping list organization"),
  notes: z.string().optional().describe("Optional preparation notes (e.g., 'diced', 'minced')"),
  displayName: z
    .string()
    .describe(
      "Ingredient name to display to the user (in user's language, e.g., 'poitrine de poulet', 'huile d'olive').",
    ),
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
      "Use this tool when the user asks for a recipe. Generate a complete recipe with all ingredients, step-by-step instructions, and cooking details. The recipe will be displayed as an interactive card with nutrition information fetched from a real API. IMPORTANT: For each ingredient, 'englishName' MUST be in English (for USDA nutrition API), while 'displayName' should be in the user's language. All other recipe text (description, instructions, tips, etc.) should be in the user's language.",
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
    console.log("input", input);
    try {
      const ingredientsWithNutrition: IngredientWithNutrition[] = await Promise.all(
        input.ingredients.map(async (ing, index) => {
          const nutrition = await getNutritionData(ing.englishName, ing.quantity, ing.unit);
          const id = `ing-${index}-${ing.englishName.toLowerCase().replace(/\s+/g, "-")}`;
          return {
            id,
            englishName: ing.englishName,
            quantity: ing.quantity,
            unit: ing.unit,
            category: ing.category,
            notes: ing.notes,
            displayName: ing.displayName,
            nutrition,
          };
        }),
      );

      const allNutrition = ingredientsWithNutrition.map((ing) => ing.nutrition);
      const totalNutrition = sumNutrition(allNutrition);
      const nutritionPerServing = calculatePerServing(totalNutrition, input.servings);

      const nutritionBreakdown: NutritionBreakdownItem[] = ingredientsWithNutrition
        .filter((ing) => ing.nutrition.calories > 0)
        .map((ing) => ({
          ingredient_name: ing.displayName,
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
          englishName: z.string().describe("English ingredient name"),
          displayName: z.string().describe("Localized ingredient name for display"),
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
          name: ing.displayName,
          quantity: scaledQuantity,
          unit: ing.unit,
          display: `${displayQuantity} ${ing.unit} ${ing.displayName}`,
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

server.tool(
  "send_shopping_list_email",
  "Sends the shopping list to an email address.",
  {
    email: z.string().email().describe("Email address to send the shopping list to"),
    recipe_name: z.string().describe("Name of the recipe"),
    servings: z.number().describe("Number of servings"),
    sections: z
      .array(
        z.object({
          name: z.string(),
          emoji: z.string(),
          items: z.array(
            z.object({
              display: z.string(),
              checked: z.boolean(),
            }),
          ),
        }),
      )
      .describe("Shopping list sections with items"),
  },
  async ({ email, recipe_name, servings, sections }): Promise<CallToolResult> => {
    try {
      if (!env.RESEND_API_KEY) {
        return {
          content: [{ type: "text", text: "Email service not configured. Please set RESEND_API_KEY." }],
          isError: true,
        };
      }

      // Build HTML email
      const sectionsHtml = sections
        .map(
          (section) => `
          <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #374151;">
              ${section.emoji} ${section.name}
            </h3>
            <ul style="margin: 0; padding: 0; list-style: none;">
              ${section.items
                .map(
                  (item) => `
                <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: ${item.checked ? "#9ca3af" : "#1f2937"}; ${item.checked ? "text-decoration: line-through;" : ""}">
                  ${item.checked ? "✓" : "☐"} ${item.display}
                </li>
              `,
                )
                .join("")}
            </ul>
          </div>
        `,
        )
        .join("");

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="margin: 0; font-size: 24px; color: #1f2937;">🛒 Shopping List</h1>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
                ${recipe_name} • ${servings} servings
              </p>
            </div>
            ${sectionsHtml}
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
              Sent from Personal Chef App
            </div>
          </body>
        </html>
      `;

      // Build plain text version
      const plainText = sections
        .map((section) => {
          const items = section.items.map((item) => `  ${item.checked ? "✓" : "☐"} ${item.display}`).join("\n");
          return `${section.emoji} ${section.name}\n${items}`;
        })
        .join("\n\n");

      const { error } = await resend.emails.send({
        from: "Personal Chef <onboarding@resend.dev>",
        to: email,
        subject: `🛒 Shopping List: ${recipe_name}`,
        html,
        text: `Shopping List - ${recipe_name}\n${servings} servings\n\n${plainText}`,
      });

      if (error) {
        return {
          content: [{ type: "text", text: `Failed to send email: ${error.message}` }],
          isError: true,
        };
      }

      return {
        structuredContent: { success: true, email },
        content: [{ type: "text", text: `Shopping list sent to ${email}` }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error sending email: ${error}` }],
        isError: true,
      };
    }
  },
);

export default server;
