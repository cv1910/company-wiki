import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Clock, MapPin, Calendar, ChevronLeft, ChevronRight, Video, Phone, Building, Link as LinkIcon, Globe, Check } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const LOCATION_TYPES = {
  google_meet: { label: "Google Meet", icon: Video },
  phone: { label: "Telefonat", icon: Phone },
  in_person: { label: "Vor Ort", icon: Building },
  custom: { label: "Benutzerdefiniert", icon: LinkIcon },
};

const TIMEZONES = [
  { value: "Europe/Berlin", label: "Central European Time" },
  { value: "Europe/London", label: "Greenwich Mean Time" },
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "Asia/Tokyo", label: "Japan Standard Time" },
];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Add days from previous month to fill the first week
  const startDayOfWeek = firstDay.getDay();
  const mondayOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Monday = 0
  for (let i = mondayOffset; i > 0; i--) {
    const date = new Date(year, month, 1 - i);
    days.push(date);
  }
  
  // Add days of current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  
  // Add days from next month to complete the last week
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }
  
  return days;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  return `${hours}:${minutes}`;
}

function generateTimeSlots(
  startTime: string,
  endTime: string,
  duration: number,
  bufferBefore: number,
  bufferAfter: number
): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  const slotDuration = duration + bufferBefore + bufferAfter;
  
  for (let time = startMinutes; time + duration <= endMinutes; time += slotDuration) {
    const hour = Math.floor(time / 60);
    const min = time % 60;
    slots.push(`${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
  }
  
  return slots;
}

export default function Book() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timezone, setTimezone] = useState("Europe/Berlin");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [step, setStep] = useState<"date" | "time" | "details" | "confirmed">("date");
  
  // Form fields
  const [guestName, setGuestName] = useState(user?.name || "");
  const [guestEmail, setGuestEmail] = useState(user?.email || "");
  const [guestNotes, setGuestNotes] = useState("");
  
  const { data: eventType, isLoading: eventTypeLoading } = trpc.scheduling.eventTypes.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );
  
  const { data: availability } = trpc.scheduling.availability.get.useQuery(
    { eventTypeId: eventType?.id || 0 },
    { enabled: !!eventType?.id }
  );
  
  // Existing bookings are checked server-side when creating a booking
  
  const [bookingResult, setBookingResult] = useState<{ meetingLink?: string | null } | null>(null);
  
  const bookMutation = trpc.scheduling.bookings.create.useMutation({
    onSuccess: (data) => {
      setBookingResult(data);
      setStep("confirmed");
      toast.success("Termin erfolgreich gebucht!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // Calculate available days based on availability settings
  const availableDays = useMemo(() => {
    if (!availability || !eventType) return new Set<string>();
    
    const days = new Set<string>();
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + (eventType.maxDaysInFuture || 60));
    
    // Get available days of week
    const availableDaysOfWeek = new Set(
      availability.filter(a => a.isAvailable).map(a => a.dayOfWeek)
    );
    
    // Check each day in the range
    for (let d = new Date(today); d <= maxDate; d.setDate(d.getDate() + 1)) {
      // Check if day of week is available
      const dayOfWeek = d.getDay();
      if (!availableDaysOfWeek.has(dayOfWeek)) continue;
      
      // Check minimum notice time
      const minNoticeTime = new Date();
      minNoticeTime.setHours(minNoticeTime.getHours() + (eventType.minNoticeHours || 4));
      if (d < minNoticeTime && d.toDateString() === today.toDateString()) continue;
      
      days.add(d.toISOString().split("T")[0]);
    }
    
    return days;
  }, [availability, eventType]);
  
  // Calculate available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !availability || !eventType) return [];
    
    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.filter(
      a => a.dayOfWeek === dayOfWeek && a.isAvailable
    );
    
    if (dayAvailability.length === 0) return [];
    
    const allSlots: string[] = [];
    
    for (const avail of dayAvailability) {
      const slots = generateTimeSlots(
        avail.startTime,
        avail.endTime,
        eventType.duration,
        eventType.bufferBefore || 0,
        eventType.bufferAfter || 0
      );
      allSlots.push(...slots);
    }
    
    // Filter out past times for today
    const now = new Date();
    const minNoticeTime = new Date();
    minNoticeTime.setHours(minNoticeTime.getHours() + (eventType.minNoticeHours || 4));
    
    return allSlots.filter(slot => {
      if (selectedDate.toDateString() === now.toDateString()) {
        const [hours, minutes] = slot.split(":").map(Number);
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hours, minutes, 0, 0);
        if (slotTime < minNoticeTime) return false;
      }
      
      return true;
    });
  }, [selectedDate, availability, eventType]);
  
  const days = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  
  const handleDateSelect = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    if (availableDays.has(dateStr)) {
      setSelectedDate(date);
      setStep("time");
    }
  };
  
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("details");
  };
  
  const handleSubmit = () => {
    if (!selectedDate || !selectedTime || !eventType) return;
    
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + eventType.duration);
    
    bookMutation.mutate({
      eventTypeId: eventType.id,
      startTime: startTime.toISOString(),
      guestName,
      guestEmail,
      guestNotes: guestNotes || undefined,
    });
  };
  
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  if (eventTypeLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-muted-foreground">Laden...</div>
      </div>
    );
  }
  
  if (!eventType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Event-Typ nicht gefunden</h2>
            <p className="text-muted-foreground">
              Der angeforderte Termintyp existiert nicht oder ist nicht mehr verfügbar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const locationType = LOCATION_TYPES[eventType.locationType as keyof typeof LOCATION_TYPES] || LOCATION_TYPES.google_meet;
  const LocationIcon = locationType.icon;
  
  // Confirmed view
  if (step === "confirmed") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Termin bestätigt!</h2>
            <p className="text-muted-foreground mb-6">
              Eine Bestätigungs-E-Mail wurde an {guestEmail} gesendet.
            </p>
            <div className="bg-muted rounded-lg p-4 text-left space-y-2">
              <div className="font-medium">{eventType.name}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {selectedDate?.toLocaleDateString("de-DE", { 
                  weekday: "long", 
                  day: "numeric", 
                  month: "long",
                  year: "numeric"
                })}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {selectedTime} - {(() => {
                  const [h, m] = selectedTime!.split(":").map(Number);
                  const end = new Date();
                  end.setHours(h, m + eventType.duration, 0, 0);
                  return `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`;
                })()}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <LocationIcon className="h-4 w-4" />
                {locationType.label}
              </div>
              {bookingResult?.meetingLink && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-600" />
                    Google Meet-Link
                  </div>
                  <a 
                    href={bookingResult.meetingLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
                  >
                    {bookingResult.meetingLink}
                  </a>
                </div>
              )}
            </div>
            {bookingResult?.meetingLink && (
              <Button className="mt-6 w-full" asChild>
                <a href={bookingResult.meetingLink} target="_blank" rel="noopener noreferrer">
                  <Video className="h-4 w-4 mr-2" />
                  Google Meet beitreten
                </a>
              </Button>
            )}
            <Button variant="outline" className="mt-3 w-full" onClick={() => window.location.href = "/"}>
              Zur Startseite
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        {/* Preview Banner */}
        <div className="bg-gray-800 text-white text-sm px-4 py-2 rounded-t-lg flex items-center justify-between">
          <span>
            <strong>Vorschau.</strong> Teilen Sie den Link mit Ihren Eingeladenen, um einen Termin zu buchen.
          </span>
          <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-gray-700" asChild>
            <a href={window.location.href} target="_blank" rel="noopener noreferrer">
              <LinkIcon className="h-4 w-4" />
            </a>
          </Button>
        </div>
        
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-muted-foreground mb-1">{eventType.host?.name || "Host"}</p>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{eventType.name}</h1>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {eventType.duration} min
              </span>
              {eventType.locationDetails ? (
                <span className="flex items-center gap-1">
                  <LocationIcon className="h-4 w-4" />
                  {eventType.locationDetails}
                </span>
              ) : (
                <span className="text-muted-foreground/60 italic flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Ort wird nach Buchung mitgeteilt
                </span>
              )}
            </div>
          </div>
          
          {/* Step: Select Date */}
          {step === "date" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Wählen Sie ein Datum</h2>
              
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">
                  {currentMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
                </span>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {["MO", "DI", "MI", "DO", "FR", "SA", "SO"].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
                {days.map((date, i) => {
                  const dateStr = date.toISOString().split("T")[0];
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isAvailable = availableDays.has(dateStr);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  
                  return (
                    <button
                      key={i}
                      onClick={() => handleDateSelect(date)}
                      disabled={!isAvailable}
                      className={`
                        aspect-square flex items-center justify-center text-sm rounded-full
                        transition-colors relative
                        ${!isCurrentMonth ? "text-muted-foreground/30" : ""}
                        ${isAvailable ? "hover:bg-primary/10 cursor-pointer font-medium text-primary" : "text-muted-foreground cursor-not-allowed"}
                        ${isSelected ? "bg-primary text-primary-foreground hover:bg-primary" : ""}
                        ${isToday && !isSelected ? "ring-1 ring-primary" : ""}
                      `}
                    >
                      {date.getDate()}
                      {isToday && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current" />}
                    </button>
                  );
                })}
              </div>
              
              {/* Timezone */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-auto border-0 p-0 h-auto font-normal hover:underline">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* Step: Select Time */}
          {step === "time" && selectedDate && (
            <div>
              <Button variant="ghost" size="sm" onClick={() => setStep("date")} className="mb-4">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>
              
              <h2 className="text-lg font-semibold mb-2">
                {selectedDate.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">Wählen Sie eine Uhrzeit</p>
              
              {availableTimeSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                  {availableTimeSlots.map(time => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      onClick={() => handleTimeSelect(time)}
                      className="justify-center"
                    >
                      {formatTime(time)}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Keine verfügbaren Zeiten an diesem Tag.
                </div>
              )}
            </div>
          )}
          
          {/* Step: Enter Details */}
          {step === "details" && selectedDate && selectedTime && (
            <div>
              <Button variant="ghost" size="sm" onClick={() => setStep("time")} className="mb-4">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>
              
              <div className="bg-muted rounded-lg p-4 mb-6">
                <div className="font-medium">{eventType.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedDate.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
                  {" · "}
                  {selectedTime} - {(() => {
                    const [h, m] = selectedTime.split(":").map(Number);
                    const end = new Date();
                    end.setHours(h, m + eventType.duration, 0, 0);
                    return `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`;
                  })()}
                </div>
              </div>
              
              <h2 className="text-lg font-semibold mb-4">Ihre Daten</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Ihr Name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="ihre@email.de"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notizen (optional)</Label>
                  <Textarea
                    id="notes"
                    value={guestNotes}
                    onChange={(e) => setGuestNotes(e.target.value)}
                    placeholder="Gibt es etwas, das der Gastgeber wissen sollte?"
                    rows={3}
                  />
                </div>
                
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={!guestName || !guestEmail || bookMutation.isPending}
                >
                  {bookMutation.isPending ? "Wird gebucht..." : "Termin buchen"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
