import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Clock, MapPin, Calendar, Settings, Copy, ExternalLink, Trash2, Edit, Video, Phone, Building, Link as LinkIcon, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sonntag", short: "S" },
  { value: 1, label: "Montag", short: "M" },
  { value: 2, label: "Dienstag", short: "D" },
  { value: 3, label: "Mittwoch", short: "M" },
  { value: 4, label: "Donnerstag", short: "D" },
  { value: 5, label: "Freitag", short: "F" },
  { value: 6, label: "Samstag", short: "S" },
];

const COLORS = [
  { value: "blue", label: "Blau", class: "bg-blue-500" },
  { value: "purple", label: "Lila", class: "bg-purple-500" },
  { value: "green", label: "Grün", class: "bg-green-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "red", label: "Rot", class: "bg-red-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
];

const LOCATION_TYPES = [
  { value: "google_meet", label: "Google Meet", icon: Video },
  { value: "phone", label: "Telefonat", icon: Phone },
  { value: "in_person", label: "Vor Ort", icon: Building },
  { value: "custom", label: "Benutzerdefiniert", icon: LinkIcon },
];

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

function EventTypeCard({ eventType, onEdit, onDelete }: { 
  eventType: any; 
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const { data: availability } = trpc.scheduling.availability.get.useQuery({ eventTypeId: eventType.id });
  
  const bookingUrl = `${window.location.origin}/book/${eventType.slug}`;
  
  const copyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast.success("Link kopiert!");
  };

  const colorClass = COLORS.find(c => c.value === eventType.color)?.class || "bg-blue-500";
  const locationType = LOCATION_TYPES.find(l => l.value === eventType.locationType);
  const LocationIcon = locationType?.icon || Video;

  // Group availability by day
  const availabilityByDay = DAYS_OF_WEEK.map(day => {
    const slots = availability?.filter(a => a.dayOfWeek === day.value && a.isAvailable) || [];
    return {
      ...day,
      slots,
      isAvailable: slots.length > 0,
    };
  });

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${colorClass}`} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${colorClass}`} />
            <div>
              <CardTitle className="text-lg">{eventType.name}</CardTitle>
              <CardDescription className="text-sm">One-on-One</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={copyLink}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Duration */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{eventType.duration} min</span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LocationIcon className="h-4 w-4" />
            <span>{locationType?.label || "Google Meet"}</span>
          </div>

          {/* Availability Summary */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {availabilityByDay.filter(d => d.isAvailable).map(d => d.short).join(", ") || "Keine Verfügbarkeit"}
              {availability && availability.length > 0 && `, ${availability[0].startTime} - ${availability[0].endTime}`}
            </span>
          </div>

          {/* Expand/Collapse */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between"
            onClick={() => setShowDetails(!showDetails)}
          >
            <span>Details</span>
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showDetails && (
            <div className="space-y-4 pt-2 border-t">
              {/* Weekly Hours */}
              <div>
                <h4 className="text-sm font-medium mb-2">Wöchentliche Verfügbarkeit</h4>
                <div className="space-y-1">
                  {availabilityByDay.map(day => (
                    <div key={day.value} className="flex items-center gap-2 text-sm">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        day.isAvailable ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {day.short}
                      </div>
                      <span className={day.isAvailable ? "" : "text-muted-foreground"}>
                        {day.isAvailable 
                          ? day.slots.map(s => `${s.startTime} - ${s.endTime}`).join(", ")
                          : "Nicht verfügbar"
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Booking Link */}
              <div>
                <h4 className="text-sm font-medium mb-2">Buchungslink</h4>
                <div className="flex items-center gap-2">
                  <Input value={bookingUrl} readOnly className="text-xs" />
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateEventTypeDialog({ open, onOpenChange, editEventType }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  editEventType?: any;
}) {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  
  const [name, setName] = useState(editEventType?.name || "");
  const [description, setDescription] = useState(editEventType?.description || "");
  const [duration, setDuration] = useState(editEventType?.duration?.toString() || "30");
  const [color, setColor] = useState(editEventType?.color || "blue");
  const [locationType, setLocationType] = useState(editEventType?.locationType || "google_meet");
  const [locationDetails, setLocationDetails] = useState(editEventType?.locationDetails || "");
  const [minNoticeHours, setMinNoticeHours] = useState(editEventType?.minNoticeHours?.toString() || "4");
  const [maxDaysInFuture, setMaxDaysInFuture] = useState(editEventType?.maxDaysInFuture?.toString() || "60");
  const [bufferBefore, setBufferBefore] = useState(editEventType?.bufferBefore?.toString() || "0");
  const [bufferAfter, setBufferAfter] = useState(editEventType?.bufferAfter?.toString() || "0");
  const [requiresConfirmation, setRequiresConfirmation] = useState(editEventType?.requiresConfirmation || false);
  // Reminder settings
  const [reminderMinutes, setReminderMinutes] = useState(editEventType?.reminderMinutes || "1440,60");
  const [sendGuestReminder, setSendGuestReminder] = useState(editEventType?.sendGuestReminder !== false);
  const [sendHostReminder, setSendHostReminder] = useState(editEventType?.sendHostReminder !== false);
  // Schedule selection
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(editEventType?.scheduleId || null);
  const [useCustomAvailability, setUseCustomAvailability] = useState(!editEventType?.scheduleId);
  
  // Load available schedules
  const { data: schedules } = trpc.scheduling.schedules.list.useQuery();
  
  // Availability state
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  
  // Load existing availability if editing
  const { data: existingAvailability } = trpc.scheduling.availability.get.useQuery(
    { eventTypeId: editEventType?.id },
    { enabled: !!editEventType?.id }
  );
  
  // Set availability when loaded
  useState(() => {
    if (existingAvailability) {
      setAvailability(existingAvailability.map(a => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isAvailable: a.isAvailable,
      })));
    }
  });

  const createMutation = trpc.scheduling.eventTypes.create.useMutation({
    onSuccess: async (data) => {
      // Set availability
      if (availability.length > 0) {
        await setAvailabilityMutation.mutateAsync({
          eventTypeId: data.id,
          availabilities: availability,
        });
      }
      toast.success("Event-Typ erstellt!");
      utils.scheduling.eventTypes.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.scheduling.eventTypes.update.useMutation({
    onSuccess: async () => {
      // Update availability
      if (editEventType?.id) {
        await setAvailabilityMutation.mutateAsync({
          eventTypeId: editEventType.id,
          availabilities: availability,
        });
      }
      toast.success("Event-Typ aktualisiert!");
      utils.scheduling.eventTypes.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const setAvailabilityMutation = trpc.scheduling.availability.set.useMutation();

  const resetForm = () => {
    setName("");
    setDescription("");
    setDuration("30");
    setColor("blue");
    setLocationType("google_meet");
    setLocationDetails("");
    setMinNoticeHours("4");
    setMaxDaysInFuture("60");
    setBufferBefore("0");
    setBufferAfter("0");
    setRequiresConfirmation(false);
    setReminderMinutes("1440,60");
    setSendGuestReminder(true);
    setSendHostReminder(true);
    setSelectedScheduleId(null);
    setUseCustomAvailability(true);
    setAvailability([]);
  };

  const handleSubmit = () => {
    const data = {
      name,
      description: description || undefined,
      duration: parseInt(duration),
      color,
      locationType: locationType as "google_meet" | "phone" | "in_person" | "custom",
      locationDetails: locationDetails || undefined,
      minNoticeHours: parseInt(minNoticeHours),
      maxDaysInFuture: parseInt(maxDaysInFuture),
      bufferBefore: parseInt(bufferBefore),
      bufferAfter: parseInt(bufferAfter),
      requiresConfirmation,
      reminderMinutes,
      sendGuestReminder,
      sendHostReminder,
      scheduleId: useCustomAvailability ? null : selectedScheduleId,
    };

    if (editEventType) {
      updateMutation.mutate({ id: editEventType.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleDayAvailability = (dayOfWeek: number) => {
    const existing = availability.find(a => a.dayOfWeek === dayOfWeek);
    if (existing) {
      setAvailability(availability.filter(a => a.dayOfWeek !== dayOfWeek));
    } else {
      setAvailability([...availability, {
        dayOfWeek,
        startTime: "09:00",
        endTime: "12:00",
        isAvailable: true,
      }]);
    }
  };

  const updateDayTime = (dayOfWeek: number, field: "startTime" | "endTime", value: string) => {
    setAvailability(availability.map(a => 
      a.dayOfWeek === dayOfWeek ? { ...a, [field]: value } : a
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editEventType ? "Event-Typ bearbeiten" : "Neuer Event-Typ"}</DialogTitle>
          <DialogDescription>
            Erstellen Sie einen Termintyp, den andere buchen können.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basics" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basics">Grundlagen</TabsTrigger>
            <TabsTrigger value="availability">Verfügbarkeit</TabsTrigger>
            <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-4 mt-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Feedback-Gespräch"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreiben Sie den Termintyp..."
                rows={3}
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Dauer</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 Minuten</SelectItem>
                  <SelectItem value="30">30 Minuten</SelectItem>
                  <SelectItem value="45">45 Minuten</SelectItem>
                  <SelectItem value="60">60 Minuten</SelectItem>
                  <SelectItem value="90">90 Minuten</SelectItem>
                  <SelectItem value="120">2 Stunden</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Farbe</Label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    className={`w-8 h-8 rounded-full ${c.class} ${
                      color === c.value ? "ring-2 ring-offset-2 ring-primary" : ""
                    }`}
                    onClick={() => setColor(c.value)}
                  />
                ))}
              </div>
            </div>

            {/* Location Type */}
            <div className="space-y-2">
              <Label>Ort</Label>
              <div className="grid grid-cols-2 gap-2">
                {LOCATION_TYPES.map(loc => {
                  const Icon = loc.icon;
                  return (
                    <button
                      key={loc.value}
                      type="button"
                      className={`flex items-center gap-2 p-3 rounded-lg border ${
                        locationType === loc.value 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:bg-muted"
                      }`}
                      onClick={() => setLocationType(loc.value)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{loc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location Details (for phone, in_person, custom) */}
            {locationType !== "google_meet" && (
              <div className="space-y-2">
                <Label htmlFor="locationDetails">
                  {locationType === "phone" ? "Telefonnummer" : 
                   locationType === "in_person" ? "Adresse" : "Link"}
                </Label>
                <Input
                  id="locationDetails"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder={
                    locationType === "phone" ? "+49 123 456789" :
                    locationType === "in_person" ? "Musterstraße 1, 12345 Berlin" :
                    "https://..."
                  }
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="availability" className="space-y-4 mt-4">
            {/* Schedule Selection */}
            <div className="space-y-3">
              <Label>Verfügbarkeit</Label>
              <div className="space-y-2">
                <div 
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    !useCustomAvailability ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
                  }`}
                  onClick={() => setUseCustomAvailability(false)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      !useCustomAvailability ? "border-primary" : "border-muted-foreground"
                    }`}>
                      {!useCustomAvailability && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="font-medium">Schedule verwenden</span>
                  </div>
                  {!useCustomAvailability && (
                    <div className="mt-2 ml-6">
                      <Select 
                        value={selectedScheduleId?.toString() || ""} 
                        onValueChange={(v) => setSelectedScheduleId(parseInt(v))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Schedule auswählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          {schedules?.map((s) => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.name} {s.isDefault && "(Standard)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Verwendet die Zeiten aus dem ausgewählten Schedule
                      </p>
                    </div>
                  )}
                </div>
                
                <div 
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    useCustomAvailability ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
                  }`}
                  onClick={() => setUseCustomAvailability(true)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      useCustomAvailability ? "border-primary" : "border-muted-foreground"
                    }`}>
                      {useCustomAvailability && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="font-medium">Eigene Zeiten festlegen</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Availability (only shown when useCustomAvailability is true) */}
            {useCustomAvailability && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Wöchentliche Verfügbarkeit</Label>
                  <p className="text-sm text-muted-foreground">
                    Wählen Sie die Tage und Zeiten, an denen Sie verfügbar sind.
                  </p>
                </div>

                <div className="space-y-3">
                  {DAYS_OF_WEEK.map(day => {
                    const dayAvail = availability.find(a => a.dayOfWeek === day.value);
                    const isAvailable = !!dayAvail;
                    
                    return (
                      <div key={day.value} className="flex items-center gap-4">
                        <button
                          type="button"
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                            isAvailable 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                          onClick={() => toggleDayAvailability(day.value)}
                        >
                          {day.short}
                        </button>
                        
                        {isAvailable ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              type="time"
                              value={dayAvail.startTime}
                              onChange={(e) => updateDayTime(day.value, "startTime", e.target.value)}
                              className="w-28"
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                              type="time"
                              value={dayAvail.endTime}
                              onChange={(e) => updateDayTime(day.value, "endTime", e.target.value)}
                              className="w-28"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nicht verfügbar</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <HelpCircle className="h-4 w-4" />
              <span>Zeitzone: Central European Time</span>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            {/* Date Range - Calendly Style */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Verfügbarkeit</Label>
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <p className="text-sm flex flex-wrap items-center gap-1">
                  <span>Gäste können bis zu</span>
                  <Select value={maxDaysInFuture} onValueChange={setMaxDaysInFuture}>
                    <SelectTrigger className="w-auto h-8 px-2 inline-flex bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Tage</SelectItem>
                      <SelectItem value="14">14 Tage</SelectItem>
                      <SelectItem value="30">30 Tage</SelectItem>
                      <SelectItem value="60">60 Tage</SelectItem>
                      <SelectItem value="90">90 Tage</SelectItem>
                      <SelectItem value="180">180 Tage</SelectItem>
                      <SelectItem value="365">1 Jahr</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>in die Zukunft buchen</span>
                </p>
                <p className="text-sm flex flex-wrap items-center gap-1">
                  <span>mit mindestens</span>
                  <Select value={minNoticeHours} onValueChange={setMinNoticeHours}>
                    <SelectTrigger className="w-auto h-8 px-2 inline-flex bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Stunde</SelectItem>
                      <SelectItem value="2">2 Stunden</SelectItem>
                      <SelectItem value="4">4 Stunden</SelectItem>
                      <SelectItem value="24">1 Tag</SelectItem>
                      <SelectItem value="48">2 Tage</SelectItem>
                      <SelectItem value="168">1 Woche</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>Vorlaufzeit</span>
                </p>
              </div>
            </div>

            {/* Buffer Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bufferBefore">Puffer vorher</Label>
                <Select value={bufferBefore} onValueChange={setBufferBefore}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Kein Puffer</SelectItem>
                    <SelectItem value="5">5 Minuten</SelectItem>
                    <SelectItem value="10">10 Minuten</SelectItem>
                    <SelectItem value="15">15 Minuten</SelectItem>
                    <SelectItem value="30">30 Minuten</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bufferAfter">Puffer nachher</Label>
                <Select value={bufferAfter} onValueChange={setBufferAfter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Kein Puffer</SelectItem>
                    <SelectItem value="5">5 Minuten</SelectItem>
                    <SelectItem value="10">10 Minuten</SelectItem>
                    <SelectItem value="15">15 Minuten</SelectItem>
                    <SelectItem value="30">30 Minuten</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Requires Confirmation */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Bestätigung erforderlich</Label>
                <p className="text-xs text-muted-foreground">
                  Müssen Sie Buchungen manuell bestätigen?
                </p>
              </div>
              <Switch
                checked={requiresConfirmation}
                onCheckedChange={setRequiresConfirmation}
              />
            </div>

            <Separator />

            {/* Reminder Settings */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Erinnerungen
              </h4>
              
              {/* Reminder Times */}
              <div className="space-y-2">
                <Label>Erinnerungszeiten</Label>
                <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 Stunde vorher</SelectItem>
                    <SelectItem value="1440">24 Stunden vorher</SelectItem>
                    <SelectItem value="1440,60">24 Stunden + 1 Stunde vorher</SelectItem>
                    <SelectItem value="2880,1440,60">48h + 24h + 1h vorher</SelectItem>
                    <SelectItem value="none">Keine Erinnerungen</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Wann sollen Erinnerungs-E-Mails gesendet werden?
                </p>
              </div>

              {/* Send to Guest */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Gast benachrichtigen</Label>
                  <p className="text-xs text-muted-foreground">
                    Erinnerung an den Gast senden
                  </p>
                </div>
                <Switch
                  checked={sendGuestReminder}
                  onCheckedChange={setSendGuestReminder}
                />
              </div>

              {/* Send to Host */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Gastgeber benachrichtigen</Label>
                  <p className="text-xs text-muted-foreground">
                    Erinnerung an Sie selbst senden
                  </p>
                </div>
                <Switch
                  checked={sendHostReminder}
                  onCheckedChange={setSendHostReminder}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!name || createMutation.isPending || updateMutation.isPending}
          >
            {editEventType ? "Speichern" : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Scheduling() {
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editEventType, setEditEventType] = useState<any>(null);
  
  const { data: eventTypes, isLoading } = trpc.scheduling.eventTypes.list.useQuery();
  const deleteMutation = trpc.scheduling.eventTypes.delete.useMutation({
    onSuccess: () => {
      toast.success("Event-Typ gelöscht!");
      trpc.useUtils().scheduling.eventTypes.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (eventType: any) => {
    setEditEventType(eventType);
    setCreateDialogOpen(true);
  };

  const handleDelete = (eventType: any) => {
    if (confirm(`Möchten Sie "${eventType.name}" wirklich löschen?`)) {
      deleteMutation.mutate({ id: eventType.id });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setEditEventType(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Terminplanung</h1>
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="event-types" className="w-full">
          <TabsList>
            <TabsTrigger value="event-types">Event-Typen</TabsTrigger>
            <TabsTrigger value="schedules">Verfügbarkeit</TabsTrigger>
            <TabsTrigger value="bookings">Buchungen</TabsTrigger>
          </TabsList>

          <TabsContent value="event-types" className="mt-6">
            {/* User Info */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-medium">
                {user?.name?.charAt(0) || "U"}
              </div>
              <span className="font-medium">{user?.name || "Benutzer"}</span>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Vereinfachen Sie Ihre Terminplanung mit Event-Typen</h2>
              <p className="text-muted-foreground">
                Event-Typen sind Vorlagen für Meetings, die Sie regelmäßig planen möchten, 
                wie Produktdemos, Kundengespräche, Sprechstunden und mehr.
              </p>
            </div>

            {/* Event Types Grid */}
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Laden...</div>
            ) : eventTypes && eventTypes.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {eventTypes.map((eventType) => (
                  <EventTypeCard
                    key={eventType.id}
                    eventType={eventType}
                    onEdit={() => handleEdit(eventType)}
                    onDelete={() => handleDelete(eventType)}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Keine Event-Typen</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Erstellen Sie Ihren ersten Event-Typ, damit andere Termine bei Ihnen buchen können.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Create Button */}
            <div className="mt-6">
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Neuer Event-Typ
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="schedules" className="mt-6">
            <SchedulesList />
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            <BookingsList />
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <CreateEventTypeDialog
          open={createDialogOpen}
          onOpenChange={handleDialogClose}
          editEventType={editEventType}
        />
      </div>
    </DashboardLayout>
  );
}

function BookingsList() {
  const { data: bookings, isLoading } = trpc.scheduling.bookings.listForHost.useQuery();
  const cancelMutation = trpc.scheduling.bookings.cancel.useMutation({
    onSuccess: () => {
      toast.success("Buchung storniert!");
      trpc.useUtils().scheduling.bookings.listForHost.invalidate();
    },
  });
  const confirmMutation = trpc.scheduling.bookings.confirm.useMutation({
    onSuccess: () => {
      toast.success("Buchung bestätigt!");
      trpc.useUtils().scheduling.bookings.listForHost.invalidate();
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Laden...</div>;
  }

  if (!bookings || bookings.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Keine Buchungen</h3>
          <p className="text-muted-foreground text-center">
            Sobald jemand einen Termin bei Ihnen bucht, erscheint er hier.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group bookings by status
  const pendingBookings = bookings.filter(b => b.status === "pending");
  const upcomingBookings = bookings.filter(b => b.status === "confirmed" && new Date(b.startTime) > new Date());
  const pastBookings = bookings.filter(b => b.status === "confirmed" && new Date(b.startTime) <= new Date());
  const cancelledBookings = bookings.filter(b => b.status === "cancelled");

  return (
    <div className="space-y-6">
      {/* Pending */}
      {pendingBookings.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Ausstehend</Badge>
            <span>{pendingBookings.length}</span>
          </h3>
          <div className="space-y-3">
            {pendingBookings.map(booking => (
              <BookingCard 
                key={booking.id} 
                booking={booking} 
                onCancel={() => cancelMutation.mutate({ id: booking.id })}
                onConfirm={() => confirmMutation.mutate({ id: booking.id })}
                showConfirm
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingBookings.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">Anstehende Termine</h3>
          <div className="space-y-3">
            {upcomingBookings.map(booking => (
              <BookingCard 
                key={booking.id} 
                booking={booking} 
                onCancel={() => cancelMutation.mutate({ id: booking.id })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past */}
      {pastBookings.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3 text-muted-foreground">Vergangene Termine</h3>
          <div className="space-y-3">
            {pastBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} isPast />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking, onCancel, onConfirm, showConfirm, isPast }: { 
  booking: any; 
  onCancel?: () => void;
  onConfirm?: () => void;
  showConfirm?: boolean;
  isPast?: boolean;
}) {
  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
  const colorClass = COLORS.find(c => c.value === booking.eventType?.color)?.class || "bg-blue-500";

  return (
    <Card className={`relative overflow-hidden ${isPast ? "opacity-60" : ""}`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${colorClass}`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="font-medium">{booking.eventType?.name || "Termin"}</h4>
            <p className="text-sm text-muted-foreground">
              {startTime.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
              {" · "}
              {startTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
              {" - "}
              {endTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Mit:</span> {booking.guestName} ({booking.guestEmail})
            </p>
            {booking.meetingLink && (
              <a 
                href={booking.meetingLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Video className="h-3 w-3" />
                Meeting beitreten
              </a>
            )}
          </div>
          {!isPast && (
            <div className="flex gap-2">
              {showConfirm && onConfirm && (
                <Button size="sm" onClick={onConfirm}>
                  Bestätigen
                </Button>
              )}
              {onCancel && (
                <Button size="sm" variant="outline" onClick={onCancel}>
                  Stornieren
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


// ==================== SCHEDULES LIST ====================

function SchedulesList() {
  const [editSchedule, setEditSchedule] = useState<any>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const { data: schedules, isLoading } = trpc.scheduling.schedules.list.useQuery();
  const ensureDefaultMutation = trpc.scheduling.schedules.ensureDefault.useMutation({
    onSuccess: () => {
      trpc.useUtils().scheduling.schedules.list.invalidate();
    },
  });
  const deleteMutation = trpc.scheduling.schedules.delete.useMutation({
    onSuccess: () => {
      toast.success("Schedule gelöscht!");
      trpc.useUtils().scheduling.schedules.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Ensure default schedule exists
  useEffect(() => {
    if (!isLoading && schedules && schedules.length === 0) {
      ensureDefaultMutation.mutate();
    }
  }, [isLoading, schedules]);

  const handleEdit = (schedule: any) => {
    setEditSchedule(schedule);
    setCreateDialogOpen(true);
  };

  const handleDelete = (schedule: any) => {
    if (schedule.isDefault) {
      toast.error("Das Standard-Schedule kann nicht gelöscht werden.");
      return;
    }
    if (confirm(`Möchten Sie "${schedule.name}" wirklich löschen?`)) {
      deleteMutation.mutate({ id: schedule.id });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setEditSchedule(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Verfügbarkeits-Vorlagen</h2>
        <p className="text-muted-foreground">
          Erstellen Sie wiederverwendbare Verfügbarkeits-Vorlagen (Schedules), die Sie 
          verschiedenen Event-Typen zuweisen können. So müssen Sie die Zeiten nicht 
          für jeden Event-Typ einzeln einstellen.
        </p>
      </div>

      {/* Schedules List */}
      {schedules && schedules.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onEdit={() => handleEdit(schedule)}
              onDelete={() => handleDelete(schedule)}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Keine Schedules</h3>
            <p className="text-muted-foreground text-center">
              Ein Standard-Schedule wird automatisch erstellt.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Button */}
      <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Neues Schedule
      </Button>

      {/* Create/Edit Dialog */}
      <ScheduleDialog
        open={createDialogOpen}
        onOpenChange={handleDialogClose}
        editSchedule={editSchedule}
      />
    </div>
  );
}

function ScheduleCard({ schedule, onEdit, onDelete }: { 
  schedule: any; 
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: scheduleWithAvailability } = trpc.scheduling.schedules.getById.useQuery(
    { id: schedule.id },
    { enabled: !!schedule.id }
  );

  const availability = scheduleWithAvailability?.availability || [];

  // Group availability by day
  const availabilityByDay = DAYS_OF_WEEK.map(day => {
    const slots = availability.filter((a: any) => a.dayOfWeek === day.value && a.isAvailable);
    return {
      ...day,
      slots,
      isAvailable: slots.length > 0,
    };
  });

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {schedule.name}
              {schedule.isDefault && (
                <Badge variant="secondary" className="text-xs">Standard</Badge>
              )}
            </CardTitle>
            <CardDescription className="text-sm">
              {schedule.timezone || "Europe/Berlin"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            {!schedule.isDefault && (
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm">
          {availabilityByDay.map(day => (
            <div key={day.value} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                day.isAvailable 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {day.short}
              </span>
              {day.isAvailable ? (
                <span className="text-muted-foreground">
                  {day.slots.map((s: any) => `${s.startTime} - ${s.endTime}`).join(", ")}
                </span>
              ) : (
                <span className="text-muted-foreground/50">Nicht verfügbar</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleDialog({ open, onOpenChange, editSchedule }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSchedule?: any;
}) {
  const utils = trpc.useUtils();
  
  const [name, setName] = useState(editSchedule?.name || "");
  const [timezone, setTimezone] = useState(editSchedule?.timezone || "Europe/Berlin");
  const [isDefault, setIsDefault] = useState(editSchedule?.isDefault || false);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);

  // Load existing availability if editing
  const { data: scheduleWithAvailability } = trpc.scheduling.schedules.getById.useQuery(
    { id: editSchedule?.id },
    { enabled: !!editSchedule?.id }
  );

  // Set form values when editing
  useEffect(() => {
    if (editSchedule) {
      setName(editSchedule.name || "");
      setTimezone(editSchedule.timezone || "Europe/Berlin");
      setIsDefault(editSchedule.isDefault || false);
    } else {
      setName("");
      setTimezone("Europe/Berlin");
      setIsDefault(false);
      setAvailability([]);
    }
  }, [editSchedule, open]);

  // Set availability when loaded
  useEffect(() => {
    if (scheduleWithAvailability?.availability) {
      setAvailability(scheduleWithAvailability.availability.map((a: any) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isAvailable: a.isAvailable,
      })));
    }
  }, [scheduleWithAvailability]);

  const createMutation = trpc.scheduling.schedules.create.useMutation({
    onSuccess: async (data) => {
      if (availability.length > 0) {
        await setAvailabilityMutation.mutateAsync({
          scheduleId: data.id,
          availabilities: availability,
        });
      }
      toast.success("Schedule erstellt!");
      utils.scheduling.schedules.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.scheduling.schedules.update.useMutation({
    onSuccess: async () => {
      if (editSchedule?.id) {
        await setAvailabilityMutation.mutateAsync({
          scheduleId: editSchedule.id,
          availabilities: availability,
        });
      }
      toast.success("Schedule aktualisiert!");
      utils.scheduling.schedules.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const setAvailabilityMutation = trpc.scheduling.schedules.setAvailability.useMutation();

  const handleSubmit = () => {
    const data = {
      name,
      timezone,
      isDefault,
    };

    if (editSchedule) {
      updateMutation.mutate({ id: editSchedule.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleDayAvailability = (dayOfWeek: number) => {
    const existing = availability.find(a => a.dayOfWeek === dayOfWeek);
    if (existing) {
      setAvailability(availability.filter(a => a.dayOfWeek !== dayOfWeek));
    } else {
      setAvailability([...availability, {
        dayOfWeek,
        startTime: "09:00",
        endTime: "17:00",
        isAvailable: true,
      }]);
    }
  };

  const updateDayTime = (dayOfWeek: number, field: "startTime" | "endTime", value: string) => {
    setAvailability(availability.map(a => 
      a.dayOfWeek === dayOfWeek ? { ...a, [field]: value } : a
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editSchedule ? "Schedule bearbeiten" : "Neues Schedule"}</DialogTitle>
          <DialogDescription>
            Erstellen Sie eine wiederverwendbare Verfügbarkeits-Vorlage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Name</Label>
            <Input
              id="schedule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Arbeitszeiten, Nachmittags, Wochenende"
            />
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="schedule-timezone">Zeitzone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Berlin">Europe/Berlin (CET)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Default Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Als Standard festlegen</Label>
              <p className="text-xs text-muted-foreground">
                Dieses Schedule wird für neue Event-Typen verwendet
              </p>
            </div>
            <Switch
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>

          <Separator />

          {/* Weekly Availability */}
          <div className="space-y-2">
            <Label>Wöchentliche Verfügbarkeit</Label>
            <p className="text-sm text-muted-foreground">
              Wählen Sie die Tage und Zeiten, an denen Sie verfügbar sind.
            </p>
          </div>

          <div className="space-y-3">
            {DAYS_OF_WEEK.map(day => {
              const dayAvail = availability.find(a => a.dayOfWeek === day.value);
              const isAvailable = !!dayAvail;
              
              return (
                <div key={day.value} className="flex items-center gap-4">
                  <button
                    type="button"
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      isAvailable 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    onClick={() => toggleDayAvailability(day.value)}
                  >
                    {day.short}
                  </button>
                  
                  {isAvailable ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={dayAvail.startTime}
                        onChange={(e) => updateDayTime(day.value, "startTime", e.target.value)}
                        className="w-28"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={dayAvail.endTime}
                        onChange={(e) => updateDayTime(day.value, "endTime", e.target.value)}
                        className="w-28"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Nicht verfügbar</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!name || createMutation.isPending || updateMutation.isPending}
          >
            {editSchedule ? "Speichern" : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
