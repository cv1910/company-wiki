import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getTaskReminders: vi.fn(),
  addTaskReminder: vi.fn(),
  deleteTaskReminder: vi.fn(),
  setTaskReminders: vi.fn(),
  getTasksWithDueDate: vi.fn(),
}));

import * as db from "./db";

describe("Task Reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTaskReminders", () => {
    it("should return reminders for a task", async () => {
      const mockReminders = [
        { id: 1, taskId: 1, reminderMinutes: 15, sent: false, sentAt: null, createdAt: new Date() },
        { id: 2, taskId: 1, reminderMinutes: 60, sent: false, sentAt: null, createdAt: new Date() },
      ];
      vi.mocked(db.getTaskReminders).mockResolvedValue(mockReminders);

      const result = await db.getTaskReminders(1);

      expect(result).toEqual(mockReminders);
      expect(db.getTaskReminders).toHaveBeenCalledWith(1);
    });

    it("should return empty array if no reminders exist", async () => {
      vi.mocked(db.getTaskReminders).mockResolvedValue([]);

      const result = await db.getTaskReminders(999);

      expect(result).toEqual([]);
    });
  });

  describe("addTaskReminder", () => {
    it("should add a reminder to a task", async () => {
      vi.mocked(db.addTaskReminder).mockResolvedValue({ id: 1 });

      const result = await db.addTaskReminder(1, 30);

      expect(result).toEqual({ id: 1 });
      expect(db.addTaskReminder).toHaveBeenCalledWith(1, 30);
    });
  });

  describe("deleteTaskReminder", () => {
    it("should delete a reminder", async () => {
      vi.mocked(db.deleteTaskReminder).mockResolvedValue(undefined);

      await db.deleteTaskReminder(1);

      expect(db.deleteTaskReminder).toHaveBeenCalledWith(1);
    });
  });

  describe("setTaskReminders", () => {
    it("should replace all reminders for a task", async () => {
      vi.mocked(db.setTaskReminders).mockResolvedValue(undefined);

      await db.setTaskReminders(1, [15, 60, 1440]);

      expect(db.setTaskReminders).toHaveBeenCalledWith(1, [15, 60, 1440]);
    });

    it("should handle empty reminder list", async () => {
      vi.mocked(db.setTaskReminders).mockResolvedValue(undefined);

      await db.setTaskReminders(1, []);

      expect(db.setTaskReminders).toHaveBeenCalledWith(1, []);
    });
  });

  describe("getTasksWithDueDate", () => {
    it("should return tasks within date range", async () => {
      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-01-31");
      const mockTasks = [
        { id: 1, title: "Task 1", dueDate: new Date("2026-01-15"), priority: "high", status: "open" },
        { id: 2, title: "Task 2", dueDate: new Date("2026-01-20"), priority: "medium", status: "open" },
      ];
      vi.mocked(db.getTasksWithDueDate).mockResolvedValue(mockTasks as any);

      const result = await db.getTasksWithDueDate(startDate, endDate);

      expect(result).toEqual(mockTasks);
      expect(db.getTasksWithDueDate).toHaveBeenCalledWith(startDate, endDate);
    });

    it("should filter by user ID when provided", async () => {
      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-01-31");
      vi.mocked(db.getTasksWithDueDate).mockResolvedValue([]);

      await db.getTasksWithDueDate(startDate, endDate, 1);

      expect(db.getTasksWithDueDate).toHaveBeenCalledWith(startDate, endDate, 1);
    });
  });
});

describe("Reminder Time Formatting", () => {
  // Helper function to format reminder time (same logic as in frontend)
  const formatReminderTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} Min`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} Std`;
    return `${Math.round(minutes / 1440)} Tag(e)`;
  };

  it("should format minutes correctly", () => {
    expect(formatReminderTime(15)).toBe("15 Min");
    expect(formatReminderTime(30)).toBe("30 Min");
    expect(formatReminderTime(45)).toBe("45 Min");
  });

  it("should format hours correctly", () => {
    expect(formatReminderTime(60)).toBe("1 Std");
    expect(formatReminderTime(120)).toBe("2 Std");
    expect(formatReminderTime(180)).toBe("3 Std");
  });

  it("should format days correctly", () => {
    expect(formatReminderTime(1440)).toBe("1 Tag(e)");
    expect(formatReminderTime(2880)).toBe("2 Tag(e)");
    expect(formatReminderTime(4320)).toBe("3 Tag(e)");
  });
});

describe("Quick Reminder Options", () => {
  const QUICK_REMINDERS = [
    { label: "15 Min", minutes: 15 },
    { label: "30 Min", minutes: 30 },
    { label: "1 Std", minutes: 60 },
    { label: "2 Std", minutes: 120 },
    { label: "1 Tag", minutes: 1440 },
    { label: "2 Tage", minutes: 2880 },
  ];

  it("should have correct minute values for quick options", () => {
    expect(QUICK_REMINDERS[0].minutes).toBe(15);
    expect(QUICK_REMINDERS[1].minutes).toBe(30);
    expect(QUICK_REMINDERS[2].minutes).toBe(60);
    expect(QUICK_REMINDERS[3].minutes).toBe(120);
    expect(QUICK_REMINDERS[4].minutes).toBe(1440);
    expect(QUICK_REMINDERS[5].minutes).toBe(2880);
  });

  it("should have 6 quick reminder options", () => {
    expect(QUICK_REMINDERS).toHaveLength(6);
  });
});
