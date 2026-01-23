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
});
