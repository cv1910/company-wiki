import { eq, desc, and, like, or, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  categories,
  articles,
  articleVersions,
  permissions,
  sops,
  sopCategories,
  chatHistory,
  activityLog,
  comments,
  notifications,
  InsertCategory,
  InsertArticle,
  InsertArticleVersion,
  InsertPermission,
  InsertSOP,
  InsertSOPCategory,
  InsertChatMessage,
  InsertActivityLogEntry,
  InsertComment,
  InsertNotification,
  articleFeedback,
  InsertArticleFeedback,
  articleTemplates,
  InsertArticleTemplate,
  media,
  InsertMedia,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USER FUNCTIONS ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "avatarUrl"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "editor" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ==================== CATEGORY FUNCTIONS ====================

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(categories).values(data);
  return result[0].insertId;
}

export async function updateCategory(id: number, data: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) return;
  await db.update(categories).set(data).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(categories).where(eq(categories.id, id));
}

export async function getCategoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return result[0];
}

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return result[0];
}

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(categories.sortOrder, categories.name);
}

// ==================== ARTICLE FUNCTIONS ====================

export async function createArticle(data: InsertArticle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(articles).values(data);
  return result[0].insertId;
}

export async function updateArticle(id: number, data: Partial<InsertArticle>) {
  const db = await getDb();
  if (!db) return;
  await db.update(articles).set(data).where(eq(articles.id, id));
}

export async function deleteArticle(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(articles).where(eq(articles.id, id));
}

export async function getArticleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  return result[0];
}

export async function getArticleBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
  return result[0];
}

export async function getArticlesByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(articles)
    .where(eq(articles.categoryId, categoryId))
    .orderBy(desc(articles.isPinned), desc(articles.updatedAt));
}

export async function getAllArticles(status?: "draft" | "published" | "archived") {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db
      .select()
      .from(articles)
      .where(eq(articles.status, status))
      .orderBy(desc(articles.isPinned), desc(articles.updatedAt));
  }
  return db.select().from(articles).orderBy(desc(articles.isPinned), desc(articles.updatedAt));
}

export async function getRecentArticles(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.updatedAt))
    .limit(limit);
}

export async function incrementArticleViewCount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(articles)
    .set({ viewCount: sql`${articles.viewCount} + 1` })
    .where(eq(articles.id, id));
}

export async function searchArticles(query: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  const searchTerm = `%${query}%`;
  return db
    .select()
    .from(articles)
    .where(
      and(
        eq(articles.status, "published"),
        or(like(articles.title, searchTerm), like(articles.content, searchTerm), like(articles.excerpt, searchTerm))
      )
    )
    .orderBy(desc(articles.updatedAt))
    .limit(limit);
}

// ==================== ARTICLE VERSION FUNCTIONS ====================

export async function createArticleVersion(data: InsertArticleVersion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(articleVersions).values(data);
  return result[0].insertId;
}

export async function getArticleVersions(articleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(articleVersions)
    .where(eq(articleVersions.articleId, articleId))
    .orderBy(desc(articleVersions.versionNumber));
}

export async function getArticleVersion(articleId: number, versionNumber: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(articleVersions)
    .where(and(eq(articleVersions.articleId, articleId), eq(articleVersions.versionNumber, versionNumber)))
    .limit(1);
  return result[0];
}

export async function getLatestVersionNumber(articleId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ maxVersion: sql<number>`MAX(${articleVersions.versionNumber})` })
    .from(articleVersions)
    .where(eq(articleVersions.articleId, articleId));
  return result[0]?.maxVersion || 0;
}

// ==================== PERMISSION FUNCTIONS ====================

export async function createPermission(data: InsertPermission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(permissions).values(data);
  return result[0].insertId;
}

export async function deletePermission(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(permissions).where(eq(permissions.id, id));
}

export async function getUserPermissions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(permissions).where(eq(permissions.userId, userId));
}

export async function getResourcePermissions(resourceType: "category" | "article", resourceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(permissions)
    .where(and(eq(permissions.resourceType, resourceType), eq(permissions.resourceId, resourceId)));
}

