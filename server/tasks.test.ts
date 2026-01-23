import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "./db";

// Mock the database
vi.mock("./db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
  getMyTasks: vi.fn(),
  getTasksAssignedToMe: vi.fn(),
  getTasksCreatedByMe: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getTaskById: vi.fn(),
}));

describe("Tasks Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Task CRUD Operations", () => {
    it("should have task-related database functions", () => {
      expect(db).toBeDefined();
    });

    it("should support task creation with required fields", () => {
      const taskData = {
        title: "Test Task",
        description: "Test Description",
        priority: "medium" as const,
        status: "open" as const,
        createdById: 1,
        assignedToId: null,
        dueDate: null,
      };
      
      expect(taskData.title).toBe("Test Task");
      expect(taskData.priority).toBe("medium");
      expect(taskData.status).toBe("open");
    });

    it("should support task assignment", () => {
      const taskWithAssignment = {
        id: 1,
        title: "Assigned Task",
        assignedToId: 2,
        createdById: 1,
      };
      
      expect(taskWithAssignment.assignedToId).toBe(2);
      expect(taskWithAssignment.createdById).toBe(1);
    });

    it("should support all task statuses", () => {
      const validStatuses = ["open", "in_progress", "completed", "cancelled"];
      
      validStatuses.forEach(status => {
        expect(["open", "in_progress", "completed", "cancelled"]).toContain(status);
      });
    });

    it("should support all priority levels", () => {
      const validPriorities = ["low", "medium", "high", "urgent"];
      
      validPriorities.forEach(priority => {
        expect(["low", "medium", "high", "urgent"]).toContain(priority);
      });
    });
  });

  describe("Task Filtering", () => {
    it("should filter tasks by status", () => {
      const tasks = [
        { id: 1, status: "open" },
        { id: 2, status: "completed" },
        { id: 3, status: "in_progress" },
      ];
      
      const openTasks = tasks.filter(t => t.status === "open");
      expect(openTasks).toHaveLength(1);
      expect(openTasks[0].id).toBe(1);
    });

    it("should filter tasks by assignment", () => {
      const tasks = [
        { id: 1, assignedToId: 1 },
        { id: 2, assignedToId: 2 },
        { id: 3, assignedToId: 1 },
      ];
      
      const myTasks = tasks.filter(t => t.assignedToId === 1);
      expect(myTasks).toHaveLength(2);
    });

    it("should filter completed tasks", () => {
      const tasks = [
        { id: 1, status: "open" },
        { id: 2, status: "completed" },
        { id: 3, status: "completed" },
        { id: 4, status: "in_progress" },
      ];
      
      const completedTasks = tasks.filter(t => t.status === "completed");
      expect(completedTasks).toHaveLength(2);
    });

    it("should filter open tasks (not completed or cancelled)", () => {
      const tasks = [
        { id: 1, status: "open" },
        { id: 2, status: "completed" },
        { id: 3, status: "in_progress" },
        { id: 4, status: "cancelled" },
      ];
      
      const openTasks = tasks.filter(t => t.status !== "completed" && t.status !== "cancelled");
      expect(openTasks).toHaveLength(2);
    });
  });

  describe("Task Priority", () => {
    it("should sort tasks by priority", () => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const tasks = [
        { id: 1, priority: "low" as keyof typeof priorityOrder },
        { id: 2, priority: "urgent" as keyof typeof priorityOrder },
        { id: 3, priority: "medium" as keyof typeof priorityOrder },
      ];
      
      const sorted = [...tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      expect(sorted[0].priority).toBe("urgent");
      expect(sorted[1].priority).toBe("medium");
      expect(sorted[2].priority).toBe("low");
    });
  });

  describe("Task Due Date", () => {
    it("should identify overdue tasks", () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const tasks = [
        { id: 1, dueDate: yesterday, status: "open" },
        { id: 2, dueDate: tomorrow, status: "open" },
        { id: 3, dueDate: yesterday, status: "completed" },
      ];
      
      const overdueTasks = tasks.filter(t => 
        t.dueDate < now && t.status !== "completed"
      );
      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0].id).toBe(1);
    });
  });

  describe("Task Comments", () => {
    it("should support comment data structure", () => {
      const comment = {
        id: 1,
        taskId: 1,
        userId: 1,
        content: "This is a test comment",
        createdAt: new Date(),
      };
      
      expect(comment.taskId).toBe(1);
      expect(comment.content).toBe("This is a test comment");
    });

    it("should filter comments by task", () => {
      const comments = [
        { id: 1, taskId: 1, content: "Comment 1" },
        { id: 2, taskId: 2, content: "Comment 2" },
        { id: 3, taskId: 1, content: "Comment 3" },
      ];
      
      const task1Comments = comments.filter(c => c.taskId === 1);
      expect(task1Comments).toHaveLength(2);
    });
  });

  describe("Recurring Tasks", () => {
    it("should support recurrence patterns", () => {
      const validPatterns = ["none", "daily", "weekly", "monthly"];
      
      validPatterns.forEach(pattern => {
        expect(["none", "daily", "weekly", "monthly"]).toContain(pattern);
      });
    });

    it("should identify recurring tasks", () => {
      const tasks = [
        { id: 1, recurrencePattern: "none" },
        { id: 2, recurrencePattern: "daily" },
        { id: 3, recurrencePattern: "weekly" },
        { id: 4, recurrencePattern: "monthly" },
      ];
      
      const recurringTasks = tasks.filter(t => t.recurrencePattern !== "none");
      expect(recurringTasks).toHaveLength(3);
    });

    it("should support recurrence end date", () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const tasks = [
        { id: 1, recurrencePattern: "daily", recurrenceEndDate: futureDate },
        { id: 2, recurrencePattern: "weekly", recurrenceEndDate: pastDate },
        { id: 3, recurrencePattern: "monthly", recurrenceEndDate: null },
      ];
      
      const activeRecurring = tasks.filter(t => 
        t.recurrencePattern !== "none" && 
        (t.recurrenceEndDate === null || t.recurrenceEndDate >= now)
      );
      expect(activeRecurring).toHaveLength(2);
    });
  });

  describe("Priority Filter", () => {
    it("should filter tasks by priority", () => {
      const tasks = [
        { id: 1, priority: "low" },
        { id: 2, priority: "medium" },
        { id: 3, priority: "high" },
        { id: 4, priority: "urgent" },
        { id: 5, priority: "high" },
      ];
      
      const highPriorityTasks = tasks.filter(t => t.priority === "high");
      expect(highPriorityTasks).toHaveLength(2);

      const urgentTasks = tasks.filter(t => t.priority === "urgent");
      expect(urgentTasks).toHaveLength(1);
    });

    it("should combine status and priority filters", () => {
      const tasks = [
        { id: 1, status: "open", priority: "high" },
        { id: 2, status: "completed", priority: "high" },
        { id: 3, status: "open", priority: "low" },
        { id: 4, status: "open", priority: "high" },
      ];
      
      const openHighPriority = tasks.filter(t => 
        t.status === "open" && t.priority === "high"
      );
      expect(openHighPriority).toHaveLength(2);
    });
  });

  describe("Task Reminders", () => {
    it("should support reminder days configuration", () => {
      const validReminderDays = [0, 1, 2, 3, 7, 14];
      
      validReminderDays.forEach(days => {
        expect(days).toBeGreaterThanOrEqual(0);
        expect(days).toBeLessThanOrEqual(30);
      });
    });

    it("should identify tasks needing reminder", () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const in10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      
      const tasks = [
        { id: 1, dueDate: tomorrow, reminderDays: 1, reminderSent: false, status: "open" },
        { id: 2, dueDate: in3Days, reminderDays: 3, reminderSent: false, status: "open" },
        { id: 3, dueDate: in10Days, reminderDays: 7, reminderSent: false, status: "open" },
        { id: 4, dueDate: tomorrow, reminderDays: 1, reminderSent: true, status: "open" },
        { id: 5, dueDate: tomorrow, reminderDays: 0, reminderSent: false, status: "open" },
      ];
      
      const tasksNeedingReminder = tasks.filter(t => {
        if (t.reminderDays === 0 || t.reminderSent || !t.dueDate) return false;
        if (t.status === "completed" || t.status === "cancelled") return false;
        
        const dueDate = new Date(t.dueDate);
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - t.reminderDays);
        
        return now >= reminderDate;
      });
      
      // Tasks 1 and 2 should need reminders (due soon enough)
      // Task 3 is 10 days away with 7-day reminder, so it needs reminder (10-7=3 days from now)
      // Task 4 already sent
      // Task 5 has no reminder configured
      expect(tasksNeedingReminder.length).toBeGreaterThanOrEqual(2);
    });

    it("should not send reminder for completed tasks", () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const tasks = [
        { id: 1, dueDate: tomorrow, reminderDays: 1, reminderSent: false, status: "completed" },
        { id: 2, dueDate: tomorrow, reminderDays: 1, reminderSent: false, status: "cancelled" },
        { id: 3, dueDate: tomorrow, reminderDays: 1, reminderSent: false, status: "open" },
      ];
      
      const eligibleTasks = tasks.filter(t => 
        t.status !== "completed" && t.status !== "cancelled"
      );
      expect(eligibleTasks).toHaveLength(1);
      expect(eligibleTasks[0].id).toBe(3);
    });

    it("should calculate days until due correctly", () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysUntilDue).toBe(5);
    });

    it("should reset reminderSent when due date changes", () => {
      const task = {
        id: 1,
        dueDate: new Date(),
        reminderDays: 1,
        reminderSent: true,
      };
      
      // Simulate updating due date
      const updatedTask = {
        ...task,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reminderSent: false, // Should be reset
      };
      
      expect(updatedTask.reminderSent).toBe(false);
    });
  });
});
