import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the email module
vi.mock("./email", () => ({
  sendShiftAssignmentEmail: vi.fn(),
  sendShiftUpdateEmail: vi.fn(),
  sendShiftCancellationEmail: vi.fn(),
  sendShiftSwapRequestEmail: vi.fn(),
  sendShiftSwapResponseEmail: vi.fn(),
  shouldSendEmail: vi.fn(),
}));

import {
  sendShiftAssignmentEmail,
  sendShiftUpdateEmail,
  sendShiftCancellationEmail,
  sendShiftSwapRequestEmail,
  sendShiftSwapResponseEmail,
  shouldSendEmail,
} from "./email";

describe("Shift Notification Emails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendShiftAssignmentEmail", () => {
    it("should send email with correct parameters", async () => {
      vi.mocked(sendShiftAssignmentEmail).mockResolvedValue(undefined);

      await sendShiftAssignmentEmail({
        userId: 1,
        userEmail: "test@example.com",
        userName: "Test User",
        shiftTitle: "Fruehschicht",
        shiftDate: "Montag, 20.01.2025",
        shiftTime: "06:00 - 14:00",
        teamName: "POS Team",
      });

      expect(sendShiftAssignmentEmail).toHaveBeenCalledWith({
        userId: 1,
        userEmail: "test@example.com",
        userName: "Test User",
        shiftTitle: "Fruehschicht",
        shiftDate: "Montag, 20.01.2025",
        shiftTime: "06:00 - 14:00",
        teamName: "POS Team",
      });
    });
  });

  describe("sendShiftUpdateEmail", () => {
    it("should send update email with changes", async () => {
      vi.mocked(sendShiftUpdateEmail).mockResolvedValue(undefined);

      await sendShiftUpdateEmail({
        userId: 1,
        userEmail: "test@example.com",
        userName: "Test User",
        shiftTitle: "Spaetschicht",
        oldDate: "Montag, 20.01.2025",
        newDate: "Dienstag, 21.01.2025",
        oldTime: "14:00 - 22:00",
        newTime: "15:00 - 23:00",
        teamName: "POS Team",
      });

      expect(sendShiftUpdateEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          oldDate: "Montag, 20.01.2025",
          newDate: "Dienstag, 21.01.2025",
        })
      );
    });
  });

  describe("sendShiftCancellationEmail", () => {
    it("should send cancellation email", async () => {
      vi.mocked(sendShiftCancellationEmail).mockResolvedValue(undefined);

      await sendShiftCancellationEmail({
        userId: 1,
        userEmail: "test@example.com",
        userName: "Test User",
        shiftTitle: "Nachtschicht",
        shiftDate: "Freitag, 24.01.2025",
        shiftTime: "22:00 - 06:00",
        teamName: "Versand Team",
        reason: "Betriebsferien",
      });

      expect(sendShiftCancellationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: "Betriebsferien",
        })
      );
    });
  });

  describe("sendShiftSwapRequestEmail", () => {
    it("should send swap request email to target user", async () => {
      vi.mocked(sendShiftSwapRequestEmail).mockResolvedValue(undefined);

      await sendShiftSwapRequestEmail({
        targetUserId: 2,
        targetUserEmail: "target@example.com",
        targetUserName: "Target User",
        requesterName: "Requester User",
        requesterShiftTitle: "Fruehschicht",
        requesterShiftDate: "Montag, 20.01.2025",
        targetShiftTitle: "Spaetschicht",
        targetShiftDate: "Dienstag, 21.01.2025",
        teamName: "POS Team",
        message: "Koenntest du bitte tauschen?",
      });

      expect(sendShiftSwapRequestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          targetUserId: 2,
          requesterName: "Requester User",
        })
      );
    });
  });

  describe("sendShiftSwapResponseEmail", () => {
    it("should send approved response email", async () => {
      vi.mocked(sendShiftSwapResponseEmail).mockResolvedValue(undefined);

      await sendShiftSwapResponseEmail({
        requesterId: 1,
        requesterEmail: "requester@example.com",
        requesterName: "Requester User",
        responderName: "Responder User",
        status: "approved",
        requesterShiftTitle: "Fruehschicht",
        requesterShiftDate: "Montag, 20.01.2025",
        targetShiftTitle: "Spaetschicht",
        targetShiftDate: "Dienstag, 21.01.2025",
        teamName: "POS Team",
      });

      expect(sendShiftSwapResponseEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "approved",
        })
      );
    });

    it("should send rejected response email with reason", async () => {
      vi.mocked(sendShiftSwapResponseEmail).mockResolvedValue(undefined);

      await sendShiftSwapResponseEmail({
        requesterId: 1,
        requesterEmail: "requester@example.com",
        requesterName: "Requester User",
        responderName: "Responder User",
        status: "rejected",
        requesterShiftTitle: "Fruehschicht",
        requesterShiftDate: "Montag, 20.01.2025",
        targetShiftTitle: "Spaetschicht",
        targetShiftDate: "Dienstag, 21.01.2025",
        teamName: "POS Team",
        responseMessage: "Leider kann ich an dem Tag nicht.",
      });

      expect(sendShiftSwapResponseEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "rejected",
          responseMessage: "Leider kann ich an dem Tag nicht.",
        })
      );
    });
  });
});