export async function checkUserPermission(
  userId: number,
  resourceType: "category" | "article",
  resourceId: number,
  requiredLevel: "read" | "edit" | "admin"
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const levelOrder = { read: 1, edit: 2, admin: 3 };
  const result = await db
    .select()
    .from(permissions)
    .where(
      and(eq(permissions.userId, userId), eq(permissions.resourceType, resourceType), eq(permissions.resourceId, resourceId))
    )
    .limit(1);

  if (result.length === 0) return false;
  return levelOrder[result[0].permissionLevel] >= levelOrder[requiredLevel];
}

// ==================== SOP FUNCTIONS ====================

export async function createSOP(data: InsertSOP) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sops).values(data);
  return result[0].insertId;
}

export async function updateSOP(id: number, data: Partial<InsertSOP>) {
  const db = await getDb();
  if (!db) return;
  await db.update(sops).set(data).where(eq(sops.id, id));
}

export async function deleteSOP(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(sops).where(eq(sops.id, id));
}

export async function getSOPById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sops).where(eq(sops.id, id)).limit(1);
  return result[0];
}

export async function getSOPBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sops).where(eq(sops.slug, slug)).limit(1);
  return result[0];
}

export async function getAllSOPs(status?: "draft" | "published" | "archived") {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(sops).where(eq(sops.status, status)).orderBy(sops.sortOrder, desc(sops.updatedAt));
  }
  return db.select().from(sops).orderBy(sops.sortOrder, desc(sops.updatedAt));
}

export async function getSOPsByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sops).where(eq(sops.categoryId, categoryId)).orderBy(sops.sortOrder);
}

export async function searchSOPs(query: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  const searchTerm = `%${query}%`;
  return db
    .select()
    .from(sops)
    .where(and(eq(sops.status, "published"), or(like(sops.title, searchTerm), like(sops.description, searchTerm))))
    .orderBy(desc(sops.updatedAt))
    .limit(limit);
}

// ==================== SOP CATEGORY FUNCTIONS ====================

export async function createSOPCategory(data: InsertSOPCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sopCategories).values(data);
  return result[0].insertId;
}

export async function updateSOPCategory(id: number, data: Partial<InsertSOPCategory>) {
  const db = await getDb();
  if (!db) return;
  await db.update(sopCategories).set(data).where(eq(sopCategories.id, id));
}

export async function deleteSOPCategory(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(sopCategories).where(eq(sopCategories.id, id));
}

export async function getAllSOPCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sopCategories).orderBy(sopCategories.sortOrder, sopCategories.name);
}

// ==================== CHAT HISTORY FUNCTIONS ====================

export async function saveChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(chatHistory).values(data);
  return result[0].insertId;
}

export async function getChatHistory(userId: number, sessionId: string, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatHistory)
    .where(and(eq(chatHistory.userId, userId), eq(chatHistory.sessionId, sessionId)))
    .orderBy(chatHistory.createdAt)
    .limit(limit);
}

export async function getUserChatSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .selectDistinct({ sessionId: chatHistory.sessionId })
    .from(chatHistory)
    .where(eq(chatHistory.userId, userId))
    .orderBy(desc(chatHistory.createdAt));
}

// ==================== ACTIVITY LOG FUNCTIONS ====================

export async function logActivity(data: InsertActivityLogEntry) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLog).values(data);
}

export async function getRecentActivity(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(limit);
}

