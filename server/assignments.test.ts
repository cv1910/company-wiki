import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// Mock the db module
vi.mock("./db", () => ({
  getUserAssignments: vi.fn(),
  getAssignment: vi.fn(),
  getAssignmentsByResource: vi.fn(),
  getAssignmentByUserAndResource: vi.fn(),
  getAllAssignments: vi.fn(),
  createAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  markAssignmentStarted: vi.fn(),
  markAssignmentCompleted: vi.fn(),
  createNotification: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(role: "user" | "editor" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("assignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMyAssignments", () => {
    it("returns empty array when no assignments exist", async () => {
      vi.mocked(db.getUserAssignments).mockResolvedValue([]);
      
      const caller = appRouter.createCaller(createUserContext());
      const result = await caller.assignments.getMyAssignments();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
      expect(db.getUserAssignments).toHaveBeenCalledWith(1);
    });

    it("returns user assignments", async () => {
      const mockAssignments = [
        {
          id: 1,
          userId: 1,
          resourceType: "article" as const,
          resourceId: 10,
          resourceSlug: "test-article",
          resourceTitle: "Test Article",
          status: "pending" as const,
          dueDate: null,
          assignedById: 2,
          assignedAt: new Date(),
          startedAt: null,
          completedAt: null,
          notes: null,
        },
      ];
      vi.mocked(db.getUserAssignments).mockResolvedValue(mockAssignments);
      
      const caller = appRouter.createCaller(createUserContext());
      const result = await caller.assignments.getMyAssignments();
      
      expect(result).toEqual(mockAssignments);
    });
  });

  describe("getById", () => {
    it("returns null for non-existent assignment", async () => {
      vi.mocked(db.getAssignment).mockResolvedValue(null);
      
      const caller = appRouter.createCaller(createUserContext());
      const result = await caller.assignments.getById({ id: 99999 });
      
      expect(result).toBeNull();
    });

    it("returns assignment by id", async () => {
      const mockAssignment = {
        id: 1,
        userId: 1,
        resourceType: "article" as const,
        resourceId: 10,
        resourceSlug: "test-article",
        resourceTitle: "Test Article",
        status: "pending" as const,
        dueDate: null,
        assignedById: 2,
        assignedAt: new Date(),
        startedAt: null,
        completedAt: null,
        notes: null,
      };
      vi.mocked(db.getAssignment).mockResolvedValue(mockAssignment);
      
      const caller = appRouter.createCaller(createUserContext());
      const result = await caller.assignments.getById({ id: 1 });
      
      expect(result).toEqual(mockAssignment);
    });
  });

  describe("getByResource", () => {
    it("returns empty array for resource without assignments", async () => {
      vi.mocked(db.getAssignmentsByResource).mockResolvedValue([]);
      
      const caller = appRouter.createCaller(createUserContext());
      const result = await caller.assignments.getByResource({
        resourceType: "article",
        resourceId: 99999,
      });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("checkMyAssignment", () => {
    it("returns null when user has no assignment for resource", async () => {
      vi.mocked(db.getAssignmentByUserAndResource).mockResolvedValue(null);
      
      const caller = appRouter.createCaller(createUserContext());
      const result = await caller.assignments.checkMyAssignment({
        resourceType: "article",
        resourceId: 99999,
      });
      
      expect(result).toBeNull();
    });
  });

  describe("list (admin)", () => {
    it("returns all assignments for admin", async () => {
      vi.mocked(db.getAllAssignments).mockResolvedValue([]);
      
      const caller = appRouter.createCaller(createUserContext("admin"));
      const result = await caller.assignments.list({});
      
      expect(Array.isArray(result)).toBe(true);
    });

    it("filters by status", async () => {
      vi.mocked(db.getAllAssignments).mockResolvedValue([]);
      
      const caller = appRouter.createCaller(createUserContext("admin"));
      const result = await caller.assignments.list({ status: "pending" });
      
      expect(Array.isArray(result)).toBe(true);
      expect(db.getAllAssignments).toHaveBeenCalledWith({ status: "pending" });
    });
  });

  describe("create (editor)", () => {
    it("creates assignment and notification", async () => {
      const mockAssignment = {
        id: 1,
        userId: 2,
        resourceType: "article" as const,
        resourceId: 10,
        resourceSlug: "test-article",
        resourceTitle: "Test Article",
        status: "pending" as const,
        dueDate: null,
        assignedById: 1,
        assignedAt: new Date(),
        startedAt: null,
        completedAt: null,
        notes: null,
      };
      vi.mocked(db.createAssignment).mockResolvedValue(mockAssignment);
      vi.mocked(db.createNotification).mockResolvedValue(1);
      
      const caller = appRouter.createCaller(createUserContext("editor"));
      const result = await caller.assignments.create({
        userId: 2,
        resourceType: "article",
        resourceId: 10,
        resourceSlug: "test-article",
        resourceTitle: "Test Article",
      });
      
      expect(result).toEqual(mockAssignment);
      expect(db.createNotification).toHaveBeenCalled();
    });
  });

  describe("delete (editor)", () => {
    it("deletes assignment", async () => {
      vi.mocked(db.deleteAssignment).mockResolvedValue(true);
      
      const caller = appRouter.createCaller(createUserContext("editor"));
      const result = await caller.assignments.delete({ id: 1 });
      
      expect(result).toEqual({ success: true });
      expect(db.deleteAssignment).toHaveBeenCalledWith(1);
    });
  });
});
