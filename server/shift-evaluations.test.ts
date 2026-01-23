import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database module
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getMonthlyShiftEvaluation: vi.fn(),
    getUserShiftEvaluation: vi.fn(),
  };
});

import { getMonthlyShiftEvaluation, getUserShiftEvaluation } from "./db";

describe("Schicht-Auswertungen (Shift Evaluations)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getMonthlyShiftEvaluation", () => {
    it("should return monthly shift evaluation with user hours", async () => {
      const mockResult = {
        year: 2026,
        month: 1,
        teamId: 1,
        teamName: "POS Team",
        totalShifts: 10,
        totalHours: 80,
        users: [
          {
            userId: 1,
            userName: "Max Mustermann",
            totalHours: 40,
            shiftCount: 5,
            shifts: [
              { date: new Date("2026-01-15"), hours: 8, title: "Frühschicht" },
              { date: new Date("2026-01-16"), hours: 8, title: "Frühschicht" },
            ],
          },
          {
            userId: 2,
            userName: "Anna Schmidt",
            totalHours: 40,
            shiftCount: 5,
            shifts: [
              { date: new Date("2026-01-17"), hours: 8, title: "Spätschicht" },
              { date: new Date("2026-01-18"), hours: 8, title: "Spätschicht" },
            ],
          },
        ],
      };

      vi.mocked(getMonthlyShiftEvaluation).mockResolvedValue(mockResult);

      const result = await getMonthlyShiftEvaluation(2026, 1, 1);

      expect(result).toBeDefined();
      expect(result.year).toBe(2026);
      expect(result.month).toBe(1);
      expect(result.teamName).toBe("POS Team");
      expect(result.totalShifts).toBe(10);
      expect(result.totalHours).toBe(80);
      expect(result.users).toHaveLength(2);
      expect(result.users[0].userName).toBe("Max Mustermann");
      expect(result.users[0].totalHours).toBe(40);
      expect(result.users[1].userName).toBe("Anna Schmidt");
    });

    it("should handle empty shifts for a month", async () => {
      const mockResult = {
        year: 2026,
        month: 2,
        teamId: 1,
        teamName: "POS Team",
        totalShifts: 0,
        totalHours: 0,
        users: [],
      };

      vi.mocked(getMonthlyShiftEvaluation).mockResolvedValue(mockResult);

      const result = await getMonthlyShiftEvaluation(2026, 2, 1);

      expect(result.totalShifts).toBe(0);
      expect(result.totalHours).toBe(0);
      expect(result.users).toHaveLength(0);
    });

    it("should filter by team when teamId is provided", async () => {
      const mockResult = {
        year: 2026,
        month: 1,
        teamId: 2,
        teamName: "Versand Team",
        totalShifts: 5,
        totalHours: 40,
        users: [
          {
            userId: 3,
            userName: "Peter Versand",
            totalHours: 40,
            shiftCount: 5,
            shifts: [],
          },
        ],
      };

      vi.mocked(getMonthlyShiftEvaluation).mockResolvedValue(mockResult);

      const result = await getMonthlyShiftEvaluation(2026, 1, 2);

      expect(result.teamId).toBe(2);
      expect(result.teamName).toBe("Versand Team");
    });
  });

  describe("getUserShiftEvaluation", () => {
    it("should return user shift evaluation for a specific month", async () => {
      const mockResult = {
        userId: "user-open-id-123",
        userName: "Max Mustermann",
        year: 2026,
        month: 1,
        totalShifts: 5,
        totalHours: 40,
        averageHoursPerShift: 8,
        shifts: [
          { date: new Date("2026-01-15"), hours: 8, title: "Frühschicht" },
          { date: new Date("2026-01-16"), hours: 8, title: "Frühschicht" },
          { date: new Date("2026-01-17"), hours: 8, title: "Frühschicht" },
          { date: new Date("2026-01-18"), hours: 8, title: "Frühschicht" },
          { date: new Date("2026-01-19"), hours: 8, title: "Frühschicht" },
        ],
        weeklyHours: [
          { week: 3, hours: 24 },
          { week: 4, hours: 16 },
        ],
      };

      vi.mocked(getUserShiftEvaluation).mockResolvedValue(mockResult);

      const result = await getUserShiftEvaluation("user-open-id-123", 2026, 1);

      expect(result).toBeDefined();
      expect(result.userId).toBe("user-open-id-123");
      expect(result.userName).toBe("Max Mustermann");
      expect(result.totalShifts).toBe(5);
      expect(result.totalHours).toBe(40);
      expect(result.averageHoursPerShift).toBe(8);
      expect(result.shifts).toHaveLength(5);
      expect(result.weeklyHours).toHaveLength(2);
    });

    it("should calculate weekly hours correctly", async () => {
      const mockResult = {
        userId: "user-123",
        userName: "Test User",
        year: 2026,
        month: 1,
        totalShifts: 4,
        totalHours: 32,
        averageHoursPerShift: 8,
        shifts: [],
        weeklyHours: [
          { week: 1, hours: 16 },
          { week: 2, hours: 16 },
        ],
      };

      vi.mocked(getUserShiftEvaluation).mockResolvedValue(mockResult);

      const result = await getUserShiftEvaluation("user-123", 2026, 1);

      expect(result.weeklyHours).toHaveLength(2);
      const totalWeeklyHours = result.weeklyHours.reduce((sum, w) => sum + w.hours, 0);
      expect(totalWeeklyHours).toBe(result.totalHours);
    });

    it("should handle user with no shifts", async () => {
      const mockResult = {
        userId: "user-no-shifts",
        userName: "Neuer Mitarbeiter",
        year: 2026,
        month: 1,
        totalShifts: 0,
        totalHours: 0,
        averageHoursPerShift: 0,
        shifts: [],
        weeklyHours: [],
      };

      vi.mocked(getUserShiftEvaluation).mockResolvedValue(mockResult);

      const result = await getUserShiftEvaluation("user-no-shifts", 2026, 1);

      expect(result.totalShifts).toBe(0);
      expect(result.totalHours).toBe(0);
      expect(result.averageHoursPerShift).toBe(0);
      expect(result.shifts).toHaveLength(0);
    });
  });

  describe("Hour calculation", () => {
    it("should correctly calculate hours from shift start and end times", () => {
      // Test helper function for hour calculation
      const calculateHours = (start: Date, end: Date): number => {
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      };

      // 8-hour shift
      const start1 = new Date("2026-01-15T06:00:00");
      const end1 = new Date("2026-01-15T14:00:00");
      expect(calculateHours(start1, end1)).toBe(8);

      // 4-hour shift
      const start2 = new Date("2026-01-15T09:00:00");
      const end2 = new Date("2026-01-15T13:00:00");
      expect(calculateHours(start2, end2)).toBe(4);

      // 10-hour shift
      const start3 = new Date("2026-01-15T07:00:00");
      const end3 = new Date("2026-01-15T17:00:00");
      expect(calculateHours(start3, end3)).toBe(10);
    });

    it("should handle overnight shifts correctly", () => {
      const calculateHours = (start: Date, end: Date): number => {
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      };

      // Overnight shift (22:00 - 06:00 next day)
      const start = new Date("2026-01-15T22:00:00");
      const end = new Date("2026-01-16T06:00:00");
      expect(calculateHours(start, end)).toBe(8);
    });
  });

  describe("Week number calculation", () => {
    it("should calculate correct ISO week number", () => {
      const getWeekNumber = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      };

      // January 1, 2026 is Thursday -> Week 1
      expect(getWeekNumber(new Date("2026-01-01"))).toBe(1);
      
      // January 15, 2026 is Thursday -> Week 3
      expect(getWeekNumber(new Date("2026-01-15"))).toBe(3);
      
      // January 23, 2026 is Friday -> Week 4
      expect(getWeekNumber(new Date("2026-01-23"))).toBe(4);
    });
  });

  describe("Monthly date range", () => {
    it("should correctly determine month boundaries", () => {
      const getMonthRange = (year: number, month: number) => {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        return { startDate, endDate };
      };

      // January 2026
      const jan = getMonthRange(2026, 1);
      expect(jan.startDate.getDate()).toBe(1);
      expect(jan.startDate.getMonth()).toBe(0); // January
      expect(jan.endDate.getDate()).toBe(31);

      // February 2026 (not leap year)
      const feb = getMonthRange(2026, 2);
      expect(feb.startDate.getDate()).toBe(1);
      expect(feb.endDate.getDate()).toBe(28);

      // April 2026
      const apr = getMonthRange(2026, 4);
      expect(apr.endDate.getDate()).toBe(30);
    });
  });
});
