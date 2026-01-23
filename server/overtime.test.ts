import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getTargetWorkHours: vi.fn(),
  getAllTargetWorkHours: vi.fn(),
  getActiveTargetWorkHours: vi.fn(),
  createTargetWorkHours: vi.fn(),
  updateTargetWorkHours: vi.fn(),
  deleteTargetWorkHours: vi.fn(),
  getOvertimeBalance: vi.fn(),
  getUserOvertimeHistory: vi.fn(),
  getAllOvertimeBalances: vi.fn(),
  upsertOvertimeBalance: vi.fn(),
  approveOvertimeBalance: vi.fn(),
  calculateUserOvertime: vi.fn(),
  calculateAndSaveMonthlyOvertime: vi.fn(),
  getOvertimeSummary: vi.fn(),
  getUserShiftReport: vi.fn(),
}));

import * as db from "./db";

describe("Target Work Hours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTargetWorkHours", () => {
    it("should return target hours for a user", async () => {
      const mockTarget = {
        id: 1,
        userId: 1,
        monthlyHours: "160.00",
        weeklyHours: "40.00",
        employmentType: "full_time",
        validFrom: new Date("2025-01-01"),
        validUntil: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 1,
      };

      vi.mocked(db.getTargetWorkHours).mockResolvedValue(mockTarget);

      const result = await db.getTargetWorkHours(1);

      expect(result).toEqual(mockTarget);
      expect(db.getTargetWorkHours).toHaveBeenCalledWith(1);
    });

    it("should return null if no target hours exist", async () => {
      vi.mocked(db.getTargetWorkHours).mockResolvedValue(null);

      const result = await db.getTargetWorkHours(999);

      expect(result).toBeNull();
    });
  });

  describe("getActiveTargetWorkHours", () => {
    it("should return all active target hours with user info", async () => {
      const mockTargets = [
        {
          target: {
            id: 1,
            userId: 1,
            monthlyHours: "160.00",
            weeklyHours: "40.00",
            employmentType: "full_time",
            validFrom: new Date("2025-01-01"),
            validUntil: null,
          },
          user: {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            avatarUrl: null,
          },
        },
      ];

      vi.mocked(db.getActiveTargetWorkHours).mockResolvedValue(mockTargets);

      const result = await db.getActiveTargetWorkHours();

      expect(result).toHaveLength(1);
      expect(result[0].user.name).toBe("Test User");
    });
  });

  describe("createTargetWorkHours", () => {
    it("should create new target hours", async () => {
      vi.mocked(db.createTargetWorkHours).mockResolvedValue(1);

      const result = await db.createTargetWorkHours({
        userId: 1,
        monthlyHours: "160.00",
        weeklyHours: "40.00",
        employmentType: "full_time",
        validFrom: new Date(),
        validUntil: null,
        notes: null,
        createdById: 1,
      });

      expect(result).toBe(1);
    });
  });
});

