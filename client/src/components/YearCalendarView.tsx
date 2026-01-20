import React, { useMemo, useRef, useEffect } from "react";
import {
  format,
  startOfYear,
  endOfYear,
  eachWeekOfInterval,
  addDays,
  isToday,
  isSameDay,
  getDay,
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

// Hey Calendar style weekday abbreviations
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
  
  // Generate all weeks of the year - each week is a ROW
  const weeksData = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    
    // Get all week start dates (Monday)
    const weekStarts = eachWeekOfInterval(
      { start: yearStart, end: yearEnd },
      { weekStartsOn: 1 }
    );
    
    // For each week, generate the 7 days
    return weekStarts.map(weekStart => {
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        days.push(addDays(weekStart, i));
      }
      return days;
    });
  }, [currentDate]);

  // Scroll to current week on mount
  useEffect(() => {
    if (scrollRef.current) {
      const today = new Date();
      const currentWeekIdx = weeksData.findIndex(week => 
        week.some(day => isSameDay(day, today))
      );
      if (currentWeekIdx > 2) {
        const rowHeight = 56;
        scrollRef.current.scrollTop = Math.max(0, (currentWeekIdx - 2) * rowHeight);
      }
    }
  }, [weeksData]);

  // Calculate event bars for each week
  const eventBarsByWeek = useMemo(() => {
    if (!events || events.length === 0) return new Map();
    
    const barsByWeek = new Map<number, Array<{
      event: CalendarEvent;
      startDayIdx: number;
      endDayIdx: number;
      row: number;
    }>>();
    
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
      
      weeksData.forEach((week, weekIdx) => {
        const weekStart = week[0];
        const weekEnd = week[6];
        
        // Check if event overlaps this week
        if (eventEnd >= weekStart && eventStart <= weekEnd) {
          // Calculate start and end day indices within this week (0-6)
          let startDayIdx = 0;
          let endDayIdx = 6;
          
          for (let i = 0; i < 7; i++) {
            if (isSameDay(week[i], eventStart)) {
              startDayIdx = i;
              break;
            } else if (eventStart < week[i] && i === 0) {
              startDayIdx = 0;
              break;
            }
          }
          
          for (let i = 6; i >= 0; i--) {
            if (isSameDay(week[i], eventEnd)) {
              endDayIdx = i;
              break;
            } else if (eventEnd > week[i] && i === 6) {
              endDayIdx = 6;
              break;
            }
          }
          
          if (eventStart < week[0]) startDayIdx = 0;
          if (eventEnd > week[6]) endDayIdx = 6;
          
          // Find available row
          if (!barsByWeek.has(weekIdx)) {
            barsByWeek.set(weekIdx, []);
          }
          const weekBars = barsByWeek.get(weekIdx)!;
          
          // Check which rows are occupied
          const occupiedSlots = new Set<string>();
          weekBars.forEach(bar => {
            for (let d = bar.startDayIdx; d <= bar.endDayIdx; d++) {
              occupiedSlots.add(`${d}-${bar.row}`);
            }
          });
          
          let row = 0;
          let foundRow = false;
          while (!foundRow && row < 3) {
            foundRow = true;
            for (let d = startDayIdx; d <= endDayIdx; d++) {
              if (occupiedSlots.has(`${d}-${row}`)) {
                foundRow = false;
                break;
              }
            }
            if (!foundRow) row++;
          }
          
          weekBars.push({ event, startDayIdx, endDayIdx, row });
        }
      });
    });
    
    return barsByWeek;
  }, [events, weeksData]);

  const cellWidth = 90; // Width per day
  const rowHeight = 56; // Height per week row
  const eventHeight = 16;
  const eventGap = 2;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Scrollable container */}
      <div className="flex-1 overflow-auto" ref={scrollRef}>
        {/* Week rows */}
        {weeksData.map((week, weekIdx) => {
          const weekBars = eventBarsByWeek.get(weekIdx) || [];
          const maxRow = weekBars.length > 0 ? Math.max(...weekBars.map((b: { row: number }) => b.row)) : -1;
          const dynamicHeight = Math.max(rowHeight, 24 + (maxRow + 1) * (eventHeight + eventGap) + 4);
          
          return (
            <div 
              key={weekIdx} 
              className="flex border-b border-border/20 relative"
              style={{ minHeight: `${dynamicHeight}px` }}
            >
              {/* Day cells for this week */}
              {week.map((day, dayIdx) => {
                const dayIsToday = isToday(day);
                const isFirstOfMonth = day.getDate() === 1;
                const monthIdx = day.getMonth();
                const isCurrentYear = day.getFullYear() === year;
                const isWeekend = dayIdx >= 5;
                const weekdayAbbrev = WEEKDAY_ABBREVS[dayIdx];
                
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      "flex-shrink-0 border-r border-border/10 cursor-pointer hover:bg-muted/30 transition-colors relative",
                      isWeekend && "bg-muted/5",
                      !isCurrentYear && "opacity-40",
                      dayIsToday && "bg-blue-50/50 dark:bg-blue-950/20"
                    )}
                    style={{ width: `${cellWidth}px`, minHeight: `${dynamicHeight}px` }}
                    onClick={() => onDayClick(day)}
                    title={format(day, "EEEE, d. MMMM yyyy", { locale: de })}
                  >
                    {/* Day header: WOC TAG [MONAT] */}
                    <div className="flex items-center gap-1 px-1 py-1">
                      <span className={cn(
                        "text-[10px] uppercase tracking-wide",
                        isWeekend ? "text-muted-foreground/50" : "text-muted-foreground"
                      )}>
                        {weekdayAbbrev}
                      </span>
                      {dayIsToday ? (
                        <span className="text-xs font-bold text-white bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">
                          {day.getDate()}
                        </span>
                      ) : (
                        <span className={cn(
                          "text-xs font-bold",
                          isWeekend ? "text-muted-foreground/60" : "text-foreground"
                        )}>
                          {day.getDate()}
                        </span>
                      )}
                      {isFirstOfMonth && isCurrentYear && (
                        <span className="text-[9px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-1 rounded">
                          {MONTH_ABBREVS[monthIdx]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Event bars overlay for this week */}
              <div className="absolute inset-0 pointer-events-none" style={{ top: '24px' }}>
                {weekBars.map((bar: { event: CalendarEvent; startDayIdx: number; endDayIdx: number; row: number }, idx: number) => {
                  const left = bar.startDayIdx * cellWidth + 2;
                  const width = (bar.endDayIdx - bar.startDayIdx + 1) * cellWidth - 4;
                  const top = bar.row * (eventHeight + eventGap);
                  
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
                        height: `${eventHeight}px`
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
  );
}
