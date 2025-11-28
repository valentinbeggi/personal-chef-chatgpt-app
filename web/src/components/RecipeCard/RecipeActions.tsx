import { cn } from "@/utils";
import { Sparkles, Target, ShoppingCart, Loader2 } from "lucide-react";

interface RecipeActionsProps {
  recipeName: string;
  onElevate: () => void;
  onSimplify: () => void;
  onShoppingList: () => void;
  isShoppingListLoading: boolean;
  messages: Record<string, string>;
}

export function RecipeActions({
  recipeName,
  onElevate,
  onSimplify,
  onShoppingList,
  isShoppingListLoading,
  messages,
}: RecipeActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
      {/* Elevate Button */}
      <button
        onClick={onElevate}
        className={cn(
          "flex-1 min-w-[100px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
          "text-sm font-medium transition-all",
          "bg-gradient-to-r from-violet-500 to-purple-600 text-white",
          "hover:from-violet-600 hover:to-purple-700 hover:shadow-md hover:shadow-purple-500/25",
          "active:scale-[0.98]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
        )}
        title={`Elevate ${recipeName} to chef-level with premium ingredients and advanced techniques`}
      >
        <Sparkles className="w-4 h-4" />
        <span>{messages["actions.elevate"]}</span>
      </button>

      {/* Simplify Button */}
      <button
        onClick={onSimplify}
        className={cn(
          "flex-1 min-w-[100px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
          "text-sm font-medium transition-all",
          "bg-gradient-to-r from-emerald-500 to-teal-600 text-white",
          "hover:from-emerald-600 hover:to-teal-700 hover:shadow-md hover:shadow-emerald-500/25",
          "active:scale-[0.98]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        )}
        title={`Simplify ${recipeName} for beginners with fewer ingredients and easier techniques`}
      >
        <Target className="w-4 h-4" />
        <span>{messages["actions.simplify"]}</span>
      </button>

      {/* Shopping List Button */}
      <button
        onClick={onShoppingList}
        disabled={isShoppingListLoading}
        className={cn(
          "flex-1 min-w-[100px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
          "text-sm font-medium transition-all",
          "bg-secondary text-secondary-foreground border border-border",
          "hover:bg-secondary/80 hover:border-border/80",
          "active:scale-[0.98]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        )}
      >
        {isShoppingListLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ShoppingCart className="w-4 h-4" />
        )}
        <span>{messages["actions.shoppingList"]}</span>
      </button>
    </div>
  );
}

