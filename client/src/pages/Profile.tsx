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
  Briefcase,
  Phone,
  MapPin,
  Save,
  X,
  Camera,
  Loader2,
  Upload
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef } from "react";
import { toast } from "@/lib/hapticToast";
import { formatDistanceToNow, format } from "date-fns";
import { de } from "date-fns/locale";
import { useLocation } from "wouter";
import { ImageCropper } from "@/components/ImageCropper";
import { ProfileCompleteness } from "@/components/ProfileCompleteness";

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
  const utils = trpc.useUtils();
  
  // Edit profile dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [location, setLocationField] = useState("");
  const [bio, setBio] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Upload avatar mutation
  const uploadAvatar = trpc.users.uploadAvatar.useMutation({
    onSuccess: () => {
      toast.success("Profilbild erfolgreich aktualisiert");
      utils.auth.me.invalidate();
      setIsUploadingAvatar(false);
      setCropperOpen(false);
      setSelectedImage(null);
    },
    onError: (error) => {
      toast.error("Fehler beim Hochladen: " + error.message);
      setIsUploadingAvatar(false);
    },
  });
  
  // Handle file selection - open cropper
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wähle ein Bild aus");
      return;
    }
    
    // Validate file size (max 10MB for cropping, will be smaller after)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Das Bild darf maximal 10MB groß sein");
      return;
    }
    
    // Read file and open cropper
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setCropperOpen(true);
    };
    reader.onerror = () => {
      toast.error("Fehler beim Lesen der Datei");
    };
    reader.readAsDataURL(file);
    
    // Reset input so same file can be selected again
    e.target.value = "";
  };
  
  // Handle cropped image
  const handleCropComplete = async (blob: Blob, mimeType: string) => {
    setIsUploadingAvatar(true);
    
    // Convert blob to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadAvatar.mutate({
        imageData: base64,
        mimeType: mimeType,
      });
    };
    reader.onerror = () => {
      toast.error("Fehler beim Verarbeiten des Bildes");
      setIsUploadingAvatar(false);
    };
    reader.readAsDataURL(blob);
  };
  
  // Cancel cropping
  const handleCropCancel = () => {
    setCropperOpen(false);
    setSelectedImage(null);
  };
  
  // Update profile mutation
  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profil erfolgreich aktualisiert");
      setEditDialogOpen(false);
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      toast.error("Fehler beim Speichern: " + error.message);
    },
  });
  
  // Initialize form when dialog opens
  const openEditDialog = () => {
    setPhone((user as any)?.phone || "");
    setLocationField((user as any)?.location || "");
    setBio((user as any)?.bio || "");
    setDepartment((user as any)?.department || "");
    setJobTitle((user as any)?.jobTitle || "");
    setEditDialogOpen(true);
  };
  
  const handleSaveProfile = () => {
    updateProfile.mutate({
      phone: phone || undefined,
      location: location || undefined,
      bio: bio || undefined,
      department: department || undefined,
      jobTitle: jobTitle || undefined,
    });
  };

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
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Profile Header - Premium Design */}
      <Card className="overflow-hidden border-0 shadow-xl">
        <div className="bg-gradient-to-r from-primary via-primary/90 to-orange-500 p-8 text-white">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Large Avatar with Upload */}
            <div className="relative group">
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 ring-4 ring-white/30 shadow-2xl">
                <AvatarImage src={user.avatarUrl || undefined} className="object-cover" />
                <AvatarFallback className={`text-3xl sm:text-4xl font-bold text-white bg-gradient-to-br ${gradient}`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              {/* Upload overlay */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </button>
              {/* Edit profile button */}
              <Button 
                size="icon" 
                variant="secondary"
                className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full shadow-lg"
                onClick={openEditDialog}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold">{userName}</h1>
              {(user as any)?.jobTitle && (
                <p className="text-white/90 text-lg mt-1">{(user as any).jobTitle}</p>
              )}
              <p className="text-white/80 mt-1 flex items-center justify-center sm:justify-start gap-2">
                <Mail className="h-4 w-4" />
                {user.email}
              </p>
              {(user as any)?.phone && (
                <p className="text-white/80 mt-1 flex items-center justify-center sm:justify-start gap-2">
                  <Phone className="h-4 w-4" />
                  {(user as any).phone}
                </p>
              )}
              {(user as any)?.location && (
                <p className="text-white/80 mt-1 flex items-center justify-center sm:justify-start gap-2">
                  <MapPin className="h-4 w-4" />
                  {(user as any).location}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                {(user as any)?.department && (
                  <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
                    <Building2 className="h-3 w-3 mr-1" />
                    {(user as any).department}
                  </Badge>
                )}
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

      {/* Profile Completeness */}
      <ProfileCompleteness 
        user={{
          name: user.name,
          avatarUrl: user.avatarUrl,
          phone: (user as any)?.phone,
          location: (user as any)?.location,
          bio: (user as any)?.bio,
          jobTitle: (user as any)?.jobTitle,
          department: (user as any)?.department,
        }}
        onEditClick={openEditDialog}
      />

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
      
      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Profil bearbeiten
            </DialogTitle>
            <DialogDescription>
              Aktualisiere deine persönlichen Informationen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Position</Label>
                <Input
                  id="jobTitle"
                  placeholder="z.B. Software Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Abteilung</Label>
                <Input
                  id="department"
                  placeholder="z.B. IT"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  placeholder="+49 123 456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Standort</Label>
                <Input
                  id="location"
                  placeholder="z.B. Berlin, Deutschland"
                  value={location}
                  onChange={(e) => setLocationField(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Über mich</Label>
              <Textarea
                id="bio"
                placeholder="Erzähle etwas über dich..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateProfile.isPending ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Image Cropper Dialog */}
      {selectedImage && (
        <ImageCropper
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          isOpen={cropperOpen}
        />
      )}
    </div>
  );
}
