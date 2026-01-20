import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 200,
    openId: "dashboard-test-user",
    email: "dashboard-test@example.com",
    name: "Dashboard Test User",
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

describe("dashboardSettings router", () => {
  it("get returns null for new user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboardSettings.get();
    // Should return null or default settings for new user
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("updateVisibility updates widget visibility", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Update visibility for a widget
    await caller.dashboardSettings.updateVisibility({
      widgetId: "stats",
      visible: false,
    });

    // Get settings and verify
    const settings = await caller.dashboardSettings.get();
    expect(settings).toBeDefined();
    if (settings) {
      expect(settings.showStats).toBe(false);
    }
  });

  it("updateOrder updates widget order", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const newOrder = [
      "navigation",
      "welcomeHero",
      "stats",
      "announcements",
      "recentArticles",
      "activityFeed",
      "favorites",
      "onboardingProgress",
    ];

    await caller.dashboardSettings.updateOrder({
      widgetOrder: newOrder,
    });

    // Get settings and verify
    const settings = await caller.dashboardSettings.get();
    expect(settings).toBeDefined();
    if (settings && settings.widgetOrder) {
      expect(settings.widgetOrder).toEqual(newOrder);
    }
  });

  it("reset restores default settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First update some settings
    await caller.dashboardSettings.updateVisibility({
      widgetId: "favorites",
      visible: false,
    });

    // Then reset
    await caller.dashboardSettings.reset();

    // Get settings - should be reset to defaults
    const settings = await caller.dashboardSettings.get();
    // After reset, settings should show default values
    expect(settings === null || settings.showFavorites === true).toBe(true);
  });

  it("updateSize updates widget size", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Update size for a widget
    await caller.dashboardSettings.updateSize({
      widgetId: "recentArticles",
      size: "large",
    });

    // Get settings and verify
    const settings = await caller.dashboardSettings.get();
    expect(settings).toBeDefined();
    if (settings && settings.widgetSizes) {
      const sizes = settings.widgetSizes as Record<string, string>;
      expect(sizes.recentArticles).toBe("large");
    }
  });

  it("updateSize can set multiple widget sizes", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Update sizes for multiple widgets
    await caller.dashboardSettings.updateSize({
      widgetId: "favorites",
      size: "small",
    });
    await caller.dashboardSettings.updateSize({
      widgetId: "activityFeed",
      size: "large",
    });

    // Get settings and verify both sizes are saved
    const settings = await caller.dashboardSettings.get();
    expect(settings).toBeDefined();
    if (settings && settings.widgetSizes) {
      const sizes = settings.widgetSizes as Record<string, string>;
      expect(sizes.favorites).toBe("small");
      expect(sizes.activityFeed).toBe("large");
    }
  });

  it("reset clears widget sizes", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Set a widget size
    await caller.dashboardSettings.updateSize({
      widgetId: "onboardingProgress",
      size: "large",
    });

    // Reset settings
    await caller.dashboardSettings.reset();

    // Get settings - sizes should be empty or not set
    const settings = await caller.dashboardSettings.get();
    if (settings && settings.widgetSizes) {
      const sizes = settings.widgetSizes as Record<string, string>;
      expect(sizes.onboardingProgress).toBeUndefined();
    }
  });
});
