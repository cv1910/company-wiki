import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// Mock the db module
vi.mock("./db", () => ({
  getAllCategories: vi.fn(),
  getCategoryById: vi.fn(),
  getCategoryBySlug: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getAllArticles: vi.fn(),
  getArticleById: vi.fn(),
  getArticleBySlug: vi.fn(),
  getArticlesByCategory: vi.fn(),
  getRecentArticles: vi.fn(),
  createArticle: vi.fn(),
  updateArticle: vi.fn(),
  deleteArticle: vi.fn(),
  incrementArticleViewCount: vi.fn(),
  searchArticles: vi.fn(),
  createArticleVersion: vi.fn(),
  getLatestVersionNumber: vi.fn(),
  getArticleVersions: vi.fn(),
  getArticleVersion: vi.fn(),
  logActivity: vi.fn(),
  getAllSOPs: vi.fn(),
  getSOPById: vi.fn(),
  getSOPBySlug: vi.fn(),
  getSOPsByCategory: vi.fn(),
  createSOP: vi.fn(),
  updateSOP: vi.fn(),
  deleteSOP: vi.fn(),
  searchSOPs: vi.fn(),
  getAllSOPCategories: vi.fn(),
  createSOPCategory: vi.fn(),
  updateSOPCategory: vi.fn(),
  deleteSOPCategory: vi.fn(),
  getUserNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  getAllUsers: vi.fn(),
  getUserById: vi.fn(),
  updateUserRole: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(role: "user" | "editor" | "admin" = "user"): TrpcContext {
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

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("categories router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all categories for authenticated users", async () => {
    const mockCategories = [
      { id: 1, name: "Category 1", slug: "category-1" },
      { id: 2, name: "Category 2", slug: "category-2" },
    ];
    vi.mocked(db.getAllCategories).mockResolvedValue(mockCategories as any);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.categories.list();

    expect(result).toEqual(mockCategories);
    expect(db.getAllCategories).toHaveBeenCalledOnce();
  });

  it("creates a category for editors", async () => {
    vi.mocked(db.createCategory).mockResolvedValue(1);
    vi.mocked(db.logActivity).mockResolvedValue(undefined);

    const ctx = createUserContext("editor");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.categories.create({
      name: "New Category",
      description: "Test description",
    });

    expect(result.id).toBe(1);
    expect(result.slug).toContain("new-category");
    expect(db.createCategory).toHaveBeenCalledOnce();
    expect(db.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        resourceType: "category",
      })
    );
  });

  it("denies category creation for regular users", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.categories.create({ name: "New Category" })
    ).rejects.toThrow("Editor access required");
  });

  it("allows admins to delete categories", async () => {
    vi.mocked(db.getCategoryById).mockResolvedValue({ id: 1, name: "Test" } as any);
    vi.mocked(db.deleteCategory).mockResolvedValue(undefined);
    vi.mocked(db.logActivity).mockResolvedValue(undefined);

    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.categories.delete({ id: 1 });

    expect(result).toEqual({ success: true });
    expect(db.deleteCategory).toHaveBeenCalledWith(1);
  });

  it("denies category deletion for editors", async () => {
    const ctx = createUserContext("editor");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.categories.delete({ id: 1 })).rejects.toThrow(
      "Admin access required"
    );
  });
});

describe("articles router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all published articles", async () => {
    const mockArticles = [
      { id: 1, title: "Article 1", slug: "article-1", status: "published" },
      { id: 2, title: "Article 2", slug: "article-2", status: "published" },
    ];
    vi.mocked(db.getAllArticles).mockResolvedValue(mockArticles as any);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.articles.list({ status: "published" });

    expect(result).toEqual(mockArticles);
    expect(db.getAllArticles).toHaveBeenCalledWith("published");
  });

  it("gets article by slug and increments view count", async () => {
    const mockArticle = { id: 1, title: "Test Article", slug: "test-article" };
    vi.mocked(db.getArticleBySlug).mockResolvedValue(mockArticle as any);
    vi.mocked(db.incrementArticleViewCount).mockResolvedValue(undefined);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.articles.getBySlug({ slug: "test-article" });

    expect(result).toEqual(mockArticle);
    expect(db.incrementArticleViewCount).toHaveBeenCalledWith(1);
  });

  it("creates an article with initial version", async () => {
    vi.mocked(db.createArticle).mockResolvedValue(1);
    vi.mocked(db.createArticleVersion).mockResolvedValue(1);
    vi.mocked(db.logActivity).mockResolvedValue(undefined);

    const ctx = createUserContext("editor");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.articles.create({
      title: "New Article",
      content: "Test content",
      status: "draft",
    });

    expect(result.id).toBe(1);
    expect(result.slug).toContain("new-article");
    expect(db.createArticle).toHaveBeenCalledOnce();
    expect(db.createArticleVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        articleId: 1,
        versionNumber: 1,
        changeDescription: "Initial version",
      })
    );
  });

  it("updates an article and creates new version", async () => {
    const mockArticle = {
      id: 1,
      title: "Old Title",
      content: "Old content",
      status: "draft",
    };
    vi.mocked(db.getArticleById).mockResolvedValue(mockArticle as any);
    vi.mocked(db.updateArticle).mockResolvedValue(undefined);
    vi.mocked(db.getLatestVersionNumber).mockResolvedValue(1);
    vi.mocked(db.createArticleVersion).mockResolvedValue(2);
    vi.mocked(db.logActivity).mockResolvedValue(undefined);

    const ctx = createUserContext("editor");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.articles.update({
      id: 1,
      title: "New Title",
      content: "New content",
      changeDescription: "Updated title and content",
    });

    expect(result).toEqual({ success: true });
    expect(db.updateArticle).toHaveBeenCalledOnce();
    expect(db.createArticleVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        articleId: 1,
        versionNumber: 2,
        changeDescription: "Updated title and content",
      })
    );
  });

  it("searches articles", async () => {
    const mockResults = [
      { id: 1, title: "Search Result 1", slug: "result-1" },
    ];
    vi.mocked(db.searchArticles).mockResolvedValue(mockResults as any);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.articles.search({ query: "test", limit: 10 });

    expect(result).toEqual(mockResults);
    expect(db.searchArticles).toHaveBeenCalledWith("test", 10);
  });
});

