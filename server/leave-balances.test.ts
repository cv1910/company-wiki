import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// Mock the database module
vi.mock("./db", () => ({
  getAllLeaveBalances: vi.fn(),
  updateLeaveBalance: vi.fn(),
  createAuditLogEntry: vi.fn(),
  getLeaveBalance: vi.fn(),
}));

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-open-id",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "test-user-id",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("leave.allBalances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all users with their leave balances for admins", async () => {
    const mockBalances = [
      {
        user: { id: 1, name: "Test User", email: "test@example.com", avatarUrl: null, role: "user" },
        balance: { totalDays: 30, usedDays: 5, year: 2026 },
      },
      {
        user: { id: 2, name: "Admin User", email: "admin@example.com", avatarUrl: null, role: "admin" },
        balance: { totalDays: 25, usedDays: 10, year: 2026 },
      },
    ];
    vi.mocked(db.getAllLeaveBalances).mockResolvedValue(mockBalances);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leave.allBalances({ year: 2026 });

    expect(result).toHaveLength(2);
    expect(result[0].user.name).toBe("Test User");
    expect(result[0].balance.totalDays).toBe(30);
    expect(result[1].user.name).toBe("Admin User");
    expect(result[1].balance.usedDays).toBe(10);
  });

  it("uses current year as default", async () => {
    vi.mocked(db.getAllLeaveBalances).mockResolvedValue([]);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leave.allBalances();

    expect(result).toBeDefined();
    expect(db.getAllLeaveBalances).toHaveBeenCalledWith(new Date().getFullYear());
  });

  it("rejects non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.leave.allBalances()).rejects.toThrow();
  });
});

describe("leave.updateBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a user's leave balance", async () => {
    vi.mocked(db.updateLeaveBalance).mockResolvedValue({
      id: 1,
      userId: 1,
      year: 2026,
      totalDays: 35,
      usedDays: 5,
      pendingDays: 0,
      carryOverDays: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.createAuditLogEntry).mockResolvedValue({ id: 1 } as any);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leave.updateBalance({
      userId: 1,
      year: 2026,
      totalDays: 35,
    });

    expect(result).toBeDefined();
    expect(result?.totalDays).toBe(35);
  });

  it("creates an audit log entry", async () => {
    vi.mocked(db.updateLeaveBalance).mockResolvedValue({
      id: 1,
      userId: 2,
      year: 2026,
      totalDays: 28,
      usedDays: 0,
      pendingDays: 0,
      carryOverDays: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.createAuditLogEntry).mockResolvedValue({ id: 1 } as any);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await caller.leave.updateBalance({
      userId: 2,
      year: 2026,
      totalDays: 28,
    });

    expect(db.createAuditLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "leave_balance_updated",
        resourceType: "leave_balance",
        resourceId: 2,
      })
    );
  });

  it("rejects non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.leave.updateBalance({
        userId: 1,
        year: 2026,
        totalDays: 40,
      })
    ).rejects.toThrow();
  });

  it("validates totalDays minimum", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.leave.updateBalance({
        userId: 1,
        year: 2026,
        totalDays: -5,
      })
    ).rejects.toThrow();
  });

  it("validates totalDays maximum", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.leave.updateBalance({
        userId: 1,
        year: 2026,
        totalDays: 400,
      })
    ).rejects.toThrow();
  });
});
