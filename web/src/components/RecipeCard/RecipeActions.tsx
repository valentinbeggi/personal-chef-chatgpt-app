import { cn } from "@/utils";
import { ShoppingCart, Sparkles } from "lucide-react";

interface RecipeActionsProps {
  onShoppingList: () => void;
  messages: Record<string, string>;
}

export function RecipeActions({ onShoppingList, messages }: RecipeActionsProps) {
  return (
    <div className="pt-4 border-t border-border">
      <button
        onClick={onShoppingList}
        className={cn(
          "w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
          "text-sm font-medium transition-all",
          "bg-gradient-to-r from-primary/10 to-accent/10 text-foreground border-2 border-primary/20",
          "hover:from-primary/20 hover:to-accent/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/20",
          "active:scale-[0.98]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "relative overflow-hidden",
        )}
      >
        <ShoppingCart className="w-4 h-4 relative z-10 animate-bounce" style={{ animationDuration: "2s" }} />
        <span className="relative z-10">{messages["actions.shoppingList"]}</span>
        <Sparkles
          className="absolute right-3 w-4 h-4 text-accent opacity-50 animate-pulse"
          style={{ animationDelay: "1s", animationDuration: "2s" }}
        />
      </button>
    </div>
  );
}
