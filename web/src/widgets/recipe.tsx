import "@/index.css";

import { useState, useCallback, useMemo } from "react";
import { mountWidget, useToolOutput, useToolResponseMetadata, useOpenAiGlobal, useCallTool } from "skybridge/web";
import { Maximize2, Minimize2, PictureInPicture2, ChefHat, Sparkles } from "lucide-react";

import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { RecipeCard } from "@/components/RecipeCard";
import { ShoppingListView } from "@/components/ShoppingList";
import { getMessages } from "@/i18n";
import { cn } from "@/utils";
import type {
  RecipeStructuredContent,
  RecipeMeta,
  ViewMode,
  TabId,
  UnitSystem,
  ShoppingList,
  ShoppingSection,
  IngredientCategory,
} from "@/types";

type DisplayMode = "inline" | "pip" | "fullscreen";

type SendEmailToolArgs = {
  email: string;
  recipe_name: string;
  servings: number;
  sections: Array<{
    name: string;
    emoji: string;
    items: Array<{
      display: string;
      checked: boolean;
    }>;
  }>;
};

interface SendEmailToolResponse {
  content: { type: "text"; text: string }[];
  structuredContent: { success: boolean; email: string };
  isError: boolean;
  result: string;
  meta: Record<string, unknown>;
}

const SECTION_CONFIG: Record<IngredientCategory, { name: string; emoji: string; order: number }> = {
  produce: { name: "Produce", emoji: "🥬", order: 1 },
  meat_seafood: { name: "Meat & Seafood", emoji: "🥩", order: 2 },
  dairy_eggs: { name: "Dairy & Eggs", emoji: "🥛", order: 3 },
  bakery: { name: "Bakery", emoji: "🥖", order: 4 },
  frozen: { name: "Frozen", emoji: "🧊", order: 5 },
  pantry: { name: "Pantry", emoji: "🥫", order: 6 },
  spices: { name: "Spices", emoji: "🧂", order: 7 },
};

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