describe("sops router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all published SOPs", async () => {
    const mockSOPs = [
      { id: 1, title: "SOP 1", slug: "sop-1", status: "published" },
    ];
    vi.mocked(db.getAllSOPs).mockResolvedValue(mockSOPs as any);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sops.list({ status: "published" });

    expect(result).toEqual(mockSOPs);
    expect(db.getAllSOPs).toHaveBeenCalledWith("published");
  });

  it("creates a SOP with Scribe URL", async () => {
    vi.mocked(db.createSOP).mockResolvedValue(1);
    vi.mocked(db.logActivity).mockResolvedValue(undefined);

    const ctx = createUserContext("editor");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sops.create({
      title: "New SOP",
      description: "Test SOP",
      scribeUrl: "https://scribehow.com/shared/test",
      status: "published",
    });

    expect(result.id).toBe(1);
    expect(result.slug).toContain("new-sop");
    expect(db.createSOP).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New SOP",
        scribeUrl: "https://scribehow.com/shared/test",
      })
    );
  });
});

describe("users router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all users for admins", async () => {
    const mockUsers = [
      { id: 1, name: "User 1", role: "user" },
      { id: 2, name: "User 2", role: "editor" },
    ];
    vi.mocked(db.getAllUsers).mockResolvedValue(mockUsers as any);

    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.list();

    expect(result).toEqual(mockUsers);
    expect(db.getAllUsers).toHaveBeenCalledOnce();
  });

  it("denies user list for non-admins", async () => {
    const ctx = createUserContext("editor");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.users.list()).rejects.toThrow("Admin access required");
  });

  it("updates user role", async () => {
    vi.mocked(db.updateUserRole).mockResolvedValue(undefined);

    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.updateRole({
      userId: 2,
      role: "editor",
    });

    expect(result).toEqual({ success: true });
    expect(db.updateUserRole).toHaveBeenCalledWith(2, "editor");
  });
});

describe("notifications router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets unread notification count", async () => {
    vi.mocked(db.getUnreadNotificationCount).mockResolvedValue(5);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.unreadCount();

    expect(result).toBe(5);
    expect(db.getUnreadNotificationCount).toHaveBeenCalledWith(1);
  });

  it("marks notification as read", async () => {
    vi.mocked(db.markNotificationAsRead).mockResolvedValue(undefined);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.markAsRead({ id: 1 });

    expect(result).toEqual({ success: true });
    expect(db.markNotificationAsRead).toHaveBeenCalledWith(1);
  });

  it("marks all notifications as read", async () => {
    vi.mocked(db.markAllNotificationsAsRead).mockResolvedValue(undefined);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.markAllAsRead();

    expect(result).toEqual({ success: true });
    expect(db.markAllNotificationsAsRead).toHaveBeenCalledWith(1);
  });
});

describe("dashboard router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns dashboard stats", async () => {
    vi.mocked(db.getAllArticles).mockResolvedValue([{ id: 1 }, { id: 2 }] as any);
    vi.mocked(db.getAllSOPs).mockResolvedValue([{ id: 1 }] as any);
    vi.mocked(db.getAllCategories).mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }] as any);
    vi.mocked(db.getAllSOPCategories).mockResolvedValue([{ id: 1 }] as any);
    vi.mocked(db.getAllUsers).mockResolvedValue([{ id: 1 }, { id: 2 }] as any);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.stats();

    expect(result).toEqual({
      articleCount: 2,
      sopCount: 1,
      categoryCount: 3,
      sopCategoryCount: 1,
      userCount: 2,
    });
  });
});