export async function getUserActivity(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(activityLog)
    .where(eq(activityLog.userId, userId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

// ==================== COMMENT FUNCTIONS ====================

export async function createComment(data: InsertComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(comments).values(data);
  return result[0].insertId;
}

export async function updateComment(id: number, data: Partial<InsertComment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(comments).set(data).where(eq(comments.id, id));
}

export async function deleteComment(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(comments).where(eq(comments.id, id));
}

export async function getArticleComments(articleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(comments).where(eq(comments.articleId, articleId)).orderBy(comments.createdAt);
}

// ==================== NOTIFICATION FUNCTIONS ====================

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function getUserNotifications(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count || 0;
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// ==================== ARTICLE FEEDBACK FUNCTIONS ====================

export async function createArticleFeedback(data: InsertArticleFeedback) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(articleFeedback).values(data);
  return result[0].insertId;
}

export async function updateArticleFeedback(id: number, data: Partial<InsertArticleFeedback>) {
  const db = await getDb();
  if (!db) return;
  await db.update(articleFeedback).set(data).where(eq(articleFeedback.id, id));
}

export async function deleteArticleFeedback(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(articleFeedback).where(eq(articleFeedback.id, id));
}

export async function getArticleFeedbackById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(articleFeedback).where(eq(articleFeedback.id, id)).limit(1);
  return result[0];
}

export async function getArticleFeedback(articleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(articleFeedback)
    .where(eq(articleFeedback.articleId, articleId))
    .orderBy(desc(articleFeedback.createdAt));
}

export async function getUserFeedbackForArticle(articleId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(articleFeedback)
    .where(and(eq(articleFeedback.articleId, articleId), eq(articleFeedback.userId, userId)))
    .limit(1);
  return result[0];
}

export async function getAllFeedback(status?: "pending" | "reviewed" | "resolved" | "dismissed", limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db
      .select()
      .from(articleFeedback)
      .where(eq(articleFeedback.status, status))
      .orderBy(desc(articleFeedback.createdAt))
      .limit(limit);
  }
  return db.select().from(articleFeedback).orderBy(desc(articleFeedback.createdAt)).limit(limit);
}

export async function getFeedbackStats(articleId: number) {
  const db = await getDb();
  if (!db) return { helpful: 0, notHelpful: 0, needsImprovement: 0, total: 0 };
  
  const result = await db
    .select({
      rating: articleFeedback.rating,
      count: sql<number>`COUNT(*)`
    })
    .from(articleFeedback)
    .where(eq(articleFeedback.articleId, articleId))
    .groupBy(articleFeedback.rating);
  
  const stats = { helpful: 0, notHelpful: 0, needsImprovement: 0, total: 0 };
  result.forEach(r => {
    if (r.rating === "helpful") stats.helpful = r.count;
    else if (r.rating === "not_helpful") stats.notHelpful = r.count;
    else if (r.rating === "needs_improvement") stats.needsImprovement = r.count;
    stats.total += r.count;
  });
  return stats;
}

export async function getPendingFeedbackCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(articleFeedback)
    .where(eq(articleFeedback.status, "pending"));
  return result[0]?.count || 0;
}


// ==================== ARTICLE TEMPLATE FUNCTIONS ====================

export async function createTemplate(data: InsertArticleTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(articleTemplates).values(data);
  return result[0].insertId;
}

export async function updateTemplate(id: number, data: Partial<InsertArticleTemplate>) {
  const db = await getDb();
  if (!db) return;
  await db.update(articleTemplates).set(data).where(eq(articleTemplates.id, id));
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) return;
  // Don't allow deleting system templates
  await db.delete(articleTemplates).where(and(eq(articleTemplates.id, id), eq(articleTemplates.isSystem, false)));
}

export async function getTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(articleTemplates).where(eq(articleTemplates.id, id)).limit(1);
  return result[0];
}

export async function getTemplateBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(articleTemplates).where(eq(articleTemplates.slug, slug)).limit(1);
  return result[0];
}

export async function getAllTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(articleTemplates).orderBy(articleTemplates.sortOrder, articleTemplates.name);
}

export async function getSystemTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(articleTemplates)
    .where(eq(articleTemplates.isSystem, true))
    .orderBy(articleTemplates.sortOrder);
}

export async function getCustomTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(articleTemplates)
    .where(eq(articleTemplates.isSystem, false))
    .orderBy(articleTemplates.sortOrder, articleTemplates.name);
}

// ==================== MEDIA FUNCTIONS ====================

export async function createMedia(data: InsertMedia) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(media).values(data);
  return result[0].insertId;
}

export async function getMediaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(media).where(eq(media.id, id)).limit(1);
  return result[0];
}

export async function getMediaByFileKey(fileKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(media).where(eq(media.fileKey, fileKey)).limit(1);
  return result[0];
}

export async function getUserMedia(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(media)
    .where(eq(media.uploadedById, userId))
    .orderBy(desc(media.createdAt))
    .limit(limit);
}

export async function getAllMedia(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(media).orderBy(desc(media.createdAt)).limit(limit);
}

export async function deleteMedia(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(media).where(eq(media.id, id));
}
