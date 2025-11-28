import { cn } from "@/utils";
import type { ShoppingList, ShoppingSection } from "@/types";
import { ArrowLeft, Clipboard, Check, Trash2 } from "lucide-react";
import { useState, useCallback } from "react";

interface ShoppingListViewProps {
  shoppingList: ShoppingList;
  onBackToRecipe: () => void;
  messages: Record<string, string>;
}

const sectionEmojis: Record<string, string> = {
  produce: "🥬",
  meat_seafood: "🥩",
  dairy_eggs: "🥛",
  bakery: "🥖",
  frozen: "🧊",
  pantry: "🥫",
  spices: "🧂",
};

export function ShoppingListView({ shoppingList, onBackToRecipe, messages }: ShoppingListViewProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const totalItems = shoppingList.sections.reduce((sum, s) => sum + s.items.length, 0);
  const checkedCount = checkedItems.size;

  const toggleItem = useCallback((itemId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setCheckedItems(new Set());
  }, []);

  const copyToClipboard = useCallback(async () => {
    const text = shoppingList.sections
      .map((section) => {
        const emoji = sectionEmojis[section.category] || "📦";
        const header = `${emoji} ${messages[`shopping.sections.${section.category}`] || section.name}`;
        const items = section.items
          .map((item) => `  ${checkedItems.has(item.id) ? "✓" : "☐"} ${item.display}`)
          .join("\n");
        return `${header}\n${items}`;
      })
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(
        `${messages["shopping.title"]} - ${shoppingList.recipe_name}\n${shoppingList.servings} servings\n\n${text}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [shoppingList, checkedItems, messages]);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span>🛒</span>
              <span>{messages["shopping.title"]}</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {shoppingList.recipe_name} • {shoppingList.servings} servings
            </p>
          </div>

          {/* Progress badge */}
          <div className="flex-shrink-0 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium">
            {checkedCount}/{totalItems}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 ease-out"
            style={{ width: `${(checkedCount / totalItems) * 100}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="p-5 space-y-6 max-h-[400px] overflow-y-auto">
        {shoppingList.sections.map((section) => (
          <ShoppingListSection
            key={section.category}
            section={section}
            checkedItems={checkedItems}
            onToggleItem={toggleItem}
            messages={messages}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="p-5 border-t border-border flex flex-wrap gap-2">
        <button
          onClick={onBackToRecipe}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
            "text-sm font-medium transition-all",
            "bg-secondary text-secondary-foreground border border-border",
            "hover:bg-secondary/80",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{messages["actions.backToRecipe"]}</span>
        </button>

        <button
          onClick={copyToClipboard}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
            "text-sm font-medium transition-all",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>{messages["actions.copied"]}</span>
            </>
          ) : (
            <>
              <Clipboard className="w-4 h-4" />
              <span>{messages["actions.copyList"]}</span>
            </>
          )}
        </button>

        {checkedCount > 0 && (
          <button
            onClick={clearAll}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
              "text-sm font-medium transition-all",
              "text-muted-foreground hover:text-destructive",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <Trash2 className="w-4 h-4" />
            <span>{messages["actions.clearAll"]}</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface ShoppingListSectionProps {
  section: ShoppingSection;
  checkedItems: Set<string>;
  onToggleItem: (id: string) => void;
  messages: Record<string, string>;
}

function ShoppingListSection({ section, checkedItems, onToggleItem, messages }: ShoppingListSectionProps) {
  const emoji = sectionEmojis[section.category] || section.emoji;
  const sectionLabel = messages[`shopping.sections.${section.category}`] || section.name;
  const allChecked = section.items.every((item) => checkedItems.has(item.id));

  return (
    <div className={cn("space-y-2", allChecked && "opacity-60")}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wide">
        <span>{emoji}</span>
        <span>{sectionLabel}</span>
      </h3>

      <ul className="space-y-1">
        {section.items.map((item) => {
          const isChecked = checkedItems.has(item.id);

          return (
            <li key={item.id}>
              <button
                onClick={() => onToggleItem(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left",
                  "hover:bg-muted/60 active:bg-muted",
                  isChecked && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                    isChecked ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30",
                  )}
                >
                  {isChecked && <Check className="w-3 h-3 text-white" />}
                </span>

                <span
                  className={cn("flex-1 text-foreground", isChecked && "line-through decoration-muted-foreground/50")}
                >
                  {item.display}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
