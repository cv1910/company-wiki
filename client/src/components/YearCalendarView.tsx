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
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
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

const MONTH_ABBREVS = ["JAN", "FEB", "MAR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"];
const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WEEKDAY_ABBREVS = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];

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

// Mobile Year View - Shows months as a grid of mini calendars
function MobileYearView({
  currentDate,
  events,
  onDayClick,
  onEventClick,
}: YearCalendarViewProps) {
  const year = currentDate.getFullYear();
  
  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    if (!events || events.length === 0) return [];
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      return day >= eventStart && day <= eventEnd;
    });
  };

  // Generate months
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(year, i, 1);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      // Get the day of week for the first day (0=Sun, 1=Mon, ...)
      const firstDayOfWeek = getDay(monthStart);
      // Adjust for Monday start (0=Mon, 6=Sun)
      const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
      
      return {
        index: i,
        name: MONTH_NAMES[i],
        abbrev: MONTH_ABBREVS[i],
        days,
        startOffset,
        color: MONTH_COLORS[i],
      };
    });
  }, [year]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{year}</h2>
        </div>
        <button
          onClick={() => onDayClick(new Date())}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          Heute
        </button>
      </div>
      
      {/* Months grid - 2 columns on mobile, 3 on tablet */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {months.map((month) => (
            <div
              key={month.index}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm"
            >
              {/* Month header */}
              <div className={cn("px-2 py-1.5 text-center", month.color)}>
                <span className="text-xs font-bold text-white">{month.abbrev}</span>
              </div>
              
              {/* Weekday headers */}
              <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
                {["M", "D", "M", "D", "F", "S", "S"].map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      "text-center py-0.5 text-[8px] font-medium",
                      i >= 5 ? "text-gray-400 bg-gray-50 dark:bg-gray-800/50" : "text-gray-500"
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Days grid */}
              <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-800">
                {/* Empty cells for offset */}
                {Array.from({ length: month.startOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-white dark:bg-gray-900 aspect-square" />
                ))}
                
                {/* Day cells */}
                {month.days.map((day) => {
                  const dayIsToday = isToday(day);
                  const dayOfWeek = getDay(day);
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const dayEvents = getEventsForDay(day);
                  const hasEvents = dayEvents.length > 0;
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "aspect-square flex flex-col items-center justify-center cursor-pointer transition-colors relative",
                        isWeekend ? "bg-gray-50 dark:bg-gray-800/30" : "bg-white dark:bg-gray-900",
                        "hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                      onClick={() => onDayClick(day)}
                    >
                      <span
                        className={cn(
                          "text-[10px] font-medium leading-none",
                          dayIsToday 
                            ? "bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center" 
                            : isWeekend 
                              ? "text-gray-400" 
                              : "text-gray-700 dark:text-gray-300"
                        )}
                      >
                        {day.getDate()}
                      </span>
                      
                      {/* Event indicator dots */}
                      {hasEvents && !dayIsToday && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((event, i) => (
                            <div
                              key={i}
                              className={cn(
                                "w-1 h-1 rounded-full",
                                getEventBgColor(event.color)
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Desktop Year View - Original Hey Calendar style with 28 days per row
function DesktopYearView({
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

  // Calculate event bar positions for 28-day rows - Hey Calendar style
  const getEventBars = (row: Date[], rowEvents: CalendarEvent[]) => {
    const bars: Array<{
      event: CalendarEvent;
      startDay: number;
      endDay: number;
      rowNum: number;
      continuesFromPrevious: boolean;
      continuesToNext: boolean;
    }> = [];
    
    const occupiedRows: Set<string>[] = Array(row.length).fill(null).map(() => new Set());
    
    // Sort events by duration (longest first) and then by start date
    const sortedEvents = [...rowEvents].sort((a, b) => {
      const aDuration = differenceInDays(new Date(a.endDate), new Date(a.startDate));
      const bDuration = differenceInDays(new Date(b.endDate), new Date(b.startDate));
      if (bDuration !== aDuration) return bDuration - aDuration;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
    
    sortedEvents.forEach(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      
      // Check if event continues from previous row or to next row
      const continuesFromPrevious = eventStart < row[0];
      const continuesToNext = eventEnd > row[row.length - 1];
      
      // Find start and end positions in this row
      let startDay = continuesFromPrevious ? 0 : row.findIndex(d => isSameDay(d, eventStart));
      let endDay = continuesToNext ? row.length - 1 : row.findIndex(d => isSameDay(d, eventEnd));
      
      if (startDay === -1) startDay = 0;
      if (endDay === -1) endDay = row.length - 1;
      
      // Find available row for this event bar
      let rowNum = 0;
      const maxRows = 3; // Allow up to 3 event bars per row
      while (rowNum < maxRows) {
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
      
      // Mark days as occupied
      for (let d = startDay; d <= endDay; d++) {
        occupiedRows[d].add(String(rowNum));
      }
      
      if (rowNum < maxRows) {
        bars.push({ 
          event, 
          startDay, 
          endDay, 
          rowNum,
          continuesFromPrevious,
          continuesToNext
        });
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
                
                {/* Event bars - Hey Calendar style: horizontal bars spanning days */}
                {eventBars.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {eventBars.map((bar, idx) => {
                      const leftPercent = (bar.startDay / row.length) * 100;
                      const widthPercent = ((bar.endDay - bar.startDay + 1) / row.length) * 100;
                      const eventBarHeight = rowHeight < 35 ? 10 : rowHeight < 45 ? 12 : 14;
                      const eventBarGap = 2;
                      const topOffset = rowHeight - (eventBarHeight + eventBarGap) * (bar.rowNum + 1) - 2;
                      
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "absolute text-white truncate pointer-events-auto cursor-pointer hover:brightness-110 flex items-center shadow-sm",
                            getEventBgColor(bar.event.color),
                            // Rounded corners based on continuation
                            bar.continuesFromPrevious && bar.continuesToNext ? "rounded-none" :
                            bar.continuesFromPrevious ? "rounded-r" :
                            bar.continuesToNext ? "rounded-l" :
                            "rounded"
                          )}
                          style={{
                            top: `${topOffset}px`,
                            left: bar.continuesFromPrevious ? '0' : `calc(${leftPercent}% + 1px)`,
                            width: bar.continuesFromPrevious && bar.continuesToNext 
                              ? '100%' 
                              : bar.continuesFromPrevious 
                                ? `calc(${widthPercent}% - 1px)` 
                                : bar.continuesToNext 
                                  ? `calc(${widthPercent}% - 1px)` 
                                  : `calc(${widthPercent}% - 2px)`,
                            height: `${eventBarHeight}px`,
                            fontSize: rowHeight < 35 ? '8px' : rowHeight < 45 ? '9px' : '10px',
                            paddingLeft: bar.continuesFromPrevious ? '4px' : '6px',
                            paddingRight: '4px',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(bar.event);
                          }}
                          title={`${bar.event.title}${bar.continuesFromPrevious ? ' (Fortsetzung)' : ''}${bar.continuesToNext ? ' (wird fortgesetzt)' : ''}`}
                        >
                          <span className="truncate font-medium">{bar.event.title}</span>
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

// Main component - switches between mobile and desktop views
export function YearCalendarView(props: YearCalendarViewProps) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  if (isMobile) {
    return <MobileYearView {...props} />;
  }
  
  return <DesktopYearView {...props} />;
}