function RecipeWidget() {
  const structuredContent = useToolOutput() as RecipeStructuredContent | null;
  const meta = useToolResponseMetadata() as RecipeMeta | null;
  const theme = useOpenAiGlobal("theme") as "light" | "dark" | undefined;
  const locale = useOpenAiGlobal("locale") as string | undefined;
  const displayMode = useOpenAiGlobal("displayMode") as DisplayMode | undefined;
  const widgetState = useOpenAiGlobal("widgetState") as {
    activeTab?: TabId;
    unitSystem?: UnitSystem;
    servings?: number | null;
  } | null;

  const { callToolAsync: sendEmailAsync, isPending: isEmailSending } = useCallTool<
    SendEmailToolArgs,
    SendEmailToolResponse
  >("send_shopping_list_email");

  const messages = useMemo(() => getMessages(locale || "en-US"), [locale]);
  const currentMode = displayMode ?? "pip";

  const [view, setView] = useState<ViewMode>("recipe");
  const [activeTab, setActiveTab] = useState<TabId>(widgetState?.activeTab ?? "ingredients");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(widgetState?.unitSystem ?? "imperial");
  const [servings, setServings] = useState<number | null>(widgetState?.servings ?? null);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);

  const effectiveServings = servings ?? meta?.recipe.servings ?? 4;

  const handleShoppingList = useCallback(() => {
    if (!meta?.recipe) return;

    const scaleFactor = effectiveServings / meta.recipe.servings;
    const sectionMap = new Map<IngredientCategory, ShoppingSection>();

    for (const ing of meta.recipe.ingredients) {
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

    setShoppingList({
      recipe_name: meta.recipe.name,
      servings: effectiveServings,
      sections,
    });
    setView("shopping-list");
  }, [meta?.recipe, effectiveServings]);

  const handleBackToRecipe = useCallback(() => {
    setView("recipe");
  }, []);

  const handleSendEmail = useCallback(
    async (email: string): Promise<boolean> => {
      if (!shoppingList) return false;

      try {
        const result = await sendEmailAsync({
          email,
          recipe_name: shoppingList.recipe_name,
          servings: shoppingList.servings,
          sections: shoppingList.sections.map((section) => ({
            name: section.name,
            emoji: section.emoji,
            items: section.items.map((item) => ({
              display: item.display,
              checked: item.checked,
            })),
          })),
        });

        return !result?.isError;
      } catch (error) {
        console.error("Failed to send email:", error);
        return false;
      }
    },
    [shoppingList, sendEmailAsync],
  );

  const handleServingsChange = useCallback((newServings: number) => {
    setServings(newServings);
  }, []);

  const handleRequestDisplayMode = useCallback(async (mode: DisplayMode) => {
    try {
      const result = await window.openai?.requestDisplayMode?.({ mode });
      // The host may coerce pip to fullscreen on mobile
      console.log("Display mode granted:", result?.mode);
    } catch (error) {
      console.error("Failed to change display mode:", error);
    }
  }, []);

  const handleTogglePip = useCallback(() => {
    handleRequestDisplayMode(currentMode === "pip" ? "inline" : "pip");
  }, [currentMode, handleRequestDisplayMode]);

  const handleToggleFullscreen = useCallback(() => {
    handleRequestDisplayMode(currentMode === "fullscreen" ? "inline" : "fullscreen");
  }, [currentMode, handleRequestDisplayMode]);

  const themeClass = theme === "dark" ? "dark" : "";

  if (!structuredContent || !meta) {
    return (
      <div className={themeClass}>
        <div className="relative flex flex-col items-center justify-center gap-6 py-16 px-6 bg-gradient-to-br from-card via-card to-accent/10 rounded-2xl border-2 border-primary/20 shadow-xl overflow-hidden">
          {/* Animated background steam/bubbles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute top-1/4 left-1/4 w-3 h-3 bg-primary/20 rounded-full animate-bounce"
              style={{ animationDelay: "0s", animationDuration: "2s" }}
            />
            <div
              className="absolute top-1/3 right-1/4 w-2 h-2 bg-primary/30 rounded-full animate-bounce"
              style={{ animationDelay: "0.5s", animationDuration: "2.5s" }}
            />
            <div
              className="absolute bottom-1/3 left-1/3 w-2.5 h-2.5 bg-accent/20 rounded-full animate-bounce"
              style={{ animationDelay: "1s", animationDuration: "2.2s" }}
            />
            <div
              className="absolute top-1/2 right-1/3 w-2 h-2 bg-primary/25 rounded-full animate-bounce"
              style={{ animationDelay: "1.5s", animationDuration: "2.8s" }}
            />

            {/* Steam effect */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-32">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-16 bg-gradient-to-t from-primary/10 to-transparent rounded-full blur-sm animate-pulse" />
              <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-12 bg-gradient-to-t from-primary/15 to-transparent rounded-full blur-sm animate-pulse"
                style={{ animationDelay: "0.3s" }}
              />
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-4 h-8 bg-gradient-to-t from-primary/20 to-transparent rounded-full blur-sm animate-pulse"
                style={{ animationDelay: "0.6s" }}
              />
            </div>
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="relative">
              <ChefHat className="w-12 h-12 text-primary animate-bounce" style={{ animationDuration: "1.5s" }} />
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-accent animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-base font-semibold text-foreground animate-pulse">
                🍳 Cooking up something delicious...
              </p>
              <p className="text-sm text-muted-foreground">Our chef is working their magic! ✨</p>
            </div>
            <Spinner variant="circle-filled" className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(themeClass, "relative group")}>
      {/* Animated decorative elements */}
      <div className="absolute -top-2 -left-2 w-20 h-20 opacity-10 pointer-events-none">
        <div
          className="absolute inset-0 bg-primary rounded-full blur-xl animate-pulse"
          style={{ animationDuration: "3s" }}
        />
      </div>
      <div className="absolute -bottom-2 -right-2 w-24 h-24 opacity-10 pointer-events-none">
        <div
          className="absolute inset-0 bg-accent rounded-full blur-xl animate-pulse"
          style={{ animationDelay: "1.5s", animationDuration: "3.5s" }}
        />
      </div>

      {/* Display Mode Controls */}
      <div
        className={cn(
          "absolute top-3 right-3 z-50 flex items-center gap-1",
          "bg-background/90 backdrop-blur-md rounded-xl border-2 border-primary/20 p-1.5",
          "shadow-lg shadow-primary/10",
          "transition-all duration-300",
          "hover:shadow-xl hover:shadow-primary/20 hover:border-primary/30",
          "hover:scale-105",
        )}
      >
        {/* PiP Toggle */}
        <button
          onClick={handleTogglePip}
          className={cn(
            "p-2 rounded-lg transition-all duration-200",
            "hover:bg-accent hover:text-accent-foreground hover:scale-110",
            "active:scale-95",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            currentMode === "pip" && "bg-primary/20 text-primary shadow-md shadow-primary/20",
          )}
          title={currentMode === "pip" ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
        >
          <PictureInPicture2 className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={handleToggleFullscreen}
          className={cn(
            "p-2 rounded-lg transition-all duration-200",
            "hover:bg-accent hover:text-accent-foreground hover:scale-110",
            "active:scale-95",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            currentMode === "fullscreen" && "bg-primary/20 text-primary shadow-md shadow-primary/20",
          )}
          title={currentMode === "fullscreen" ? "Exit Fullscreen" : "Fullscreen"}
        >
          {currentMode === "fullscreen" ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Recipe Card with cooking animation wrapper */}
      <div className="relative">
        {/* Subtle cooking animation overlay */}
        <div
          className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-3xl opacity-50 blur-xl animate-pulse pointer-events-none"
          style={{ animationDuration: "4s" }}
        />

        {view === "recipe" ? (
          <div className="relative">
            <RecipeCard
              recipe={meta.recipe}
              meta={meta}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              unitSystem={unitSystem}
              onUnitSystemChange={setUnitSystem}
              servings={effectiveServings}
              onServingsChange={handleServingsChange}
              onShoppingList={handleShoppingList}
              messages={messages}
            />
          </div>
        ) : shoppingList ? (
          <div className="relative transform transition-all duration-300">
            <ShoppingListView
              shoppingList={shoppingList}
              onBackToRecipe={handleBackToRecipe}
              onSendEmail={handleSendEmail}
              isEmailSending={isEmailSending}
              messages={messages}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default RecipeWidget;

mountWidget(<RecipeWidget />);
