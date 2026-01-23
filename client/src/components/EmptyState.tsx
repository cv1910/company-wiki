import { LucideIcon, FileText, Search, Calendar, MessageCircle, Users, FolderOpen, Bell, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "search" | "success";
}

// Predefined empty state configurations
export const emptyStatePresets = {
  noArticles: {
    icon: FileText,
    title: "Noch keine Artikel",
    description: "Erstelle deinen ersten Wiki-Artikel, um Wissen mit dem Team zu teilen.",
  },
  noSearchResults: {
    icon: Search,
    title: "Keine Ergebnisse gefunden",
    description: "Versuche andere Suchbegriffe oder überprüfe die Schreibweise.",
  },
  noEvents: {
    icon: Calendar,
    title: "Keine Termine",
    description: "Du hast keine anstehenden Termine. Erstelle einen neuen Termin oder lass dich einladen.",
  },
  noMessages: {
    icon: MessageCircle,
    title: "Keine Nachrichten",
    description: "Starte eine Unterhaltung mit deinem Team.",
  },
  noTeamMembers: {
    icon: Users,
    title: "Noch keine Teammitglieder",
    description: "Lade Kollegen ein, um zusammenzuarbeiten.",
  },
  noCategories: {
    icon: FolderOpen,
    title: "Keine Kategorien",
    description: "Erstelle Kategorien, um Inhalte zu organisieren.",
  },
  noNotifications: {
    icon: Bell,
    title: "Keine Benachrichtigungen",
    description: "Du bist auf dem neuesten Stand!",
  },
  taskComplete: {
    icon: CheckCircle2,
    title: "Alles erledigt!",
    description: "Du hast alle Aufgaben abgeschlossen.",
  },
};

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
}: EmptyStateProps) {
  const iconColors = {
    default: "text-muted-foreground/50",
    search: "text-primary/50",
    success: "text-green-500/50",
  };

  const bgColors = {
    default: "bg-muted/30",
    search: "bg-primary/5",
    success: "bg-green-500/5",
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
      {/* Decorative background circle */}
      <div className={`relative mb-6 ${bgColors[variant]} rounded-full p-6`}>
        {/* Subtle ring animation */}
        <div className="absolute inset-0 rounded-full animate-pulse opacity-50" 
             style={{ 
               background: `radial-gradient(circle, transparent 60%, var(--muted) 100%)` 
             }} 
        />
        <Icon className={`h-12 w-12 ${iconColors[variant]} relative z-10`} strokeWidth={1.5} />
      </div>
      
      {/* Text content */}
      <div className="text-center max-w-sm space-y-2">
        <h3 className="text-lg font-semibold text-foreground tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      
      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {action && (
            <Button 
              onClick={action.onClick}
              className="btn-interactive"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button 
              variant="outline" 
              onClick={secondaryAction.onClick}
              className="btn-interactive"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for inline use
export function EmptyStateInline({
  icon: Icon = FileText,
  message,
}: {
  icon?: LucideIcon;
  message: string;
}) {
  return (
    <div className="flex items-center gap-3 py-8 px-4 text-muted-foreground animate-fade-in">
      <Icon className="h-5 w-5 opacity-50" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
