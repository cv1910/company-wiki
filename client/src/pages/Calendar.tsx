import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  MoreHorizontal,
  Grid3X3,
  List,
  Columns,
  LayoutGrid,
  Download,
  Upload,
  FileDown,
  FileUp,
  Settings,
  Link2,
  Users,
  FileText,
  Repeat,
  Timer,
  Circle,
  Bell,
  X,
  ArrowRight,
  GripVertical,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addYears,
  subYears,
  getDay,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  isToday,
  parseISO,
  differenceInDays,
} from "date-fns";
import { de } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { YearCalendarView } from "@/components/YearCalendarView";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useCallback } from "react";

type ViewMode = "day" | "week" | "month" | "year" | "shifts";

interface CalendarEvent {
  id: number;
  title: string;
  description?: string | null;
  startDate: Date | string;
  endDate: Date | string;
  isAllDay: boolean;
  color: string;
  eventType: string;
  location?: string | null;
  notes?: string | null;
  linkedResourceType?: string | null;
  linkedResourceId?: number | null;
}

const EVENT_COLORS = [
  { value: "blue", label: "Blau", class: "bg-blue-500" },
  { value: "green", label: "Grün", class: "bg-green-500" },
  { value: "red", label: "Rot", class: "bg-red-500" },
  { value: "yellow", label: "Gelb", class: "bg-yellow-500" },
  { value: "purple", label: "Lila", class: "bg-purple-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "teal", label: "Türkis", class: "bg-teal-500" },
];

const EVENT_TYPES = [
  { value: "personal", label: "Persönlich" },
  { value: "meeting", label: "Meeting" },
  { value: "reminder", label: "Erinnerung" },
  { value: "shift", label: "Schicht (Einsatzplan)" },
  { value: "other", label: "Sonstiges" },
];

function getColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
    green: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
    red: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
    yellow: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
    purple: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
    pink: "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30",
    orange: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30",
    teal: "bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30",
  };
  return colorMap[color] || colorMap.blue;
}

function getDotColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    pink: "bg-pink-500",
    orange: "bg-orange-500",
    teal: "bg-teal-500",
  };
  return colorMap[color] || colorMap.blue;
}

