import { useState, useMemo } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week" | "month" | "year";

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
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showTeamLeaves, setShowTeamLeaves] = useState(false);

  // Form state
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventIsAllDay, setEventIsAllDay] = useState(false);
  const [eventColor, setEventColor] = useState("blue");
  const [eventType, setEventType] = useState("personal");
  const [eventLocation, setEventLocation] = useState("");

  const utils = trpc.useUtils();

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
    }
  }, [currentDate, viewMode]);

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
      eventType: eventType as "personal" | "meeting" | "reminder" | "vacation" | "other",
      location: eventLocation || undefined,
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

        {/* Calendar grid */}
        <div className="grid grid-cols-7 flex-1">
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[100px] border-b border-r p-1 cursor-pointer transition-colors hover:bg-muted/50",
                  !isCurrentMonth && "bg-muted/20 text-muted-foreground"
                )}
                onClick={() => openNewEventDialog(day)}
              >
                <div
                  className={cn(
                    "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                    isCurrentDay && "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded truncate cursor-pointer border",
                        getColorClass(event.color)
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditEventDialog(event);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{dayEvents.length - 3} weitere
                    </div>
                  )}
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

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header with days */}
        <div className="flex border-b">
          <div className="w-16 flex-shrink-0" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "flex-1 p-2 text-center border-l",
                isToday(day) && "bg-primary/5"
              )}
            >
              <div className="text-sm text-muted-foreground">
                {format(day, "EEE", { locale: de })}
              </div>
              <div
                className={cn(
                  "text-lg font-semibold w-8 h-8 flex items-center justify-center mx-auto rounded-full",
                  isToday(day) && "bg-primary text-primary-foreground"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* All-day events */}
        <div className="flex border-b bg-muted/30">
          <div className="w-16 flex-shrink-0 p-1 text-xs text-muted-foreground text-right pr-2">
            Ganztägig
          </div>
          {days.map((day) => {
            const allDayEvents = getEventsForDay(day).filter((e) => e.isAllDay);
            return (
              <div key={day.toISOString()} className="flex-1 p-1 border-l min-h-[40px]">
                {allDayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "text-xs px-1 py-0.5 rounded truncate mb-0.5 cursor-pointer border",
                      getColorClass(event.color)
                    )}
                    onClick={() => openEditEventDialog(event)}
                  >
                    {event.title}
                  </div>
                ))}
                {allDayEvents.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{allDayEvents.length - 2}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="flex-1 overflow-auto">
          <div className="relative">
            {hours.map((hour) => (
              <div key={hour} className="flex h-12 border-b">
                <div className="w-16 flex-shrink-0 text-xs text-muted-foreground text-right pr-2 -mt-2">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="flex-1 border-l hover:bg-muted/30 cursor-pointer"
                    onClick={() => {
                      const clickDate = new Date(day);
                      clickDate.setHours(hour);
                      openNewEventDialog(clickDate);
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForDay(currentDate);
    const allDayEvents = dayEvents.filter((e) => e.isAllDay);
    const timedEvents = dayEvents.filter((e) => !e.isAllDay);

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className="border-b p-2 bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Ganztägig</div>
            <div className="flex flex-wrap gap-1">
              {allDayEvents.map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    "text-sm px-2 py-1 rounded cursor-pointer border",
                    getColorClass(event.color)
                  )}
                  onClick={() => openEditEventDialog(event)}
                >
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time grid */}
        <div className="flex-1 overflow-auto">
          {hours.map((hour) => (
            <div key={hour} className="flex h-16 border-b">
              <div className="w-20 flex-shrink-0 text-sm text-muted-foreground text-right pr-3 pt-1">
                {hour.toString().padStart(2, "0")}:00
              </div>
              <div
                className="flex-1 border-l hover:bg-muted/30 cursor-pointer relative"
                onClick={() => {
                  const clickDate = new Date(currentDate);
                  clickDate.setHours(hour);
                  openNewEventDialog(clickDate);
                }}
              >
                {timedEvents
                  .filter((e) => {
                    const eventHour = new Date(e.startDate).getHours();
                    return eventHour === hour;
                  })
                  .map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "absolute left-1 right-1 px-2 py-1 rounded text-sm cursor-pointer border",
                        getColorClass(event.color)
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditEventDialog(event);
                      }}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-xs opacity-75">
                        {format(new Date(event.startDate), "HH:mm")} -{" "}
                        {format(new Date(event.endDate), "HH:mm")}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render year view
  const renderYearView = () => {
    const months = eachMonthOfInterval({
      start: startOfYear(currentDate),
      end: endOfYear(currentDate),
    });

    return (
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4 p-4">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
          const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
          const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

          return (
            <Card
              key={month.toISOString()}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setCurrentDate(month);
                setViewMode("month");
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {format(month, "MMMM", { locale: de })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="grid grid-cols-7 gap-0.5 text-[10px]">
                  {["M", "D", "M", "D", "F", "S", "S"].map((d, i) => (
                    <div key={i} className="text-center text-muted-foreground">
                      {d}
                    </div>
                  ))}
                  {days.map((day, i) => {
                    const hasEvents = getEventsForDay(day).length > 0;
                    const isCurrentMonth = isSameMonth(day, month);
                    return (
                      <div
                        key={i}
                        className={cn(
                          "text-center py-0.5 rounded-sm",
                          !isCurrentMonth && "text-muted-foreground/30",
                          isToday(day) && "bg-primary text-primary-foreground",
                          hasEvents && isCurrentMonth && !isToday(day) && "bg-primary/20"
                        )}
                      >
                        {format(day, "d")}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
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

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
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

          <Button onClick={() => openNewEventDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            Neuer Termin
          </Button>
        </div>
      </div>

      {/* Calendar content */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full">
          {viewMode === "month" && renderMonthView()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && renderDayView()}
          {viewMode === "year" && renderYearView()}
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Termin bearbeiten" : "Neuer Termin"}
            </DialogTitle>
            <DialogDescription>
              {editingEvent
                ? "Bearbeite die Details deines Termins"
                : "Erstelle einen neuen Termin in deinem Kalender"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Termintitel eingeben..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="all-day"
                checked={eventIsAllDay}
                onCheckedChange={setEventIsAllDay}
              />
              <Label htmlFor="all-day">Ganztägig</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Start *</Label>
                <Input
                  id="start"
                  type={eventIsAllDay ? "date" : "datetime-local"}
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Ende *</Label>
                <Input
                  id="end"
                  type={eventIsAllDay ? "date" : "datetime-local"}
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Farbe</Label>
                <Select value={eventColor} onValueChange={setEventColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", color.class)} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
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
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Ort</Label>
              <Input
                id="location"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Ort eingeben..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Beschreibung eingeben..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            {editingEvent && editingEvent.id > 0 && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteEvent.isPending}
              >
                Löschen
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createEvent.isPending || updateEvent.isPending}
              >
                {editingEvent ? "Speichern" : "Erstellen"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
