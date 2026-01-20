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

// Hey Calendar style: MON, TUE, WED, THU, FRI, SAT, SUN
const WEEKDAY_ABBREVS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTH_ABBREVS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

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
  
  // Generate all days of the year as columns (like Hey Calendar)
  // Each column is one day, rows are weeks
  const daysData = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    
    // Find the Monday of the week containing Jan 1
    const firstMonday = startOfWeek(yearStart, { weekStartsOn: 1 });
    // Find the Sunday of the week containing Dec 31
    const lastSunday = addDays(startOfWeek(yearEnd, { weekStartsOn: 1 }), 6);
    
    // Generate all days
    const allDays = eachDayOfInterval({ start: firstMonday, end: lastSunday });
    
    return allDays;
  }, [currentDate]);

  // Group days by week (for row layout like Hey)
  const weeksData = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < daysData.length; i += 7) {
      weeks.push(daysData.slice(i, i + 7));
    }
    return weeks;
  }, [daysData]);

  // Scroll to current week on mount
  useEffect(() => {
    if (scrollRef.current) {
      const today = new Date();
      const todayIdx = daysData.findIndex(d => isSameDay(d, today));
      if (todayIdx > 7) {
        const scrollPosition = Math.max(0, (todayIdx - 7) * 46);
        scrollRef.current.scrollLeft = scrollPosition;
      }
    }
  }, [daysData]);

  // Calculate event bars for Hey-style horizontal rendering
  const eventBars = useMemo(() => {
    if (!events || events.length === 0) return [];
    
    const bars: Array<{
      event: CalendarEvent;
      weekIdx: number;
      startDayInWeek: number;
      endDayInWeek: number;
      row: number;
    }> = [];
    
    // Track occupied slots per week
    const occupied: Map<number, Map<string, number>> = new Map();
    
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
      
      // Find which weeks this event spans
      weeksData.forEach((week, weekIdx) => {
        const weekStart = week[0];
        const weekEnd = week[6];
        
        // Check if event overlaps this week
        if (eventEnd >= weekStart && eventStart <= weekEnd) {
          // Calculate start and end day within this week (0-6)
          let startDayInWeek = 0;
          let endDayInWeek = 6;
          
          for (let i = 0; i < 7; i++) {
            if (isSameDay(week[i], eventStart) || (eventStart < week[i] && i === 0)) {
              startDayInWeek = eventStart < week[0] ? 0 : i;
            }
            if (isSameDay(week[i], eventEnd) || (eventEnd > week[i] && i === 6)) {
              endDayInWeek = eventEnd > week[6] ? 6 : i;
            }
          }
          
          // Recalculate to ensure correct bounds
          if (eventStart < week[0]) startDayInWeek = 0;
          else {
            for (let i = 0; i < 7; i++) {
              if (isSameDay(week[i], eventStart)) {
                startDayInWeek = i;
                break;
              }
            }
          }
          
          if (eventEnd > week[6]) endDayInWeek = 6;
          else {
            for (let i = 6; i >= 0; i--) {
              if (isSameDay(week[i], eventEnd)) {
                endDayInWeek = i;
                break;
              }
            }
          }
          
          // Find available row
          if (!occupied.has(weekIdx)) {
            occupied.set(weekIdx, new Map());
          }
          const weekOccupied = occupied.get(weekIdx)!;
          
          let row = 0;
          let foundRow = false;
          while (!foundRow && row < 5) {
            foundRow = true;
            for (let d = startDayInWeek; d <= endDayInWeek; d++) {
              const key = `${d}-${row}`;
              if (weekOccupied.has(key)) {
                foundRow = false;
                break;
              }
            }
            if (!foundRow) row++;
          }
          
          // Mark as occupied
          for (let d = startDayInWeek; d <= endDayInWeek; d++) {
            weekOccupied.set(`${d}-${row}`, 1);
          }
          
          bars.push({ event, weekIdx, startDayInWeek, endDayInWeek, row });
        }
      });
    });
    
    return bars;
  }, [events, weeksData]);

  const cellWidth = 46; // Width per day column
  const rowHeight = 52; // Height per week row
  const eventHeight = 16;
  const eventGap = 2;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Scrollable container - horizontal scroll */}
      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div className="inline-block min-w-full">
          {/* Header row with day numbers */}
          <div className="flex sticky top-0 bg-background z-20 border-b border-border/30">
            {daysData.map((day, dayIdx) => {
              const dayIsToday = isToday(day);
              const isFirstOfMonth = day.getDate() === 1;
              const monthIdx = day.getMonth();
              const isCurrentYear = day.getFullYear() === year;
              const weekdayIdx = getDay(day) === 0 ? 6 : getDay(day) - 1;
              
              return (
                <div
                  key={dayIdx}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center justify-center py-1 border-r border-border/10",
                    !isCurrentYear && "opacity-30"
                  )}
                  style={{ width: `${cellWidth}px` }}
                >
                  {/* Month label on first of month */}
                  {isFirstOfMonth && isCurrentYear ? (
                    <div className="flex items-center gap-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                        {WEEKDAY_ABBREVS[weekdayIdx]}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold",
                        dayIsToday ? "text-white bg-red-500 rounded px-1" : "text-foreground"
                      )}>
                        {day.getDate()}
                      </span>
                      <span className="text-[9px] font-semibold text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-1 rounded ml-0.5">
                        {MONTH_ABBREVS[monthIdx]}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                        {WEEKDAY_ABBREVS[weekdayIdx]}
                      </span>
                      {dayIsToday ? (
                        <span className="text-[10px] font-bold text-white bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">
                          {day.getDate()}
                        </span>
                      ) : (
                        <span className={cn(
                          "text-[10px] font-bold",
                          weekdayIdx >= 5 ? "text-muted-foreground/60" : "text-foreground"
                        )}>
                          {day.getDate()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Week rows with events */}
          {weeksData.map((week, weekIdx) => {
            const weekEvents = eventBars.filter(b => b.weekIdx === weekIdx);
            const maxRow = weekEvents.length > 0 ? Math.max(...weekEvents.map(e => e.row)) : -1;
            const dynamicHeight = Math.max(rowHeight, 20 + (maxRow + 1) * (eventHeight + eventGap));
            
            return (
              <div 
                key={weekIdx} 
                className="flex relative border-b border-border/10"
                style={{ minHeight: `${dynamicHeight}px` }}
              >
                {/* Day cells */}
                {week.map((day, dayInWeek) => {
                  const isCurrentYear = day.getFullYear() === year;
                  const weekdayIdx = getDay(day) === 0 ? 6 : getDay(day) - 1;
                  const isWeekend = weekdayIdx >= 5;
                  const dayIsToday = isToday(day);
                  
                  return (
                    <div
                      key={dayInWeek}
                      className={cn(
                        "flex-shrink-0 border-r border-border/10 cursor-pointer hover:bg-muted/30 transition-colors",
                        isWeekend && "bg-muted/5",
                        !isCurrentYear && "opacity-20",
                        dayIsToday && "bg-red-50/50 dark:bg-red-950/20"
                      )}
                      style={{ width: `${cellWidth}px`, minHeight: `${dynamicHeight}px` }}
                      onClick={() => onDayClick(day)}
                      title={format(day, "EEEE, d. MMMM yyyy", { locale: de })}
                    />
                  );
                })}
                
                {/* Event bars overlay for this week */}
                <div className="absolute inset-0 pointer-events-none">
                  {weekEvents.map((bar, idx) => {
                    const left = bar.startDayInWeek * cellWidth + 2;
                    const width = (bar.endDayInWeek - bar.startDayInWeek + 1) * cellWidth - 4;
                    const top = 4 + bar.row * (eventHeight + eventGap);
                    
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "absolute rounded text-[10px] text-white px-1.5 truncate pointer-events-auto cursor-pointer hover:opacity-80 shadow-sm flex items-center font-medium",
                          getEventBgColor(bar.event.color)
                        )}
                        style={{ 
                          top: `${top}px`, 
                          left: `${left}px`, 
                          width: `${width}px`,
                          height: `${eventHeight}px`,
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
