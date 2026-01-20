import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 400): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `google-calendar-test-${userId}`,
    email: `google-test-${userId}@example.com`,
    name: "Google Calendar Test User",
    loginMethod: "manus",
    role: "user",
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

describe("Google Calendar Integration", () => {
  let ctx: TrpcContext;
  let userId: number;

  beforeEach(() => {
    userId = Math.floor(Math.random() * 100000) + 400;
    ctx = createAuthContext(userId);
  });

  describe("googleCalendar.isConfigured", () => {
    it("should return configuration status", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.googleCalendar.isConfigured();
      
      expect(result).toHaveProperty("configured");
      expect(typeof result.configured).toBe("boolean");
    });
  });

  describe("googleCalendar.getConnection", () => {
    it("should return null when no connection exists", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.googleCalendar.getConnection();
      
      expect(result).toBeNull();
    });
  });

  describe("googleCalendar.disconnect", () => {
    it("should successfully disconnect even when no connection exists", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.googleCalendar.disconnect();
      
      expect(result).toEqual({ success: true });
    });
  });

  describe("googleCalendar.toggleSync", () => {
    it("should throw error when no connection exists", async () => {
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.googleCalendar.toggleSync({ enabled: true })
      ).rejects.toThrow("Keine Google Calendar-Verbindung gefunden");
    });
  });

  describe("googleCalendar.syncFromGoogle", () => {
    it("should throw error when no connection exists", async () => {
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.googleCalendar.syncFromGoogle()
      ).rejects.toThrow("Keine Google Calendar-Verbindung gefunden");
    });
  });

  describe("googleCalendar.syncToGoogle", () => {
    it("should throw error when no connection exists", async () => {
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.googleCalendar.syncToGoogle()
      ).rejects.toThrow("Keine Google Calendar-Verbindung gefunden");
    });
  });

  describe("googleCalendar.fullSync", () => {
    it("should throw error when no connection exists", async () => {
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.googleCalendar.fullSync()
      ).rejects.toThrow("Keine Google Calendar-Verbindung gefunden");
    });
  });

  describe("googleCalendar.getAuthUrl", () => {
    it("should handle configuration status appropriately", async () => {
      const caller = appRouter.createCaller(ctx);
      
      // This test depends on whether GOOGLE_CLIENT_ID etc. are set
      // If not configured, it should throw
      try {
        const result = await caller.googleCalendar.getAuthUrl();
        // If it succeeds, it should have a url property
        expect(result).toHaveProperty("url");
        expect(typeof result.url).toBe("string");
      } catch (error: any) {
        // If it fails, it should be because it's not configured
        expect(error.message).toContain("nicht konfiguriert");
      }
    });
  });

  describe("googleCalendar.handleCallback", () => {
    it("should reject invalid state parameter", async () => {
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.googleCalendar.handleCallback({
          code: "test-code",
          state: "invalid-state",
        })
      ).rejects.toThrow("Ungültiger State-Parameter");
    });

    it("should reject expired state", async () => {
      const caller = appRouter.createCaller(ctx);
      
      // Create a state that is too old (more than 5 minutes)
      const expiredState = Buffer.from(
        JSON.stringify({
          userId: userId,
          timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
        })
      ).toString("base64");
      
      await expect(
        caller.googleCalendar.handleCallback({
          code: "test-code",
          state: expiredState,
        })
      ).rejects.toThrow("State ist abgelaufen");
    });

    it("should reject state with wrong user ID", async () => {
      const caller = appRouter.createCaller(ctx);
      
      // Create a state with a different user ID
      const wrongUserState = Buffer.from(
        JSON.stringify({
          userId: userId + 999,
          timestamp: Date.now(),
        })
      ).toString("base64");
      
      await expect(
        caller.googleCalendar.handleCallback({
          code: "test-code",
          state: wrongUserState,
        })
      ).rejects.toThrow("Ungültiger State-Parameter");
    });
  });
});

