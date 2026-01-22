import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users,
  Search,
  Mail,
  MessageCircle,
  Phone,
  MapPin,
  Building2,
  Filter,
  Grid3X3,
  List,
  UserCircle,
} from "lucide-react";
import { Link } from "wouter";

// Avatar gradient colors based on name
const AVATAR_COLORS = [
  "from-orange-400 to-rose-500",
  "from-blue-400 to-indigo-500",
  "from-green-400 to-emerald-500",
  "from-purple-400 to-violet-500",
  "from-pink-400 to-rose-500",
  "from-teal-400 to-cyan-500",
  "from-amber-400 to-orange-500",
  "from-indigo-400 to-purple-500",
];

function getAvatarColor(name: string): string {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface TeamMember {
  id: number;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  department?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
}

// Team Member Card Component
function TeamMemberCard({
  member,
  viewMode,
  onMessage,
}: {
  member: TeamMember;
  viewMode: "grid" | "list";
  onMessage: (userId: number) => void;
}) {
  const avatarColor = getAvatarColor(member.name || "User");
  const initials = getInitials(member.name);

  if (viewMode === "list") {
    return (
      <Card className="card-shadow rounded-xl hover:shadow-lg transition-all hover:-translate-y-0.5">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <Avatar className="h-14 w-14 ring-2 ring-white shadow-md flex-shrink-0">
              <AvatarImage src={member.avatarUrl || undefined} />
              <AvatarFallback className={`bg-gradient-to-br ${avatarColor} text-white font-bold`}>
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base truncate">{member.name || "Unbekannt"}</h3>
                {member.role === "admin" && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                    Admin
                  </Badge>
                )}
              </div>
              {member.jobTitle && (
                <p className="text-sm text-primary font-medium truncate">{member.jobTitle}</p>
              )}
              {member.department && (
                <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {member.department}
                </p>
              )}
            </div>

            {/* Contact Info */}
            <div className="hidden md:flex flex-col gap-1 text-sm text-muted-foreground">
              {member.email && (
                <a href={`mailto:${member.email}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Mail className="h-4 w-4" />
                  <span className="truncate max-w-[200px]">{member.email}</span>
                </a>
              )}
              {member.phone && (
                <a href={`tel:${member.phone}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Phone className="h-4 w-4" />
                  {member.phone}
                </a>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => onMessage(member.id)}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Link href={`/profile/${member.id}`}>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <UserCircle className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid View
  return (
    <Card className="card-shadow rounded-2xl hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden group">
      {/* Gradient Header */}
      <div className={`h-16 bg-gradient-to-r ${avatarColor} relative`}>
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
          <Avatar className="h-16 w-16 ring-4 ring-white dark:ring-gray-800 shadow-lg">
            <AvatarImage src={member.avatarUrl || undefined} />
            <AvatarFallback className={`bg-gradient-to-br ${avatarColor} text-white font-bold text-lg`}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <CardContent className="pt-12 pb-6 px-4 text-center">
        {/* Name & Role */}
        <div className="mb-3">
          <div className="flex items-center justify-center gap-2">
            <h3 className="font-bold text-lg">{member.name || "Unbekannt"}</h3>
            {member.role === "admin" && (
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                Admin
              </Badge>
            )}
          </div>
          {member.jobTitle && (
            <p className="text-sm text-primary font-medium mt-1">{member.jobTitle}</p>
          )}
        </div>

        {/* Department & Location */}
        <div className="space-y-1 mb-4">
          {member.department && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Building2 className="h-3 w-3" />
              {member.department}
            </p>
          )}
          {member.location && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <MapPin className="h-3 w-3" />
              {member.location}
            </p>
          )}
        </div>

        {/* Contact Buttons */}
        <div className="flex items-center justify-center gap-2">
          {member.email && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              asChild
            >
              <a href={`mailto:${member.email}`}>
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                E-Mail
              </a>
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            className="h-8 bg-gradient-to-r from-primary to-orange-500"
            onClick={() => onMessage(member.id)}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
            Nachricht
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeamDirectory() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch users
  const { data: users, isLoading } = trpc.users.list.useQuery();
  
  // Fetch org positions to get department info
  const { data: positions } = trpc.orgChart.getPositions.useQuery();

  // Build user list with position/department info
  const teamMembers = useMemo(() => {
    if (!users) return [];

    return users.map((u) => {
      // Find position for this user
      const userPosition = positions?.find((p) => p.user?.id === u.id);
      
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        role: u.role,
        department: userPosition?.position.department || null,
        position: userPosition?.position.title || null,
        phone: null, // Could be added to user schema later
        location: null, // Could be added to user schema later
      } as TeamMember;
    });
  }, [users, positions]);

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set<string>();
    teamMembers.forEach((m) => {
      if (m.department) depts.add(m.department);
    });
    return Array.from(depts).sort();
  }, [teamMembers]);

  // Filter members
  const filteredMembers = useMemo(() => {
    let result = teamMembers;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name?.toLowerCase().includes(query) ||
          m.email?.toLowerCase().includes(query) ||
          m.jobTitle?.toLowerCase().includes(query) ||
          m.department?.toLowerCase().includes(query)
      );
    }

    // Department filter
    if (departmentFilter !== "all") {
      result = result.filter((m) => m.department === departmentFilter);
    }

    return result;
  }, [teamMembers, searchQuery, departmentFilter]);

  const handleMessage = (userId: number) => {
    // Navigate to Ohweees with the user selected
    // For now, just show a toast
    toast.info("Direktnachricht-Funktion wird in Ohweees geöffnet");
    window.location.href = `/ohweees?dm=${userId}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg">
            <Users className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Team-Verzeichnis</h1>
            <p className="text-muted-foreground">
              {filteredMembers.length} Mitarbeiter{filteredMembers.length !== 1 ? "" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card className="card-shadow rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Name, E-Mail oder Position suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Abteilung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Abteilungen</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      {filteredMembers.length === 0 ? (
        <Card className="card-shadow rounded-2xl">
          <CardContent className="py-16 text-center">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine Mitarbeiter gefunden</h3>
            <p className="text-muted-foreground">
              {searchQuery || departmentFilter !== "all"
                ? "Versuche andere Suchkriterien."
                : "Es sind noch keine Mitarbeiter registriert."}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMembers.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              viewMode={viewMode}
              onMessage={handleMessage}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              viewMode={viewMode}
              onMessage={handleMessage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
