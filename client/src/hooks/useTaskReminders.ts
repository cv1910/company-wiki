import { useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useBrowserNotifications, formatReminderMessage } from "./useBrowserNotifications";
import { useLocation } from "wouter";

interface TaskWithReminder {
  id: number;
  title: string;
  dueDate: Date | string;
  reminderMinutes: number;
  priority: string;
}

export function useTaskReminders() {
  const [, setLocation] = useLocation();
  const { isGranted, showNotification } = useBrowserNotifications();
  const checkedReminders = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch tasks with upcoming reminders
  const { data: upcomingTasks, refetch } = trpc.tasks.getUpcomingReminders.useQuery(undefined, {
    enabled: isGranted,
    refetchInterval: 60000, // Refetch every minute
  });

  const checkAndShowReminders = useCallback(() => {
    if (!isGranted || !upcomingTasks) return;

    const now = new Date();

    upcomingTasks.forEach((task: TaskWithReminder) => {
      const dueDate = new Date(task.dueDate);
      const reminderTime = new Date(dueDate.getTime() - task.reminderMinutes * 60 * 1000);
      const reminderKey = `${task.id}-${task.reminderMinutes}`;

      // Check if reminder should fire (within 1 minute window)
      const timeDiff = reminderTime.getTime() - now.getTime();
      const shouldFire = timeDiff <= 60000 && timeDiff > -60000;

      if (shouldFire && !checkedReminders.current.has(reminderKey)) {
        checkedReminders.current.add(reminderKey);

        // Calculate minutes until due
        const minutesUntilDue = Math.round((dueDate.getTime() - now.getTime()) / 60000);

        showNotification({
          title: "Aufgaben-Erinnerung",
          body: formatReminderMessage(task.title, minutesUntilDue),
          tag: `task-reminder-${task.id}`,
          onClick: () => setLocation("/aufgaben"),
        });
      }
    });
  }, [isGranted, upcomingTasks, showNotification, setLocation]);

  // Check reminders every 30 seconds
  useEffect(() => {
    if (!isGranted) return;

    // Initial check
    checkAndShowReminders();

    // Set up interval
    intervalRef.current = setInterval(checkAndShowReminders, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isGranted, checkAndShowReminders]);

  // Clean up old reminder keys periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Keep only recent reminder keys (last hour)
      checkedReminders.current = new Set();
    }, 3600000); // Clean up every hour

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    isEnabled: isGranted,
    upcomingTasks,
    refetch,
  };
}
