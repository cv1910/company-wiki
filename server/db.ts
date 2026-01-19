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
  announcements,
  InsertAnnouncement,
  emailSettings,
  InsertEmailSetting,
  mentions,
  InsertMention,
  InsertMedia,
  auditLog,
  InsertAuditLogEntry,
  articleReviews,
  InsertArticleReview,
  favorites,
  InsertFavorite,
  recentlyViewed,
  InsertRecentlyViewed,
  userPreferences,
  InsertUserPreference,
  leaveRequests,
  InsertLeaveRequest,
  leaveBalances,
  InsertLeaveBalance,
  assignments,
  InsertAssignment,
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
  // Use subquery to get distinct sessions with their latest timestamp
  const sessions = await db
    .select({
      sessionId: chatHistory.sessionId,
      latestAt: sql<Date>`MAX(${chatHistory.createdAt})`.as('latestAt'),
    })
    .from(chatHistory)
    .where(eq(chatHistory.userId, userId))
    .groupBy(chatHistory.sessionId)
    .orderBy(sql`latestAt DESC`);
  return sessions;
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
  return db
    .select({
      id: comments.id,
      articleId: comments.articleId,
      userId: comments.userId,
      content: comments.content,
      parentId: comments.parentId,
      isResolved: comments.isResolved,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.articleId, articleId))
    .orderBy(comments.createdAt);
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
  if (!db) return null;
  const result = await db
    .select()
    .from(articleFeedback)
    .where(and(eq(articleFeedback.articleId, articleId), eq(articleFeedback.userId, userId)))
    .limit(1);
  return result[0] ?? null;
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


// ==================== AUDIT LOG FUNCTIONS ====================

export async function createAuditLogEntry(data: InsertAuditLogEntry) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLog).values(data);
  } catch (error) {
    console.error("[AuditLog] Failed to create entry:", error);
  }
}

export async function getAuditLog(options: {
  userId?: number;
  action?: string;
  resourceType?: string;
  resourceId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (options.userId) conditions.push(eq(auditLog.userId, options.userId));
  if (options.action) conditions.push(eq(auditLog.action, options.action));
  if (options.resourceType) conditions.push(eq(auditLog.resourceType, options.resourceType));
  if (options.resourceId) conditions.push(eq(auditLog.resourceId, options.resourceId));
  
  const query = db.select().from(auditLog);
  
  if (conditions.length > 0) {
    return query
      .where(and(...conditions))
      .orderBy(desc(auditLog.createdAt))
      .limit(options.limit || 100)
      .offset(options.offset || 0);
  }
  
  return query
    .orderBy(desc(auditLog.createdAt))
    .limit(options.limit || 100)
    .offset(options.offset || 0);
}

export async function getAuditLogCount(options: {
  userId?: number;
  action?: string;
  resourceType?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const conditions = [];
  if (options.userId) conditions.push(eq(auditLog.userId, options.userId));
  if (options.action) conditions.push(eq(auditLog.action, options.action));
  if (options.resourceType) conditions.push(eq(auditLog.resourceType, options.resourceType));
  
  const query = db.select({ count: sql<number>`COUNT(*)` }).from(auditLog);
  
  if (conditions.length > 0) {
    const result = await query.where(and(...conditions));
    return result[0]?.count || 0;
  }
  
  const result = await query;
  return result[0]?.count || 0;
}

export async function getDistinctAuditActions(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ action: auditLog.action }).from(auditLog);
  return result.map(r => r.action);
}

export async function getDistinctAuditResourceTypes(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ resourceType: auditLog.resourceType }).from(auditLog);
  return result.map(r => r.resourceType);
}

// ==================== ARTICLE REVIEW FUNCTIONS ====================

export async function createArticleReview(data: InsertArticleReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(articleReviews).values(data);
  return result[0].insertId;
}

export async function updateArticleReview(id: number, data: Partial<InsertArticleReview>) {
  const db = await getDb();
  if (!db) return;
  await db.update(articleReviews).set(data).where(eq(articleReviews.id, id));
}

export async function getArticleReviewById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(articleReviews).where(eq(articleReviews.id, id)).limit(1);
  return result[0];
}

export async function getArticleReviewsByArticle(articleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(articleReviews)
    .where(eq(articleReviews.articleId, articleId))
    .orderBy(desc(articleReviews.requestedAt));
}

export async function getLatestArticleReview(articleId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(articleReviews)
    .where(eq(articleReviews.articleId, articleId))
    .orderBy(desc(articleReviews.requestedAt))
    .limit(1);
  return result[0];
}

