import React, { useMemo, useRef, useEffect } from "react";
import {
  format,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
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

// Hey Calendar style - weekdays as ROW headers on the left
const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
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
  
  // Generate all days of the year
  const allDays = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    return eachDayOfInterval({ start: yearStart, end: yearEnd });
  }, [currentDate]);

  // Group days by weekday (0=Monday, 1=Tuesday, ..., 6=Sunday)
  // Each row is a weekday, each column is a specific date
  const daysByWeekday = useMemo(() => {
    // Create 7 arrays, one for each weekday
    const weekdays: (Date | null)[][] = [[], [], [], [], [], [], []];
    
    // Find the first Monday of the year or before
    const firstDay = allDays[0];
    const firstDayWeekday = getDay(firstDay); // 0=Sunday, 1=Monday, ...
    const mondayBasedWeekday = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1; // Convert to Monday=0
    
    // Calculate how many weeks we need (roughly 53)
    const totalWeeks = Math.ceil((allDays.length + mondayBasedWeekday) / 7);
    
    // Initialize arrays with nulls
    for (let w = 0; w < 7; w++) {
      weekdays[w] = new Array(totalWeeks).fill(null);
    }
    
    // Place each day in the correct position
    allDays.forEach((day, idx) => {
      const dayWeekday = getDay(day); // 0=Sunday
      const mondayBased = dayWeekday === 0 ? 6 : dayWeekday - 1; // Monday=0, Sunday=6
      const weekIndex = Math.floor((idx + mondayBasedWeekday) / 7);
      weekdays[mondayBased][weekIndex] = day;
    });
    
    return weekdays;
  }, [allDays]);

  // Calculate column indices for each day (for event positioning)
  const dayToColumnIndex = useMemo(() => {
    const map = new Map<string, number>();
    const firstDay = allDays[0];
    const firstDayWeekday = getDay(firstDay);
    const mondayBasedWeekday = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;
    
    allDays.forEach((day, idx) => {
      const weekIndex = Math.floor((idx + mondayBasedWeekday) / 7);
      map.set(format(day, 'yyyy-MM-dd'), weekIndex);
    });
    return map;
  }, [allDays]);

  // Number of columns (weeks)
  const numColumns = daysByWeekday[0].length;

  // Scroll to current week on mount
  useEffect(() => {
    if (scrollRef.current) {
      const today = new Date();
      const todayKey = format(today, 'yyyy-MM-dd');
      const colIdx = dayToColumnIndex.get(todayKey);
      if (colIdx !== undefined && colIdx > 3) {
        const colWidth = 48;
        scrollRef.current.scrollLeft = Math.max(0, (colIdx - 3) * colWidth);
      }
    }
  }, [dayToColumnIndex]);

  // Calculate event bars - events span horizontally across columns
  const eventBars = useMemo(() => {
    if (!events || events.length === 0) return [];
    
    const bars: Array<{
      event: CalendarEvent;
      weekdayRow: number;
      startCol: number;
      endCol: number;
      row: number;
    }> = [];
    
    // Track occupied slots per weekday row
    const occupiedSlots: Map<number, Set<string>> = new Map();
    for (let i = 0; i < 7; i++) {
      occupiedSlots.set(i, new Set());
    }
    
    // Sort events by duration (longer first)
    const sortedEvents = [...events].sort((a, b) => {
      const aDuration = differenceInDays(new Date(a.endDate), new Date(a.startDate));
      const bDuration = differenceInDays(new Date(b.endDate), new Date(b.startDate));
      return bDuration - aDuration;
    });
    
    sortedEvents.forEach((event) => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      
      // Get all days this event spans
      const eventDays = eachDayOfInterval({ start: eventStart, end: eventEnd });
      
      // Group consecutive days by weekday row
      const segments: Map<number, { startCol: number; endCol: number }> = new Map();
      
      eventDays.forEach((day) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const colIdx = dayToColumnIndex.get(dayKey);
        if (colIdx === undefined) return;
        
        const dayWeekday = getDay(day);
        const mondayBased = dayWeekday === 0 ? 6 : dayWeekday - 1;
        
        if (!segments.has(mondayBased)) {
          segments.set(mondayBased, { startCol: colIdx, endCol: colIdx });
        } else {
          const seg = segments.get(mondayBased)!;
          seg.startCol = Math.min(seg.startCol, colIdx);
          seg.endCol = Math.max(seg.endCol, colIdx);
        }
      });
      
      // Create bars for each weekday segment
      segments.forEach((seg, weekdayRow) => {
        const slots = occupiedSlots.get(weekdayRow)!;
        
        // Find available row
        let row = 0;
        let foundRow = false;
        while (!foundRow && row < 3) {
          foundRow = true;
          for (let c = seg.startCol; c <= seg.endCol; c++) {
            if (slots.has(`${c}-${row}`)) {
              foundRow = false;
              break;
            }
          }
          if (!foundRow) row++;
        }
        
        // Mark slots as occupied
        for (let c = seg.startCol; c <= seg.endCol; c++) {
          slots.add(`${c}-${row}`);
        }
        
        bars.push({
          event,
          weekdayRow,
          startCol: seg.startCol,
          endCol: seg.endCol,
          row,
        });
      });
    });
    
    return bars;
  }, [events, dayToColumnIndex]);

  const colWidth = 48; // Width per day column
  const rowHeight = 80; // Height per weekday row
  const headerHeight = 28; // Height of the date header
  const eventHeight = 16;
  const eventGap = 2;
  const weekdayLabelWidth = 40; // Width of the weekday labels on the left

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Main container with fixed weekday labels and scrollable content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed weekday labels on the left */}
        <div className="flex-shrink-0 flex flex-col" style={{ width: `${weekdayLabelWidth}px` }}>
          {/* Empty corner for header alignment */}
          <div style={{ height: `${headerHeight}px` }} className="border-b border-border/20" />
          
          {/* Weekday labels */}
          {WEEKDAY_LABELS.map((label, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-start justify-end pr-2 pt-1 text-[11px] font-medium uppercase tracking-wide",
                idx >= 5 ? "text-muted-foreground/50" : "text-muted-foreground"
              )}
              style={{ height: `${rowHeight}px` }}
            >
              {label}
            </div>
          ))}
        </div>
        
        {/* Scrollable calendar grid */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden" ref={scrollRef}>
          <div style={{ width: `${numColumns * colWidth}px` }}>
            {/* Header row with dates and month labels */}
            <div className="flex border-b border-border/20" style={{ height: `${headerHeight}px` }}>
              {daysByWeekday[0].map((_, colIdx) => {
                // Find the first non-null day in this column to get the date
                let columnDate: Date | null = null;
                for (let w = 0; w < 7; w++) {
                  if (daysByWeekday[w][colIdx]) {
                    columnDate = daysByWeekday[w][colIdx];
                    break;
                  }
                }
                
                // Check if this column starts a new month
                const isFirstOfMonth = columnDate && columnDate.getDate() <= 7;
                const showMonthLabel = columnDate && columnDate.getDate() === 1;
                const monthIdx = columnDate ? columnDate.getMonth() : 0;
                
                return (
                  <div
                    key={colIdx}
                    className="flex-shrink-0 flex items-center justify-center text-[10px] text-muted-foreground border-r border-border/10"
                    style={{ width: `${colWidth}px` }}
                  >
                    {showMonthLabel && (
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        {MONTH_ABBREVS[monthIdx]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Weekday rows */}
            {WEEKDAY_LABELS.map((_, weekdayIdx) => {
              const rowBars = eventBars.filter(b => b.weekdayRow === weekdayIdx);
              
              return (
                <div
                  key={weekdayIdx}
                  className={cn(
                    "flex relative border-b border-border/10",
                    weekdayIdx >= 5 && "bg-muted/5"
                  )}
                  style={{ height: `${rowHeight}px` }}
                >
                  {/* Day cells */}
                  {daysByWeekday[weekdayIdx].map((day, colIdx) => {
                    if (!day) {
                      return (
                        <div
                          key={colIdx}
                          className="flex-shrink-0 border-r border-border/5"
                          style={{ width: `${colWidth}px` }}
                        />
                      );
                    }
                    
                    const dayIsToday = isToday(day);
                    const isCurrentYear = day.getFullYear() === year;
                    const isFirstOfMonth = day.getDate() === 1;
                    const monthIdx = day.getMonth();
                    
                    return (
                      <div
                        key={colIdx}
                        className={cn(
                          "flex-shrink-0 border-r border-border/10 cursor-pointer hover:bg-muted/30 transition-colors",
                          !isCurrentYear && "opacity-40",
                          dayIsToday && "bg-blue-50/50 dark:bg-blue-950/20"
                        )}
                        style={{ width: `${colWidth}px` }}
                        onClick={() => onDayClick(day)}
                        title={format(day, "EEEE, d. MMMM yyyy", { locale: de })}
                      >
                        {/* Day number */}
                        <div className="flex items-center gap-0.5 px-1 pt-1">
                          {dayIsToday ? (
                            <span className="text-xs font-bold text-white bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">
                              {day.getDate()}
                            </span>
                          ) : (
                            <span className={cn(
                              "text-xs font-bold",
                              weekdayIdx >= 5 ? "text-muted-foreground/60" : "text-foreground"
                            )}>
                              {day.getDate()}
                            </span>
                          )}
                          {isFirstOfMonth && (
                            <span className="text-[8px] font-semibold text-orange-600 dark:text-orange-400">
                              {MONTH_ABBREVS[monthIdx]}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Event bars overlay */}
                  <div className="absolute inset-0 pointer-events-none" style={{ top: '22px' }}>
                    {rowBars.map((bar, idx) => {
                      const left = bar.startCol * colWidth + 2;
                      const width = (bar.endCol - bar.startCol + 1) * colWidth - 4;
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
                            height: `${eventHeight}px`,
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
    </div>
  );
}