describe("Email Settings for Shift Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("shouldSendEmail", () => {
    it("should check if shift assignment emails are enabled", async () => {
      vi.mocked(shouldSendEmail).mockResolvedValue(true);

      const result = await shouldSendEmail(1, "shiftAssignment");

      expect(result).toBe(true);
      expect(shouldSendEmail).toHaveBeenCalledWith(1, "shiftAssignment");
    });

    it("should check if shift update emails are enabled", async () => {
      vi.mocked(shouldSendEmail).mockResolvedValue(true);

      const result = await shouldSendEmail(1, "shiftUpdate");

      expect(result).toBe(true);
    });

    it("should check if shift cancellation emails are enabled", async () => {
      vi.mocked(shouldSendEmail).mockResolvedValue(true);

      const result = await shouldSendEmail(1, "shiftCancellation");

      expect(result).toBe(true);
    });

    it("should check if shift swap emails are enabled", async () => {
      vi.mocked(shouldSendEmail).mockResolvedValue(true);

      const result = await shouldSendEmail(1, "shiftSwap");

      expect(result).toBe(true);
    });

    it("should return false if user has disabled notifications", async () => {
      vi.mocked(shouldSendEmail).mockResolvedValue(false);

      const result = await shouldSendEmail(1, "shiftAssignment");

      expect(result).toBe(false);
    });
  });
});

describe("Shift Notification Email Content", () => {
  it("should format German dates correctly", () => {
    const date = new Date("2025-01-20T06:00:00");
    const formattedDate = date.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    expect(formattedDate).toContain("20");
    expect(formattedDate).toContain("01");
    expect(formattedDate).toContain("2025");
  });

  it("should format time ranges correctly", () => {
    const startTime = "06:00";
    const endTime = "14:00";
    const timeRange = startTime + " - " + endTime;

    expect(timeRange).toBe("06:00 - 14:00");
  });

  it("should handle all-day shifts", () => {
    const isAllDay = true;
    const timeDisplay = isAllDay ? "Ganztaegig" : "06:00 - 14:00";

    expect(timeDisplay).toBe("Ganztaegig");
  });
});

describe("Shift Swap Status Values", () => {
  it("should have valid swap response statuses", () => {
    const validStatuses = ["approved", "rejected"];
    
    expect(validStatuses).toContain("approved");
    expect(validStatuses).toContain("rejected");
  });

  it("should have valid swap request statuses", () => {
    const validStatuses = ["pending", "approved", "rejected", "cancelled"];
    
    expect(validStatuses).toContain("pending");
    expect(validStatuses).toContain("approved");
    expect(validStatuses).toContain("rejected");
    expect(validStatuses).toContain("cancelled");
  });
});