export async function getPendingReviews(reviewerId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (reviewerId) {
    return db
      .select()
      .from(articleReviews)
      .where(and(
        eq(articleReviews.status, "pending"),
        or(eq(articleReviews.reviewerId, reviewerId), sql`${articleReviews.reviewerId} IS NULL`)
      ))
      .orderBy(articleReviews.requestedAt);
  }
  
  return db
    .select()
    .from(articleReviews)
    .where(eq(articleReviews.status, "pending"))
    .orderBy(articleReviews.requestedAt);
}

export async function getPendingReviewCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(articleReviews)
    .where(eq(articleReviews.status, "pending"));
  return result[0]?.count || 0;
}

export async function getUserReviewRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(articleReviews)
    .where(eq(articleReviews.requestedById, userId))
    .orderBy(desc(articleReviews.requestedAt));
}


// ==================== FAVORITES ====================

export async function addFavorite(userId: number, articleId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Check if already favorited
  const existing = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.articleId, articleId)))
    .limit(1);
  
  if (existing.length > 0) return existing[0];
  
  const result = await db.insert(favorites).values({ userId, articleId });
  return { id: result[0].insertId, userId, articleId };
}

export async function removeFavorite(userId: number, articleId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(favorites).where(
    and(eq(favorites.userId, userId), eq(favorites.articleId, articleId))
  );
  return true;
}

export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: favorites.id,
      articleId: favorites.articleId,
      createdAt: favorites.createdAt,
      article: {
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
      },
    })
    .from(favorites)
    .leftJoin(articles, eq(favorites.articleId, articles.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
}

export async function isFavorite(userId: number, articleId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.articleId, articleId)))
    .limit(1);
  return result.length > 0;
}

// ==================== RECENTLY VIEWED ====================

export async function addRecentlyViewed(userId: number, articleId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Remove existing entry for this article
  await db.delete(recentlyViewed).where(
    and(eq(recentlyViewed.userId, userId), eq(recentlyViewed.articleId, articleId))
  );
  
  // Add new entry
  const result = await db.insert(recentlyViewed).values({ userId, articleId });
  
  // Keep only last 20 entries
  const allViewed = await db
    .select({ id: recentlyViewed.id })
    .from(recentlyViewed)
    .where(eq(recentlyViewed.userId, userId))
    .orderBy(desc(recentlyViewed.viewedAt));
  
  if (allViewed.length > 20) {
    const idsToDelete = allViewed.slice(20).map(v => v.id);
    await db.delete(recentlyViewed).where(inArray(recentlyViewed.id, idsToDelete));
  }
  
  return { id: result[0].insertId, userId, articleId };
}

export async function getRecentlyViewed(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: recentlyViewed.id,
      articleId: recentlyViewed.articleId,
      viewedAt: recentlyViewed.viewedAt,
      article: {
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
      },
    })
    .from(recentlyViewed)
    .leftJoin(articles, eq(recentlyViewed.articleId, articles.id))
    .where(eq(recentlyViewed.userId, userId))
    .orderBy(desc(recentlyViewed.viewedAt))
    .limit(limit);
}

// ==================== USER PREFERENCES ====================

export async function getUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return result[0] || null;
}

export async function upsertUserPreferences(userId: number, prefs: Partial<InsertUserPreference>) {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await getUserPreferences(userId);
  
  if (existing) {
    await db
      .update(userPreferences)
      .set(prefs)
      .where(eq(userPreferences.userId, userId));
    return { ...existing, ...prefs };
  } else {
    const result = await db.insert(userPreferences).values({ userId, ...prefs });
    return { id: result[0].insertId, userId, ...prefs };
  }
}

// ==================== LEAVE REQUESTS ====================

export async function createLeaveRequest(data: InsertLeaveRequest) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(leaveRequests).values(data);
  
  // Update pending days in balance
  const year = new Date(data.startDate).getFullYear();
  await updateLeaveBalance(data.userId, year, { pendingDays: data.totalDays });
  
  return { id: result[0].insertId, ...data };
}

export async function getLeaveRequest(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1);
  return result[0] || null;
}

export async function getUserLeaveRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.userId, userId))
    .orderBy(desc(leaveRequests.requestedAt));
}

export async function getPendingLeaveRequests() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      request: leaveRequests,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(leaveRequests)
    .leftJoin(users, eq(leaveRequests.userId, users.id))
    .where(eq(leaveRequests.status, "pending"))
    .orderBy(leaveRequests.requestedAt);
}

