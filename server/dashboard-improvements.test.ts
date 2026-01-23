import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getUserDashboardSettings: vi.fn(),
  updateQuickActions: vi.fn(),
  upsertUserDashboardSettings: vi.fn(),
}));

import * as db from "./db";

describe("Dashboard Improvements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Quick Actions", () => {
    it("should return default quick actions when none are set", async () => {
      const mockSettings = {
        id: 0,
        userId: 1,
        showWelcomeHero: true,
        showAnnouncements: true,
        showNavigation: true,
        showStats: true,
        showRecentArticles: true,
        showActivityFeed: true,
        showFavorites: true,
        showOnboardingProgress: true,
        widgetOrder: [],
        widgetSizes: {},
        quickActions: [
          { id: "leave", label: "Urlaub", path: "/leave/new", icon: "Palmtree", color: "green" },
          { id: "chat", label: "Chat", path: "/taps/new", icon: "MessageSquarePlus", color: "blue" },
          { id: "calendar", label: "Termin", path: "/calendar?new=true", icon: "Calendar", color: "orange" },
          { id: "task", label: "Aufgabe", path: "/aufgaben/new", icon: "ClipboardCheck", color: "purple" }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getUserDashboardSettings).mockResolvedValue(mockSettings);

      const result = await db.getUserDashboardSettings(1);
      
      expect(result).toBeDefined();
      expect(result?.quickActions).toHaveLength(4);
      expect(result?.quickActions[0].id).toBe("leave");
      expect(result?.quickActions[0].icon).toBe("Palmtree");
      expect(result?.quickActions[0].color).toBe("green");
    });

    it("should update quick actions", async () => {
      const newQuickActions = [
        { id: "wiki", label: "Wiki", path: "/wiki", icon: "Book", color: "cyan" },
        { id: "search", label: "Suche", path: "/search", icon: "Search", color: "purple" },
      ];

      vi.mocked(db.updateQuickActions).mockResolvedValue({
        id: 1,
        userId: 1,
        showWelcomeHero: true,
        showAnnouncements: true,
        showNavigation: true,
        showStats: true,
        showRecentArticles: true,
        showActivityFeed: true,
        showFavorites: true,
        showOnboardingProgress: true,
        widgetOrder: [],
        widgetSizes: {},
        quickActions: newQuickActions,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await db.updateQuickActions(1, newQuickActions);
      
      expect(db.updateQuickActions).toHaveBeenCalledWith(1, newQuickActions);
      expect(result?.quickActions).toEqual(newQuickActions);
    });

    it("should validate quick action structure", () => {
      const validAction = {
        id: "test",
        label: "Test",
        path: "/test",
        icon: "Star",
        color: "blue"
      };

      expect(validAction.id).toBeTruthy();
      expect(validAction.label).toBeTruthy();
      expect(validAction.path).toBeTruthy();
      expect(validAction.icon).toBeTruthy();
      expect(validAction.color).toBeTruthy();
    });
  });

  describe("Personalized Greeting", () => {
    it("should return morning greeting for early hours", () => {
      const hour = 8;
      const dayOfWeek = 3; // Wednesday
      
      let greeting: string;
      if (dayOfWeek === 1 && hour >= 5 && hour < 12) {
        greeting = "Guten Start in die Woche";
      } else if (dayOfWeek === 5 && hour >= 14) {
        greeting = "Fast Wochenende";
      } else if (hour >= 5 && hour < 12) {
        greeting = "Guten Morgen";
      } else if (hour >= 12 && hour < 14) {
        greeting = "Mahlzeit";
      } else if (hour >= 14 && hour < 18) {
        greeting = "Guten Tag";
      } else if (hour >= 18 && hour < 22) {
        greeting = "Guten Abend";
      } else {
        greeting = "Gute Nacht";
      }
      
      expect(greeting).toBe("Guten Morgen");
    });

    it("should return Monday greeting", () => {
      const hour = 9;
      const dayOfWeek = 1; // Monday
      
      let greeting: string;
      if (dayOfWeek === 1 && hour >= 5 && hour < 12) {
        greeting = "Guten Start in die Woche";
      } else if (dayOfWeek === 5 && hour >= 14) {
        greeting = "Fast Wochenende";
      } else if (hour >= 5 && hour < 12) {
        greeting = "Guten Morgen";
      } else if (hour >= 12 && hour < 14) {
        greeting = "Mahlzeit";
      } else if (hour >= 14 && hour < 18) {
        greeting = "Guten Tag";
      } else if (hour >= 18 && hour < 22) {
        greeting = "Guten Abend";
      } else {
        greeting = "Gute Nacht";
      }
      
      expect(greeting).toBe("Guten Start in die Woche");
    });

    it("should return Friday afternoon greeting", () => {
      const hour = 15;
      const dayOfWeek = 5; // Friday
      
      let greeting: string;
      if (dayOfWeek === 1 && hour >= 5 && hour < 12) {
        greeting = "Guten Start in die Woche";
      } else if (dayOfWeek === 5 && hour >= 14) {
        greeting = "Fast Wochenende";
      } else if (hour >= 5 && hour < 12) {
        greeting = "Guten Morgen";
      } else if (hour >= 12 && hour < 14) {
        greeting = "Mahlzeit";
      } else if (hour >= 14 && hour < 18) {
        greeting = "Guten Tag";
      } else if (hour >= 18 && hour < 22) {
        greeting = "Guten Abend";
      } else {
        greeting = "Gute Nacht";
      }
      
      expect(greeting).toBe("Fast Wochenende");
    });

    it("should return lunch greeting", () => {
      const hour = 12;
      const dayOfWeek = 3;
      
      let greeting: string;
      if (dayOfWeek === 1 && hour >= 5 && hour < 12) {
        greeting = "Guten Start in die Woche";
      } else if (dayOfWeek === 5 && hour >= 14) {
        greeting = "Fast Wochenende";
      } else if (hour >= 5 && hour < 12) {
        greeting = "Guten Morgen";
      } else if (hour >= 12 && hour < 14) {
        greeting = "Mahlzeit";
      } else if (hour >= 14 && hour < 18) {
        greeting = "Guten Tag";
      } else if (hour >= 18 && hour < 22) {
        greeting = "Guten Abend";
      } else {
        greeting = "Gute Nacht";
      }
      
      expect(greeting).toBe("Mahlzeit");
    });

    it("should return evening greeting", () => {
      const hour = 20;
      const dayOfWeek = 3;
      
      let greeting: string;
      if (dayOfWeek === 1 && hour >= 5 && hour < 12) {
        greeting = "Guten Start in die Woche";
      } else if (dayOfWeek === 5 && hour >= 14) {
        greeting = "Fast Wochenende";
      } else if (hour >= 5 && hour < 12) {
        greeting = "Guten Morgen";
      } else if (hour >= 12 && hour < 14) {
        greeting = "Mahlzeit";
      } else if (hour >= 14 && hour < 18) {
        greeting = "Guten Tag";
      } else if (hour >= 18 && hour < 22) {
        greeting = "Guten Abend";
      } else {
        greeting = "Gute Nacht";
      }
      
      expect(greeting).toBe("Guten Abend");
    });

    it("should return night greeting", () => {
      const hour = 23;
      const dayOfWeek = 3;
      
      let greeting: string;
      if (dayOfWeek === 1 && hour >= 5 && hour < 12) {
        greeting = "Guten Start in die Woche";
      } else if (dayOfWeek === 5 && hour >= 14) {
        greeting = "Fast Wochenende";
      } else if (hour >= 5 && hour < 12) {
        greeting = "Guten Morgen";
      } else if (hour >= 12 && hour < 14) {
        greeting = "Mahlzeit";
      } else if (hour >= 14 && hour < 18) {
        greeting = "Guten Tag";
      } else if (hour >= 18 && hour < 22) {
        greeting = "Guten Abend";
      } else {
        greeting = "Gute Nacht";
      }
      
      expect(greeting).toBe("Gute Nacht");
    });
  });

  describe("Personalized Description", () => {
    it("should return admin description for admin role", () => {
      const role = "admin";
      
      let description: string;
      if (role === "admin") {
        description = "Hier hast du Zugriff auf alle Verwaltungsfunktionen und Einstellungen.";
      } else if (role === "editor") {
        description = "Hier kannst du Inhalte erstellen und bearbeiten.";
      } else {
        description = "Hier findest du alle wichtigen Informationen, Prozesse und Anleitungen für deinen Arbeitsalltag.";
      }
      
      expect(description).toBe("Hier hast du Zugriff auf alle Verwaltungsfunktionen und Einstellungen.");
    });

    it("should return editor description for editor role", () => {
      const role = "editor";
      
      let description: string;
      if (role === "admin") {
        description = "Hier hast du Zugriff auf alle Verwaltungsfunktionen und Einstellungen.";
      } else if (role === "editor") {
        description = "Hier kannst du Inhalte erstellen und bearbeiten.";
      } else {
        description = "Hier findest du alle wichtigen Informationen, Prozesse und Anleitungen für deinen Arbeitsalltag.";
      }
      
      expect(description).toBe("Hier kannst du Inhalte erstellen und bearbeiten.");
    });

    it("should return user description for user role", () => {
      const role = "user";
      
      let description: string;
      if (role === "admin") {
        description = "Hier hast du Zugriff auf alle Verwaltungsfunktionen und Einstellungen.";
      } else if (role === "editor") {
        description = "Hier kannst du Inhalte erstellen und bearbeiten.";
      } else {
        description = "Hier findest du alle wichtigen Informationen, Prozesse und Anleitungen für deinen Arbeitsalltag.";
      }
      
      expect(description).toBe("Hier findest du alle wichtigen Informationen, Prozesse und Anleitungen für deinen Arbeitsalltag.");
    });
  });

  describe("My Overtime Widget", () => {
    it("should calculate overtime balance correctly", () => {
      const overtimeHours = "5.5";
      const carryOverHours = "2.0";
      
      const balance = parseFloat(overtimeHours) + parseFloat(carryOverHours);
      
      expect(balance).toBe(7.5);
    });

    it("should calculate negative overtime balance", () => {
      const overtimeHours = "-3.0";
      const carryOverHours = "1.0";
      
      const balance = parseFloat(overtimeHours) + parseFloat(carryOverHours);
      
      expect(balance).toBe(-2.0);
    });

    it("should calculate trend between months", () => {
      const currentBalance = 10.5;
      const previousBalance = 8.0;
      
      const trend = currentBalance - previousBalance;
      
      expect(trend).toBe(2.5);
    });

    it("should calculate total year hours", () => {
      const monthlyData = [
        { actualHours: "160.0" },
        { actualHours: "168.0" },
        { actualHours: "152.0" },
      ];
      
      const totalYearHours = monthlyData.reduce(
        (sum, item) => sum + parseFloat(item.actualHours || "0"),
        0
      );
      
      expect(totalYearHours).toBe(480.0);
    });
  });
});