describe("Google Calendar Database Functions", () => {
  let userId: number;

  beforeEach(() => {
    userId = Math.floor(Math.random() * 100000) + 500;
  });

  it("should return null for non-existent connection", async () => {
    const db = await import("./db");
    const connection = await db.getGoogleCalendarConnection(userId);
    expect(connection).toBeNull();
  });

  it("should create and retrieve a connection", async () => {
    const db = await import("./db");
    
    const connectionData = {
      userId: userId,
      googleEmail: "test@gmail.com",
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      calendarId: "primary",
      syncEnabled: true,
    };
    
    await db.upsertGoogleCalendarConnection(connectionData);
    
    const retrieved = await db.getGoogleCalendarConnection(userId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.googleEmail).toBe("test@gmail.com");
    expect(retrieved?.syncEnabled).toBe(true);
  });

  it("should update an existing connection", async () => {
    const db = await import("./db");
    
    // Create initial connection
    await db.upsertGoogleCalendarConnection({
      userId: userId,
      googleEmail: "test@gmail.com",
      accessToken: "old-token",
      refreshToken: "old-refresh",
      tokenExpiresAt: new Date(),
      calendarId: "primary",
      syncEnabled: true,
    });
    
    // Update connection
    await db.upsertGoogleCalendarConnection({
      userId: userId,
      googleEmail: "updated@gmail.com",
      accessToken: "new-token",
      refreshToken: "new-refresh",
      tokenExpiresAt: new Date(),
      calendarId: "primary",
      syncEnabled: false,
    });
    
    const retrieved = await db.getGoogleCalendarConnection(userId);
    expect(retrieved?.googleEmail).toBe("updated@gmail.com");
    expect(retrieved?.accessToken).toBe("new-token");
    expect(retrieved?.syncEnabled).toBe(false);
  });

  it("should delete a connection", async () => {
    const db = await import("./db");
    
    // Create connection
    await db.upsertGoogleCalendarConnection({
      userId: userId,
      googleEmail: "test@gmail.com",
      accessToken: "token",
      refreshToken: "refresh",
      tokenExpiresAt: new Date(),
      calendarId: "primary",
      syncEnabled: true,
    });
    
    // Delete connection
    await db.deleteGoogleCalendarConnection(userId);
    
    const retrieved = await db.getGoogleCalendarConnection(userId);
    expect(retrieved).toBeNull();
  });

  it("should update sync status", async () => {
    const db = await import("./db");
    
    // Create connection
    await db.upsertGoogleCalendarConnection({
      userId: userId,
      googleEmail: "test@gmail.com",
      accessToken: "token",
      refreshToken: "refresh",
      tokenExpiresAt: new Date(),
      calendarId: "primary",
      syncEnabled: true,
    });
    
    // Update sync status
    await db.updateGoogleCalendarSyncStatus(userId, "success", undefined, "sync-token-123");
    
    const retrieved = await db.getGoogleCalendarConnection(userId);
    expect(retrieved?.lastSyncStatus).toBe("success");
    expect(retrieved?.syncToken).toBe("sync-token-123");
    expect(retrieved?.lastSyncAt).not.toBeNull();
  });

  it("should update sync status with error", async () => {
    const db = await import("./db");
    
    // Create connection
    await db.upsertGoogleCalendarConnection({
      userId: userId,
      googleEmail: "test@gmail.com",
      accessToken: "token",
      refreshToken: "refresh",
      tokenExpiresAt: new Date(),
      calendarId: "primary",
      syncEnabled: true,
    });
    
    // Update sync status with error
    await db.updateGoogleCalendarSyncStatus(userId, "error", "Token expired");
    
    const retrieved = await db.getGoogleCalendarConnection(userId);
    expect(retrieved?.lastSyncStatus).toBe("error");
    expect(retrieved?.lastSyncError).toBe("Token expired");
  });
});

describe("Calendar Event Sync Map Functions", () => {
  let userId: number;

  beforeEach(() => {
    userId = Math.floor(Math.random() * 100000) + 600;
  });

  it("should create and retrieve sync mapping by local event ID", async () => {
    const db = await import("./db");
    const localEventId = Math.floor(Math.random() * 100000);
    
    const mapping = await db.createSyncMapping({
      userId: userId,
      localEventId: localEventId,
      googleEventId: `google-event-${localEventId}`,
      googleCalendarId: "primary",
      syncDirection: "export",
    });
    
    expect(mapping).toHaveProperty("id");
    
    const retrieved = await db.getSyncMapByLocalEventId(userId, localEventId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.googleEventId).toBe(`google-event-${localEventId}`);
  });

  it("should retrieve sync mapping by Google event ID", async () => {
    const db = await import("./db");
    const localEventId = Math.floor(Math.random() * 100000);
    const googleEventId = `google-event-${localEventId}`;
    
    await db.createSyncMapping({
      userId: userId,
      localEventId: localEventId,
      googleEventId: googleEventId,
      googleCalendarId: "primary",
      syncDirection: "import",
    });
    
    const retrieved = await db.getSyncMapByGoogleEventId(userId, googleEventId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.localEventId).toBe(localEventId);
    expect(retrieved?.syncDirection).toBe("import");
  });

  it("should return null for non-existent mappings", async () => {
    const db = await import("./db");
    
    const byLocal = await db.getSyncMapByLocalEventId(userId, 99999999);
    expect(byLocal).toBeNull();
    
    const byGoogle = await db.getSyncMapByGoogleEventId(userId, "non-existent-id");
    expect(byGoogle).toBeNull();
  });

  it("should get all user sync mappings", async () => {
    const db = await import("./db");
    const localEventId1 = Math.floor(Math.random() * 100000);
    const localEventId2 = Math.floor(Math.random() * 100000);
    
    await db.createSyncMapping({
      userId: userId,
      localEventId: localEventId1,
      googleEventId: `g-${localEventId1}`,
      googleCalendarId: "primary",
      syncDirection: "export",
    });
    
    await db.createSyncMapping({
      userId: userId,
      localEventId: localEventId2,
      googleEventId: `g-${localEventId2}`,
      googleCalendarId: "primary",
      syncDirection: "import",
    });
    
    const mappings = await db.getUserSyncMappings(userId);
    expect(mappings.length).toBeGreaterThanOrEqual(2);
  });
});