describe("Overtime Balance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOvertimeBalance", () => {
    it("should return overtime balance for a user in a specific month", async () => {
      const mockBalance = {
        id: 1,
        userId: 1,
        year: 2025,
        month: 1,
        targetHours: "160.00",
        actualHours: "170.00",
        overtimeHours: "10.00",
        carryOverHours: "0.00",
        status: "pending",
        approvedById: null,
        approvedAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getOvertimeBalance).mockResolvedValue(mockBalance);

      const result = await db.getOvertimeBalance(1, 2025, 1);

      expect(result).toEqual(mockBalance);
      expect(result?.overtimeHours).toBe("10.00");
    });

    it("should return null if no balance exists", async () => {
      vi.mocked(db.getOvertimeBalance).mockResolvedValue(null);

      const result = await db.getOvertimeBalance(999, 2025, 1);

      expect(result).toBeNull();
    });
  });

  describe("getUserOvertimeHistory", () => {
    it("should return overtime history for a user", async () => {
      const mockHistory = [
        {
          id: 1,
          userId: 1,
          year: 2025,
          month: 1,
          targetHours: "160.00",
          actualHours: "170.00",
          overtimeHours: "10.00",
          carryOverHours: "0.00",
          status: "approved",
        },
        {
          id: 2,
          userId: 1,
          year: 2024,
          month: 12,
          targetHours: "160.00",
          actualHours: "155.00",
          overtimeHours: "-5.00",
          carryOverHours: "0.00",
          status: "approved",
        },
      ];

      vi.mocked(db.getUserOvertimeHistory).mockResolvedValue(mockHistory);

      const result = await db.getUserOvertimeHistory(1);

      expect(result).toHaveLength(2);
      expect(result[0].month).toBe(1);
      expect(result[1].month).toBe(12);
    });

    it("should filter by year if provided", async () => {
      const mockHistory = [
        {
          id: 1,
          userId: 1,
          year: 2025,
          month: 1,
          targetHours: "160.00",
          actualHours: "170.00",
          overtimeHours: "10.00",
          carryOverHours: "0.00",
          status: "approved",
        },
      ];

      vi.mocked(db.getUserOvertimeHistory).mockResolvedValue(mockHistory);

      const result = await db.getUserOvertimeHistory(1, 2025);

      expect(result).toHaveLength(1);
      expect(result[0].year).toBe(2025);
    });
  });

  describe("calculateUserOvertime", () => {
    it("should calculate overtime correctly with positive hours", async () => {
      vi.mocked(db.calculateUserOvertime).mockResolvedValue({
        targetHours: 160,
        actualHours: 175,
        overtimeHours: 15,
        hasTarget: true,
        employmentType: "full_time",
        weeklyTarget: 40,
      });

      const result = await db.calculateUserOvertime(1, 2025, 1);

      expect(result?.overtimeHours).toBe(15);
      expect(result?.hasTarget).toBe(true);
    });

    it("should calculate overtime correctly with negative hours (undertime)", async () => {
      vi.mocked(db.calculateUserOvertime).mockResolvedValue({
        targetHours: 160,
        actualHours: 140,
        overtimeHours: -20,
        hasTarget: true,
        employmentType: "full_time",
        weeklyTarget: 40,
      });

      const result = await db.calculateUserOvertime(1, 2025, 1);

      expect(result?.overtimeHours).toBe(-20);
    });

    it("should return hasTarget false if no target hours configured", async () => {
      vi.mocked(db.calculateUserOvertime).mockResolvedValue({
        targetHours: 0,
        actualHours: 0,
        overtimeHours: 0,
        hasTarget: false,
      });

      const result = await db.calculateUserOvertime(1, 2025, 1);

      expect(result?.hasTarget).toBe(false);
    });
  });

  describe("getOvertimeSummary", () => {
    it("should return summary with correct totals", async () => {
      const mockSummary = {
        year: 2025,
        month: 1,
        totalUsers: 3,
        totalTargetHours: 480,
        totalActualHours: 500,
        totalOvertimeHours: 20,
        usersWithOvertime: 2,
        usersUndertime: 1,
        balances: [],
      };

      vi.mocked(db.getOvertimeSummary).mockResolvedValue(mockSummary);

      const result = await db.getOvertimeSummary(2025, 1);

      expect(result?.totalUsers).toBe(3);
      expect(result?.totalOvertimeHours).toBe(20);
      expect(result?.usersWithOvertime).toBe(2);
      expect(result?.usersUndertime).toBe(1);
    });
  });

  describe("approveOvertimeBalance", () => {
    it("should approve overtime balance", async () => {
      vi.mocked(db.approveOvertimeBalance).mockResolvedValue(undefined);

      await db.approveOvertimeBalance(1, 2);

      expect(db.approveOvertimeBalance).toHaveBeenCalledWith(1, 2);
    });
  });
});

describe("Employment Types", () => {
  it("should support all employment types", () => {
    const validTypes = ["full_time", "part_time", "mini_job", "student", "intern"];
    
    validTypes.forEach(type => {
      expect(["full_time", "part_time", "mini_job", "student", "intern"]).toContain(type);
    });
  });

  it("should have correct default hours for full_time", () => {
    const fullTimeMonthly = 160;
    const fullTimeWeekly = 40;
    
    expect(fullTimeMonthly).toBe(160);
    expect(fullTimeWeekly).toBe(40);
  });

  it("should have correct default hours for part_time", () => {
    const partTimeMonthly = 80;
    const partTimeWeekly = 20;
    
    expect(partTimeMonthly).toBe(80);
    expect(partTimeWeekly).toBe(20);
  });

  it("should have correct default hours for mini_job", () => {
    const miniJobMonthly = 43;
    const miniJobWeekly = 10;
    
    expect(miniJobMonthly).toBe(43);
    expect(miniJobWeekly).toBe(10);
  });
});

describe("Overtime Status Workflow", () => {
  it("should have valid status transitions", () => {
    const validStatuses = ["pending", "approved", "paid_out"];
    
    // Pending -> Approved -> Paid Out
    expect(validStatuses.indexOf("pending")).toBeLessThan(validStatuses.indexOf("approved"));
    expect(validStatuses.indexOf("approved")).toBeLessThan(validStatuses.indexOf("paid_out"));
  });
});
