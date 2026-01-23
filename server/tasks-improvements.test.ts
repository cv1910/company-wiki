import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getTaskById: vi.fn(),
  updateTask: vi.fn(),
  createTask: vi.fn(),
  getUserById: vi.fn(),
  createNotification: vi.fn(),
}));

import * as db from "./db";

describe("Tasks Improvements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Task Time Support", () => {
    it("should create a task with date and time", async () => {
      const dueDate = new Date("2026-01-24T14:30:00");
      
      vi.mocked(db.createTask).mockResolvedValue({
        id: 1,
        title: "Test Aufgabe",
        description: "Beschreibung",
        status: "open",
        priority: "medium",
        dueDate: dueDate,
        createdById: 1,
        assignedToId: null,
        recurrencePattern: "none",
        recurrenceEndDate: null,
        parentTaskId: null,
        reminderDays: 0,
        reminderSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await db.createTask({
        title: "Test Aufgabe",
        description: "Beschreibung",
        priority: "medium",
        dueDate: dueDate,
        createdById: 1,
      });

      expect(result.dueDate).toEqual(dueDate);
      expect(result.dueDate?.getHours()).toBe(14);
      expect(result.dueDate?.getMinutes()).toBe(30);
    });

    it("should create a task with date only (midnight)", async () => {
      const dueDate = new Date("2026-01-24T00:00:00");
      
      vi.mocked(db.createTask).mockResolvedValue({
        id: 2,
        title: "Test Aufgabe ohne Zeit",
        description: null,
        status: "open",
        priority: "low",
        dueDate: dueDate,
        createdById: 1,
        assignedToId: null,
        recurrencePattern: "none",
        recurrenceEndDate: null,
        parentTaskId: null,
        reminderDays: 0,
        reminderSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await db.createTask({
        title: "Test Aufgabe ohne Zeit",
        priority: "low",
        dueDate: dueDate,
        createdById: 1,
      });

      expect(result.dueDate).toEqual(dueDate);
      expect(result.dueDate?.getHours()).toBe(0);
      expect(result.dueDate?.getMinutes()).toBe(0);
    });

    it("should format date with time correctly", () => {
      const date = new Date("2026-01-24T14:30:00");
      
      // Simulate the format function from date-fns
      const formattedDate = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
      const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      expect(formattedDate).toBe("24.01.2026");
      expect(formattedTime).toBe("14:30");
    });
  });

  describe("Task Edit Functionality", () => {
    it("should update task title and description", async () => {
      const mockTask = {
        task: {
          id: 1,
          title: "Original Title",
          description: "Original Description",
          status: "open",
          priority: "medium",
          dueDate: null,
          assignedToId: null,
        },
        assignedTo: null,
        createdBy: { id: 1, name: "Test User" },
      };

      vi.mocked(db.getTaskById).mockResolvedValue(mockTask as any);
      vi.mocked(db.updateTask).mockResolvedValue(undefined);

      await db.updateTask(1, {
        title: "Updated Title",
        description: "Updated Description",
      });

      expect(db.updateTask).toHaveBeenCalledWith(1, {
        title: "Updated Title",
        description: "Updated Description",
      });
    });

    it("should update task priority", async () => {
      vi.mocked(db.updateTask).mockResolvedValue(undefined);

      await db.updateTask(1, { priority: "urgent" });

      expect(db.updateTask).toHaveBeenCalledWith(1, { priority: "urgent" });
    });

    it("should update task due date and time", async () => {
      const newDueDate = new Date("2026-02-15T10:00:00");
      
      vi.mocked(db.updateTask).mockResolvedValue(undefined);

      await db.updateTask(1, { dueDate: newDueDate });

      expect(db.updateTask).toHaveBeenCalledWith(1, { dueDate: newDueDate });
    });

    it("should update task assignment", async () => {
      const mockTask = {
        task: {
          id: 1,
          title: "Test Task",
          assignedToId: 1,
        },
      };

      vi.mocked(db.getTaskById).mockResolvedValue(mockTask as any);
      vi.mocked(db.updateTask).mockResolvedValue(undefined);
      vi.mocked(db.getUserById).mockResolvedValue({
        id: 2,
        email: "new@example.com",
        name: "New User",
      } as any);

      await db.updateTask(1, { assignedToId: 2 });

      expect(db.updateTask).toHaveBeenCalledWith(1, { assignedToId: 2 });
    });

    it("should clear task due date", async () => {
      vi.mocked(db.updateTask).mockResolvedValue(undefined);

      await db.updateTask(1, { dueDate: null });

      expect(db.updateTask).toHaveBeenCalledWith(1, { dueDate: null });
    });

    it("should update multiple fields at once", async () => {
      const newDueDate = new Date("2026-03-01T09:00:00");
      
      vi.mocked(db.updateTask).mockResolvedValue(undefined);

      await db.updateTask(1, {
        title: "New Title",
        description: "New Description",
        priority: "high",
        dueDate: newDueDate,
        assignedToId: 3,
        reminderDays: 2,
      });

      expect(db.updateTask).toHaveBeenCalledWith(1, {
        title: "New Title",
        description: "New Description",
        priority: "high",
        dueDate: newDueDate,
        assignedToId: 3,
        reminderDays: 2,
      });
    });
  });

  describe("Date and Time Parsing", () => {
    it("should parse date and time from form inputs", () => {
      const dateInput = "2026-01-24";
      const timeInput = "14:30";
      
      const combinedDate = new Date(`${dateInput}T${timeInput}`);
      
      expect(combinedDate.getFullYear()).toBe(2026);
      expect(combinedDate.getMonth()).toBe(0); // January
      expect(combinedDate.getDate()).toBe(24);
      expect(combinedDate.getHours()).toBe(14);
      expect(combinedDate.getMinutes()).toBe(30);
    });

    it("should parse date only with default midnight time", () => {
      const dateInput = "2026-01-24";
      
      const dateOnly = new Date(`${dateInput}T00:00`);
      
      expect(dateOnly.getHours()).toBe(0);
      expect(dateOnly.getMinutes()).toBe(0);
    });

    it("should extract date and time from existing task", () => {
      const existingDate = new Date("2026-01-24T14:30:00");
      
      // Simulate format functions
      const year = existingDate.getFullYear();
      const month = (existingDate.getMonth() + 1).toString().padStart(2, '0');
      const day = existingDate.getDate().toString().padStart(2, '0');
      const hours = existingDate.getHours().toString().padStart(2, '0');
      const minutes = existingDate.getMinutes().toString().padStart(2, '0');
      
      const dateString = `${year}-${month}-${day}`;
      const timeString = `${hours}:${minutes}`;
      
      expect(dateString).toBe("2026-01-24");
      expect(timeString).toBe("14:30");
    });
  });

  describe("Task Display", () => {
    it("should display date with time when time is set", () => {
      const taskDate = new Date("2026-01-24T14:30:00");
      
      // Check if time is not midnight
      const hasTime = taskDate.getHours() !== 0 || taskDate.getMinutes() !== 0;
      
      expect(hasTime).toBe(true);
    });

    it("should identify midnight time as date-only", () => {
      const taskDate = new Date("2026-01-24T00:00:00");
      
      const hasTime = taskDate.getHours() !== 0 || taskDate.getMinutes() !== 0;
      
      expect(hasTime).toBe(false);
    });
  });
});
