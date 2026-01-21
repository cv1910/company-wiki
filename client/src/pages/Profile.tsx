import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  User, 
  Mail, 
  Calendar, 
  FileText, 
  ClipboardList, 
  MessageSquare,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  Edit,
  Settings,
  Building2,
  Briefcase
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { de } from "date-fns/locale";
import { useLocation } from "wouter";

// Avatar gradient colors based on name hash
const AVATAR_GRADIENTS = [
  "from-orange-400 to-orange-600",
  "from-blue-400 to-blue-600",
  "from-green-400 to-green-600",
  "from-purple-400 to-purple-600",
  "from-pink-400 to-pink-600",
  "from-teal-400 to-teal-600",
  "from-amber-400 to-amber-600",
  "from-indigo-400 to-indigo-600",
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch user statistics - get all articles and filter client-side
  const { data: allArticles, isLoading: statsLoading } = trpc.articles.list.useQuery({
    limit: 100,
  });
  
  // Use all articles for now (authorId not exposed in list query)
  const userArticles = allArticles || [];

  // Fetch user's assignments
  const { data: assignments } = trpc.assignments.getMyAssignments.useQuery();

  // Calculate statistics
  const articlesCount = userArticles.length;
  const completedAssignments = assignments?.filter(a => a.status === "completed").length || 0;
  const pendingAssignments = assignments?.filter(a => a.status !== "completed").length || 0;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Bitte melde dich an, um dein Profil zu sehen.</p>
      </div>
    );
  }

  const userName = user.name || "User";
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const gradient = getAvatarGradient(userName);

  return (
    <div className="space-y-6">
      {/* Profile Header - Premium Design */}
      <Card className="overflow-hidden border-0 shadow-xl">
        <div className="bg-gradient-to-r from-primary via-primary/90 to-orange-500 p-8 text-white">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Large Avatar */}
            <div className="relative">
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 ring-4 ring-white/30 shadow-2xl">
                <AvatarImage src={user.avatarUrl || undefined} className="object-cover" />
                <AvatarFallback className={`text-3xl sm:text-4xl font-bold text-white bg-gradient-to-br ${gradient}`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Button 
                size="icon" 
                variant="secondary"
                className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full shadow-lg"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold">{userName}</h1>
              <p className="text-white/80 mt-1 flex items-center justify-center sm:justify-start gap-2">
                <Mail className="h-4 w-4" />
                {user.email}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
                  <Briefcase className="h-3 w-3 mr-1" />
                  {user.role === "admin" ? "Administrator" : "Mitarbeiter"}
                </Badge>
                <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
                  <Calendar className="h-3 w-3 mr-1" />
                  Seit {format(new Date(user.createdAt || Date.now()), "MMMM yyyy", { locale: de })}
                </Badge>
              </div>
            </div>

            {/* Settings Button */}
            <Button 
              variant="secondary" 
              className="hidden sm:flex"
              onClick={() => setLocation("/settings/email")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Einstellungen
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 divide-x">
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-primary">{articlesCount}</div>
            <div className="text-sm text-muted-foreground mt-1">Artikel erstellt</div>
          </div>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-green-500">{completedAssignments}</div>
            <div className="text-sm text-muted-foreground mt-1">Aufgaben erledigt</div>
          </div>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-amber-500">{pendingAssignments}</div>
            <div className="text-sm text-muted-foreground mt-1">Aufgaben offen</div>
          </div>
        </div>
      </Card>

      {/* Tabs for Activity */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="activity" className="text-sm">
            <Clock className="h-4 w-4 mr-2" />
            Aktivität
          </TabsTrigger>
          <TabsTrigger value="articles" className="text-sm">
            <FileText className="h-4 w-4 mr-2" />
            Meine Artikel
          </TabsTrigger>
          <TabsTrigger value="assignments" className="text-sm">
            <ClipboardList className="h-4 w-4 mr-2" />
            Aufgaben
          </TabsTrigger>
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card className="card-shadow rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 shadow-md">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span>Letzte Aktivitäten</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Activity Timeline */}
                <div className="relative pl-6 border-l-2 border-muted space-y-6">
                  {assignments?.slice(0, 5).map((assignment, index) => (
                    <div key={assignment.id} className="relative">
                      <div className={`absolute -left-[25px] w-4 h-4 rounded-full ${
                        assignment.status === "completed" 
                          ? "bg-green-500" 
                          : "bg-amber-500"
                      }`} />
                      <div className="bg-muted/30 rounded-xl p-4">
                        <div className="flex items-center gap-2">
                          {assignment.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500" />
                          )}
                          <span className="font-medium">{assignment.resourceTitle}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {assignment.status === "completed" ? "Abgeschlossen" : "Zugewiesen"} · {
                            formatDistanceToNow(
                              new Date(assignment.completedAt || assignment.assignedAt), 
                              { addSuffix: true, locale: de }
                            )
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!assignments || assignments.length === 0) && (
                    <p className="text-muted-foreground text-sm">Noch keine Aktivitäten vorhanden.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Articles Tab */}
        <TabsContent value="articles">
          <Card className="card-shadow rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <span>Meine Artikel</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : userArticles.length > 0 ? (
                <div className="space-y-3">
                  {userArticles.slice(0, 10).map((article) => (
                    <div
                      key={article.id}
                      className="flex items-center gap-4 p-4 rounded-xl border hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                      onClick={() => setLocation(`/wiki/article/${article.slug}`)}
                    >
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                        <FileText className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate group-hover:text-primary transition-colors">
                          {article.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(article.updatedAt), { addSuffix: true, locale: de })}
                        </p>
                      </div>
                      <Badge variant="secondary">{article.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Du hast noch keine Artikel erstellt.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <Card className="card-shadow rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-md">
                  <ClipboardList className="h-5 w-5 text-white" />
                </div>
                <span>Meine Aufgaben</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignments && assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        assignment.status === "completed" 
                          ? "bg-green-500/5 border-green-500/20" 
                          : "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                      }`}
                      onClick={() => {
                        if (assignment.status !== "completed") {
                          if (assignment.resourceType === "article") {
                            setLocation(`/wiki/article/${assignment.resourceSlug}`);
                          } else {
                            setLocation(`/sops/view/${assignment.resourceSlug}`);
                          }
                        }
                      }}
                    >
                      <div className={`p-3 rounded-xl ${
                        assignment.status === "completed"
                          ? "bg-gradient-to-br from-green-500 to-emerald-500"
                          : "bg-gradient-to-br from-amber-500 to-orange-500"
                      }`}>
                        {assignment.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-white" />
                        ) : (
                          <Clock className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">
                          {assignment.resourceTitle}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {assignment.resourceType === "article" ? "Wiki-Artikel" : "SOP"} · {
                            assignment.status === "completed" && assignment.completedAt
                              ? `Abgeschlossen ${formatDistanceToNow(new Date(assignment.completedAt), { addSuffix: true, locale: de })}`
                              : `Zugewiesen ${formatDistanceToNow(new Date(assignment.assignedAt), { addSuffix: true, locale: de })}`
                          }
                        </p>
                      </div>
                      <Badge 
                        variant={assignment.status === "completed" ? "default" : "secondary"}
                        className={assignment.status === "completed" ? "bg-green-500" : ""}
                      >
                        {assignment.status === "completed" ? "Erledigt" : "Offen"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Keine Aufgaben zugewiesen.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
