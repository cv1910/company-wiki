import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (switchable && typeof window !== "undefined") {
      const stored = localStorage.getItem("wiki-theme");
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (theme === "system") {
      return getSystemTheme();
    }
    return theme as ResolvedTheme;
  });

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Update resolved theme when theme changes
  useEffect(() => {
    if (theme === "system") {
      setResolvedTheme(getSystemTheme());
    } else {
      setResolvedTheme(theme as ResolvedTheme);
    }
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);

    // Also set color-scheme for native elements
    root.style.colorScheme = resolvedTheme;

    if (switchable) {
      localStorage.setItem("wiki-theme", theme);
    }
  }, [resolvedTheme, theme, switchable]);

  const setTheme = (newTheme: Theme) => {
    if (switchable) {
      setThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    if (!switchable) return;
    
    // Cycle through: light -> dark -> system -> light
    setThemeState(prev => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
