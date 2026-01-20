import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Briefcase,
  MapPin,
  Phone,
  Smartphone,
  Mail,
  Calendar,
  Linkedin,
  Loader2,
  Pencil,
  X,
  Check,
  Circle,
} from "lucide-react";
import { toast } from "sonner";

interface UserProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: number; // If not provided, show own profile
}

const statusColors = {
  available: "bg-green-500",
  busy: "bg-red-500",
  away: "bg-yellow-500",
  offline: "bg-gray-400",
};

const statusLabels = {
  available: "Verfügbar",
  busy: "Beschäftigt",
  away: "Abwesend",
  offline: "Offline",
};

export function UserProfile({ open, onOpenChange, userId }: UserProfileProps) {
  const { user: currentUser } = useAuth();
  const isOwnProfile = !userId || userId === currentUser?.id;
  const targetUserId = userId || currentUser?.id;

  const { data: profileData, isLoading, refetch } = trpc.profile.getProfile.useQuery(
    { userId: targetUserId! },
    { enabled: open && !!targetUserId }
  );

  const updateProfile = trpc.profile.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profil aktualisiert");
      refetch();
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Fehler beim Speichern");
    },
  });

  const updateStatus = trpc.profile.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status aktualisiert");
      refetch();
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    position: "",
    department: "",
    location: "",
    phone: "",
    mobilePhone: "",
    skills: "",
    bio: "",
    linkedinUrl: "",
    manager: "",
  });

  useEffect(() => {
    if (profileData?.profile) {
      setFormData({
        position: profileData.profile.position || "",
        department: profileData.profile.department || "",
        location: profileData.profile.location || "",
        phone: profileData.profile.phone || "",
        mobilePhone: profileData.profile.mobilePhone || "",
        skills: profileData.profile.skills || "",
        bio: profileData.profile.bio || "",
        linkedinUrl: profileData.profile.linkedinUrl || "",
        manager: profileData.profile.manager || "",
      });
    }
  }, [profileData]);

  const handleSave = () => {
    updateProfile.mutate(formData);
  };

  const handleStatusChange = (status: "available" | "busy" | "away" | "offline") => {
    updateStatus.mutate({ status });
  };

  const user = profileData?.user;
  const profile = profileData?.profile;
  const skills = profile?.skills ? JSON.parse(profile.skills) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isOwnProfile ? "Mein Profil" : "Profil"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : user ? (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="contact">Kontakt</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-4">
              {/* Header with Avatar and Status */}
              <div className="flex items-start gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="text-2xl">
                      {user.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  {profile && (
                    <div
                      className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-background ${
                        statusColors[profile.status || "offline"]
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{user.name}</h2>
                  {(profile?.position || isEditing) && (
                    isEditing ? (
                      <Input
                        value={formData.position}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, position: e.target.value }))
                        }
                        placeholder="Position"
                        className="mt-1 h-8"
                      />
                    ) : (
                      <p className="text-muted-foreground">{profile?.position}</p>
                    )
                  )}
                  {(profile?.department || isEditing) && (
                    isEditing ? (
                      <Input
                        value={formData.department}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, department: e.target.value }))
                        }
                        placeholder="Abteilung"
                        className="mt-1 h-8"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {profile?.department}
                      </p>
                    )
                  )}

                  {/* Status Selector (only for own profile) */}
                  {isOwnProfile && (
                    <div className="mt-3">
                      <Select
                        value={profile?.status || "available"}
                        onValueChange={handleStatusChange}
                      >
                        <SelectTrigger className="w-40 h-8">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <Circle
                                className={`h-2 w-2 fill-current ${
                                  statusColors[profile?.status || "available"]
                                } text-transparent`}
                              />
                              {statusLabels[profile?.status || "available"]}
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                <Circle
                                  className={`h-2 w-2 fill-current ${
                                    statusColors[value as keyof typeof statusColors]
                                  } text-transparent`}
                                />
                                {label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {isOwnProfile && (
                  <div>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setIsEditing(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleSave}
                          disabled={updateProfile.isPending}
                        >
                          {updateProfile.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsEditing(true)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Bio */}
              <div>
                <Label className="text-sm font-medium">Über mich</Label>
                {isEditing ? (
                  <Textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, bio: e.target.value }))
                    }
                    placeholder="Erzähle etwas über dich..."
                    className="mt-1.5"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {profile?.bio || "Keine Beschreibung"}
                  </p>
                )}
              </div>

              {/* Skills */}
              <div>
                <Label className="text-sm font-medium">Skills & Expertise</Label>
                {isEditing ? (
                  <Input
                    value={formData.skills}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, skills: e.target.value }))
                    }
                    placeholder='["React", "TypeScript", "Node.js"]'
                    className="mt-1.5"
                  />
                ) : skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {skills.map((skill: string, i: number) => (
                      <Badge key={i} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    Keine Skills angegeben
                  </p>
                )}
              </div>

              {/* Location */}
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {isEditing ? (
                  <Input
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, location: e.target.value }))
                    }
                    placeholder="Standort"
                    className="h-8"
                  />
                ) : (
                  <span className="text-sm">
                    {profile?.location || "Nicht angegeben"}
                  </span>
                )}
              </div>

              {/* Manager */}
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                {isEditing ? (
                  <Input
                    value={formData.manager}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, manager: e.target.value }))
                    }
                    placeholder="Vorgesetzter"
                    className="h-8"
                  />
                ) : (
                  <span className="text-sm">
                    Vorgesetzter: {profile?.manager || "Nicht angegeben"}
                  </span>
                )}
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-4">
              {/* Email */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">E-Mail</p>
                  <p className="text-sm font-medium">{user.email || "Nicht angegeben"}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Telefon</p>
                  {isEditing ? (
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, phone: e.target.value }))
                      }
                      placeholder="+49 123 456789"
                      className="h-7 mt-0.5"
                    />
                  ) : (
                    <p className="text-sm font-medium">
                      {profile?.phone || "Nicht angegeben"}
                    </p>
                  )}
                </div>
              </div>

              {/* Mobile */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Mobil</p>
                  {isEditing ? (
                    <Input
                      value={formData.mobilePhone}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, mobilePhone: e.target.value }))
                      }
                      placeholder="+49 170 1234567"
                      className="h-7 mt-0.5"
                    />
                  ) : (
                    <p className="text-sm font-medium">
                      {profile?.mobilePhone || "Nicht angegeben"}
                    </p>
                  )}
                </div>
              </div>

              {/* LinkedIn */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Linkedin className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">LinkedIn</p>
                  {isEditing ? (
                    <Input
                      value={formData.linkedinUrl}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, linkedinUrl: e.target.value }))
                      }
                      placeholder="https://linkedin.com/in/..."
                      className="h-7 mt-0.5"
                    />
                  ) : profile?.linkedinUrl ? (
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Profil ansehen
                    </a>
                  ) : (
                    <p className="text-sm font-medium">Nicht angegeben</p>
                  )}
                </div>
              </div>

              {/* Member since */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Mitglied seit</p>
                  <p className="text-sm font-medium">
                    {new Date(user.createdAt).toLocaleDateString("de-DE", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Profil nicht gefunden
          </p>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
