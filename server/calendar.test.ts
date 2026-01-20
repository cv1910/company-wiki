import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 300,
    openId: "calendar-test-user",
    email: "calendar-test@example.com",
    name: "Calendar Test User",
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

describe("Calendar API", () => {
  const caller = appRouter.createCaller(createAuthContext());

  describe("calendar.create", () => {
    it("should create a new calendar event", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(10, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(11, 0, 0, 0);

      const result = await caller.calendar.create({
        title: "Test Meeting",
        description: "A test meeting",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isAllDay: false,
        color: "blue",
        eventType: "meeting",
        location: "Conference Room A",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.title).toBe("Test Meeting");
      expect(result.description).toBe("A test meeting");
      expect(result.isAllDay).toBe(false);
      expect(result.color).toBe("blue");
      expect(result.eventType).toBe("meeting");
      expect(result.location).toBe("Conference Room A");
    });

    it("should create an all-day event", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 2);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);

      const result = await caller.calendar.create({
        title: "All Day Event",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isAllDay: true,
        color: "green",
        eventType: "personal",
      });

      expect(result).toBeDefined();
      expect(result.title).toBe("All Day Event");
      expect(result.isAllDay).toBe(true);
      expect(result.color).toBe("green");
    });

    it("should create a multi-day event", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 3);
      endDate.setHours(23, 59, 59, 999);

      const result = await caller.calendar.create({
        title: "Multi-Day Conference",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isAllDay: true,
        color: "purple",
        eventType: "meeting",
      });

      expect(result).toBeDefined();
      expect(result.title).toBe("Multi-Day Conference");
      expect(result.isAllDay).toBe(true);
    });
  });

  describe("calendar.getEvents", () => {
    it("should get events for a date range", async () => {
      const startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);

      const result = await caller.calendar.getEvents({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includeTeamLeaves: false,
      });

      expect(result).toBeDefined();
      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
      expect(result.leaves).toBeDefined();
      expect(Array.isArray(result.leaves)).toBe(true);
    });
  });

  describe("calendar.getMonthEvents", () => {
    it("should get events for a specific month", async () => {
      const now = new Date();
      const result = await caller.calendar.getMonthEvents({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });

      expect(result).toBeDefined();
      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
    });
  });

  describe("calendar.getYearEvents", () => {
    it("should get events for a specific year", async () => {
      const now = new Date();
      const result = await caller.calendar.getYearEvents({
        year: now.getFullYear(),
      });

      expect(result).toBeDefined();
      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
    });
  });

  describe("calendar.update", () => {
    it("should update an existing event", async () => {
      // First create an event
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 10);
      startDate.setHours(14, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(15, 0, 0, 0);

      const created = await caller.calendar.create({
        title: "Original Title",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        color: "blue",
        eventType: "personal",
      });

      // Then update it
      const updated = await caller.calendar.update({
        id: created.id,
        title: "Updated Title",
        color: "red",
      });

      expect(updated).toBeDefined();
      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe("Updated Title");
      expect(updated.color).toBe("red");
    });
  });

  describe("calendar.delete", () => {
    it("should delete an event", async () => {
      // First create an event
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 15);
      startDate.setHours(9, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(10, 0, 0, 0);

      const created = await caller.calendar.create({
        title: "Event to Delete",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        color: "orange",
        eventType: "reminder",
      });

      // Then delete it
      const result = await caller.calendar.delete({ id: created.id });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Verify it's deleted by trying to get it
      await expect(
        caller.calendar.getById({ id: created.id })
      ).rejects.toThrow();
    });
  });

  describe("calendar.getById", () => {
    it("should get a single event by ID", async () => {
      // First create an event
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 20);
      startDate.setHours(11, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(12, 0, 0, 0);

      const created = await caller.calendar.create({
        title: "Get By ID Test",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        color: "teal",
        eventType: "other",
      });

      // Then get it by ID
      const result = await caller.calendar.getById({ id: created.id });

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.title).toBe("Get By ID Test");
    });

    it("should throw error for non-existent event", async () => {
      await expect(
        caller.calendar.getById({ id: 999999 })
      ).rejects.toThrow();
    });
  });

  describe("calendar.exportIcal", () => {
    it("should export events as iCal format", async () => {
      const result = await caller.calendar.exportIcal({});

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content).toContain("BEGIN:VCALENDAR");
      expect(result.content).toContain("VERSION:2.0");
      expect(result.content).toContain("END:VCALENDAR");
      expect(result.filename).toMatch(/company-wiki-calendar-.*\.ics/);
      expect(typeof result.eventCount).toBe("number");
    });

    it("should export events for a specific date range", async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const result = await caller.calendar.exportIcal({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      expect(result).toBeDefined();
      expect(result.content).toContain("BEGIN:VCALENDAR");
    });
  });

  describe("calendar.importIcal", () => {
    it("should import events from iCal content", async () => {
      const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-import-1@test
DTSTART:20260201T100000
DTEND:20260201T110000
SUMMARY:Imported Test Event
DESCRIPTION:This is an imported event
LOCATION:Test Location
END:VEVENT
END:VCALENDAR`;

      const result = await caller.calendar.importIcal({
        content: icalContent,
        overwriteExisting: false,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.imported).toBeGreaterThanOrEqual(0);
      expect(result.total).toBe(1);
    });

    it("should import all-day events", async () => {
      const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-import-allday@test
DTSTART;VALUE=DATE:20260215
DTEND;VALUE=DATE:20260216
SUMMARY:All Day Import Test
END:VEVENT
END:VCALENDAR`;

      const result = await caller.calendar.importIcal({
        content: icalContent,
        overwriteExisting: false,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should skip duplicate events when overwrite is false", async () => {
      const uniqueTitle = `Duplicate Test ${Date.now()}`;
      const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-duplicate@test
DTSTART:20260301T140000
DTEND:20260301T150000
SUMMARY:${uniqueTitle}
END:VEVENT
END:VCALENDAR`;

      // First import
      const firstResult = await caller.calendar.importIcal({
        content: icalContent,
        overwriteExisting: false,
      });

      expect(firstResult.imported).toBe(1);

      // Second import should skip
      const secondResult = await caller.calendar.importIcal({
        content: icalContent,
        overwriteExisting: false,
      });

      expect(secondResult.skipped).toBe(1);
      expect(secondResult.imported).toBe(0);
    });

    it("should handle empty iCal content", async () => {
      const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
END:VCALENDAR`;

      const result = await caller.calendar.importIcal({
        content: icalContent,
        overwriteExisting: false,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.total).toBe(0);
    });
  });
});
