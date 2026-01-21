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
      {/* Header - Premium Design */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg">
            <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Onboarding</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Willkommen! Wichtige Infos für deinen Start.
            </p>
          </div>
        </div>
      </div>

      {/* Progress Card - Premium Design */}
      {totalAssignments > 0 && (
        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-xl">Dein Fortschritt</h3>
                <p className="text-teal-100">
                  {completedAssignments} von {totalAssignments} Aufgaben abgeschlossen
                </p>
              </div>
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur">
                <span className="text-3xl font-bold">{progressPercent}%</span>
              </div>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
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
        <Card className="card-shadow rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-b">
            <CardTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-md">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <span>Deine Aufgaben</span>
            </CardTitle>
            <CardDescription>
              Diese Inhalte wurden dir zugewiesen
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {pendingAssignments.map((assignment, index) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-4 p-4 rounded-xl border hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group bg-background"
                  onClick={() => {
                    if (assignment.resourceType === "article") {
                      setLocation(`/wiki/article/${assignment.resourceSlug}`);
                    } else if (assignment.resourceType === "sop") {
                      setLocation(`/sops/view/${assignment.resourceSlug}`);
                    }
                  }}
                >
                  <div className={`p-3 rounded-xl shadow-sm ${
                    assignment.status === "in_progress" 
                      ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white" 
                      : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-muted-foreground"
                  }`}>
                    {assignment.resourceType === "article" ? (
                      <FileText className="h-5 w-5" />
                    ) : (
                      <ClipboardList className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {assignment.resourceTitle}
                      </h4>
                      <Badge 
                        variant={assignment.status === "in_progress" ? "default" : "secondary"} 
                        className={`text-xs ${
                          assignment.status === "in_progress" 
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" 
                            : ""
                        }`}
                      >
                        {assignment.status === "in_progress" ? "In Bearbeitung" : "Offen"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {assignment.resourceType === "article" ? "Wiki-Artikel" : "SOP"} · 
                      Zugewiesen {formatDistanceToNow(new Date(assignment.assignedAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Recently Completed - Premium Design */}
      {recentlyCompleted.length > 0 && (
        <Card className="card-shadow rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-b">
            <CardTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-md">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <span>Kürzlich abgeschlossen</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {recentlyCompleted.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-green-500/10"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium flex-1">{assignment.resourceTitle}</span>
                  <span className="text-xs text-muted-foreground">
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

      {/* Onboarding Articles - Premium Design */}
      <Card className="card-shadow rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b">
          <CardTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span>Onboarding-Materialien</span>
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
