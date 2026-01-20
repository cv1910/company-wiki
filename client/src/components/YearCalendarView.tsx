import React, { useMemo, useEffect, useState, useRef } from "react";
import {
  format,
  startOfYear,
  endOfYear,
  addDays,
  isToday,
  isSameDay,
  differenceInDays,
  getMonth,
  getDay,
  subDays,
} from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

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

// Hey Calendar style month colors
const MONTH_COLORS: Record<number, string> = {
  0: "bg-blue-500",    // JAN
  1: "bg-blue-400",    // FEB
  2: "bg-orange-500",  // MAR
  3: "bg-green-500",   // APR
  4: "bg-green-400",   // MAY
  5: "bg-yellow-500",  // JUN
  6: "bg-orange-400",  // JUL
  7: "bg-orange-500",  // AUG
  8: "bg-red-500",     // SEP
  9: "bg-orange-600",  // OCT
  10: "bg-amber-700",  // NOV
  11: "bg-blue-600",   // DEC
};

const MONTH_ABBREVS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const WEEKDAY_ABBREVS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const getEventBgColor = (color: string) => {
  const colors: Record<string, string> = {
    blue: "bg-blue-400",
    green: "bg-green-400",
    red: "bg-red-400",
    yellow: "bg-yellow-400",
    purple: "bg-purple-400",
    pink: "bg-pink-400",
    orange: "bg-orange-400",
    gray: "bg-gray-400",
    teal: "bg-teal-400",
  };
  return colors[color] || "bg-gray-400";
};

