import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme, switchable } = useTheme();

  if (!switchable) return null;

  const themes = [
    { value: "light" as const, label: "Hell", icon: Sun },
    { value: "dark" as const, label: "Dunkel", icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ];

  const currentTheme = themes.find((t) => t.value === theme);
  const CurrentIcon = currentTheme?.icon || Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Theme wechseln</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="animate-scale-in">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              "gap-2 cursor-pointer",
              theme === t.value && "bg-accent"
            )}
          >
            <t.icon className="h-4 w-4" />
            <span>{t.label}</span>
            {theme === t.value && (
              <span className="ml-auto text-xs text-muted-foreground">
                {t.value === "system" && `(${resolvedTheme === "dark" ? "Dunkel" : "Hell"})`}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeSwitcherCompact({ className }: { className?: string }) {
  const { toggleTheme, theme, switchable } = useTheme();

  if (!switchable) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn("relative", className)}
      title={`Theme: ${theme === "light" ? "Hell" : theme === "dark" ? "Dunkel" : "System"}`}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Theme wechseln</span>
    </Button>
  );
}