export async function getAllLeaveRequests(filters?: { status?: string; userId?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db
    .select({
      request: leaveRequests,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(leaveRequests)
    .leftJoin(users, eq(leaveRequests.userId, users.id));
  
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(leaveRequests.status, filters.status as any));
  }
  if (filters?.userId) {
    conditions.push(eq(leaveRequests.userId, filters.userId));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(leaveRequests.requestedAt));
}

export async function approveLeaveRequest(id: number, approverId: number, comment?: string) {
  const db = await getDb();
  if (!db) return null;
  
  const request = await getLeaveRequest(id);
  if (!request) return null;
  
  await db
    .update(leaveRequests)
    .set({
      status: "approved",
      approverId,
      approverComment: comment,
      reviewedAt: new Date(),
    })
    .where(eq(leaveRequests.id, id));
  
  // Update leave balance
  const year = new Date(request.startDate).getFullYear();
  const balance = await getLeaveBalance(request.userId, year);
  if (balance) {
    await updateLeaveBalance(request.userId, year, {
      usedDays: balance.usedDays + request.totalDays,
      pendingDays: Math.max(0, balance.pendingDays - request.totalDays),
    });
  }
  
  return { ...request, status: "approved", approverId, approverComment: comment };
}

export async function rejectLeaveRequest(id: number, approverId: number, comment?: string) {
  const db = await getDb();
  if (!db) return null;
  
  const request = await getLeaveRequest(id);
  if (!request) return null;
  
  await db
    .update(leaveRequests)
    .set({
      status: "rejected",
      approverId,
      approverComment: comment,
      reviewedAt: new Date(),
    })
    .where(eq(leaveRequests.id, id));
  
  // Update pending days
  const year = new Date(request.startDate).getFullYear();
  const balance = await getLeaveBalance(request.userId, year);
  if (balance) {
    await updateLeaveBalance(request.userId, year, {
      pendingDays: Math.max(0, balance.pendingDays - request.totalDays),
    });
  }
  
  return { ...request, status: "rejected", approverId, approverComment: comment };
}

export async function cancelLeaveRequest(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const request = await getLeaveRequest(id);
  if (!request || request.userId !== userId) return null;
  if (request.status !== "pending") return null;
  
  await db
    .update(leaveRequests)
    .set({ status: "cancelled" })
    .where(eq(leaveRequests.id, id));
  
  // Update pending days
  const year = new Date(request.startDate).getFullYear();
  const balance = await getLeaveBalance(request.userId, year);
  if (balance) {
    await updateLeaveBalance(request.userId, year, {
      pendingDays: Math.max(0, balance.pendingDays - request.totalDays),
    });
  }
  
  return { ...request, status: "cancelled" };
}

// ==================== LEAVE BALANCES ====================

export async function getLeaveBalance(userId: number, year: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(leaveBalances)
    .where(and(eq(leaveBalances.userId, userId), eq(leaveBalances.year, year)))
    .limit(1);
  
  if (result.length === 0) {
    // Create default balance
    const newBalance = await db.insert(leaveBalances).values({
      userId,
      year,
      totalDays: 30,
      usedDays: 0,
      pendingDays: 0,
      carryOverDays: 0,
    });
    return {
      id: newBalance[0].insertId,
      userId,
      year,
      totalDays: 30,
      usedDays: 0,
      pendingDays: 0,
      carryOverDays: 0,
    };
  }
  
  return result[0];
}

export async function updateLeaveBalance(userId: number, year: number, data: Partial<InsertLeaveBalance>) {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await getLeaveBalance(userId, year);
  if (!existing) return null;
  
  await db
    .update(leaveBalances)
    .set(data)
    .where(and(eq(leaveBalances.userId, userId), eq(leaveBalances.year, year)));
  
  return { ...existing, ...data };
}

export async function getTeamLeaveCalendar(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      request: leaveRequests,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(leaveRequests)
    .leftJoin(users, eq(leaveRequests.userId, users.id))
    .where(
      and(
        eq(leaveRequests.status, "approved"),
        sql`${leaveRequests.startDate} <= ${endDate}`,
        sql`${leaveRequests.endDate} >= ${startDate}`
      )
    )
    .orderBy(leaveRequests.startDate);
}


// ==================== EMAIL SETTINGS FUNCTIONS ====================

export async function getEmailSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(emailSettings).where(eq(emailSettings.userId, userId)).limit(1);
  return result[0];
}

export async function upsertEmailSettings(userId: number, settings: Partial<InsertEmailSetting>) {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getEmailSettings(userId);
  if (existing) {
    await db.update(emailSettings).set(settings).where(eq(emailSettings.userId, userId));
  } else {
    await db.insert(emailSettings).values({ userId, ...settings });
  }
}

// ==================== MENTIONS FUNCTIONS ====================

export async function createMention(data: InsertMention) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(mentions).values(data);
  return result[0].insertId;
}

