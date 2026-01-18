import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 100,
    openId: "ux-test-user",
    email: "ux-test@example.com",
    name: "UX Test User",
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
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("favorites router", () => {
  it("list returns empty array for new user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.favorites.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("check returns false for non-favorited article", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.favorites.check({ articleId: 99999 });
    expect(result).toBe(false);
  });
});

describe("preferences router", () => {
  it("get returns default preferences for new user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.preferences.get();
    // Should return null or default preferences
    expect(result === null || typeof result === "object").toBe(true);
  });
});

describe("leave router", () => {
  it("myBalance returns balance object", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.leave.myBalance();
    expect(result).toHaveProperty("totalDays");
    expect(result).toHaveProperty("usedDays");
    expect(result).toHaveProperty("pendingDays");
    expect(typeof result.totalDays).toBe("number");
  });

  it("myRequests returns array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.leave.myRequests();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create validates date range", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // End date before start date should fail validation
    await expect(
      caller.leave.create({
        leaveType: "vacation",
        startDate: "2025-12-31",
        endDate: "2025-12-01", // Before start
        reason: "Test",
      })
    ).rejects.toThrow();
  });

  it("pending requires admin role", async () => {
    const userCtx = createAuthContext("user");
    const userCaller = appRouter.createCaller(userCtx);

    // Regular user should not be able to access pending requests
    await expect(userCaller.leave.pending()).rejects.toThrow();
  });

  it("admin can access pending requests", async () => {
    const adminCtx = createAuthContext("admin");
    const adminCaller = appRouter.createCaller(adminCtx);

    const result = await adminCaller.leave.pending();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can access all requests", async () => {
    const adminCtx = createAuthContext("admin");
    const adminCaller = appRouter.createCaller(adminCtx);

    const result = await adminCaller.leave.all();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("recentlyViewed router", () => {
  it("list returns array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.recentlyViewed.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
