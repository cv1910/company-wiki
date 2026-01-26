import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Users, 
  Clock, 
  Copy, 
  Mail, 
  Download, 
  Trash2, 
  Edit, 
  MoreHorizontal,
  Share2,
  FileText,
  Printer,
  Check,
  X,
  ArrowLeftRight,
  Settings,
  Filter
} from "lucide-react";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  subWeeks, 
  eachDayOfInterval, 
  isSameDay, 
  getDay,
  parseISO,
  addDays,
  differenceInHours,
  differenceInMinutes
} from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

// Color options for shifts
const SHIFT_COLORS = [
  { value: "blue", label: "Blau", class: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  { value: "green", label: "Grün", class: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30" },
  { value: "red", label: "Rot", class: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30" },
  { value: "orange", label: "Orange", class: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  { value: "purple", label: "Lila", class: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30" },
  { value: "pink", label: "Pink", class: "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30" },
  { value: "teal", label: "Türkis", class: "bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30" },
];

const getColorClass = (color: string) => {
  return SHIFT_COLORS.find(c => c.value === color)?.class || SHIFT_COLORS[0].class;
};

// Standorte werden dynamisch geladen

export default function Schichtplan() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  
  // Form state
  const [shiftTitle, setShiftTitle] = useState("");
  const [shiftDescription, setShiftDescription] = useState("");
  const [shiftDate, setShiftDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [shiftStartTime, setShiftStartTime] = useState("09:00");
  const [shiftEndTime, setShiftEndTime] = useState("17:00");
  const [shiftColor, setShiftColor] = useState("blue");
  const [shiftTeamId, setShiftTeamId] = useState<number | null>(null);
  const [shiftUserId, setShiftUserId] = useState<number | null>(null);
  const [shiftIsAllDay, setShiftIsAllDay] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [shiftLocation, setShiftLocation] = useState<string>("");
  
  // Template form state
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateStartTime, setNewTemplateStartTime] = useState("09:00");
  const [newTemplateEndTime, setNewTemplateEndTime] = useState("17:00");
  const [newTemplateColor, setNewTemplateColor] = useState("blue");
  
  // Week range
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Queries
  const { data: teams } = trpc.teams.list.useQuery();
  const { data: allUsers } = trpc.users.list.useQuery();
  const { data: shiftTemplates, refetch: refetchTemplates } = trpc.shiftTemplates.list.useQuery({ teamId: selectedTeamId || undefined });
  const { data: locations } = trpc.locations.listActive.useQuery();
  
  // Location helper functions
  const getLocationLabel = (value: string) => {
    const loc = locations?.find(l => l.id.toString() === value || l.shortName === value);
    return loc?.name || value;
  };
  
  const getLocationShort = (value: string) => {
    const loc = locations?.find(l => l.id.toString() === value || l.shortName === value);
    return loc?.shortName || value;
  };
  
  // Fetch events for the week
  const { data: events, refetch: refetchEvents, isLoading: eventsLoading } = trpc.calendar.getEvents.useQuery({
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
  });
  
  // Define event type
  type CalendarEvent = NonNullable<typeof events>['events'][number];
  
  // Filter shift events
  const shiftEvents = useMemo(() => {
    if (!events?.events) return [];
    let filtered = events.events.filter((e: CalendarEvent) => e.eventType === "shift");
    
    // Filter by location if selected
    if (selectedLocation) {
      filtered = filtered.filter((e: CalendarEvent) => (e as any).location === selectedLocation);
    }
    
    return filtered;
  }, [events, selectedLocation]);
  
  // Group shifts by team and user
  const shiftsByTeamAndUser = useMemo(() => {
    const result: Record<number, Record<number, CalendarEvent[]>> = {};
    
    shiftEvents.forEach((shift: CalendarEvent) => {
      const teamId = (shift as any).teamId || 0;
      const userId = (shift as any).userId || 0;
      
      if (!result[teamId]) result[teamId] = {};
      if (!result[teamId][userId]) result[teamId][userId] = [];
      
      result[teamId][userId].push(shift);
    });
    
    return result;
  }, [shiftEvents]);
  
  // Get team name
  const getTeamName = (teamId: number) => {
    return teams?.find(t => t.id === teamId)?.name || `Team ${teamId}`;
  };
  
  // Get user name
  const getUserName = (userId: number) => {
    const u = allUsers?.find(u => u.id === userId);
    return u?.name || `Benutzer ${userId}`;
  };
  
  // Get user avatar
  const getUserAvatar = (userId: number) => {
    return allUsers?.find(u => u.id === userId)?.avatarUrl;
  };
  
  // Mutations
  const createEvent = trpc.calendar.create.useMutation({
    onSuccess: () => {
      refetchEvents();
      setShowCreateDialog(false);
      resetForm();
      toast.success("Schicht erstellt");
    },
    onError: (error: any) => {
      toast.error("Fehler beim Erstellen: " + error.message);
    },
  });
  
  const updateEvent = trpc.calendar.update.useMutation({
    onSuccess: () => {
      refetchEvents();
      setShowCreateDialog(false);
      setEditingShift(null);
      resetForm();
      toast.success("Schicht aktualisiert");
    },
    onError: (error: any) => {
      toast.error("Fehler beim Aktualisieren: " + error.message);
    },
  });
  
  const deleteEvent = trpc.calendar.delete.useMutation({
    onSuccess: () => {
      refetchEvents();
      toast.success("Schicht gelöscht");
    },
    onError: (error: any) => {
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });
  
  const createTemplate = trpc.shiftTemplates.create.useMutation({
    onSuccess: () => {
      refetchTemplates();
      setShowTemplateDialog(false);
      setNewTemplateName("");
      setNewTemplateDescription("");
      toast.success("Vorlage erstellt");
    },
  });
  
  const deleteTemplate = trpc.shiftTemplates.delete.useMutation({
    onSuccess: () => {
      refetchTemplates();
      toast.success("Vorlage gelöscht");
    },
  });
  
  // Reset form
  const resetForm = () => {
    setShiftTitle("");
    setShiftDescription("");
    setShiftDate(format(new Date(), "yyyy-MM-dd"));
    setShiftStartTime("09:00");
    setShiftEndTime("17:00");
    setShiftColor("blue");
    setShiftTeamId(null);
    setShiftUserId(null);
    setShiftIsAllDay(false);
    setSelectedTemplateId(null);
    setShiftLocation("eppendorfer-landstrasse");
  };
  
  // Open create dialog for a specific day
  const openCreateForDay = (day: Date, teamId?: number) => {
    resetForm();
    setShiftDate(format(day, "yyyy-MM-dd"));
    if (teamId) setShiftTeamId(teamId);
    setShowCreateDialog(true);
  };
  
  // Open edit dialog
  const openEditDialog = (shift: any) => {
    setEditingShift(shift);
    setShiftTitle(shift.title);
    setShiftDescription(shift.description || "");
    setShiftDate(format(new Date(shift.startDate), "yyyy-MM-dd"));
    setShiftStartTime(format(new Date(shift.startDate), "HH:mm"));
    setShiftEndTime(format(new Date(shift.endDate), "HH:mm"));
    setShiftColor(shift.color);
    setShiftTeamId((shift as any).teamId);
    setShiftUserId((shift as any).userId);
    setShiftIsAllDay(shift.isAllDay);
    setShiftLocation(shift.location || "eppendorfer-landstrasse");
    setShowCreateDialog(true);
  };
  
  // Apply template
  const applyTemplate = (templateId: number) => {
    const template = shiftTemplates?.find(t => t.id === templateId);
    if (template) {
      setShiftTitle(template.name);
      setShiftDescription(template.description || "");
      setShiftStartTime(template.startTime);
      setShiftEndTime(template.endTime);
      setShiftColor(template.color || "blue");
      setSelectedTemplateId(templateId);
    }
  };
  
  // Save shift
  const handleSaveShift = () => {
    const startDate = new Date(`${shiftDate}T${shiftStartTime}:00`);
    const endDate = new Date(`${shiftDate}T${shiftEndTime}:00`);
    
    if (editingShift) {
      updateEvent.mutate({
        id: editingShift.id,
        title: shiftTitle,
        description: shiftDescription || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isAllDay: shiftIsAllDay,
        color: shiftColor,
        eventType: "shift",
        teamId: shiftTeamId || undefined,
        location: shiftLocation,
      });
    } else {
      createEvent.mutate({
        title: shiftTitle,
        description: shiftDescription || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isAllDay: shiftIsAllDay,
        color: shiftColor,
        eventType: "shift",
        teamId: shiftTeamId || undefined,
        location: shiftLocation,
      });
    }
  };
  
  // Generate share link
  const generateShareLink = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      week: format(weekStart, "yyyy-MM-dd"),
      ...(selectedTeamId && { team: selectedTeamId.toString() }),
    });
    return `${baseUrl}/schichtplan?${params.toString()}`;
  };
  
  // Copy share link
  const copyShareLink = () => {
    navigator.clipboard.writeText(generateShareLink());
    toast.success("Link kopiert!");
  };
  
  // Export as CSV
  const exportCSV = () => {
    const headers = ["Datum", "Tag", "Mitarbeiter", "Team", "Standort", "Schicht", "Start", "Ende", "Stunden"];
    const rows: string[][] = [];
    
    weekDays.forEach(day => {
      shiftEvents.forEach((shift: CalendarEvent) => {
        const shiftStart = new Date(shift.startDate);
        if (isSameDay(shiftStart, day)) {
          const shiftEnd = new Date(shift.endDate);
          const hours = differenceInMinutes(shiftEnd, shiftStart) / 60;
          rows.push([
            format(day, "dd.MM.yyyy"),
            format(day, "EEEE", { locale: de }),
            getUserName((shift as any).userId || 0),
            getTeamName((shift as any).teamId || 0),
            getLocationLabel((shift as any).location || ""),
            shift.title,
            format(shiftStart, "HH:mm"),
            format(shiftEnd, "HH:mm"),
            hours.toFixed(1),
          ]);
        }
      });
    });
    
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `schichtplan_${format(weekStart, "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportiert");
  };
  
  // Print
  const handlePrint = () => {
    window.print();
  };
  
  // Filter teams that are shift teams
  const shiftTeams = useMemo(() => {
    if (!teams) return [];
    const shiftTeamNames = ['pos', 'versand', 'lager', 'warehouse', 'shipping', 'retail', 'store'];
    return teams.filter(team => 
      shiftTeamNames.some(name => team.name.toLowerCase().includes(name))
    );
  }, [teams]);
  
  // Get shifts for a specific day and user
  const getShiftsForDayAndUser = (day: Date, userId: number) => {
    return shiftEvents.filter((shift: CalendarEvent) => {
      const shiftStart = new Date(shift.startDate);
      return isSameDay(shiftStart, day) && (shift as any).userId === userId;
    });
  };
  
  // Get all users with shifts in the selected team
  const usersWithShifts = useMemo(() => {
    const userIds = new Set<number>();
    shiftEvents.forEach((shift: CalendarEvent) => {
      if (!selectedTeamId || (shift as any).teamId === selectedTeamId) {
        if ((shift as any).userId) {
          userIds.add((shift as any).userId);
        }
      }
    });
    return Array.from(userIds);
  }, [shiftEvents, selectedTeamId]);
  
  const isAdmin = user?.role === "admin";
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Schichtplan</h1>
          <p className="text-muted-foreground">
            Wochenübersicht und Schichtverwaltung
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Standort Filter */}
          <Select
            value={selectedLocation || "all"}
            onValueChange={(v) => setSelectedLocation(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[220px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Alle Standorte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Standorte</SelectItem>
              {locations?.map((loc) => (
                <SelectItem key={loc.id} value={loc.id.toString()}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Team Filter */}
          <Select
            value={selectedTeamId?.toString() || "all"}
            onValueChange={(v) => setSelectedTeamId(v === "all" ? null : parseInt(v))}
          >
            <SelectTrigger className="w-[180px]">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Alle Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Teams</SelectItem>
              {shiftTeams.map((team) => (
                <SelectItem key={team.id} value={team.id.toString()}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Teilen
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyShareLink}>
                <Copy className="h-4 w-4 mr-2" />
                Link kopieren
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                <Mail className="h-4 w-4 mr-2" />
                Per E-Mail senden
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Als CSV exportieren
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Drucken
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Vorlagen
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Neue Schicht
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <h2 className="text-lg font-semibold">
                {format(weekStart, "d. MMMM", { locale: de })} - {format(weekEnd, "d. MMMM yyyy", { locale: de })}
              </h2>
              <p className="text-sm text-muted-foreground">
                KW {format(weekStart, "w", { locale: de })}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Shift Grid */}
      <Card className="overflow-hidden print:shadow-none">
        <CardContent className="p-0">
          {eventsLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] sticky left-0 bg-background z-10">Mitarbeiter</TableHead>
                    {weekDays.map((day) => (
                      <TableHead 
                        key={day.toISOString()} 
                        className={cn(
                          "min-w-[120px] text-center",
                          (getDay(day) === 0 || getDay(day) === 6) && "bg-muted/30"
                        )}
                      >
                        <div className="font-medium">{format(day, "EEE", { locale: de })}</div>
                        <div className="text-xs text-muted-foreground">{format(day, "d. MMM", { locale: de })}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersWithShifts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="text-muted-foreground">
                          <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="font-medium">Keine Schichten in dieser Woche</p>
                          <p className="text-sm mt-1">Erstellen Sie eine neue Schicht, um zu beginnen.</p>
                          {isAdmin && (
                            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Schicht erstellen
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    usersWithShifts.map((userId) => (
                      <TableRow key={userId}>
                        <TableCell className="sticky left-0 bg-background z-10">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={getUserAvatar(userId) || undefined} />
                              <AvatarFallback>{getUserName(userId).charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium truncate max-w-[120px]">{getUserName(userId)}</span>
                          </div>
                        </TableCell>
                        {weekDays.map((day) => {
                          const dayShifts = getShiftsForDayAndUser(day, userId);
                          return (
                            <TableCell 
                              key={day.toISOString()} 
                              className={cn(
                                "p-1 align-top",
                                (getDay(day) === 0 || getDay(day) === 6) && "bg-muted/30"
                              )}
                            >
                              <div className="space-y-1 min-h-[60px]">
                                {dayShifts.map((shift) => (
                                  <div
                                    key={shift.id}
                                    className={cn(
                                      "p-2 rounded-md text-xs cursor-pointer border transition-colors hover:opacity-80",
                                      getColorClass(shift.color)
                                    )}
                                    onClick={() => isAdmin && openEditDialog(shift)}
                                  >
                                    <div className="font-medium truncate">{shift.title}</div>
                                    {(shift as any).location && (
                                      <div className="text-[10px] opacity-70 font-medium">
                                        {getLocationShort((shift as any).location)}
                                      </div>
                                    )}
                                    {!shift.isAllDay && (
                                      <div className="text-[10px] opacity-80">
                                        {format(new Date(shift.startDate), "HH:mm")} - {format(new Date(shift.endDate), "HH:mm")}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {isAdmin && dayShifts.length === 0 && (
                                  <button
                                    className="w-full h-full min-h-[60px] rounded-md border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-center"
                                    onClick={() => openCreateForDay(day)}
                                  >
                                    <Plus className="h-4 w-4 text-muted-foreground/50" />
                                  </button>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Schichten diese Woche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shiftEvents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mitarbeiter eingeplant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersWithShifts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gesamtstunden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shiftEvents.reduce((acc: number, shift: CalendarEvent) => {
                const start = new Date(shift.startDate);
                const end = new Date(shift.endDate);
                return acc + differenceInMinutes(end, start) / 60;
              }, 0).toFixed(1)} h
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Create/Edit Shift Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingShift(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingShift ? "Schicht bearbeiten" : "Neue Schicht erstellen"}</DialogTitle>
            <DialogDescription>
              {editingShift ? "Bearbeiten Sie die Schichtdetails." : "Erstellen Sie eine neue Schicht für das Team."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Template Selection */}
            {shiftTemplates && shiftTemplates.length > 0 && !editingShift && (
              <div className="space-y-2">
                <Label>Vorlage verwenden</Label>
                <Select
                  value={selectedTemplateId?.toString() || ""}
                  onValueChange={(v) => v && applyTemplate(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vorlage auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {shiftTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name} ({template.startTime} - {template.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Bezeichnung *</Label>
              <Input
                id="title"
                value={shiftTitle}
                onChange={(e) => setShiftTitle(e.target.value)}
                placeholder="z.B. Frühschicht, Spätschicht..."
              />
            </div>
            
            {/* Standort */}
            <div className="space-y-2">
              <Label>Standort *</Label>
              <Select
                value={shiftLocation}
                onValueChange={(v) => setShiftLocation(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Standort auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id.toString()}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Team */}
            <div className="space-y-2">
              <Label>Team *</Label>
              <Select
                value={shiftTeamId?.toString() || ""}
                onValueChange={(v) => setShiftTeamId(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Team auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {shiftTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* User */}
            <div className="space-y-2">
              <Label>Mitarbeiter</Label>
              <Select
                value={shiftUserId?.toString() || ""}
                onValueChange={(v) => setShiftUserId(v ? parseInt(v) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers?.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Datum *</Label>
              <Input
                id="date"
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
              />
            </div>
            
            {/* All Day Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="allDay"
                checked={shiftIsAllDay}
                onCheckedChange={setShiftIsAllDay}
              />
              <Label htmlFor="allDay">Ganztägig</Label>
            </div>
            
            {/* Time */}
            {!shiftIsAllDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Startzeit</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Endzeit</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {/* Color */}
            <div className="space-y-2">
              <Label>Farbe</Label>
              <div className="flex flex-wrap gap-2">
                {SHIFT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      color.class,
                      shiftColor === color.value ? "ring-2 ring-offset-2 ring-primary" : ""
                    )}
                    onClick={() => setShiftColor(color.value)}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={shiftDescription}
                onChange={(e) => setShiftDescription(e.target.value)}
                placeholder="Optionale Notizen..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingShift && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Schicht wirklich löschen?")) {
                    deleteEvent.mutate({ id: editingShift.id });
                    setShowCreateDialog(false);
                    setEditingShift(null);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setEditingShift(null);
              resetForm();
            }}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSaveShift}
              disabled={!shiftTitle || !shiftTeamId || createEvent.isPending || updateEvent.isPending}
            >
              {editingShift ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schichtplan teilen</DialogTitle>
            <DialogDescription>
              Teilen Sie den Schichtplan per E-Mail oder kopieren Sie den Link.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Link zum Schichtplan</Label>
              <div className="flex gap-2">
                <Input value={generateShareLink()} readOnly />
                <Button variant="outline" onClick={copyShareLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Per E-Mail senden</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const subject = encodeURIComponent(`Schichtplan KW ${format(weekStart, "w")}`);
                  const body = encodeURIComponent(`Hier ist der Schichtplan für die Woche vom ${format(weekStart, "d. MMMM", { locale: de })} bis ${format(weekEnd, "d. MMMM yyyy", { locale: de })}:\n\n${generateShareLink()}`);
                  window.open(`mailto:?subject=${subject}&body=${body}`);
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                E-Mail-Client öffnen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Template Management Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schicht-Vorlagen verwalten</DialogTitle>
            <DialogDescription>
              Erstellen und verwalten Sie wiederverwendbare Schicht-Vorlagen.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Existing Templates */}
            {shiftTemplates && shiftTemplates.length > 0 && (
              <div className="space-y-2">
                <Label>Vorhandene Vorlagen</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {shiftTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {template.startTime} - {template.endTime}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Vorlage wirklich löschen?")) {
                            deleteTemplate.mutate({ id: template.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* New Template Form */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Neue Vorlage erstellen</Label>
              
              <div className="space-y-2">
                <Label htmlFor="templateName">Name *</Label>
                <Input
                  id="templateName"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="z.B. Frühschicht"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="templateStart">Startzeit</Label>
                  <Input
                    id="templateStart"
                    type="time"
                    value={newTemplateStartTime}
                    onChange={(e) => setNewTemplateStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateEnd">Endzeit</Label>
                  <Input
                    id="templateEnd"
                    type="time"
                    value={newTemplateEndTime}
                    onChange={(e) => setNewTemplateEndTime(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="templateDesc">Beschreibung</Label>
                <Input
                  id="templateDesc"
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="Optionale Beschreibung..."
                />
              </div>
              
              <Button
                onClick={() => {
                  if (!newTemplateName || !selectedTeamId) {
                    toast.error("Bitte Name und Team angeben");
                    return;
                  }
                  createTemplate.mutate({
                    name: newTemplateName,
                    description: newTemplateDescription || undefined,
                    teamId: selectedTeamId,
                    startTime: newTemplateStartTime,
                    endTime: newTemplateEndTime,
                    color: newTemplateColor,
                  });
                }}
                disabled={!newTemplateName || createTemplate.isPending}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Vorlage erstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
