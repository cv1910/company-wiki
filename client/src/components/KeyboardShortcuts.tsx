import { useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(enabled: boolean = true) {
  const [, setLocation] = useLocation();
  const { toggleTheme } = useTheme();

  const shortcuts: ShortcutConfig[] = [
    {
      key: "k",
      ctrl: true,
      action: () => setLocation("/search"),
      description: "Suche öffnen",
    },
    {
      key: "k",
      meta: true,
      action: () => setLocation("/search"),
      description: "Suche öffnen (Mac)",
    },
    {
      key: "h",
      ctrl: true,
      shift: true,
      action: () => setLocation("/"),
      description: "Zum Dashboard",
    },
    {
      key: "w",
      ctrl: true,
      shift: true,
      action: () => setLocation("/wiki"),
      description: "Wiki öffnen",
    },
    {
      key: "s",
      ctrl: true,
      shift: true,
      action: () => setLocation("/sops"),
      description: "SOPs öffnen",
    },
    {
      key: "a",
      ctrl: true,
      shift: true,
      action: () => setLocation("/chat"),
      description: "AI-Assistent öffnen",
    },
    {
      key: "n",
      ctrl: true,
      shift: true,
      action: () => setLocation("/wiki/new"),
      description: "Neuer Artikel",
    },
    {
      key: "u",
      ctrl: true,
      shift: true,
      action: () => setLocation("/leave"),
      description: "Urlaub",
    },
    {
      key: "d",
      ctrl: true,
      shift: true,
      action: () => toggleTheme(),
      description: "Theme wechseln",
    },
  ];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        // Handle both ctrl and meta for cross-platform
        const modifierMatch =
          (shortcut.ctrl && (event.ctrlKey || event.metaKey)) ||
          (shortcut.meta && event.metaKey) ||
          (!shortcut.ctrl && !shortcut.meta && !event.ctrlKey && !event.metaKey);

        if (keyMatch && shiftMatch && (modifierMatch || (shortcut.ctrl && ctrlMatch) || (shortcut.meta && metaMatch))) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

export function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: ["⌘", "K"], description: "Suche öffnen" },
    { keys: ["⌘", "⇧", "H"], description: "Zum Dashboard" },
    { keys: ["⌘", "⇧", "W"], description: "Wiki öffnen" },
    { keys: ["⌘", "⇧", "S"], description: "SOPs öffnen" },
    { keys: ["⌘", "⇧", "A"], description: "AI-Assistent öffnen" },
    { keys: ["⌘", "⇧", "N"], description: "Neuer Artikel" },
    { keys: ["⌘", "⇧", "U"], description: "Urlaub" },
    { keys: ["⌘", "⇧", "D"], description: "Theme wechseln" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-xl p-6 shadow-2xl max-w-md w-full mx-4 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Tastaturkürzel</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <kbd
                    key={keyIndex}
                    className="px-2 py-1 text-xs font-medium bg-muted rounded border border-border"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Auf Windows/Linux verwenden Sie Ctrl statt ⌘
        </p>
      </div>
    </div>
  );
}
