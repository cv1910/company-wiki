import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  Shield,
  User,
} from "lucide-react";

const TEAM_COLORS = [
  { value: "blue", label: "Blau", class: "bg-blue-500" },
  { value: "green", label: "Grün", class: "bg-green-500" },
  { value: "purple", label: "Lila", class: "bg-purple-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
  { value: "teal", label: "Türkis", class: "bg-teal-500" },
  { value: "red", label: "Rot", class: "bg-red-500" },
  { value: "yellow", label: "Gelb", class: "bg-yellow-500" },
];

export default function TeamsPage() {
  const utils = trpc.useUtils();
  const { data: teams, isLoading } = trpc.teams.list.useQuery();
  const { data: allUsers } = trpc.users.list.useQuery();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);

  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamColor, setTeamColor] = useState("blue");

  const { data: teamDetails } = trpc.teams.getById.useQuery(
    { id: selectedTeam! },
    { enabled: !!selectedTeam }
  );

  const createTeam = trpc.teams.create.useMutation({
    onSuccess: () => {
      utils.teams.list.invalidate();
      setShowCreateDialog(false);
      resetForm();
      toast.success("Team erstellt");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateTeam = trpc.teams.update.useMutation({
    onSuccess: () => {
      utils.teams.list.invalidate();
      utils.teams.getById.invalidate({ id: selectedTeam! });
      setShowEditDialog(false);
      toast.success("Team aktualisiert");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteTeam = trpc.teams.delete.useMutation({
    onSuccess: () => {
      utils.teams.list.invalidate();
      toast.success("Team gelöscht");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addMember = trpc.teams.addMember.useMutation({
    onSuccess: () => {
      utils.teams.getById.invalidate({ id: selectedTeam! });
      toast.success("Mitglied hinzugefügt");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeMember = trpc.teams.removeMember.useMutation({
    onSuccess: () => {
      utils.teams.getById.invalidate({ id: selectedTeam! });
      toast.success("Mitglied entfernt");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMemberRole = trpc.teams.updateMemberRole.useMutation({
    onSuccess: () => {
      utils.teams.getById.invalidate({ id: selectedTeam! });
      toast.success("Rolle aktualisiert");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setTeamName("");
    setTeamDescription("");
    setTeamColor("blue");
  };

  const handleCreateTeam = () => {
    if (!teamName.trim()) {
      toast.error("Bitte gib einen Teamnamen ein");
      return;
    }
    createTeam.mutate({
      name: teamName,
      description: teamDescription || undefined,
      color: teamColor,
    });
  };

  const handleEditTeam = () => {
    if (!selectedTeam || !teamName.trim()) return;
    updateTeam.mutate({
      id: selectedTeam,
      name: teamName,
      description: teamDescription || undefined,
      color: teamColor,
    });
  };

  const handleDeleteTeam = (id: number) => {
    if (confirm("Möchtest du dieses Team wirklich löschen?")) {
      deleteTeam.mutate({ id });
    }
  };

  const openEditDialog = (team: typeof teams extends (infer T)[] | undefined ? T : never) => {
    if (!team) return;
    setSelectedTeam(team.id);
    setTeamName(team.name);
    setTeamDescription(team.description || "");
    setTeamColor(team.color || "blue");
    setShowEditDialog(true);
  };

  const openMembersDialog = (teamId: number) => {
    setSelectedTeam(teamId);
    setShowMembersDialog(true);
  };

  const getColorClass = (color: string) => {
    return TEAM_COLORS.find((c) => c.value === color)?.class || "bg-blue-500";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get users not in the current team
  const availableUsers = allUsers?.filter(
    (user) => !teamDetails?.members.some((m) => m.user.id === user.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Teams</h1>
          <p className="text-muted-foreground">
            Verwalte Teams und weise Mitarbeiter zu
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Neues Team
        </Button>
      </div>

      {/* Teams Grid */}
      {teams && teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-card border rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${getColorClass(team.color || "blue")} flex items-center justify-center`}
                  >
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium">{team.name}</h3>
                    {team.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {team.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openMembersDialog(team.id)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Mitglieder
                </Button>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(team)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTeam(team.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/30 rounded-xl">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Noch keine Teams</h3>
          <p className="text-muted-foreground mb-4">
            Erstelle dein erstes Team, um Mitarbeiter zu organisieren
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Team erstellen
          </Button>
        </div>
      )}

      {/* Create Team Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Team erstellen</DialogTitle>
            <DialogDescription>
              Erstelle ein Team, um Mitarbeiter zu gruppieren
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="z.B. Marketing"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Beschreibung</label>
              <Textarea
                placeholder="Optional: Beschreibe das Team"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Farbe</label>
              <div className="flex gap-2 flex-wrap">
                {TEAM_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setTeamColor(color.value)}
                    className={`w-8 h-8 rounded-full ${color.class} ${
                      teamColor === color.value
                        ? "ring-2 ring-offset-2 ring-primary"
                        : ""
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateTeam} disabled={createTeam.isPending}>
              {createTeam.isPending ? "Erstelle..." : "Team erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Team bearbeiten</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="z.B. Marketing"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Beschreibung</label>
              <Textarea
                placeholder="Optional: Beschreibe das Team"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Farbe</label>
              <div className="flex gap-2 flex-wrap">
                {TEAM_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setTeamColor(color.value)}
                    className={`w-8 h-8 rounded-full ${color.class} ${
                      teamColor === color.value
                        ? "ring-2 ring-offset-2 ring-primary"
                        : ""
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleEditTeam} disabled={updateTeam.isPending}>
              {updateTeam.isPending ? "Speichere..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {teamDetails?.name} - Mitglieder
            </DialogTitle>
            <DialogDescription>
              Verwalte die Mitglieder dieses Teams
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Add Member */}
            {availableUsers && availableUsers.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Mitglied hinzufügen</label>
                <Select
                  onValueChange={(userId) => {
                    if (selectedTeam) {
                      addMember.mutate({
                        teamId: selectedTeam,
                        userId: parseInt(userId),
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mitarbeiter auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.name || user.email || "")}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.name || user.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Members List */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Aktuelle Mitglieder</label>
              {teamDetails?.members && teamDetails.members.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {teamDetails.members.map((member) => (
                    <div
                      key={member.user.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.user.avatarUrl || undefined} />
                          <AvatarFallback>
                            {getInitials(member.user.name || member.user.email || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={member.membership.role === "admin" ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => {
                            if (selectedTeam) {
                              updateMemberRole.mutate({
                                teamId: selectedTeam,
                                userId: member.user.id,
                                role: member.membership.role === "admin" ? "member" : "admin",
                              });
                            }
                          }}
                        >
                          {member.membership.role === "admin" ? (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            <>
                              <User className="h-3 w-3 mr-1" />
                              Mitglied
                            </>
                          )}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (selectedTeam) {
                              removeMember.mutate({
                                teamId: selectedTeam,
                                userId: member.user.id,
                              });
                            }
                          }}
                        >
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Noch keine Mitglieder</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowMembersDialog(false)}>
              Fertig
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
