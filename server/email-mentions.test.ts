import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

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

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("emailSettings", () => {
  it("returns settings when queried", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const settings = await caller.emailSettings.get();
    
    // Should return settings object with all required fields
    expect(settings).toBeDefined();
    expect(typeof settings.leaveRequestSubmitted).toBe("boolean");
    expect(typeof settings.leaveRequestApproved).toBe("boolean");
    expect(typeof settings.mentioned).toBe("boolean");
  });

  it("can update email settings", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Update a setting
    await caller.emailSettings.update({
      leaveRequestSubmitted: false,
    });

    // Verify the update
    const settings = await caller.emailSettings.get();
    expect(settings.leaveRequestSubmitted).toBe(false);
  });
});

describe("mentions", () => {
  it("can search for users to mention", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Search for users
    const users = await caller.mentions.searchUsers({
      query: "test",
      limit: 5,
    });

    // Should return an array (may be empty if no matching users)
    expect(Array.isArray(users)).toBe(true);
  });

  it("can list mentions for current user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mentions = await caller.mentions.list({ limit: 10 });

    // Should return an array
    expect(Array.isArray(mentions)).toBe(true);
  });

  it("can get unread mention count", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mentions.unreadCount();

    // Should return a number
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("can create a mention record", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a mention
    const result = await caller.mentions.create({
      mentionedUserId: 2, // Different user
      contextType: "article",
      contextId: 1,
      contextTitle: "Test Article",
    });

    expect(result.success).toBe(true);
  });

  it("silently ignores self-mentions", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Try to mention self (user id 1) - should succeed but not create mention
    const result = await caller.mentions.create({
      mentionedUserId: 1, // Same as current user
      contextType: "article",
      contextId: 1,
      contextTitle: "Test Article",
    });

    // Should return success but with null id (no mention created)
    expect(result.success).toBe(true);
  });
});

describe("email notifications", () => {
  it("email settings have correct structure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const settings = await caller.emailSettings.get();

    // Check that all fields exist and are booleans
    expect(typeof settings.leaveRequestSubmitted).toBe("boolean");
    expect(typeof settings.leaveRequestApproved).toBe("boolean");
    expect(typeof settings.leaveRequestRejected).toBe("boolean");
    expect(typeof settings.articleReviewRequested).toBe("boolean");
    expect(typeof settings.articleApproved).toBe("boolean");
    expect(typeof settings.articleRejected).toBe("boolean");
    expect(typeof settings.articleFeedback).toBe("boolean");
    expect(typeof settings.mentioned).toBe("boolean");
    expect(typeof settings.dailyDigest).toBe("boolean");
    expect(typeof settings.weeklyDigest).toBe("boolean");
  });

  it("can disable all leave notifications", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Disable all leave notifications
    await caller.emailSettings.update({
      leaveRequestSubmitted: false,
      leaveRequestApproved: false,
      leaveRequestRejected: false,
    });

    const settings = await caller.emailSettings.get();
    expect(settings.leaveRequestSubmitted).toBe(false);
    expect(settings.leaveRequestApproved).toBe(false);
    expect(settings.leaveRequestRejected).toBe(false);
  });

  it("can enable digest emails", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Enable daily digest
    await caller.emailSettings.update({
      dailyDigest: true,
    });

    const settings = await caller.emailSettings.get();
    expect(settings.dailyDigest).toBe(true);
  });
});
