# Personal Chef App - ChatGPT Apps SDK Implementation Plan

> **Framework:** Skybridge (TypeScript framework for ChatGPT Apps)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Server (skybridge/server)](#server-skybridgeserver)
4. [Frontend (skybridge/web)](#frontend-skybridgeweb)
5. [Widget State Management](#widget-state-management)
6. [Component Design](#component-design)
7. [Localization](#localization)
8. [Project Structure](#project-structure)

---

## Overview

A personal chef ChatGPT App that helps users:

- Generate recipes based on preferences, constraints, and available ingredients
- View detailed nutritional information (enriched via Nutrition API)
- Adjust recipes: elevate (chef-level) or simplify (beginner-friendly)
- Generate organized shopping lists by store section
- Scale servings and convert between imperial/metric units

### Tech Stack

| Layer         | Technology                                          |
| ------------- | --------------------------------------------------- |
| Server        | `skybridge/server` (drop-in MCP server replacement) |
| Frontend      | `skybridge/web` (React hooks + Vite plugin)         |
| Styling       | Tailwind CSS                                        |
| Localization  | react-intl                                          |
| Nutrition API | Edamam or Nutritionix                               |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User: "Quick high-protein dinner with chicken"                             │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ChatGPT Model                                                        │   │
│  │ • Generates complete recipe (name, ingredients, steps, tips)         │   │
│  │ • Calls generate_recipe tool with recipe data                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Skybridge MCP Server                                                 │   │
│  │ • server.widget("recipe", ...) handles the tool call                 │   │
│  │ • Calls Nutrition API for each ingredient                            │   │
│  │ • Returns structuredContent + _meta                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Recipe Widget (web/src/widgets/recipe.tsx)                           │   │
│  │ • useToolOutput() → structuredContent                                │   │
│  │ • useToolResponseMetadata() → _meta                                  │   │
│  │ • useCallTool() → call generate_shopping_list                        │   │
│  │ • useOpenAiGlobal("theme" | "locale") → adapt UI                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│              ┌───────────────┼───────────────┐                              │
│              ▼               ▼               ▼                              │
│        [Elevate]       [Simplify]    [Shopping List]                        │
│              │               │               │                              │
│              ▼               ▼               ▼                              │
│   window.openai.         window.openai.    useCallTool()                    │
│   sendFollowUpMessage    sendFollowUpMessage  (widget-initiated)            │
│   (model regenerates)    (model regenerates)                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision                           | Rationale                                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| **Stateless Server**               | No recipe storage. Widget keeps recipe in local state for subsequent operations. |
| **Model-Driven Adjustments**       | Elevate/Simplify use `sendFollowUpMessage` so ChatGPT can creatively regenerate. |
| **Widget-Initiated Shopping List** | Uses `useCallTool` hook - no model involvement, just server formatting.          |
| **Skybridge Framework**            | Simplifies widget registration and provides React hooks out of the box.          |

---

## Server (skybridge/server)

### Setup

```typescript
import { McpServer } from "skybridge/server";

const server = new McpServer({
  name: "personal-chef-app",
  version: "1.0.0",
});

export default server;
```

### Widget: `recipe`

Registered with `server.widget()` - this creates both the tool AND links it to a widget.

| Property               | Value                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Widget Name**        | `"recipe"` (matches `web/src/widgets/recipe.tsx`)                                                                                                                                                       |
| **Tool Description**   | "Use this when user asks for a recipe. Generate complete recipe with ingredients and instructions."                                                                                                     |
| **Input Schema (Zod)** | `name`, `description`, `cuisine`, `servings`, `prep_time_minutes`, `cook_time_minutes`, `difficulty`, `ingredients[]`, `instructions[]`, `tags[]`, `dietary_info[]`, `chef_tips[]?`, `substitutions[]?` |

#### Handler Logic

1. Receive model-generated recipe data as input
2. For each ingredient → call Nutrition API (Edamam/Nutritionix)
3. Calculate per-serving nutrition totals
4. Calculate breakdown by ingredient (percentage of calories)
5. Return response:

| Response Field      | Purpose                          | Who Sees It    |
| ------------------- | -------------------------------- | -------------- |
| `structuredContent` | Summary data for model narration | Model + Widget |
| `_meta`             | Full recipe + detailed nutrition | Widget only    |
| `content`           | Text description                 | Model only     |

#### structuredContent (model sees this)

```typescript
{
  name: string,
  description: string,
  total_time_minutes: number,
  servings: number,
  difficulty: "easy" | "medium" | "hard",
  nutrition_per_serving: { calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg },
  ingredient_count: number,
  tags: string[],
  dietary_info: string[]
}
```

#### \_meta (widget only)

```typescript
{
  recipe: {
    // Full recipe with ingredients enriched with nutrition data
    ingredients: Array<{ ...original, nutrition: { calories, protein_g, carbs_g, fat_g } }>
  },
  nutrition_per_serving: { ... },
  nutrition_breakdown: Array<{ ingredient_name, calories, percentage_of_total }>
}
```

---

### Tool: `generate_shopping_list`

Registered with `server.tool()` - regular MCP tool, callable from widget.

| Property         | Value                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| **Tool Name**    | `"generate_shopping_list"`                                                    |
| **Description**  | "Organizes recipe ingredients into a shopping list grouped by store section." |
| **Input Schema** | `recipe_name`, `original_servings`, `desired_servings`, `ingredients[]`       |

#### Handler Logic

1. Calculate scale factor (`desired_servings / original_servings`)
2. Scale all quantities
3. Group ingredients by category
4. Sort sections by typical store layout order
5. Return formatted shopping list

#### Section Order

| Order | Category       | Emoji |
| ----- | -------------- | ----- |
| 1     | Produce        | 🥬    |
| 2     | Meat & Seafood | 🥩    |
| 3     | Dairy & Eggs   | 🥛    |
| 4     | Bakery         | 🥖    |
| 5     | Frozen         | 🧊    |
| 6     | Pantry         | 🥫    |
| 7     | Spices         | 🧂    |

---

### Nutrition API Service

> **Important:** Use a real public API for nutrition data. Do NOT use hardcoded/mock values.

| API Option                    | Pros                                            | Cons                  | Recommendation      |
| ----------------------------- | ----------------------------------------------- | --------------------- | ------------------- |
| **Edamam Nutrition Analysis** | Good free tier, parses natural language         | Rate limited          | ✅ Recommended      |
| **Nutritionix**               | Excellent parsing                               | Paid after free tier  | Alternative         |
| **USDA FoodData Central**     | Free, comprehensive, no API key for basic usage | Requires more parsing | ✅ Best for no-auth |

#### Implementation Notes

1. **Primary Choice: USDA FoodData Central** - Use this API as it's completely free and requires no API key for basic searches
   - Endpoint: `https://api.nal.usda.gov/fdc/v1/foods/search`
   - Supports natural language ingredient search
   - Returns comprehensive nutrition data (calories, protein, carbs, fat, fiber, sugar, sodium)

2. **Fallback: Edamam** - If USDA doesn't return good results, can fall back to Edamam (requires free API key)

3. **Error Handling:** If API fails, return zeroed nutrition data but log warning - don't block recipe generation

**Function:** `getNutritionData(ingredientName, quantity, unit) → NutritionData`

```typescript
// Example USDA API call
const response = await fetch(
  `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(ingredient)}&pageSize=1&api_key=DEMO_KEY`,
);
```

---

## Frontend (skybridge/web)

### Vite Configuration

```typescript
import { defineConfig } from "vite";
import { skybridge } from "skybridge/web";

export default defineConfig({
  plugins: [skybridge()],
});
```

The Skybridge Vite plugin handles widget bundling automatically.

---

### Widget Entry Point

**File:** `web/src/widgets/recipe.tsx`

Must match the widget name registered on server (`"recipe"`).

```typescript
import { mountWidget } from "skybridge/web";

function RecipeWidget() {
  // Widget implementation
}

mountWidget(<RecipeWidget />);
```

---

### Skybridge Hooks

| Hook                        | Purpose                                    | Returns                                  |
| --------------------------- | ------------------------------------------ | ---------------------------------------- |
| `useToolOutput()`           | Get `structuredContent` from tool response | Recipe summary data                      |
| `useToolResponseMetadata()` | Get `_meta` from tool response             | Full recipe + nutrition breakdown        |
| `useOpenAiGlobal("theme")`  | Get current theme                          | `"light"` \| `"dark"`                    |
| `useOpenAiGlobal("locale")` | Get user's locale                          | `"en-US"`, `"fr-FR"`, etc.               |
| `useCallTool("toolName")`   | Call a tool from widget                    | `{ callTool, callToolAsync, isPending }` |

---

### Hook Usage by Feature

#### Initial Render

| Hook                        | Data Retrieved                                                |
| --------------------------- | ------------------------------------------------------------- |
| `useToolOutput()`           | Recipe name, description, nutrition summary, tags             |
| `useToolResponseMetadata()` | Full ingredients list with nutrition, instructions, breakdown |
| `useOpenAiGlobal("theme")`  | Apply dark/light mode styles                                  |
| `useOpenAiGlobal("locale")` | Select language for UI strings                                |

#### Elevate / Simplify Buttons

**Mechanism:** `window.openai.sendFollowUpMessage({ prompt })`

- Sends a message to ChatGPT as if user typed it
- Model regenerates recipe and calls `generate_recipe` tool again
- Widget re-renders with new data

| Action   | Prompt                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------- |
| Elevate  | "Elevate this [recipe name] to be chef-level with premium ingredients and advanced techniques..." |
| Simplify | "Simplify this [recipe name] for a beginner with fewer ingredients and easier techniques..."      |

#### Shopping List Button

**Mechanism:** `useCallTool("generate_shopping_list")`

```typescript
const { callToolAsync, isPending } = useCallTool("generate_shopping_list");

// On button click:
const result = await callToolAsync({
  recipe_name: recipe.name,
  original_servings: recipe.servings,
  desired_servings: recipe.servings * servingsMultiplier,
  ingredients: recipe.ingredients.map((i) => ({ name, quantity, unit, category })),
});

// result.structuredContent contains the formatted shopping list
```

- Does NOT create a chat message
- Direct server call, returns structured data
- Widget updates local state to show shopping list view

---

## Widget State Management

### State Structure

```typescript
interface WidgetState {
  // View
  view: "recipe" | "shopping-list";
  activeTab: "ingredients" | "instructions" | "nutrition";

  // Preferences
  preferences: {
    unitSystem: "imperial" | "metric";
    servingsMultiplier: number; // 1 = original, 1.5 = 150%, etc.
  };

  // Shopping list (populated after callTool)
  shoppingList?: {
    sections: Array<{
      name: string;
      emoji: string;
      items: Array<{ name; quantity; unit; display; checked }>;
    }>;
  };
}
```

### State Flow

| Action              | State Change                                                    |
| ------------------- | --------------------------------------------------------------- |
| Tab click           | `activeTab` updates                                             |
| Toggle units        | `preferences.unitSystem` toggles                                |
| Adjust servings +/- | `preferences.servingsMultiplier` changes                        |
| Click Shopping List | `callTool` → `shoppingList` populated, `view` = "shopping-list" |
| Check item          | `shoppingList.sections[i].items[j].checked` toggles             |
| Back to Recipe      | `view` = "recipe"                                               |

### Data Sources

| Data                 | Source                      | Persisted?              |
| -------------------- | --------------------------- | ----------------------- |
| Recipe content       | `useToolResponseMetadata()` | No (from tool response) |
| Nutrition summary    | `useToolOutput()`           | No (from tool response) |
| View/tab/preferences | React `useState`            | No (session only)       |
| Shopping list        | `useCallTool` result        | No (session only)       |

---

## Component Design

### RecipeCard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER                                                          │
│ • Recipe name, description                                      │
│ • Time, servings, difficulty, calories                          │
│ • Tags (dietary info)                                           │
├─────────────────────────────────────────────────────────────────┤
│ TAB BAR                                                         │
│ [Ingredients] [Instructions] [Nutrition]                        │
├─────────────────────────────────────────────────────────────────┤
│ TAB CONTENT                                                     │
│ • Ingredients: grouped by category, with calories               │
│ • Instructions: numbered steps with time and tips               │
│ • Nutrition: macro cards + breakdown chart                      │
├─────────────────────────────────────────────────────────────────┤
│ ACTIONS                                                         │
│ [✨ Elevate] [🎯 Simplify] [🛒 Shopping List]                   │
├─────────────────────────────────────────────────────────────────┤
│ SETTINGS BAR                                                    │
│ Units: [Imperial/Metric]     Servings: [-] 4 [+]               │
└─────────────────────────────────────────────────────────────────┘
```

### ShoppingList Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER                                                          │
│ 🛒 Shopping List                                                │
│ Recipe name • X servings • Y/Z items checked                    │
├─────────────────────────────────────────────────────────────────┤
│ SECTIONS (grouped by store aisle)                               │
│                                                                 │
│ 🥬 PRODUCE                                                      │
│ ☐ 2 lemons                                                     │
│ ☑ 1 head garlic                                                │
│                                                                 │
│ 🥩 MEAT & SEAFOOD                                               │
│ ☐ 1.5 lbs chicken breast                                       │
│                                                                 │
│ ... more sections ...                                           │
├─────────────────────────────────────────────────────────────────┤
│ ACTIONS                                                         │
│ [📋 Copy List] [← Back to Recipe]                               │
└─────────────────────────────────────────────────────────────────┘
```

### Component Tree

```
RecipeWidget
├── RecipeCard (view === "recipe")
│   ├── RecipeHeader
│   ├── TabBar
│   ├── IngredientsTab | InstructionsTab | NutritionTab
│   ├── RecipeActions
│   └── SettingsBar
│
└── ShoppingListView (view === "shopping-list")
    ├── ShoppingListHeader
    ├── ShoppingListSections
    └── ShoppingListActions
```

---

## Localization

### Strategy

| Aspect                | Approach                            |
| --------------------- | ----------------------------------- |
| **UI Strings**        | react-intl with JSON message files  |
| **Locale Detection**  | `useOpenAiGlobal("locale")`         |
| **Number Formatting** | `Intl.NumberFormat(locale)`         |
| **Unit Conversion**   | Custom utility (imperial ↔ metric) |

### Supported Locales

| Locale  | Language          |
| ------- | ----------------- |
| `en-US` | English (default) |
| `fr-FR` | French            |
| `es-ES` | Spanish           |

### Message Categories

| Category              | Examples                                    |
| --------------------- | ------------------------------------------- |
| `tabs.*`              | Ingredients, Instructions, Nutrition        |
| `labels.*`            | servings, minutes, Calories, Protein, etc.  |
| `actions.*`           | Elevate, Simplify, Shopping List, Copy List |
| `shopping.sections.*` | Produce, Meat & Seafood, Dairy, etc.        |
| `units.*`             | Imperial, Metric                            |
| `difficulty.*`        | Easy, Medium, Hard                          |

### Unit Conversion

| Imperial | Metric | Factor         |
| -------- | ------ | -------------- |
| lbs      | kg     | × 0.453592     |
| oz       | g      | × 28.3495      |
| cups     | ml     | × 236.588      |
| tbsp     | ml     | × 14.787       |
| tsp      | ml     | × 4.929        |
| °F       | °C     | (F - 32) × 5/9 |

---

## Project Structure

```
personal-chef-app/
│
├── server/
│   ├── src/
│   │   ├── index.ts              # McpServer setup + widget/tool registration
│   │   └── services/
│   │       └── nutrition-api.ts  # Edamam/Nutritionix client
│   ├── package.json
│   └── tsconfig.json
│
├── web/
│   ├── src/
│   │   ├── widgets/
│   │   │   └── recipe.tsx        # Main widget entry (mountWidget)
│   │   ├── components/
│   │   │   ├── RecipeCard/
│   │   │   │   ├── RecipeCard.tsx
│   │   │   │   ├── RecipeHeader.tsx
│   │   │   │   ├── TabBar.tsx
│   │   │   │   ├── IngredientsTab.tsx
│   │   │   │   ├── InstructionsTab.tsx
│   │   │   │   ├── NutritionTab.tsx
│   │   │   │   ├── RecipeActions.tsx
│   │   │   │   └── SettingsBar.tsx
│   │   │   └── ShoppingList/
│   │   │       └── ShoppingList.tsx
│   │   ├── i18n/
│   │   │   ├── index.ts
│   │   │   ├── en-US.json
│   │   │   ├── fr-FR.json
│   │   │   └── es-ES.json
│   │   ├── utils/
│   │   │   └── units.ts          # Unit conversion helpers
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript interfaces
│   │   └── index.css             # Tailwind imports
│   ├── vite.config.ts            # skybridge() plugin
│   ├── package.json
│   └── tsconfig.json
│
├── package.json                   # Workspace root (if monorepo)
└── README.md
```

---

## Summary Table

| Feature           | Server                                  | Frontend Hook                                  | UI Component     |
| ----------------- | --------------------------------------- | ---------------------------------------------- | ---------------- |
| Generate recipe   | `server.widget("recipe")`               | `useToolOutput()`, `useToolResponseMetadata()` | RecipeCard       |
| View ingredients  | —                                       | Data from `_meta.recipe.ingredients`           | IngredientsTab   |
| View instructions | —                                       | Data from `_meta.recipe.instructions`          | InstructionsTab  |
| View nutrition    | —                                       | Data from `_meta.nutrition_breakdown`          | NutritionTab     |
| Elevate recipe    | —                                       | `window.openai.sendFollowUpMessage()`          | RecipeActions    |
| Simplify recipe   | —                                       | `window.openai.sendFollowUpMessage()`          | RecipeActions    |
| Shopping list     | `server.tool("generate_shopping_list")` | `useCallTool()`                                | ShoppingListView |
| Scale servings    | —                                       | Local state                                    | SettingsBar      |
| Toggle units      | —                                       | Local state                                    | SettingsBar      |
| Theme adaptation  | —                                       | `useOpenAiGlobal("theme")`                     | Root component   |
| Localization      | —                                       | `useOpenAiGlobal("locale")`                    | IntlProvider     |