export function YearCalendarView({
  currentDate,
  events,
  onDayClick,
  onEventClick,
}: YearCalendarViewProps) {
  const year = currentDate.getFullYear();
  const { setOpen } = useSidebar();
  const containerRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(52);
  
  // Hide sidebar completely when year view is active
  useEffect(() => {
    setOpen(false);
    
    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
    const sidebarRail = document.querySelector('[data-sidebar="rail"]');
    if (sidebar) (sidebar as HTMLElement).style.display = 'none';
    if (sidebarRail) (sidebarRail as HTMLElement).style.display = 'none';
    
    return () => {
      if (sidebar) (sidebar as HTMLElement).style.display = '';
      if (sidebarRail) (sidebarRail as HTMLElement).style.display = '';
      setOpen(true);
    };
  }, [setOpen]);
  
  // Generate all days of the year as rows of 28 days each (like Hey Calendar)
  const rows = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    
    // Start from the Monday before or on Jan 1
    const jan1DayOfWeek = getDay(yearStart); // 0=Sun, 1=Mon, ...
    const daysToGoBack = jan1DayOfWeek === 0 ? 6 : jan1DayOfWeek - 1;
    let currentDay = subDays(yearStart, daysToGoBack);
    
    const allRows: Date[][] = [];
    const DAYS_PER_ROW = 28; // 4 weeks per row like Hey Calendar
    
    // Generate rows until we've covered the entire year
    while (currentDay <= yearEnd || allRows.length < 14) {
      const row: Date[] = [];
      for (let i = 0; i < DAYS_PER_ROW; i++) {
        row.push(currentDay);
        currentDay = addDays(currentDay, 1);
      }
      allRows.push(row);
      
      // Stop if we've passed the year end
      if (currentDay > yearEnd) {
        break;
      }
    }
    
    return allRows;
  }, [currentDate]);

  // Calculate dynamic row height based on available space
  useEffect(() => {
    const calculateRowHeight = () => {
      // Use viewport height minus header (60px) and preview bar (44px) to calculate available space
      const viewportHeight = window.innerHeight;
      const headerHeight = 60; // Header is approximately 60px
      const previewBarHeight = 44; // Preview mode bar at bottom
      const padding = 10; // Extra padding for safety
      const availableHeight = viewportHeight - headerHeight - previewBarHeight - padding;
      const numRows = rows.length;
      // Calculate height per row to fit all rows without scrolling
      const calculatedHeight = Math.floor(availableHeight / numRows);
      // Set minimum height of 28px and maximum of 60px
      setRowHeight(Math.max(28, Math.min(60, calculatedHeight)));
    };
    
    // Initial calculation with a small delay to ensure DOM is ready
    setTimeout(calculateRowHeight, 50);
    calculateRowHeight();
    window.addEventListener('resize', calculateRowHeight);
    
    return () => window.removeEventListener('resize', calculateRowHeight);
  }, [rows.length]);

  // Get events for a specific row of days
  const getEventsForRow = (row: Date[]) => {
    if (!events || events.length === 0) return [];
    const rowStart = row[0];
    const rowEnd = row[row.length - 1];
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      return eventStart <= rowEnd && eventEnd >= rowStart;
    });
  };

  // Calculate event bar positions for 28-day rows
  const getEventBars = (row: Date[], rowEvents: CalendarEvent[]) => {
    const bars: Array<{
      event: CalendarEvent;
      startDay: number;
      endDay: number;
      rowNum: number;
    }> = [];
    
    const occupiedRows: Set<string>[] = Array(28).fill(null).map(() => new Set());
    
    const sortedEvents = [...rowEvents].sort((a, b) => {
      const aDuration = differenceInDays(new Date(a.endDate), new Date(a.startDate));
      const bDuration = differenceInDays(new Date(b.endDate), new Date(b.startDate));
      return bDuration - aDuration;
    });
    
    sortedEvents.forEach(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      
      let startDay = eventStart < row[0] ? 0 : row.findIndex(d => isSameDay(d, eventStart));
      let endDay = eventEnd > row[row.length - 1] ? row.length - 1 : row.findIndex(d => isSameDay(d, eventEnd));
      
      if (startDay === -1) startDay = 0;
      if (endDay === -1) endDay = row.length - 1;
      
      let rowNum = 0;
      while (rowNum < 2) {
        let canPlace = true;
        for (let d = startDay; d <= endDay; d++) {
          if (occupiedRows[d].has(String(rowNum))) {
            canPlace = false;
            break;
          }
        }
        if (canPlace) break;
        rowNum++;
      }
      
      for (let d = startDay; d <= endDay; d++) {
        occupiedRows[d].add(String(rowNum));
      }
      
      if (rowNum < 2) {
        bars.push({ event, startDay, endDay, rowNum });
      }
    });
    
    return bars;
  };

  // Calculate dynamic font sizes based on row height
  const weekdayFontSize = rowHeight < 35 ? '7px' : rowHeight < 45 ? '8px' : '9px';
  const dayFontSize = rowHeight < 35 ? '10px' : rowHeight < 45 ? '11px' : '13px';
  const monthFontSize = rowHeight < 35 ? '6px' : rowHeight < 45 ? '7px' : '8px';
  const todaySize = rowHeight < 35 ? '16px' : rowHeight < 45 ? '18px' : '20px';

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950 overflow-hidden">
      {/* Compact header - Hey style */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-2 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{year}</h2>
        </div>
        <button
          onClick={() => onDayClick(new Date())}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          Heute
        </button>
      </div>
      
      {/* Calendar grid - Hey style with dynamic height - use 100% of available space */}
      <div ref={containerRef} className="flex-1 overflow-hidden px-2" style={{ height: 'calc(100vh - 60px)' }}>
        <div className="h-full flex flex-col">
          {rows.map((row, rowIdx) => {
            const rowEvents = getEventsForRow(row);
            const eventBars = getEventBars(row, rowEvents);
            
            return (
              <div
                key={rowIdx}
                className="grid relative flex-1"
                style={{ 
                  gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
                  minHeight: `${rowHeight}px`,
                  maxHeight: `${rowHeight}px`,
                }}
              >
                {row.map((day, dayIdx) => {
                  const dayIsToday = isToday(day);
                  const isCurrentYear = day.getFullYear() === year;
                  const isFirstOfMonth = day.getDate() === 1;
                  const monthIdx = getMonth(day);
                  const dayOfWeek = getDay(day); // 0=Sun, 1=Mon, ..., 6=Sat
                  const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6; // Sun or Sat
                  
                  return (
                    <div
                      key={dayIdx}
                      className={cn(
                        "relative cursor-pointer transition-colors",
                        "flex items-start gap-0.5 pl-0.5 pt-0.5",
                        !isCurrentYear && "opacity-30",
                        // Weekend (SAT, SUN) gray background - Hey style
                        isWeekendDay && "bg-gray-50 dark:bg-gray-900/30",
                        // Hover effect
                        "hover:bg-gray-100 dark:hover:bg-gray-800/50",
                        // Border - subtle like Hey
                        "border-r border-b border-gray-100 dark:border-gray-800/50"
                      )}
                      onClick={() => onDayClick(day)}
                      title={format(day, "EEEE, d. MMMM yyyy", { locale: de })}
                    >
                      {/* Weekday abbreviation - Hey style: very small, gray, uppercase */}
                      <span 
                        className="font-medium text-gray-400 dark:text-gray-500 uppercase leading-none mt-0.5"
                        style={{ fontSize: weekdayFontSize }}
                      >
                        {WEEKDAY_ABBREVS[dayOfWeek]}
                      </span>
                      
                      {/* Day number - Hey style: larger, bold */}
                      {dayIsToday ? (
                        <span 
                          className="font-bold text-white bg-red-500 rounded-full flex items-center justify-center leading-none"
                          style={{ 
                            fontSize: dayFontSize, 
                            minWidth: todaySize, 
                            height: todaySize 
                          }}
                        >
                          {day.getDate()}
                        </span>
                      ) : (
                        <span 
                          className="font-bold text-gray-800 dark:text-gray-200 leading-none"
                          style={{ fontSize: dayFontSize }}
                        >
                          {day.getDate()}
                        </span>
                      )}
                      
                      {/* Month label - Hey style: small colored badge */}
                      {isFirstOfMonth && (
                        <span 
                          className={cn(
                            "font-bold text-white px-0.5 py-0.5 rounded leading-none",
                            MONTH_COLORS[monthIdx]
                          )}
                          style={{ fontSize: monthFontSize }}
                        >
                          {MONTH_ABBREVS[monthIdx]}
                        </span>
                      )}
                    </div>
                  );
                })}
                
                {/* Event bars */}
                {eventBars.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none">
                    {eventBars.map((bar, idx) => {
                      const leftPercent = (bar.startDay / row.length) * 100;
                      const widthPercent = ((bar.endDay - bar.startDay + 1) / row.length) * 100;
                      const eventBarHeight = rowHeight < 40 ? '8px' : '11px';
                      const topOffset = bar.rowNum === 0 
                        ? `calc(100% - ${parseInt(eventBarHeight) + 2}px)` 
                        : `calc(100% - ${(parseInt(eventBarHeight) + 2) * 2}px)`;
                      
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "absolute rounded text-white px-1 truncate pointer-events-auto cursor-pointer hover:opacity-80 flex items-center",
                            getEventBgColor(bar.event.color)
                          )}
                          style={{
                            top: topOffset,
                            left: `calc(${leftPercent}% + 2px)`,
                            width: `calc(${widthPercent}% - 4px)`,
                            height: eventBarHeight,
                            fontSize: rowHeight < 40 ? '7px' : '9px',
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
