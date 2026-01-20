import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-open-id",
    name: "Test User",
    email: "test@example.com",
    role: "admin",
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    loginMethod: "google",
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// Mock db functions
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    markOhweeeAsUnread: vi.fn().mockResolvedValue(undefined),
    removeUnreadMarker: vi.fn().mockResolvedValue(undefined),
    getUnreadMarkersForUser: vi.fn().mockResolvedValue([]),
    getUnreadMarkersBatch: vi.fn().mockResolvedValue(new Set([1, 3])),
    getRoomsWithUnreadMarkers: vi.fn().mockResolvedValue(new Map([[1, 2], [3, 1]])),
    getLastMessagesForRooms: vi.fn().mockResolvedValue(new Map()),
    setTypingStatus: vi.fn().mockResolvedValue(undefined),
    clearTypingStatus: vi.fn().mockResolvedValue(undefined),
    getTypingUsersInRoom: vi.fn().mockResolvedValue([
      { userId: 2, userName: "Anna", userAvatar: null, lastTypingAt: new Date() }
    ]),
    cleanupOldTypingIndicators: vi.fn().mockResolvedValue(undefined),
    // Delivery & Read Receipts
    markMessagesAsDelivered: vi.fn().mockResolvedValue(undefined),
    markMessageAsRead: vi.fn().mockResolvedValue(undefined),
    getDeliveryStatusForMessages: vi.fn().mockResolvedValue(new Map([[1, [2, 3]]])),
    getReadStatusForMessages: vi.fn().mockResolvedValue(new Map([[1, [2]]])),
    getMessageReadDetails: vi.fn().mockResolvedValue([]),
    // Chat Tasks
    getChatRoomParticipants: vi.fn().mockResolvedValue([]),
    createChatTask: vi.fn().mockResolvedValue(1),
    getTasksForRoom: vi.fn().mockResolvedValue([]),
    getChatTaskById: vi.fn().mockResolvedValue(null),
    toggleTaskCompletion: vi.fn().mockResolvedValue(null),
    deleteChatTask: vi.fn().mockResolvedValue(undefined),
    updateChatTask: vi.fn().mockResolvedValue(undefined),
    // Due Tasks
    getDueTasksForUser: vi.fn().mockResolvedValue([]),
    getTasksDueTodayForUser: vi.fn().mockResolvedValue([]),
    getOverdueTasksForUser: vi.fn().mockResolvedValue([]),
  };
});

import * as db from "./db";

describe("Ohweees: Unread Markers API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should mark a message as unread", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.markAsUnread({ ohweeeId: 1 });
    
    expect(result.success).toBe(true);
    expect(db.markOhweeeAsUnread).toHaveBeenCalledWith(1, ctx.user!.id);
  });

  it("should remove unread marker from a message", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.removeUnreadMarker({ ohweeeId: 1 });
    
    expect(result.success).toBe(true);
    expect(db.removeUnreadMarker).toHaveBeenCalledWith(1, ctx.user!.id);
  });

  it("should get all unread markers for user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.getUnreadMarkers();
    
    expect(Array.isArray(result)).toBe(true);
    expect(db.getUnreadMarkersForUser).toHaveBeenCalledWith(ctx.user!.id);
  });

  it("should get unread markers batch", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.getUnreadMarkersBatch({ ohweeeIds: [1, 2, 3] });
    
    expect(Array.isArray(result)).toBe(true);
    expect(result).toContain(1);
    expect(result).toContain(3);
    expect(result).not.toContain(2);
  });
});

describe("Ohweees: Typing Indicators API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set typing status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.setTyping({ roomId: 1 });
    
    expect(result.success).toBe(true);
    expect(db.setTypingStatus).toHaveBeenCalledWith(1, ctx.user!.id);
  });

  it("should clear typing status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.clearTyping({ roomId: 1 });
    
    expect(result.success).toBe(true);
    expect(db.clearTypingStatus).toHaveBeenCalledWith(1, ctx.user!.id);
  });

  it("should get typing users in room", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.getTypingUsers({ roomId: 1 });
    
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].userName).toBe("Anna");
    expect(db.getTypingUsersInRoom).toHaveBeenCalledWith(1, ctx.user!.id);
  });
});

describe("Ohweees: Last Messages for Rooms API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get last messages for rooms in batch", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // The rooms query now includes lastMessage
    const result = await caller.ohweees.rooms();
    
    expect(Array.isArray(result)).toBe(true);
    // getLastMessagesForRooms is called with room IDs
    expect(db.getLastMessagesForRooms).toHaveBeenCalled();
  });
});

describe("Ohweees: Rooms with Unread Markers API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get rooms with unread markers", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.getRoomsWithUnreadMarkers();
    
    expect(Array.isArray(result)).toBe(true);
    expect(db.getRoomsWithUnreadMarkers).toHaveBeenCalledWith(ctx.user!.id);
  });
});

describe("Ohweees: Delivery & Read Receipts API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should mark messages as delivered", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.markDelivered({ ohweeeIds: [1, 2, 3] });
    
    expect(result.success).toBe(true);
    expect(db.markMessagesAsDelivered).toHaveBeenCalledWith([1, 2, 3], ctx.user!.id);
  });

  it("should mark a message as read", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.markMessageRead({ ohweeeId: 1 });
    
    expect(result.success).toBe(true);
    expect(db.markMessageAsRead).toHaveBeenCalledWith(1, ctx.user!.id);
  });

  it("should get message status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.getMessageStatus({ ohweeeIds: [1] });
    
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].ohweeeId).toBe(1);
    expect(result[0].deliveredTo).toContain(2);
    expect(result[0].deliveredTo).toContain(3);
    expect(result[0].readBy).toContain(2);
  });

  it("should get read details for a message", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.getReadDetails({ ohweeeId: 1 });
    
    expect(Array.isArray(result)).toBe(true);
    expect(db.getMessageReadDetails).toHaveBeenCalledWith(1);
  });
});

