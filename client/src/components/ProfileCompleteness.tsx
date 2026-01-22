import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Circle, 
  User, 
  Camera, 
  Phone, 
  MapPin, 
  FileText,
  Briefcase,
  Building2,
  Award,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileCompletenessProps {
  user: {
    name?: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
    location?: string | null;
    bio?: string | null;
    jobTitle?: string | null;
    department?: string | null;
  };
  onEditClick?: () => void;
}

interface ProfileField {
  key: string;
  label: string;
  icon: React.ElementType;
  filled: boolean;
  weight: number;
}

export function ProfileCompleteness({ user, onEditClick }: ProfileCompletenessProps) {
  // Define profile fields with weights
  const fields: ProfileField[] = [
    { key: "name", label: "Name", icon: User, filled: !!user.name, weight: 20 },
    { key: "avatarUrl", label: "Profilbild", icon: Camera, filled: !!user.avatarUrl, weight: 20 },
    { key: "jobTitle", label: "Position", icon: Briefcase, filled: !!user.jobTitle, weight: 15 },
    { key: "department", label: "Abteilung", icon: Building2, filled: !!user.department, weight: 10 },
    { key: "phone", label: "Telefon", icon: Phone, filled: !!user.phone, weight: 10 },
    { key: "location", label: "Standort", icon: MapPin, filled: !!user.location, weight: 10 },
    { key: "bio", label: "Über mich", icon: FileText, filled: !!user.bio, weight: 15 },
  ];

  // Calculate completion percentage
  const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
  const filledWeight = fields.reduce((sum, f) => sum + (f.filled ? f.weight : 0), 0);
  const completionPercent = Math.round((filledWeight / totalWeight) * 100);

  // Get missing fields
  const missingFields = fields.filter(f => !f.filled);
  const isComplete = completionPercent === 100;

  // Get color based on completion
  const getProgressColor = () => {
    if (completionPercent >= 100) return "bg-gradient-to-r from-green-500 to-emerald-500";
    if (completionPercent >= 70) return "bg-gradient-to-r from-amber-500 to-orange-500";
    if (completionPercent >= 40) return "bg-gradient-to-r from-yellow-500 to-amber-500";
    return "bg-gradient-to-r from-red-500 to-rose-500";
  };

  return (
    <Card className="card-shadow rounded-xl overflow-hidden">
      <CardContent className="p-4">
        {/* Header with percentage */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                <Award className="h-4 w-4 text-white" />
              </div>
            ) : (
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            )}
            <span className="font-semibold text-sm">Profil-Vollständigkeit</span>
          </div>
          <Badge 
            variant={isComplete ? "default" : "secondary"}
            className={cn(
              "font-bold",
              isComplete && "bg-green-500 hover:bg-green-600"
            )}
          >
            {completionPercent}%
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-3">
          <div 
            className={cn("h-full transition-all duration-500 ease-out", getProgressColor())}
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        {/* Field checklist */}
        <div className="grid grid-cols-2 gap-2">
          {fields.map((field) => {
            const Icon = field.icon;
            return (
              <div 
                key={field.key}
                className={cn(
                  "flex items-center gap-2 text-sm py-1 px-2 rounded-lg transition-colors",
                  field.filled 
                    ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30" 
                    : "text-muted-foreground hover:bg-muted/50 cursor-pointer"
                )}
                onClick={() => !field.filled && onEditClick?.()}
              >
                {field.filled ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 flex-shrink-0" />
                )}
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{field.label}</span>
              </div>
            );
          })}
        </div>

        {/* Completion message or tips */}
        {isComplete ? (
          <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-2">
              <Award className="h-4 w-4" />
              Dein Profil ist vollständig!
            </p>
          </div>
        ) : missingFields.length > 0 && (
          <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              <strong>Tipp:</strong> Füge {missingFields[0].label} hinzu um dein Profil zu vervollständigen.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
