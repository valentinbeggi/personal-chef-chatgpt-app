import "@/index.css";

import { useState, useCallback, useMemo, useEffect } from "react";
import { mountWidget, useToolOutput, useToolResponseMetadata, useOpenAiGlobal, useCallTool } from "skybridge/web";
import { Maximize2, Minimize2, PictureInPicture2 } from "lucide-react";

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
  ShoppingItem,
  IngredientCategory,
} from "@/types";

type DisplayMode = "inline" | "pip" | "fullscreen";

type ShoppingListToolArgs = {
  recipe_name: string;
  original_servings: number;
  desired_servings: number;
  ingredients: Array<{
    id: string;
    englishName: string;
    displayName: string;
    quantity: number;
    unit: string;
    category: IngredientCategory;
  }>;
  [key: string]: unknown;
};

interface ShoppingListToolResponse {
  content: { type: "text"; text: string }[];
  structuredContent: {
    recipe_name: string;
    servings: number;
    sections: Array<{
      name: string;
      category: IngredientCategory;
      emoji: string;
      order: number;
      items: Array<{
        id: string;
        name: string;
        quantity: number;
        unit: string;
        display: string;
        checked: boolean;
      }>;
    }>;
    total_items: number;
  };
  isError: boolean;
  result: string;
  meta: Record<string, unknown>;
}

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

  const { callToolAsync, isPending: isShoppingListLoading } = useCallTool<
    ShoppingListToolArgs,
    ShoppingListToolResponse
  >("generate_shopping_list");

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

  useEffect(() => {
    window.openai?.setWidgetState?.({
      activeTab,
      unitSystem,
      servings,
    });
  }, [activeTab, unitSystem, servings]);

  const handleElevate = useCallback(
    (customization?: string) => {
      if (!meta?.recipe.name) return;

      const prompt = customization
        ? `Elevate ${meta.recipe.name} to chef-level, but with this change: "${customization}". This overrides core ingredients/concept if specified. Call the "recipe" widget with the new recipe.`
        : `Elevate ${meta.recipe.name} to chef-level with premium ingredients and advanced techniques. Call the "recipe" widget with the new recipe.`;

      window.openai?.sendFollowUpMessage?.({ prompt });
    },
    [meta?.recipe.name],
  );

  const handleSimplify = useCallback(
    (customization?: string) => {
      if (!meta?.recipe.name) return;

      const prompt = customization
        ? `Simplify ${meta.recipe.name} for beginners, but with this change: "${customization}". This overrides core ingredients/concept if specified. Call the "recipe" widget with the new recipe.`
        : `Simplify ${meta.recipe.name} for beginners with fewer ingredients and simpler techniques. Call the "recipe" widget with the new recipe.`;

      window.openai?.sendFollowUpMessage?.({ prompt });
    },
    [meta?.recipe.name],
  );

  const handleShoppingList = useCallback(async () => {
    if (!meta?.recipe) return;

    try {
      const result = await callToolAsync({
        recipe_name: meta.recipe.name,
        original_servings: meta.recipe.servings,
        desired_servings: effectiveServings,
        ingredients: meta.recipe.ingredients.map((i) => ({
          id: i.id,
          englishName: i.englishName,
          displayName: i.displayName,
          quantity: i.quantity,
          unit: i.unit,
          category: i.category,
        })),
      });

      if (result?.structuredContent) {
        const serverList = result.structuredContent;

        const transformedList: ShoppingList = {
          recipe_name: serverList.recipe_name,
          servings: serverList.servings,
          sections: serverList.sections.map((section) => ({
            name: section.name,
            category: section.category,
            emoji: section.emoji,
            order: section.order,
            items: section.items.map(
              (item): ShoppingItem => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                display: item.display,
                checked: item.checked,
              }),
            ),
          })),
        };

        setShoppingList(transformedList);
        setView("shopping-list");
      }
    } catch (error) {
      console.error("Failed to generate shopping list:", error);
    }
  }, [meta?.recipe, effectiveServings, callToolAsync]);

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
        <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 bg-card rounded-2xl border border-border">
          <Spinner variant="circle-filled" className="w-8 h-8 text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Preparing your recipe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(themeClass, "relative")}>
      {/* Display Mode Controls */}
      <div
        className={cn(
          "absolute top-3 right-3 z-50 flex items-center gap-1",
          "bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 p-1",
          "shadow-lg",
        )}
      >
        {/* PiP Toggle */}
        <button
          onClick={handleTogglePip}
          className={cn(
            "p-2 rounded-md transition-all",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            currentMode === "pip" && "bg-primary/10 text-primary",
          )}
          title={currentMode === "pip" ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
        >
          <PictureInPicture2 className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={handleToggleFullscreen}
          className={cn(
            "p-2 rounded-md transition-all",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            currentMode === "fullscreen" && "bg-primary/10 text-primary",
          )}
          title={currentMode === "fullscreen" ? "Exit Fullscreen" : "Fullscreen"}
        >
          {currentMode === "fullscreen" ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {view === "recipe" ? (
        <RecipeCard
          recipe={meta.recipe}
          meta={meta}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unitSystem={unitSystem}
          onUnitSystemChange={setUnitSystem}
          servings={effectiveServings}
          onServingsChange={handleServingsChange}
          onElevate={handleElevate}
          onSimplify={handleSimplify}
          onShoppingList={handleShoppingList}
          isShoppingListLoading={isShoppingListLoading}
          messages={messages}
        />
      ) : shoppingList ? (
        <ShoppingListView
          shoppingList={shoppingList}
          onBackToRecipe={handleBackToRecipe}
          onSendEmail={handleSendEmail}
          isEmailSending={isEmailSending}
          messages={messages}
        />
      ) : null}
    </div>
  );
}

export default RecipeWidget;

mountWidget(<RecipeWidget />);
