import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { 
  GraduationCap, 
  FileText, 
  ClipboardList, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  BookOpen,
  Users,
  Briefcase,
  Clock
} from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch onboarding articles (from the Onboarding category)
  const { data: onboardingArticles, isLoading: articlesLoading } = trpc.articles.list.useQuery({
    categorySlug: "onboarding",
    status: "published",
    limit: 20,
  });

  // Fetch user's assignments
  const { data: assignments, isLoading: assignmentsLoading } = trpc.assignments.getMyAssignments.useQuery();

  // Calculate progress
  const totalAssignments = assignments?.length || 0;
  const completedAssignments = assignments?.filter(a => a.status === "completed").length || 0;
  const progressPercent = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  const pendingAssignments = assignments?.filter(a => a.status === "pending" || a.status === "in_progress") || [];
  const recentlyCompleted = assignments?.filter(a => a.status === "completed").slice(0, 3) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Onboarding
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Willkommen! Wichtige Infos für deinen Start.
        </p>
      </div>

      {/* Progress Card */}
      {totalAssignments > 0 && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Dein Fortschritt</h3>
                <p className="text-sm text-muted-foreground">
                  {completedAssignments} von {totalAssignments} Aufgaben abgeschlossen
                </p>
              </div>
              <div className="text-3xl font-bold text-primary">{progressPercent}%</div>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Assigned Tasks */}
      {assignmentsLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : pendingAssignments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Deine Aufgaben
            </CardTitle>
            <CardDescription>
              Diese Inhalte wurden dir zugewiesen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => {
                    if (assignment.resourceType === "article") {
                      setLocation(`/wiki/article/${assignment.resourceSlug}`);
                    } else if (assignment.resourceType === "sop") {
                      setLocation(`/sops/view/${assignment.resourceSlug}`);
                    }
                  }}
                >
                  <div className={`p-2.5 rounded-lg ${
                    assignment.status === "in_progress" 
                      ? "bg-amber-500/10 text-amber-600" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {assignment.resourceType === "article" ? (
                      <FileText className="h-5 w-5" />
                    ) : (
                      <ClipboardList className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                        {assignment.resourceTitle}
                      </h4>
                      <Badge variant={assignment.status === "in_progress" ? "default" : "secondary"} className="text-xs">
                        {assignment.status === "in_progress" ? "In Bearbeitung" : "Offen"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {assignment.resourceType === "article" ? "Wiki-Artikel" : "SOP"} · 
                      Zugewiesen {formatDistanceToNow(new Date(assignment.assignedAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Recently Completed */}
      {recentlyCompleted.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Kürzlich abgeschlossen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentlyCompleted.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{assignment.resourceTitle}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {assignment.completedAt && formatDistanceToNow(new Date(assignment.completedAt), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Articles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Onboarding-Materialien
          </CardTitle>
          <CardDescription>
            Wichtige Artikel und Anleitungen für neue Mitarbeiter
          </CardDescription>
        </CardHeader>
        <CardContent>
          {articlesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : onboardingArticles && onboardingArticles.length > 0 ? (
            <div className="space-y-2">
              {onboardingArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => setLocation(`/wiki/article/${article.slug}`)}
                >
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                      {article.title}
                    </h4>
                    {article.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Noch keine Onboarding-Materialien vorhanden</p>
              <p className="text-sm text-muted-foreground mt-1">
                Erstellen Sie Artikel in der Kategorie "Onboarding"
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-all group"
          onClick={() => setLocation("/wiki")}
        >
          <CardContent className="p-6 text-center">
            <div className="p-3 rounded-xl bg-blue-500/10 w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium">Wissensdatenbank</h3>
            <p className="text-sm text-muted-foreground mt-1">Alle Wiki-Artikel</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-all group"
          onClick={() => setLocation("/sops")}
        >
          <CardContent className="p-6 text-center">
            <div className="p-3 rounded-xl bg-green-500/10 w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
              <ClipboardList className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-medium">SOPs</h3>
            <p className="text-sm text-muted-foreground mt-1">Arbeitsanweisungen</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-all group"
          onClick={() => setLocation("/chat")}
        >
          <CardContent className="p-6 text-center">
            <div className="p-3 rounded-xl bg-purple-500/10 w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-medium">AI-Assistent</h3>
            <p className="text-sm text-muted-foreground mt-1">Fragen stellen</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