export async function getUserMentions(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(mentions)
    .where(eq(mentions.mentionedUserId, userId))
    .orderBy(desc(mentions.createdAt))
    .limit(limit);
}

export async function getUnreadMentions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(mentions)
    .where(and(eq(mentions.mentionedUserId, userId), eq(mentions.isRead, false)))
    .orderBy(desc(mentions.createdAt));
}

export async function markMentionAsRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(mentions).set({ isRead: true }).where(eq(mentions.id, id));
}

export async function markAllMentionsAsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(mentions).set({ isRead: true }).where(eq(mentions.mentionedUserId, userId));
}

export async function getUnreadMentionCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(mentions)
    .where(and(eq(mentions.mentionedUserId, userId), eq(mentions.isRead, false)));
  return result[0]?.count || 0;
}

// ==================== USER SEARCH FOR MENTIONS ====================

export async function searchUsers(query: string, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
    .from(users)
    .where(or(
      like(users.name, `%${query}%`),
      like(users.email, `%${query}%`)
    ))
    .limit(limit);
}

// ==================== ANNOUNCEMENTS ====================

export async function createAnnouncement(data: InsertAnnouncement) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(announcements).values(data);
  return result[0]?.insertId;
}

export async function getActiveAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.isActive, true),
        or(
          sql`${announcements.startsAt} IS NULL`,
          sql`${announcements.startsAt} <= ${now}`
        ),
        or(
          sql`${announcements.expiresAt} IS NULL`,
          sql`${announcements.expiresAt} > ${now}`
        )
      )
    )
    .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
    .limit(5);
}

export async function getAllAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt));
}

export async function updateAnnouncement(id: number, data: Partial<InsertAnnouncement>) {
  const db = await getDb();
  if (!db) return;
  await db.update(announcements).set(data).where(eq(announcements.id, id));
}

export async function deleteAnnouncement(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(announcements).where(eq(announcements.id, id));
}


// ==================== ASSIGNMENTS ====================

export async function createAssignment(data: InsertAssignment) {
  const db = await getDb();
  if (!db) return null;
  
  // Check if assignment already exists
  const existing = await db
    .select()
    .from(assignments)
    .where(and(
      eq(assignments.userId, data.userId),
      eq(assignments.resourceType, data.resourceType),
      eq(assignments.resourceId, data.resourceId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  const result = await db.insert(assignments).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getAssignment(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
  return result[0] || null;
}

export async function getUserAssignments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(assignments)
    .where(eq(assignments.userId, userId))
    .orderBy(desc(assignments.assignedAt));
}

export async function updateAssignment(id: number, data: Partial<InsertAssignment>) {
  const db = await getDb();
  if (!db) return null;
  await db.update(assignments).set(data).where(eq(assignments.id, id));
  return getAssignment(id);
}

export async function deleteAssignment(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(assignments).where(eq(assignments.id, id));
  return true;
}

export async function getAssignmentsByResource(resourceType: "article" | "sop", resourceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      assignment: assignments,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(assignments)
    .leftJoin(users, eq(assignments.userId, users.id))
    .where(and(
      eq(assignments.resourceType, resourceType),
      eq(assignments.resourceId, resourceId)
    ))
    .orderBy(assignments.assignedAt);
}

export async function getAllAssignments(filters?: { status?: string; userId?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(assignments.status, filters.status as any));
  }
  if (filters?.userId) {
    conditions.push(eq(assignments.userId, filters.userId));
  }
  
  return db
    .select({
      assignment: assignments,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
      assignedBy: {
        id: sql<number>`assignedBy.id`,
        name: sql<string>`assignedBy.name`,
      },
    })
    .from(assignments)
    .leftJoin(users, eq(assignments.userId, users.id))
    .leftJoin(sql`users as assignedBy`, sql`${assignments.assignedById} = assignedBy.id`)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(assignments.assignedAt));
}

export async function markAssignmentStarted(id: number) {
  const db = await getDb();
  if (!db) return null;
  await db.update(assignments).set({
    status: "in_progress",
    startedAt: new Date(),
  }).where(eq(assignments.id, id));
  return getAssignment(id);
}

export async function markAssignmentCompleted(id: number) {
  const db = await getDb();
  if (!db) return null;
  await db.update(assignments).set({
    status: "completed",
    completedAt: new Date(),
  }).where(eq(assignments.id, id));
  return getAssignment(id);
}

export async function getAssignmentByUserAndResource(userId: number, resourceType: "article" | "sop", resourceId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(assignments)
    .where(and(
      eq(assignments.userId, userId),
      eq(assignments.resourceType, resourceType),
      eq(assignments.resourceId, resourceId)
    ))
    .limit(1);
  return result[0] || null;
}
