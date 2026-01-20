import React, { useMemo, useRef, useEffect } from "react";
import {
  format,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  getDay,
  isToday,
  isSameDay,
  startOfWeek,
  addDays,
  differenceInDays,
} from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

interface YearCalendarViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const WEEKDAY_LABELS = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"];
const MONTH_NAMES = ["JAN.", "FEB.", "MÄRZ", "APR.", "MAI", "JUNI", "JULI", "AUG.", "SEP.", "OKT.", "NOV.", "DEZ."];

const getEventBgColor = (color: string) => {
  const colors: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    pink: "bg-pink-500",
    orange: "bg-orange-500",
    gray: "bg-gray-500",
  };
  return colors[color] || "bg-gray-500";
};

export function YearCalendarView({
  currentDate,
  events,
  onDayClick,
  onEventClick,
}: YearCalendarViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const year = currentDate.getFullYear();
  
  // Generate all weeks of the year as columns
  // Each column represents one week (7 days vertically)
  const weeksData = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    
    // Find the Monday of the week containing Jan 1
    const firstMonday = startOfWeek(yearStart, { weekStartsOn: 1 });
    // Find the Sunday of the week containing Dec 31
    const lastSunday = addDays(startOfWeek(yearEnd, { weekStartsOn: 1 }), 6);
    
    const weeks: { days: Date[]; weekStart: Date }[] = [];
    let currentWeekStart = firstMonday;
    
    while (currentWeekStart <= lastSunday) {
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        days.push(addDays(currentWeekStart, i));
      }
      weeks.push({ days, weekStart: currentWeekStart });
      currentWeekStart = addDays(currentWeekStart, 7);
    }
    
    return weeks;
  }, [currentDate]);

  // Scroll to current week on mount
  useEffect(() => {
    if (scrollRef.current) {
      const today = new Date();
      const todayWeekIdx = weeksData.findIndex(week => 
        week.days.some(d => isSameDay(d, today))
      );
      if (todayWeekIdx > 2) {
        const scrollPosition = Math.max(0, (todayWeekIdx - 2) * 32);
        scrollRef.current.scrollLeft = scrollPosition;
      }
    }
  }, [weeksData]);

  // Calculate event bars - events span horizontally across weeks
  const eventBars = useMemo(() => {
    if (!events || events.length === 0) return [];
    
    const bars: Array<{
      event: CalendarEvent;
      weekdayRow: number;
      startWeekIdx: number;
      endWeekIdx: number;
      row: number;
    }> = [];
    
    // Track occupied slots per weekday row
    const occupied: Map<number, Map<number, Set<number>>> = new Map();
    for (let i = 0; i < 7; i++) {
      occupied.set(i, new Map());
    }
    
    // Sort events by duration (longer first) then by start date
    const sortedEvents = [...events].sort((a, b) => {
      const aDuration = differenceInDays(new Date(a.endDate), new Date(a.startDate));
      const bDuration = differenceInDays(new Date(b.endDate), new Date(b.startDate));
      if (bDuration !== aDuration) return bDuration - aDuration;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
    
    sortedEvents.forEach((event) => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      
      // For multi-day events, we need to render bars on each weekday row
      // For now, just render on the start day's weekday
      const startWeekday = getDay(eventStart) === 0 ? 6 : getDay(eventStart) - 1;
      
      // Find start and end week indices
      let startWeekIdx = -1;
      let endWeekIdx = -1;
      
      weeksData.forEach((week, weekIdx) => {
        week.days.forEach((day) => {
          if (isSameDay(day, eventStart)) {
            startWeekIdx = weekIdx;
          }
          if (isSameDay(day, eventEnd)) {
            endWeekIdx = weekIdx;
          }
        });
      });
      
      if (startWeekIdx === -1) return;
      if (endWeekIdx === -1) endWeekIdx = startWeekIdx;
      
      const weekdayOccupied = occupied.get(startWeekday)!;
      
      // Find available row
      let row = 0;
      let foundRow = false;
      while (!foundRow && row < 3) {
        foundRow = true;
        for (let w = startWeekIdx; w <= endWeekIdx; w++) {
          const weekRows = weekdayOccupied.get(w) || new Set();
          if (weekRows.has(row)) {
            foundRow = false;
            break;
          }
        }
        if (!foundRow) row++;
      }
      
      // Mark as occupied
      for (let w = startWeekIdx; w <= endWeekIdx; w++) {
        if (!weekdayOccupied.has(w)) {
          weekdayOccupied.set(w, new Set());
        }
        weekdayOccupied.get(w)!.add(row);
      }
      
      bars.push({ event, weekdayRow: startWeekday, startWeekIdx, endWeekIdx, row });
    });
    
    return bars;
  }, [events, weeksData]);

  const cellWidth = 32;
  const rowHeight = 48;
  const headerHeight = 24;
  const weekdayLabelWidth = 32;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Scrollable container */}
      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div className="inline-flex flex-col min-w-full">
          {/* Header row with week numbers/month markers */}
          <div className="flex sticky top-0 bg-background z-20 border-b">
            <div 
              className="flex-shrink-0 bg-background sticky left-0 z-30" 
              style={{ width: `${weekdayLabelWidth}px`, height: `${headerHeight}px` }} 
            />
            {weeksData.map((week, weekIdx) => {
              const monday = week.days[0];
              const isMonthStart = monday.getDate() <= 7 && monday.getDate() >= 1;
              const monthIdx = monday.getMonth();
              const hasToday = week.days.some(d => isToday(d));
              const todayInWeek = week.days.find(d => isToday(d));
              const isCurrentYear = monday.getFullYear() === year;
              
              return (
                <div
                  key={weekIdx}
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center text-[9px] border-r border-border/20",
                    !isCurrentYear && "opacity-30"
                  )}
                  style={{ width: `${cellWidth}px`, height: `${headerHeight}px` }}
                >
                  {isMonthStart && isCurrentYear ? (
                    <span className="font-semibold text-primary truncate px-0.5">
                      {MONTH_NAMES[monthIdx]}
                    </span>
                  ) : hasToday && todayInWeek ? (
                    <span className="bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold">
                      {format(todayInWeek, "d")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">
                      {format(monday, "d")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Calendar grid - 7 rows for weekdays */}
          <div className="relative">
            {WEEKDAY_LABELS.map((dayName, rowIdx) => (
              <div 
                key={rowIdx} 
                className="flex"
                style={{ height: `${rowHeight}px` }}
              >
                {/* Weekday label - sticky left */}
                <div 
                  className="flex-shrink-0 text-[10px] text-muted-foreground font-medium flex items-start justify-center pt-1 sticky left-0 bg-background z-10 border-r"
                  style={{ width: `${weekdayLabelWidth}px` }}
                >
                  {dayName}
                </div>
                
                {/* Week columns for this weekday */}
                {weeksData.map((week, weekIdx) => {
                  const day = week.days[rowIdx];
                  const isCurrentYear = day.getFullYear() === year;
                  const isWeekend = rowIdx >= 5;
                  const dayIsToday = isToday(day);
                  const isFirstOfMonth = day.getDate() === 1;
                  
                  return (
                    <div
                      key={weekIdx}
                      className={cn(
                        "flex-shrink-0 border-r border-b border-border/10 cursor-pointer hover:bg-muted/40 transition-colors relative group",
                        isWeekend && "bg-muted/5",
                        !isCurrentYear && "opacity-20",
                        dayIsToday && "bg-red-50 dark:bg-red-950/30",
                        isFirstOfMonth && "border-l-2 border-l-primary/30"
                      )}
                      style={{ width: `${cellWidth}px` }}
                      onClick={() => onDayClick(day)}
                      title={format(day, "EEEE, d. MMMM yyyy", { locale: de })}
                    >
                      {/* Day number in corner */}
                      <div className={cn(
                        "absolute top-0.5 left-0.5 text-[8px] leading-none",
                        dayIsToday ? "text-red-500 font-bold" : "text-muted-foreground/40",
                        "group-hover:text-muted-foreground"
                      )}>
                        {format(day, "d")}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            
            {/* Event bars overlay */}
            <div 
              className="absolute pointer-events-none"
              style={{ 
                top: 0, 
                left: weekdayLabelWidth,
                right: 0,
                bottom: 0
              }}
            >
              {eventBars.map((bar, idx) => {
                const top = bar.weekdayRow * rowHeight + 12 + bar.row * 10;
                const left = bar.startWeekIdx * cellWidth + 1;
                const width = (bar.endWeekIdx - bar.startWeekIdx + 1) * cellWidth - 2;
                
                return (
                  <div
                    key={idx}
                    className={cn(
                      "absolute h-2 rounded-sm text-[7px] text-white px-0.5 truncate pointer-events-auto cursor-pointer hover:opacity-80 shadow-sm flex items-center",
                      getEventBgColor(bar.event.color)
                    )}
                    style={{ 
                      top: `${top}px`, 
                      left: `${left}px`, 
                      width: `${width}px`,
                      maxWidth: `${width}px`
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(bar.event);
                    }}
                    title={bar.event.title}
                  >
                    <span className="truncate">{bar.event.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