export default function Calendar() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showTeamLeaves, setShowTeamLeaves] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importOverwrite, setImportOverwrite] = useState(false);

  // Form state
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventIsAllDay, setEventIsAllDay] = useState(false);
  const [eventColor, setEventColor] = useState("blue");
  const [eventType, setEventType] = useState("personal");
  const [eventLocation, setEventLocation] = useState("");
  // Extended options (Hey Calendar style)
  const [eventLink, setEventLink] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [eventIsCircle, setEventIsCircle] = useState(false);
  const [eventShowCountdown, setEventShowCountdown] = useState(false);
  const [eventReminderMinutes, setEventReminderMinutes] = useState<number | null>(null);
  const [eventIsRecurring, setEventIsRecurring] = useState(false);
  const [eventRecurrenceRule, setEventRecurrenceRule] = useState("");
  // Team selection for shift events
  const [eventTeamId, setEventTeamId] = useState<number | null>(null);
  // UI state for optional fields
  const [showLinkField, setShowLinkField] = useState(false);
  const [showNotesField, setShowNotesField] = useState(false);
  const [showRepeatField, setShowRepeatField] = useState(false);
  
  // Drag & Drop state
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const utils = trpc.useUtils();

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    await utils.calendar.getEvents.invalidate();
    toast.success("Aktualisiert");
  }, [utils]);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case "day":
        return {
          start: new Date(currentDate.setHours(0, 0, 0, 0)),
          end: new Date(currentDate.setHours(23, 59, 59, 999)),
        };
      case "week":
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case "month":
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return {
          start: startOfWeek(monthStart, { weekStartsOn: 1 }),
          end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
        };
      case "year":
        return {
          start: startOfYear(currentDate),
          end: endOfYear(currentDate),
        };
      case "shifts":
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      default:
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
    }
  }, [currentDate, viewMode]);

  // Fetch teams for shift events
  const { data: teams } = trpc.teams.list.useQuery();
  const { data: myTeams } = trpc.teams.myTeams.useQuery();
  
  // Check if user is in POS or Versand team
  const isInShiftTeam = useMemo(() => {
    if (!myTeams) return false;
    const shiftTeamNames = ['pos', 'versand', 'lager', 'warehouse', 'shipping'];
    return myTeams.some(t => 
      shiftTeamNames.some(name => t.team.name.toLowerCase().includes(name))
    );
  }, [myTeams]);

  // Fetch events
  const { data: calendarData, isLoading } = trpc.calendar.getEvents.useQuery({
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
    includeTeamLeaves: showTeamLeaves,
  });

  // Mutations
  const createEvent = trpc.calendar.create.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      toast.success("Termin erstellt");
      resetForm();
      setShowEventDialog(false);
    },
    onError: (error) => {
      toast.error("Fehler beim Erstellen: " + error.message);
    },
  });

  const updateEvent = trpc.calendar.update.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      toast.success("Termin aktualisiert");
      resetForm();
      setShowEventDialog(false);
    },
    onError: (error) => {
      toast.error("Fehler beim Aktualisieren: " + error.message);
    },
  });

  const deleteEvent = trpc.calendar.delete.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      toast.success("Termin gelöscht");
      resetForm();
      setShowEventDialog(false);
    },
    onError: (error) => {
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  // Export mutation
  const exportIcal = trpc.calendar.exportIcal.useMutation({
    onSuccess: (data) => {
      // Create blob and download
      const blob = new Blob([data.content], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${data.eventCount} Termine exportiert`);
    },
    onError: (error) => {
      toast.error("Fehler beim Export: " + error.message);
    },
  });

  // Import mutation
  const importIcal = trpc.calendar.importIcal.useMutation({
    onSuccess: (data) => {
      utils.calendar.getEvents.invalidate();
      setShowImportDialog(false);
      setImportFile(null);
      setImportOverwrite(false);
      if (data.errors && data.errors.length > 0) {
        toast.warning(`${data.imported} importiert, ${data.skipped} übersprungen, ${data.errors.length} Fehler`);
      } else {
        toast.success(`${data.imported} Termine importiert, ${data.skipped} übersprungen`);
      }
    },
    onError: (error) => {
      toast.error("Fehler beim Import: " + error.message);
    },
  });

  // Drag & Drop handlers
  const handleDragStart = (event: CalendarEvent, e: React.DragEvent) => {
    if (event.id < 0) {
      // Urlaube können nicht verschoben werden
      e.preventDefault();
      return;
    }
    setDraggedEvent(event);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", event.id.toString());
    // Ghost-Element Styling
    const target = e.target as HTMLElement;
    target.style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedEvent(null);
    setDragOverDate(null);
    setIsDragging(false);
    const target = e.target as HTMLElement;
    target.style.opacity = "1";
  };

  const handleDragOver = (date: Date, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(date);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (targetDate: Date, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDate(null);
    
    if (!draggedEvent) return;
    
    const eventStart = new Date(draggedEvent.startDate);
    const eventEnd = new Date(draggedEvent.endDate);
    const duration = eventEnd.getTime() - eventStart.getTime();
    
    // Berechne neue Start- und Endzeit
    const newStart = new Date(targetDate);
    if (!draggedEvent.isAllDay) {
      // Behalte die ursprüngliche Uhrzeit bei
      newStart.setHours(eventStart.getHours(), eventStart.getMinutes(), 0, 0);
    } else {
      newStart.setHours(0, 0, 0, 0);
    }
    const newEnd = new Date(newStart.getTime() + duration);
    
    // Update Event
    updateEvent.mutate({
      id: draggedEvent.id,
      startDate: newStart.toISOString(),
      endDate: newEnd.toISOString(),
    });
    
    setDraggedEvent(null);
    setIsDragging(false);
    toast.success("Termin verschoben");
  };

  // Handle export
  const handleExport = () => {
    exportIcal.mutate({});
  };

  // Handle import
  const handleImport = async () => {
    if (!importFile) {
      toast.error("Bitte wähle eine Datei aus");
      return;
    }
    const content = await importFile.text();
    importIcal.mutate({ content, overwriteExisting: importOverwrite });
  };

  // Combine all events
  const allEvents = useMemo(() => {
    if (!calendarData) return [];
    const events: CalendarEvent[] = [
      ...calendarData.events,
      ...calendarData.leaves,
      ...calendarData.teamLeaves,
    ];
    return events;
  }, [calendarData]);

  // Get events for a specific day
  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return allEvents.filter((event) => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  };

  // Navigation
  const navigate = (direction: "prev" | "next") => {
    switch (viewMode) {
      case "day":
        setCurrentDate(direction === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        break;
      case "year":
        setCurrentDate(direction === "prev" ? subYears(currentDate, 1) : addYears(currentDate, 1));
        break;
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Form handling
  const resetForm = () => {
    setEventTitle("");
    setEventDescription("");
    setEventStartDate("");
    setEventEndDate("");
    setEventIsAllDay(false);
    setEventColor("blue");
    setEventType("personal");
    setEventLocation("");
    // Extended options reset
    setEventLink("");
    setEventNotes("");
    setEventIsCircle(false);
    setEventShowCountdown(false);
    setEventReminderMinutes(null);
    setEventIsRecurring(false);
    setEventRecurrenceRule("");
    setShowLinkField(false);
    setShowNotesField(false);
    setShowRepeatField(false);
    setEventTeamId(null);
    setEditingEvent(null);
    setSelectedDate(null);
  };

  const openNewEventDialog = (date?: Date) => {
    resetForm();
    if (date) {
      const dateStr = format(date, "yyyy-MM-dd");
      setEventStartDate(dateStr + "T09:00");
      setEventEndDate(dateStr + "T10:00");
    }
    setShowEventDialog(true);
  };

  const openEditEventDialog = (event: CalendarEvent) => {
    if (event.id < 0) {
      toast.info("Urlaube können nicht bearbeitet werden");
      return;
    }
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDescription(event.description || "");
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    if (event.isAllDay) {
      setEventStartDate(format(startDate, "yyyy-MM-dd"));
      setEventEndDate(format(endDate, "yyyy-MM-dd"));
    } else {
      setEventStartDate(format(startDate, "yyyy-MM-dd'T'HH:mm"));
      setEventEndDate(format(endDate, "yyyy-MM-dd'T'HH:mm"));
    }
    setEventIsAllDay(event.isAllDay);
    setEventColor(event.color);
    setEventType(event.eventType);
    setEventLocation(event.location || "");
    setShowEventDialog(true);
  };

  const handleSubmit = () => {
    if (!eventTitle.trim()) {
      toast.error("Bitte gib einen Titel ein");
      return;
    }
    if (!eventStartDate || !eventEndDate) {
      toast.error("Bitte wähle Start- und Enddatum");
      return;
    }

    const startDate = eventIsAllDay
      ? new Date(eventStartDate + "T00:00:00")
      : new Date(eventStartDate);
    const endDate = eventIsAllDay
      ? new Date(eventEndDate + "T23:59:59")
      : new Date(eventEndDate);

    if (endDate < startDate) {
      toast.error("Das Enddatum muss nach dem Startdatum liegen");
      return;
    }

    const eventData = {
      title: eventTitle,
      description: eventDescription || undefined,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isAllDay: eventIsAllDay,
      color: eventColor,
      eventType: eventType as "personal" | "meeting" | "reminder" | "vacation" | "shift" | "other",
      location: eventLocation || undefined,
      teamId: eventType === "shift" ? eventTeamId : undefined,
      isCircleEvent: eventIsCircle,
      showCountdown: eventShowCountdown,
      reminderMinutes: eventReminderMinutes,
      link: eventLink || undefined,
      notes: eventNotes || undefined,
    };

    if (editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, ...eventData });
    } else {
      createEvent.mutate(eventData);
    }
  };

  const handleDelete = () => {
    if (editingEvent && editingEvent.id > 0) {
      deleteEvent.mutate({ id: editingEvent.id });
    }
  };

  // Get title for current view
  const getViewTitle = () => {
    switch (viewMode) {
      case "day":
        return format(currentDate, "EEEE, d. MMMM yyyy", { locale: de });
      case "week":
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${format(weekStart, "d.")} - ${format(weekEnd, "d. MMMM yyyy", { locale: de })}`;
        }
        return `${format(weekStart, "d. MMM", { locale: de })} - ${format(weekEnd, "d. MMM yyyy", { locale: de })}`;
      case "month":
        return format(currentDate, "MMMM yyyy", { locale: de });
      case "year":
        return format(currentDate, "yyyy");
    }
  };

  // Render month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    
    // Group days into weeks
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    // Get multi-day events that span across days
    const getMultiDayEventsForWeek = (weekDays: Date[]) => {
      const weekStart = weekDays[0];
      const weekEnd = weekDays[6];
      weekEnd.setHours(23, 59, 59, 999);
      
      return allEvents.filter(event => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        // Check if event spans multiple days and overlaps with this week
        const isMultiDay = differenceInDays(eventEnd, eventStart) >= 1 || event.isAllDay;
        const overlapsWeek = eventStart <= weekEnd && eventEnd >= weekStart;
        return isMultiDay && overlapsWeek;
      }).sort((a, b) => {
        // Sort by start date, then by duration (longer first)
        const startDiff = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        if (startDiff !== 0) return startDiff;
        const aDuration = differenceInDays(new Date(a.endDate), new Date(a.startDate));
        const bDuration = differenceInDays(new Date(b.endDate), new Date(b.startDate));
        return bDuration - aDuration;
      });
    };
    
    // Calculate event bar positions for a week
    const getEventBarsForWeek = (weekDays: Date[], multiDayEvents: CalendarEvent[]) => {
      const bars: { event: CalendarEvent; startCol: number; endCol: number; row: number; isStart: boolean; isEnd: boolean }[] = [];
      const rowOccupancy: boolean[][] = []; // rowOccupancy[row][col] = occupied
      
      multiDayEvents.forEach(event => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        eventStart.setHours(0, 0, 0, 0);
        eventEnd.setHours(23, 59, 59, 999);
        
        // Find start and end columns within this week
        let startCol = 0;
        let endCol = 6;
        let isStart = false;
        let isEnd = false;
        
        for (let i = 0; i < 7; i++) {
          const dayStart = new Date(weekDays[i]);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(weekDays[i]);
          dayEnd.setHours(23, 59, 59, 999);
          
          if (isSameDay(dayStart, eventStart) || (eventStart < dayStart && i === 0)) {
            startCol = eventStart < dayStart ? 0 : i;
            isStart = isSameDay(dayStart, eventStart);
          }
          if (isSameDay(dayEnd, eventEnd) || (eventEnd > dayEnd && i === 6)) {
            endCol = eventEnd > dayEnd ? 6 : i;
            isEnd = isSameDay(dayEnd, eventEnd);
          }
        }
        
        // Adjust if event starts before this week
        if (eventStart < weekDays[0]) {
          startCol = 0;
          isStart = false;
        }
        // Adjust if event ends after this week
        const weekEndDate = new Date(weekDays[6]);
        weekEndDate.setHours(23, 59, 59, 999);
        if (eventEnd > weekEndDate) {
          endCol = 6;
          isEnd = false;
        }
        
        // Find available row
        let row = 0;
        while (true) {
          if (!rowOccupancy[row]) rowOccupancy[row] = Array(7).fill(false);
          let canPlace = true;
          for (let col = startCol; col <= endCol; col++) {
            if (rowOccupancy[row][col]) {
              canPlace = false;
              break;
            }
          }
          if (canPlace) break;
          row++;
          if (row > 10) break; // Safety limit
        }
        
        // Mark occupied
        if (!rowOccupancy[row]) rowOccupancy[row] = Array(7).fill(false);
        for (let col = startCol; col <= endCol; col++) {
          rowOccupancy[row][col] = true;
        }
        
        bars.push({ event, startCol, endCol, row, isStart, isEnd });
      });
      
      return bars;
    };

    return (
      <div className="flex flex-col h-full">
        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid - by weeks */}
        <div className="flex-1 flex flex-col">
          {weeks.map((week, weekIndex) => {
            const multiDayEvents = getMultiDayEventsForWeek(week);
            const eventBars = getEventBarsForWeek(week, multiDayEvents);
            const maxRows = Math.max(0, ...eventBars.map(b => b.row)) + 1;
            
            return (
              <div key={weekIndex} className="flex-1 min-h-[100px] relative">
                {/* Multi-day event bars */}
                <div className="absolute top-6 left-0 right-0 z-10 pointer-events-none" style={{ height: maxRows * 20 }}>
                  {eventBars.map((bar, barIdx) => {
                    const leftPercent = (bar.startCol / 7) * 100;
                    const widthPercent = ((bar.endCol - bar.startCol + 1) / 7) * 100;
                    
                    return (
                      <div
                        key={`${bar.event.id}-${weekIndex}-${barIdx}`}
                        className={cn(
                          "absolute h-[18px] text-xs px-1.5 truncate cursor-pointer pointer-events-auto flex items-center",
                          getDotColorClass(bar.event.color),
                          "text-white",
                          bar.isStart ? "rounded-l" : "",
                          bar.isEnd ? "rounded-r" : "",
                          !bar.isStart && "pl-0",
                          !bar.isEnd && "pr-0"
                        )}
                        style={{
                          top: bar.row * 20,
                          left: `calc(${leftPercent}% + ${bar.isStart ? 4 : 0}px)`,
                          width: `calc(${widthPercent}% - ${(bar.isStart ? 4 : 0) + (bar.isEnd ? 4 : 0)}px)`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditEventDialog(bar.event);
                        }}
                        title={bar.event.title}
                      >
                        {bar.isStart && <span className="truncate">{bar.event.title}</span>}
                      </div>
                    );
                  })}
                </div>
                
                {/* Day cells */}
                <div className="grid grid-cols-7 h-full">
                  {week.map((day, dayIndex) => {
                    const dayEvents = getEventsForDay(day);
                    // Filter out multi-day events (they're shown as bars)
                    const singleDayEvents = dayEvents.filter(event => {
                      const eventStart = new Date(event.startDate);
                      const eventEnd = new Date(event.endDate);
                      return differenceInDays(eventEnd, eventStart) < 1 && !event.isAllDay;
                    });
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isCurrentDay = isToday(day);
                    const isDropTarget = dragOverDate && isSameDay(day, dragOverDate);

                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          "border-b border-r p-1 cursor-pointer transition-colors",
                          !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                          isDropTarget && isDragging && "bg-primary/20 ring-2 ring-primary ring-inset",
                          !isDropTarget && "hover:bg-muted/50"
                        )}
                        onClick={() => openNewEventDialog(day)}
                        onDragOver={(e) => handleDragOver(day, e)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(day, e)}
                      >
                        <div
                          className={cn(
                            "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                            isCurrentDay && "bg-primary text-primary-foreground"
                          )}
                        >
                          {format(day, "d")}
                        </div>
                        {/* Space for multi-day event bars */}
                        <div style={{ height: maxRows * 20 + 4 }} />
                        {/* Single-day events */}
                        <div className="space-y-0.5">
                          {singleDayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              draggable={event.id > 0}
                              onDragStart={(e) => handleDragStart(event, e)}
                              onDragEnd={handleDragEnd}
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded truncate cursor-pointer border group flex items-center gap-1",
                                getColorClass(event.color),
                                event.id > 0 && "cursor-grab active:cursor-grabbing",
                                draggedEvent?.id === event.id && "opacity-50"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditEventDialog(event);
                              }}
                            >
                              {event.id > 0 && (
                                <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-50 flex-shrink-0" />
                              )}
                              <span className="truncate">{event.title}</span>
                            </div>
                          ))}
                          {singleDayEvents.length > 2 && (
                            <div className="text-xs text-muted-foreground px-1">
                              +{singleDayEvents.length - 2} weitere
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6),
    });
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Helper to handle drop with specific hour
    const handleDropWithHour = (day: Date, hour: number, e: React.DragEvent) => {
      e.preventDefault();
      setDragOverDate(null);
      
      if (!draggedEvent) return;
      
      const eventStart = new Date(draggedEvent.startDate);
      const eventEnd = new Date(draggedEvent.endDate);
      const duration = eventEnd.getTime() - eventStart.getTime();
      
      const newStart = new Date(day);
      newStart.setHours(hour, 0, 0, 0);
      const newEnd = new Date(newStart.getTime() + duration);
      
      updateEvent.mutate({
        id: draggedEvent.id,
        startDate: newStart.toISOString(),
        endDate: newEnd.toISOString(),
      });
      
      setDraggedEvent(null);
      setIsDragging(false);
      toast.success("Termin verschoben");
    };

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header with days - horizontal scroll on mobile */}
        <div className="flex border-b overflow-x-auto">
          <div className="w-12 md:w-16 flex-shrink-0" />
          {days.map((day) => {
            const isDropTarget = dragOverDate && isSameDay(day, dragOverDate);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-w-[48px] md:min-w-0 flex-1 p-1 md:p-2 text-center border-l transition-colors",
                  isToday(day) && "bg-primary/5",
                  isDropTarget && isDragging && "bg-primary/20"
                )}
                onDragOver={(e) => handleDragOver(day, e)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(day, e)}
              >
                <div className="text-xs md:text-sm text-muted-foreground">
                  {format(day, "EEEEE", { locale: de })}
                </div>
                <div
                  className={cn(
                    "text-sm md:text-lg font-semibold w-6 h-6 md:w-8 md:h-8 flex items-center justify-center mx-auto rounded-full",
                    isToday(day) && "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day events */}
        <div className="flex border-b bg-muted/30 overflow-x-auto">
          <div className="w-12 md:w-16 flex-shrink-0 p-1 text-[10px] md:text-xs text-muted-foreground text-right pr-1 md:pr-2">
            Ganzt.
          </div>
          {days.map((day) => {
            const allDayEvents = getEventsForDay(day).filter((e) => e.isAllDay);
            const isDropTarget = dragOverDate && isSameDay(day, dragOverDate);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-w-[48px] md:min-w-0 flex-1 p-0.5 md:p-1 border-l min-h-[32px] md:min-h-[40px] transition-colors",
                  isDropTarget && isDragging && "bg-primary/20"
                )}
                onDragOver={(e) => handleDragOver(day, e)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(day, e)}
              >
                {allDayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    draggable={event.id > 0}
                    onDragStart={(e) => handleDragStart(event, e)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "text-[10px] md:text-xs px-0.5 md:px-1 py-0.5 rounded truncate mb-0.5 cursor-pointer border group flex items-center gap-0.5 md:gap-1",
                      getColorClass(event.color),
                      event.id > 0 && "cursor-grab active:cursor-grabbing",
                      draggedEvent?.id === event.id && "opacity-50"
                    )}
                    onClick={() => openEditEventDialog(event)}
                  >
                    {event.id > 0 && (
                      <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-50 flex-shrink-0 hidden md:block" />
                    )}
                    <span className="truncate">{event.title}</span>
                  </div>
                ))}
                {allDayEvents.length > 2 && (
                  <div className="text-[10px] md:text-xs text-muted-foreground">
                    +{allDayEvents.length - 2}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="flex-1 overflow-auto">
          <div className="relative min-w-[384px] md:min-w-0">
            {hours.map((hour) => (
              <div key={hour} className="flex h-10 md:h-12 border-b">
                <div className="w-12 md:w-16 flex-shrink-0 text-[10px] md:text-xs text-muted-foreground text-right pr-1 md:pr-2 -mt-2">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                {days.map((day) => {
                  const cellDate = new Date(day);
                  cellDate.setHours(hour, 0, 0, 0);
                  const isDropTarget = dragOverDate && isSameDay(day, dragOverDate);
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "min-w-[48px] md:min-w-0 flex-1 border-l cursor-pointer transition-colors",
                        isDropTarget && isDragging ? "bg-primary/20" : "hover:bg-muted/30"
                      )}
                      onClick={() => {
                        const clickDate = new Date(day);
                        clickDate.setHours(hour);
                        openNewEventDialog(clickDate);
                      }}
                      onDragOver={(e) => handleDragOver(day, e)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropWithHour(day, hour, e)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render shifts view (Schichtplan)
  const renderShiftsView = () => {
    // Get shift events only
    const shiftEvents = (allEvents || []).filter(e => e.eventType === "shift");
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    // Group shifts by team
    const shiftsByTeam = shiftEvents.reduce((acc, event) => {
      const teamId = (event as any).teamId || 0;
      if (!acc[teamId]) acc[teamId] = [];
      acc[teamId].push(event);
      return acc;
    }, {} as Record<number, CalendarEvent[]>);
    
    const teamNames: Record<number, string> = { 0: "Ohne Team" };
    (teams || []).forEach((t: any) => {
      teamNames[t.id] = t.name;
    });
    
    return (
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            Schichtplan: {format(weekStart, "d. MMM", { locale: de })} - {format(weekEnd, "d. MMM yyyy", { locale: de })}
          </h2>
        </div>
        
        {/* Week header */}
        <div className="grid grid-cols-8 gap-1 mb-2">
          <div className="p-2 font-medium text-muted-foreground text-sm">Team</div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2 text-center font-medium text-sm rounded-lg",
                isToday(day) && "bg-primary/10 text-primary",
                (getDay(day) === 0 || getDay(day) === 6) && "bg-muted/50"
              )}
            >
              <div>{format(day, "EEE", { locale: de })}</div>
              <div className="text-lg">{format(day, "d")}</div>
            </div>
          ))}
        </div>
        
        {/* Team rows */}
        {Object.entries(shiftsByTeam).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Keine Schichten in dieser Woche geplant.
            <br />
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setEventType("shift");
                setShowEventDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Schicht erstellen
            </Button>
          </div>
        ) : (
          Object.entries(shiftsByTeam).map(([teamId, shifts]) => (
            <div key={teamId} className="grid grid-cols-8 gap-1 mb-1">
              <div className="p-2 font-medium text-sm bg-muted/30 rounded-lg flex items-center">
                {teamNames[parseInt(teamId)] || `Team ${teamId}`}
              </div>
              {weekDays.map((day) => {
                const dayShifts = shifts.filter((s) => {
                  const start = new Date(s.startDate);
                  const end = new Date(s.endDate);
                  return day >= new Date(start.setHours(0, 0, 0, 0)) && day <= new Date(end.setHours(23, 59, 59, 999));
                });
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "p-1 min-h-[60px] rounded-lg border border-border/50",
                      (getDay(day) === 0 || getDay(day) === 6) && "bg-muted/30"
                    )}
                  >
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className={cn(
                          "p-1 text-xs rounded cursor-pointer truncate mb-1",
                          getColorClass(shift.color)
                        )}
                        onClick={() => openEditEventDialog(shift)}
                      >
                        {shift.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForDay(currentDate);
    const allDayEvents = dayEvents.filter((e) => e.isAllDay);
    const timedEvents = dayEvents.filter((e) => !e.isAllDay);

    // Helper to handle drop with specific hour in day view
    const handleDayDropWithHour = (hour: number, e: React.DragEvent) => {
      e.preventDefault();
      setDragOverDate(null);
      
      if (!draggedEvent) return;
      
      const eventStart = new Date(draggedEvent.startDate);
      const eventEnd = new Date(draggedEvent.endDate);
      const duration = eventEnd.getTime() - eventStart.getTime();
      
      const newStart = new Date(currentDate);
      newStart.setHours(hour, 0, 0, 0);
      const newEnd = new Date(newStart.getTime() + duration);
      
      updateEvent.mutate({
        id: draggedEvent.id,
        startDate: newStart.toISOString(),
        endDate: newEnd.toISOString(),
      });
      
      setDraggedEvent(null);
      setIsDragging(false);
      toast.success("Termin verschoben");
    };

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div
            className={cn(
              "border-b p-2 bg-muted/30 transition-colors",
              isDragging && "bg-primary/10"
            )}
            onDragOver={(e) => handleDragOver(currentDate, e)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(currentDate, e)}
          >
            <div className="text-xs text-muted-foreground mb-1">Ganztägig</div>
            <div className="flex flex-wrap gap-1">
              {allDayEvents.map((event) => (
                <div
                  key={event.id}
                  draggable={event.id > 0}
                  onDragStart={(e) => handleDragStart(event, e)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "text-sm px-2 py-1 rounded cursor-pointer border group flex items-center gap-1",
                    getColorClass(event.color),
                    event.id > 0 && "cursor-grab active:cursor-grabbing",
                    draggedEvent?.id === event.id && "opacity-50"
                  )}
                  onClick={() => openEditEventDialog(event)}
                >
                  {event.id > 0 && (
                    <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-50 flex-shrink-0" />
                  )}
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time grid */}
        <div className="flex-1 overflow-auto">
          {hours.map((hour) => {
            const hourDate = new Date(currentDate);
            hourDate.setHours(hour, 0, 0, 0);
            const isDropTarget = isDragging;
            
            return (
              <div key={hour} className="flex h-16 border-b">
                <div className="w-20 flex-shrink-0 text-sm text-muted-foreground text-right pr-3 pt-1">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                <div
                  className={cn(
                    "flex-1 border-l cursor-pointer relative transition-colors",
                    isDropTarget ? "hover:bg-primary/20" : "hover:bg-muted/30"
                  )}
                  onClick={() => {
                    const clickDate = new Date(currentDate);
                    clickDate.setHours(hour);
                    openNewEventDialog(clickDate);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => handleDayDropWithHour(hour, e)}
                >
                  {timedEvents
                    .filter((e) => {
                      const eventHour = new Date(e.startDate).getHours();
                      return eventHour === hour;
                    })
                    .map((event) => (
                      <div
                        key={event.id}
                        draggable={event.id > 0}
                        onDragStart={(e) => handleDragStart(event, e)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "absolute left-1 right-1 px-2 py-1 rounded text-sm cursor-pointer border group",
                          getColorClass(event.color),
                          event.id > 0 && "cursor-grab active:cursor-grabbing",
                          draggedEvent?.id === event.id && "opacity-50"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditEventDialog(event);
                        }}
                      >
                        <div className="flex items-center gap-1">
                          {event.id > 0 && (
                            <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-50 flex-shrink-0" />
                          )}
                          <span className="font-medium truncate">{event.title}</span>
                        </div>
                        <div className="text-xs opacity-75">
                          {format(new Date(event.startDate), "HH:mm")} -{" "}
                          {format(new Date(event.endDate), "HH:mm")}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render year view - Hey Calendar style with horizontal scroll
  const renderYearView = () => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });
    
    // Group days by week (Monday start)
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    
    // Fill in days before Jan 1 to complete the first week
    const firstDayOfWeek = getDay(yearStart);
    const daysToFill = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = daysToFill; i > 0; i--) {
      currentWeek.push(subDays(yearStart, i));
    }
    
    allDays.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    // Fill remaining days of last week
    if (currentWeek.length > 0) {
      const lastDay = currentWeek[currentWeek.length - 1];
      while (currentWeek.length < 7) {
        currentWeek.push(addDays(lastDay, currentWeek.length - currentWeek.indexOf(lastDay)));
      }
      weeks.push(currentWeek);
    }

    const weekDays = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"];
    
    // Get events that span multiple days for rendering as bars
    const getMultiDayEvents = () => {
      if (!allEvents) return [];
      return allEvents.filter((event: CalendarEvent) => {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        return differenceInDays(end, start) >= 1 || event.isAllDay;
      });
    };
    
    const multiDayEvents = getMultiDayEvents();
    
    // Calculate event bar positions
    const getEventBars = () => {
      const bars: Array<{
        event: CalendarEvent;
        startWeek: number;
        startDay: number;
        endWeek: number;
        endDay: number;
        row: number;
      }> = [];
      
      // Track occupied rows per week-day
      const occupied: Map<string, number[]> = new Map();
      
      multiDayEvents.forEach((event: CalendarEvent) => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        
        // Find start position
        let startWeekIdx = -1;
        let startDayIdx = -1;
        let endWeekIdx = -1;
        let endDayIdx = -1;
        
        weeks.forEach((week, wi) => {
          week.forEach((day, di) => {
            if (isSameDay(day, eventStart) || (day > eventStart && startWeekIdx === -1)) {
              if (startWeekIdx === -1) {
                startWeekIdx = wi;
                startDayIdx = di;
              }
            }
            if (isSameDay(day, eventEnd) || (day >= eventEnd && endWeekIdx === -1)) {
              endWeekIdx = wi;
              endDayIdx = di;
            }
          });
        });
        
        if (startWeekIdx === -1) startWeekIdx = 0;
        if (startDayIdx === -1) startDayIdx = 0;
        if (endWeekIdx === -1) endWeekIdx = weeks.length - 1;
        if (endDayIdx === -1) endDayIdx = 6;
        
        // Find available row
        let row = 0;
        let foundRow = false;
        while (!foundRow) {
          foundRow = true;
          for (let w = startWeekIdx; w <= endWeekIdx; w++) {
            const startD = w === startWeekIdx ? startDayIdx : 0;
            const endD = w === endWeekIdx ? endDayIdx : 6;
            for (let d = startD; d <= endD; d++) {
              const key = `${w}-${d}`;
              const rows = occupied.get(key) || [];
              if (rows.includes(row)) {
                foundRow = false;
                break;
              }
            }
            if (!foundRow) break;
          }
          if (!foundRow) row++;
        }
        
        // Mark as occupied
        for (let w = startWeekIdx; w <= endWeekIdx; w++) {
          const startD = w === startWeekIdx ? startDayIdx : 0;
          const endD = w === endWeekIdx ? endDayIdx : 6;
          for (let d = startD; d <= endD; d++) {
            const key = `${w}-${d}`;
            const rows = occupied.get(key) || [];
            rows.push(row);
            occupied.set(key, rows);
          }
        }
        
        bars.push({
          event,
          startWeek: startWeekIdx,
          startDay: startDayIdx,
          endWeek: endWeekIdx,
          endDay: endDayIdx,
          row,
        });
      });
      
      return bars;
    };
    
    const eventBars = getEventBars();

    // Total columns = number of weeks * 7 days
    const totalDays = weeks.length * 7;
    const cellWidth = 32; // px per day
    const totalWidth = totalDays * cellWidth + 48; // +48 for weekday label column

    return (
      <div className="h-full overflow-auto">
        <div style={{ minWidth: `${totalWidth}px` }}>
          {/* Header row with day numbers - one cell per day across all weeks */}
          <div className="sticky top-0 bg-background z-20 border-b">
            <div className="flex">
              <div className="w-12 flex-shrink-0" /> {/* Spacer for weekday labels */}
              {weeks.flatMap((week, weekIdx) =>
                week.map((day, dayIdx) => {
                  const isCurrentYear = day.getFullYear() === currentDate.getFullYear();
                  const isMonthStart = day.getDate() === 1;
                  const monthAbbr = format(day, "MMM", { locale: de }).toUpperCase().slice(0, 3);
                  const globalIdx = weekIdx * 7 + dayIdx;
                  
                  return (
                    <div
                      key={globalIdx}
                      className={cn(
                        "flex-shrink-0 text-center text-xs py-1",
                        !isCurrentYear && "text-muted-foreground/30"
                      )}
                      style={{ width: `${cellWidth}px` }}
                    >
                      {isMonthStart ? (
                        <span className={cn(
                          "text-[9px] font-bold px-1 py-0.5 rounded",
                          isCurrentYear ? "bg-muted text-muted-foreground" : "text-muted-foreground/30"
                        )}>
                          {monthAbbr}
                        </span>
                      ) : (
                        <span className={cn(
                          isToday(day) && "bg-red-500 text-white rounded-full px-1.5 py-0.5"
                        )}>
                          {format(day, "d")}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Calendar grid with weekday rows */}
          <div className="relative">
            {weekDays.map((dayName, rowIdx) => (
              <div key={rowIdx} className="flex border-b border-border/20 min-h-[50px] relative">
                {/* Weekday label */}
                <div className="w-12 flex-shrink-0 text-[10px] text-muted-foreground font-medium py-2 px-1 sticky left-0 bg-background z-10 border-r">
                  {dayName}
                </div>
                
                {/* Day cells - one per column (week*7 + dayOfWeek) */}
                {weeks.map((week, weekIdx) => {
                  const day = week[rowIdx];
                  if (!day) return null;
                  const isCurrentYear = day.getFullYear() === currentDate.getFullYear();
                  const isWeekend = rowIdx >= 5;
                  
                  return (
                    <div
                      key={weekIdx}
                      className={cn(
                        "flex-shrink-0 border-r border-border/10 cursor-pointer hover:bg-muted/50 transition-colors",
                        isWeekend && "bg-muted/20",
                        !isCurrentYear && "bg-muted/10"
                      )}
                      style={{ width: `${cellWidth}px` }}
                      onClick={() => {
                        setCurrentDate(day);
                        setViewMode("day");
                      }}
                    />
                  );
                })}
              </div>
            ))}
            
            {/* Event bars overlay */}
            <div className="absolute top-0 left-12 right-0 pointer-events-none">
              {eventBars.map((bar, idx) => {
                // Calculate position based on which row (weekday) the event starts
                const rowHeight = 50;
                const topOffset = bar.startDay * rowHeight + 8 + bar.row * 18;
                // Left offset: startWeek columns
                const leftOffset = bar.startWeek * cellWidth;
                // Width spans from startWeek to endWeek
                const spanWeeks = bar.endWeek - bar.startWeek + 1;
                const width = spanWeeks * cellWidth - 4;
                
                // For events spanning multiple weekday rows, render per-row segments
                if (bar.startDay !== bar.endDay || bar.startWeek !== bar.endWeek) {
                  const segments: React.ReactElement[] = [];
                  
                  // Simplified: render one bar per weekday row the event spans
                  for (let dayRow = bar.startDay; dayRow <= (bar.startWeek === bar.endWeek ? bar.endDay : 6); dayRow++) {
                    const segTop = dayRow * rowHeight + 8 + bar.row * 18;
                    const segLeft = bar.startWeek * cellWidth;
                    const segEndWeek = dayRow === bar.endDay ? bar.endWeek : bar.endWeek;
                    const segWidth = (segEndWeek - bar.startWeek + 1) * cellWidth - 4;
                    
                    segments.push(
                      <div
                        key={`${idx}-${dayRow}`}
                        className={cn(
                          "absolute h-4 rounded text-[10px] text-white px-1 truncate pointer-events-auto cursor-pointer hover:opacity-80",
                          getDotColorClass(bar.event.color)
                        )}
                        style={{
                          top: segTop,
                          left: segLeft,
                          width: segWidth,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditEventDialog(bar.event);
                        }}
                        title={bar.event.title}
                      >
                        {dayRow === bar.startDay && bar.event.title}
                      </div>
                    );
                  }
                  
                  return <React.Fragment key={idx}>{segments}</React.Fragment>;
                }
                
                return (
                  <div
                    key={idx}
                    className={cn(
                      "absolute h-4 rounded text-[10px] text-white px-1 truncate pointer-events-auto cursor-pointer hover:opacity-80",
                      getDotColorClass(bar.event.color)
                    )}
                    style={{
                      top: topOffset,
                      left: leftOffset,
                      width: width,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditEventDialog(bar.event);
                    }}
                    title={bar.event.title}
                  >
                    {bar.event.title}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  // In year view, use full height without header
  const isYearView = viewMode === "year";

  return (
    <>
    {/* Mobile: PullToRefresh */}
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen md:hidden">
      <div className={cn(
      "flex flex-col",
      isYearView ? "h-[calc(100vh-60px)]" : "h-[calc(100vh-120px)]"
    )}>
      {/* Header - hidden in year view for more space */}
      <div className={cn(
        "flex-shrink-0 mb-4",
        isYearView && "hidden"
      )}>
        {/* Mobile Header - Premium Design */}
        <div className="md:hidden space-y-4">
          {/* Row 1: Month/Year Title with Gradient Icon */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">{getViewTitle()}</h2>
            </div>
            <Button 
              onClick={() => openNewEventDialog()} 
              className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl h-10 w-10 p-0 shadow-lg"
            >
              <Plus className="h-5 w-5 text-white" />
            </Button>
          </div>
          
          {/* Row 2: Navigation - Premium Style */}
          <div className="flex items-center justify-between bg-muted/30 rounded-xl p-2">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-background" onClick={() => navigate("prev")}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-10 px-4 rounded-xl font-semibold hover:bg-background" onClick={goToToday}>
                Heute
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-background" onClick={() => navigate("next")}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            
            {/* View Mode Selector - Premium Segmented Control */}
            <div className="flex items-center gap-1 bg-background rounded-lg p-1 shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3 rounded-lg font-medium transition-all",
                  viewMode === "day" && "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md"
                )}
                onClick={() => setViewMode("day")}
              >
                Tag
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3 rounded-lg font-medium transition-all",
                  viewMode === "week" && "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md"
                )}
                onClick={() => setViewMode("week")}
              >
                W
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3 rounded-lg font-medium transition-all",
                  viewMode === "month" && "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md"
                )}
                onClick={() => setViewMode("month")}
              >
                M
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl shadow-xl">
                  <DropdownMenuItem onClick={() => setViewMode("year")} className="rounded-lg">
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Jahresansicht
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {(user?.role === "admin" || user?.role === "editor") && (
                    <DropdownMenuItem onClick={() => setShowTeamLeaves(!showTeamLeaves)} className="rounded-lg">
                      <Users className="h-4 w-4 mr-2" />
                      {showTeamLeaves ? "Team-Urlaube ausblenden" : "Team-Urlaube anzeigen"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleExport} disabled={exportIcal.isPending} className="rounded-lg">
                    <Download className="h-4 w-4 mr-2" />
                    {exportIcal.isPending ? "Exportiere..." : "Als iCal exportieren"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowImportDialog(true)} className="rounded-lg">
                    <Upload className="h-4 w-4 mr-2" />
                    iCal importieren
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/calendar/settings")} className="rounded-lg">
                    <Settings className="h-4 w-4 mr-2" />
                    Einstellungen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Desktop Header - Original Layout */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Heute
            </Button>
            <h2 className="text-xl font-semibold ml-2">{getViewTitle()}</h2>
          </div>

          <div className="flex items-center gap-2">
            {(user?.role === "admin" || user?.role === "editor") && (
              <div className="flex items-center gap-2 mr-4">
                <Switch
                  id="team-leaves"
                  checked={showTeamLeaves}
                  onCheckedChange={setShowTeamLeaves}
                />
                <Label htmlFor="team-leaves" className="text-sm">
                  Team-Urlaube
                </Label>
              </div>
            )}

            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "day" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode("day")}
              >
                <List className="h-4 w-4 mr-1" />
                Tag
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                className="rounded-none border-l"
                onClick={() => setViewMode("week")}
              >
                <Columns className="h-4 w-4 mr-1" />
                Woche
              </Button>
              <Button
                variant={viewMode === "month" ? "default" : "ghost"}
                size="sm"
                className="rounded-none border-l"
                onClick={() => setViewMode("month")}
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Monat
              </Button>
              <Button
                variant={viewMode === "year" ? "default" : "ghost"}
                size="sm"
                className="rounded-none border-l"
                onClick={() => setViewMode("year")}
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Jahr
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExport} disabled={exportIcal.isPending}>
                    <Download className="h-4 w-4 mr-2" />
                    {exportIcal.isPending ? "Exportiere..." : "Als iCal exportieren"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    iCal importieren
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/calendar/settings")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Google Calendar verbinden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => openNewEventDialog()}>
                <Plus className="h-4 w-4 mr-1" />
                Neuer Termin
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar content */}
      {isYearView ? (
        // Year view - full screen without card wrapper
        <div className="flex-1 overflow-hidden">
          <YearCalendarView
            currentDate={currentDate}
            events={allEvents || []}
            onDayClick={(day) => {
              setCurrentDate(day);
              setViewMode("day");
            }}
            onEventClick={openEditEventDialog}
          />
        </div>
      ) : (
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full">
            {viewMode === "month" && renderMonthView()}
            {viewMode === "week" && renderWeekView()}
            {viewMode === "day" && renderDayView()}
          </CardContent>
        </Card>
      )}

      {/* Event Dialog - Hey Calendar Style */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>
              {editingEvent ? "Termin bearbeiten" : "Neuer Termin"}
            </DialogTitle>
          </VisuallyHidden>
          {/* Header with category selector */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto font-medium text-foreground hover:bg-transparent focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setShowEventDialog(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 space-y-4">
            {/* Title */}
            <div>
              <h2 className="text-xl font-semibold text-primary mb-1">
                {editingEvent ? "Termin bearbeiten" : "Neuer Termin"}
              </h2>
              <Input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Termintitel eingeben..."
                className="text-lg border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>

            {/* Date range - Hey style */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <Input
                  type={eventIsAllDay ? "date" : "datetime-local"}
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto text-base focus-visible:ring-0"
                />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <Input
                  type={eventIsAllDay ? "date" : "datetime-local"}
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto text-base focus-visible:ring-0"
                />
              </div>
            </div>

            {/* All day toggle */}
            <div className="flex items-center justify-center gap-2">
              <Switch
                id="all-day"
                checked={eventIsAllDay}
                onCheckedChange={setEventIsAllDay}
                className="data-[state=checked]:bg-green-500"
              />
              <Label htmlFor="all-day" className="text-sm">Ganztägig</Label>
            </div>

            {/* Team selection for shift events */}
            {eventType === "shift" && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                <Users className="h-4 w-4 text-orange-600" />
                <Select
                  value={eventTeamId?.toString() || ""}
                  onValueChange={(v) => setEventTeamId(v ? parseInt(v) : null)}
                >
                  <SelectTrigger className="flex-1 border-0 bg-transparent">
                    <SelectValue placeholder="Team auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.filter(team => {
                      const shiftTeamNames = ['pos', 'versand', 'lager', 'warehouse', 'shipping'];
                      return shiftTeamNames.some(name => team.name.toLowerCase().includes(name));
                    }).map((team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reminder */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              <Select
                value={eventReminderMinutes?.toString() || "none"}
                onValueChange={(v) => setEventReminderMinutes(v === "none" ? null : parseInt(v))}
              >
                <SelectTrigger className="border-0 bg-transparent p-0 h-auto w-auto focus:ring-0">
                  <SelectValue placeholder="Keine Erinnerung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Erinnerung</SelectItem>
                  <SelectItem value="0">Zum Zeitpunkt</SelectItem>
                  <SelectItem value="5">5 Minuten vorher</SelectItem>
                  <SelectItem value="15">15 Minuten vorher</SelectItem>
                  <SelectItem value="30">30 Minuten vorher</SelectItem>
                  <SelectItem value="60">1 Stunde vorher</SelectItem>
                  <SelectItem value="1440">1 Tag vorher (08:00)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick action buttons - Hey style */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={showLinkField ? "secondary" : "outline"}
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setShowLinkField(!showLinkField)}
              >
                <Link2 className="h-3 w-3 mr-1" />
                Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => {
                  setEventLocation(eventLocation || "");
                }}
              >
                <MapPin className="h-3 w-3 mr-1" />
                Ort
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs opacity-50 cursor-not-allowed"
                disabled
                title="Einladungen - Bald verfügbar"
              >
                <Users className="h-3 w-3 mr-1" />
                Einladen
              </Button>
              <Button
                variant={showNotesField ? "secondary" : "outline"}
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setShowNotesField(!showNotesField)}
              >
                <FileText className="h-3 w-3 mr-1" />
                Notizen
              </Button>
              <Button
                variant={showRepeatField ? "secondary" : "outline"}
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setShowRepeatField(!showRepeatField)}
              >
                <Repeat className="h-3 w-3 mr-1" />
                Wiederholen
              </Button>
              <Button
                variant={eventShowCountdown ? "secondary" : "outline"}
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setEventShowCountdown(!eventShowCountdown)}
              >
                <Timer className="h-3 w-3 mr-1" />
                Countdown
              </Button>
              <Button
                variant={eventIsCircle ? "secondary" : "outline"}
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setEventIsCircle(!eventIsCircle)}
              >
                <Circle className="h-3 w-3 mr-1" />
                Circle Event
              </Button>
            </div>

            {/* Conditional fields */}
            {showLinkField && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Link</Label>
                <Input
                  value={eventLink}
                  onChange={(e) => setEventLink(e.target.value)}
                  placeholder="https://..."
                  className="text-sm"
                />
              </div>
            )}

            {/* Location field - always visible but collapsible */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ort</Label>
              <Input
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Ort eingeben..."
                className="text-sm"
              />
            </div>

            {showNotesField && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Notizen</Label>
                <Textarea
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  placeholder="Notizen hinzufügen..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            )}

            {showRepeatField && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Wiederholung</Label>
                <Select
                  value={eventRecurrenceRule || "none"}
                  onValueChange={(v) => {
                    setEventRecurrenceRule(v === "none" ? "" : v);
                    setEventIsRecurring(v !== "none");
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Keine Wiederholung" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine Wiederholung</SelectItem>
                    <SelectItem value="FREQ=DAILY">Täglich</SelectItem>
                    <SelectItem value="FREQ=WEEKLY">Wöchentlich</SelectItem>
                    <SelectItem value="FREQ=BIWEEKLY">Alle 2 Wochen</SelectItem>
                    <SelectItem value="FREQ=MONTHLY">Monatlich</SelectItem>
                    <SelectItem value="FREQ=YEARLY">Jährlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Color picker */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Farbe:</Label>
              <div className="flex gap-1">
                {EVENT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "w-6 h-6 rounded-full transition-all",
                      color.class,
                      eventColor === color.value && "ring-2 ring-offset-2 ring-primary"
                    )}
                    onClick={() => setEventColor(color.value)}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Beschreibung</Label>
              <Textarea
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Beschreibung hinzufügen..."
                rows={2}
                className="text-sm"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
            {editingEvent && editingEvent.id > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deleteEvent.isPending}
              >
                Löschen
              </Button>
            ) : (
              <div />
            )}
            <Button
              onClick={handleSubmit}
              disabled={createEvent.isPending || updateEvent.isPending || !eventTitle.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {editingEvent ? "Speichern" : "Termin hinzufügen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              <Upload className="h-5 w-5 inline mr-2" />
              iCal importieren
            </DialogTitle>
            <DialogDescription>
              Importiere Termine aus einer iCal-Datei (.ics) von Outlook, Google Calendar oder anderen Kalender-Apps.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">iCal-Datei auswählen</Label>
              <Input
                id="import-file"
                type="file"
                accept=".ics,text/calendar"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              {importFile && (
                <p className="text-sm text-muted-foreground">
                  Ausgewählt: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="import-overwrite"
                checked={importOverwrite}
                onCheckedChange={setImportOverwrite}
              />
              <Label htmlFor="import-overwrite" className="text-sm">
                Bestehende Termine überschreiben (bei gleichem Titel und Datum)
              </Label>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p className="font-medium mb-1">Hinweis:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Unterstützt werden Standard-iCal-Dateien (.ics)</li>
                <li>Wiederkehrende Termine werden als einzelne Termine importiert</li>
                <li>Bereits vorhandene Termine werden übersprungen</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportDialog(false);
              setImportFile(null);
              setImportOverwrite(false);
            }}>
              Abbrechen
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || importIcal.isPending}
            >
              {importIcal.isPending ? "Importiere..." : "Importieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PullToRefresh>
    {/* Desktop: Normal content - same as mobile but without PullToRefresh wrapper */}
    <div className={cn(
      "hidden md:flex flex-col",
      isYearView ? "h-[calc(100vh-60px)]" : "h-[calc(100vh-120px)]"
    )}>
      {/* Header - hidden in year view for more space */}
      <div className={cn(
        "flex-shrink-0 mb-4",
        isYearView && "hidden"
      )}>
        {/* Desktop Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-xl font-semibold">
              {format(currentDate, "MMMM yyyy", { locale: de })}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Heute
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Tag</SelectItem>
                <SelectItem value="week">Woche</SelectItem>
                <SelectItem value="month">Monat</SelectItem>
                <SelectItem value="year">Jahr</SelectItem>
                <SelectItem value="shifts">Schichtplan</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowEventDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Neuer Termin
            </Button>
          </div>
        </div>
      </div>
      {/* Calendar Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "day" && renderDayView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "month" && renderMonthView()}
        {viewMode === "year" && (
          <YearCalendarView
            currentDate={currentDate}
            events={allEvents || []}
            onDayClick={(day) => {
              setCurrentDate(day);
              setViewMode("day");
            }}
            onEventClick={openEditEventDialog}
          />
        )}
        {viewMode === "shifts" && renderShiftsView()}
      </div>
    </div>
    </>
  );
}
