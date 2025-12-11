import { Clock, Users, Flame, ChefHat, Sparkles } from "lucide-react";
import { cn } from "@/utils";
import type { Recipe, NutritionData, Difficulty } from "@/types";
import { formatTime } from "@/utils/units";

interface RecipeHeaderProps {
  recipe: Recipe;
  nutrition: NutritionData;
  scaledServings: number;
  messages: Record<string, string>;
}

const difficultyConfig: Record<Difficulty, { color: string; bgColor: string }> = {
  easy: { color: "text-emerald-700", bgColor: "bg-emerald-100 dark:bg-emerald-900/40" },
  medium: { color: "text-amber-700", bgColor: "bg-amber-100 dark:bg-amber-900/40" },
  hard: { color: "text-rose-700", bgColor: "bg-rose-100 dark:bg-rose-900/40" },
};

export function RecipeHeader({ recipe, nutrition, scaledServings, messages }: RecipeHeaderProps) {
  const totalTime = recipe.prep_time_minutes + recipe.cook_time_minutes;
  const difficultyStyle = difficultyConfig[recipe.difficulty];
  const difficultyLabel = messages[`difficulty.${recipe.difficulty}`] || recipe.difficulty;

  return (
    <div className="space-y-4 relative z-10">
      {/* Title & Description */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">{recipe.name}</h1>
          <Sparkles className="w-5 h-5 text-accent animate-pulse" style={{ animationDuration: "2s" }} />
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{recipe.description}</p>
      </div>

      {/* Quick Stats */}
      <div className="flex flex-wrap gap-2">
        {/* Time */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 text-secondary-foreground transition-all hover:bg-secondary/80 hover:scale-105">
          <Clock className="w-4 h-4 opacity-70 animate-pulse" style={{ animationDuration: "3s" }} />
          <span className="text-sm font-medium">{formatTime(totalTime)}</span>
        </div>

        {/* Servings */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 text-secondary-foreground transition-all hover:bg-secondary/80 hover:scale-105">
          <Users className="w-4 h-4 opacity-70" />
          <span className="text-sm font-medium">{scaledServings}</span>
        </div>

        {/* Calories */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 text-secondary-foreground transition-all hover:bg-secondary/80 hover:scale-105">
          <Flame className="w-4 h-4 opacity-70 animate-pulse text-orange-500" style={{ animationDuration: "1.5s" }} />
          <span className="text-sm font-medium">{Math.round(nutrition.calories)} kcal</span>
        </div>

        {/* Difficulty */}
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-105",
            difficultyStyle.bgColor,
          )}
        >
          <ChefHat
            className={cn("w-4 h-4 animate-bounce", difficultyStyle.color)}
            style={{ animationDuration: "2s" }}
          />
          <span className={cn("text-sm font-medium capitalize", difficultyStyle.color)}>{difficultyLabel}</span>
        </div>
      </div>

      {/* Tags */}
      {(recipe.dietary_info.length > 0 || recipe.tags.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.dietary_info.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs font-medium rounded-md bg-primary/10 text-primary border border-primary/20"
            >
              {tag}
            </span>
          ))}
          {recipe.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
