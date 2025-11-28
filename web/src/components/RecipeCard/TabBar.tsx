import { cn } from "@/utils";
import type { TabId } from "@/types";
import { UtensilsCrossed, ListOrdered, PieChart } from "lucide-react";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  messages: Record<string, string>;
}

const tabs: { id: TabId; icon: typeof UtensilsCrossed; messageKey: string }[] = [
  { id: "ingredients", icon: UtensilsCrossed, messageKey: "tabs.ingredients" },
  { id: "instructions", icon: ListOrdered, messageKey: "tabs.instructions" },
  { id: "nutrition", icon: PieChart, messageKey: "tabs.nutrition" },
];

export function TabBar({ activeTab, onTabChange, messages }: TabBarProps) {
  return (
    <div className="flex border-b border-border">
      {tabs.map(({ id, icon: Icon, messageKey }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all",
            "hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            activeTab === id
              ? "text-primary border-b-2 border-primary -mb-[1px]"
              : "text-muted-foreground"
          )}
          aria-selected={activeTab === id}
          role="tab"
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{messages[messageKey]}</span>
        </button>
      ))}
    </div>
  );
}

