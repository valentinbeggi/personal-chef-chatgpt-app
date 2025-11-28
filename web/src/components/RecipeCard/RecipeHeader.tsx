import { Clock, Users, Flame, ChefHat } from "lucide-react";
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
    <div className="space-y-4">
      {/* Title & Description */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">{recipe.name}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{recipe.description}</p>
      </div>

      {/* Quick Stats */}
      <div className="flex flex-wrap gap-2">
        {/* Time */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 text-secondary-foreground">
          <Clock className="w-4 h-4 opacity-70" />
          <span className="text-sm font-medium">{formatTime(totalTime)}</span>
        </div>

        {/* Servings */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 text-secondary-foreground">
          <Users className="w-4 h-4 opacity-70" />
          <span className="text-sm font-medium">{scaledServings}</span>
        </div>

        {/* Calories */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 text-secondary-foreground">
          <Flame className="w-4 h-4 opacity-70" />
          <span className="text-sm font-medium">{Math.round(nutrition.calories)} kcal</span>
        </div>

        {/* Difficulty */}
        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full", difficultyStyle.bgColor)}>
          <ChefHat className={cn("w-4 h-4", difficultyStyle.color)} />
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