describe("Ohweees: Chat Tasks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a task when user is participant", async () => {
    const ctx = createAuthContext();
    vi.mocked(db.getChatRoomParticipants).mockResolvedValue([
      { participant: { id: 1, roomId: 1, userId: ctx.user!.id, joinedAt: new Date(), lastReadAt: new Date() }, user: ctx.user as any }
    ]);
    vi.mocked(db.createChatTask).mockResolvedValue(42);
    
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ohweees.createTask({
      roomId: 1,
      title: "Test Task",
      priority: "high",
    });
    
    expect(result.taskId).toBe(42);
    expect(db.createChatTask).toHaveBeenCalled();
  });

  it("should reject task creation when user is not participant", async () => {
    const ctx = createAuthContext();
    vi.mocked(db.getChatRoomParticipants).mockResolvedValue([]);
    
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.ohweees.createTask({
      roomId: 1,
      title: "Test Task",
    })).rejects.toThrow();
  });

  it("should get tasks for a room", async () => {
    const ctx = createAuthContext();
    vi.mocked(db.getChatRoomParticipants).mockResolvedValue([
      { participant: { id: 1, roomId: 1, userId: ctx.user!.id, joinedAt: new Date(), lastReadAt: new Date() }, user: ctx.user as any }
    ]);
    vi.mocked(db.getTasksForRoom).mockResolvedValue([]);
    
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ohweees.getTasks({ roomId: 1 });
    
    expect(Array.isArray(result)).toBe(true);
    expect(db.getTasksForRoom).toHaveBeenCalledWith(1);
  });

  it("should toggle task completion", async () => {
    const ctx = createAuthContext();
    vi.mocked(db.getChatTaskById).mockResolvedValue({
      id: 1,
      roomId: 1,
      title: "Test",
      isCompleted: false,
      createdById: ctx.user!.id,
      priority: "medium",
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceOhweeeId: null,
      description: null,
      completedAt: null,
      completedById: null,
      dueDate: null,
      assigneeId: null,
    });
    vi.mocked(db.getChatRoomParticipants).mockResolvedValue([
      { participant: { id: 1, roomId: 1, userId: ctx.user!.id, joinedAt: new Date(), lastReadAt: new Date() }, user: ctx.user as any }
    ]);
    vi.mocked(db.toggleTaskCompletion).mockResolvedValue({ id: 1, isCompleted: true } as any);
    
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ohweees.toggleTask({ taskId: 1 });
    
    expect(result?.isCompleted).toBe(true);
    expect(db.toggleTaskCompletion).toHaveBeenCalledWith(1, ctx.user!.id);
  });

  it("should delete a task when user is creator", async () => {
    const ctx = createAuthContext();
    vi.mocked(db.getChatTaskById).mockResolvedValue({
      id: 1,
      roomId: 1,
      title: "Test",
      isCompleted: false,
      createdById: ctx.user!.id,
      priority: "medium",
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceOhweeeId: null,
      description: null,
      completedAt: null,
      completedById: null,
      dueDate: null,
      assigneeId: null,
    });
    
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ohweees.deleteTask({ taskId: 1 });
    
    expect(result.success).toBe(true);
    expect(db.deleteChatTask).toHaveBeenCalledWith(1);
  });

  it("should reject task deletion when user is not creator", async () => {
    const ctx = createAuthContext();
    vi.mocked(db.getChatTaskById).mockResolvedValue({
      id: 1,
      roomId: 1,
      title: "Test",
      isCompleted: false,
      createdById: 999, // Different user
      priority: "medium",
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceOhweeeId: null,
      description: null,
      completedAt: null,
      completedById: null,
      dueDate: null,
      assigneeId: null,
    });
    
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.ohweees.deleteTask({ taskId: 1 })).rejects.toThrow();
  });
});

describe("Ohweees: Due Tasks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get due tasks for user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.getDueTasks();
    
    expect(Array.isArray(result)).toBe(true);
    expect(db.getDueTasksForUser).toHaveBeenCalledWith(ctx.user!.id);
  });

  it("should get tasks due today for user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.getTasksDueToday();
    
    expect(Array.isArray(result)).toBe(true);
    expect(db.getTasksDueTodayForUser).toHaveBeenCalledWith(ctx.user!.id);
  });

  it("should get overdue tasks for user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.ohweees.getOverdueTasks();
    
    expect(Array.isArray(result)).toBe(true);
    expect(db.getOverdueTasksForUser).toHaveBeenCalledWith(ctx.user!.id);
  });
});

describe("Ohweees: Feature Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle full unread marker workflow", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // Mark as unread
    const markResult = await caller.ohweees.markAsUnread({ ohweeeId: 5 });
    expect(markResult.success).toBe(true);
    
    // Get markers
    await caller.ohweees.getUnreadMarkers();
    expect(db.getUnreadMarkersForUser).toHaveBeenCalled();
    
    // Remove marker
    const removeResult = await caller.ohweees.removeUnreadMarker({ ohweeeId: 5 });
    expect(removeResult.success).toBe(true);
  });

  it("should handle full typing indicator workflow", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // Start typing
    const startResult = await caller.ohweees.setTyping({ roomId: 1 });
    expect(startResult.success).toBe(true);
    
    // Check who is typing
    const typingUsers = await caller.ohweees.getTypingUsers({ roomId: 1 });
    expect(typingUsers.length).toBeGreaterThanOrEqual(0);
    
    // Stop typing
    const stopResult = await caller.ohweees.clearTyping({ roomId: 1 });
    expect(stopResult.success).toBe(true);
  });
});
