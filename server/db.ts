import { eq, desc, and, like, or, sql, inArray, lte, gte } from "drizzle-orm";
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
  ohweeeReactions,
  InsertOhweeeReaction,
  ohweeeReadReceipts,
  InsertOhweeeReadReceipt,
  pushSubscriptions,
  InsertPushSubscription,
  // Teams and Ohweees
  teams,
  InsertTeam,
  teamMembers,
  InsertTeamMember,
  chatRooms,
  InsertChatRoom,
  chatRoomParticipants,
  InsertChatRoomParticipant,
  ohweees,
  InsertOhweee,
  InsertLeaveBalance,
  assignments,
  InsertAssignment,
  systemSettings,
  pageViews,
  InsertPageView,
  searchQueries,
  InsertSearchQuery,
  contentVerification,
  InsertContentVerification,
  userDashboardSettings,
  InsertUserDashboardSetting,
  calendarEvents,
  InsertCalendarEvent,
  googleCalendarConnections,
  InsertGoogleCalendarConnection,
  calendarEventSyncMap,
  InsertCalendarEventSyncMap,
  schedules,
  InsertSchedule,
  scheduleAvailability,
  InsertScheduleAvailability,
  ohweeeUnreadMarkers,
  InsertOhweeeUnreadMarker,
  ohweeeTypingIndicators,
  InsertOhweeeTypingIndicator,
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


// Get recent published articles for AI context
export async function getPublishedArticles(limit: number = 5) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.updatedAt))
    .limit(limit);
}

// Get recent published SOPs for AI context
export async function getPublishedSOPs(limit: number = 3) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(sops)
    .where(eq(sops.status, "published"))
    .orderBy(desc(sops.updatedAt))
    .limit(limit);
}


// Get all users with their leave balances for a given year
export async function getAllLeaveBalances(year: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all users
  const allUsers = await db.select().from(users);
  
  // Get or create balances for each user
  const balances = await Promise.all(
    allUsers.map(async (user) => {
      const balance = await getLeaveBalance(user.id, year);
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
        balance: balance || {
          totalDays: 30,
          usedDays: 0,
          remainingDays: 30,
          year,
        },
      };
    })
  );
  
  return balances;
}


// Carry over remaining leave days to the next year
export async function carryOverLeaveBalances(
  fromYear: number,
  maxCarryOverDays: number = 10
): Promise<{ userId: number; carriedOver: number }[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get all balances for the source year
  const balances = await db
    .select()
    .from(leaveBalances)
    .where(eq(leaveBalances.year, fromYear));
  
  const results: { userId: number; carriedOver: number }[] = [];
  const toYear = fromYear + 1;
  
  for (const balance of balances) {
    const remainingDays = balance.totalDays - balance.usedDays;
    const daysToCarryOver = Math.min(Math.max(0, remainingDays), maxCarryOverDays);
    
    if (daysToCarryOver > 0) {
      // Check if next year balance exists
      const existingNextYear = await db
        .select()
        .from(leaveBalances)
        .where(and(
          eq(leaveBalances.userId, balance.userId),
          eq(leaveBalances.year, toYear)
        ))
        .limit(1);
      
      if (existingNextYear.length > 0) {
        // Update existing balance with carry over
        await db
          .update(leaveBalances)
          .set({
            carryOverDays: daysToCarryOver,
            totalDays: existingNextYear[0].totalDays + daysToCarryOver,
          })
          .where(and(
            eq(leaveBalances.userId, balance.userId),
            eq(leaveBalances.year, toYear)
          ));
      } else {
        // Create new balance for next year with carry over
        await db.insert(leaveBalances).values({
          userId: balance.userId,
          year: toYear,
          totalDays: 30 + daysToCarryOver, // Default 30 + carry over
          usedDays: 0,
          pendingDays: 0,
          carryOverDays: daysToCarryOver,
        });
      }
      
      results.push({
        userId: balance.userId,
        carriedOver: daysToCarryOver,
      });
    }
  }
  
  return results;
}

// Get system settings for leave carry over
export async function getLeaveCarryOverSettings(): Promise<{
  maxCarryOverDays: number;
  autoCarryOver: boolean;
}> {
  const db = await getDb();
  if (!db) {
    return { maxCarryOverDays: 10, autoCarryOver: false };
  }
  
  const result = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, "leave_carry_over"))
    .limit(1);
  
  if (result.length > 0 && result[0].value) {
    try {
      const settings = JSON.parse(result[0].value);
      return {
        maxCarryOverDays: settings.maxCarryOverDays ?? 10,
        autoCarryOver: settings.autoCarryOver ?? false,
      };
    } catch {
      return { maxCarryOverDays: 10, autoCarryOver: false };
    }
  }
  
  return { maxCarryOverDays: 10, autoCarryOver: false };
}

// Update system settings for leave carry over
export async function updateLeaveCarryOverSettings(settings: {
  maxCarryOverDays: number;
  autoCarryOver: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const value = JSON.stringify(settings);
  
  // Check if setting exists
  const existing = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, "leave_carry_over"))
    .limit(1);
  
  if (existing.length > 0) {
    await db
      .update(systemSettings)
      .set({ value })
      .where(eq(systemSettings.key, "leave_carry_over"));
  } else {
    await db.insert(systemSettings).values({
      key: "leave_carry_over",
      value,
    });
  }
}


// ==================== ANALYTICS FUNCTIONS ====================

export async function trackPageView(data: InsertPageView) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(pageViews).values(data);
  return result[0].insertId;
}

export async function trackSearchQuery(data: InsertSearchQuery) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(searchQueries).values(data);
  return result[0].insertId;
}

export async function getAnalyticsSummary(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;
  
  const conditions = [];
  if (startDate) {
    conditions.push(sql`${pageViews.viewedAt} >= ${startDate}`);
  }
  if (endDate) {
    conditions.push(sql`${pageViews.viewedAt} <= ${endDate}`);
  }
  
  // Total page views
  const totalViewsResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(pageViews)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  // Unique visitors
  const uniqueVisitorsResult = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${pageViews.userId})` })
    .from(pageViews)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  // Total searches
  const searchConditions = [];
  if (startDate) {
    searchConditions.push(sql`${searchQueries.searchedAt} >= ${startDate}`);
  }
  if (endDate) {
    searchConditions.push(sql`${searchQueries.searchedAt} <= ${endDate}`);
  }
  
  const totalSearchesResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(searchQueries)
    .where(searchConditions.length > 0 ? and(...searchConditions) : undefined);
  
  return {
    totalPageViews: totalViewsResult[0]?.count || 0,
    uniqueVisitors: uniqueVisitorsResult[0]?.count || 0,
    totalSearches: totalSearchesResult[0]?.count || 0,
  };
}

export async function getPopularArticles(limit: number = 10, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(pageViews.resourceType, "article")];
  if (startDate) {
    conditions.push(sql`${pageViews.viewedAt} >= ${startDate}`);
  }
  if (endDate) {
    conditions.push(sql`${pageViews.viewedAt} <= ${endDate}`);
  }
  
  return db
    .select({
      resourceId: pageViews.resourceId,
      resourceSlug: pageViews.resourceSlug,
      resourceTitle: pageViews.resourceTitle,
      viewCount: sql<number>`COUNT(*)`,
      uniqueViewers: sql<number>`COUNT(DISTINCT ${pageViews.userId})`,
    })
    .from(pageViews)
    .where(and(...conditions))
    .groupBy(pageViews.resourceId, pageViews.resourceSlug, pageViews.resourceTitle)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(limit);
}

export async function getPopularSOPs(limit: number = 10, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(pageViews.resourceType, "sop")];
  if (startDate) {
    conditions.push(sql`${pageViews.viewedAt} >= ${startDate}`);
  }
  if (endDate) {
    conditions.push(sql`${pageViews.viewedAt} <= ${endDate}`);
  }
  
  return db
    .select({
      resourceId: pageViews.resourceId,
      resourceSlug: pageViews.resourceSlug,
      resourceTitle: pageViews.resourceTitle,
      viewCount: sql<number>`COUNT(*)`,
      uniqueViewers: sql<number>`COUNT(DISTINCT ${pageViews.userId})`,
    })
    .from(pageViews)
    .where(and(...conditions))
    .groupBy(pageViews.resourceId, pageViews.resourceSlug, pageViews.resourceTitle)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(limit);
}

export async function getTopSearchQueries(limit: number = 20, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (startDate) {
    conditions.push(sql`${searchQueries.searchedAt} >= ${startDate}`);
  }
  if (endDate) {
    conditions.push(sql`${searchQueries.searchedAt} <= ${endDate}`);
  }
  
  return db
    .select({
      query: searchQueries.query,
      searchCount: sql<number>`COUNT(*)`,
      avgResults: sql<number>`AVG(${searchQueries.resultsCount})`,
      clickRate: sql<number>`SUM(CASE WHEN ${searchQueries.clickedResourceId} IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*) * 100`,
    })
    .from(searchQueries)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(searchQueries.query)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(limit);
}

export async function getViewsOverTime(days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return db
    .select({
      date: sql<string>`DATE(${pageViews.viewedAt})`,
      views: sql<number>`COUNT(*)`,
      uniqueUsers: sql<number>`COUNT(DISTINCT ${pageViews.userId})`,
    })
    .from(pageViews)
    .where(sql`${pageViews.viewedAt} >= ${startDate}`)
    .groupBy(sql`DATE(${pageViews.viewedAt})`)
    .orderBy(sql`DATE(${pageViews.viewedAt})`);
}

export async function getAnalyticsUserActivity(limit: number = 20, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (startDate) {
    conditions.push(sql`${pageViews.viewedAt} >= ${startDate}`);
  }
  if (endDate) {
    conditions.push(sql`${pageViews.viewedAt} <= ${endDate}`);
  }
  
  return db
    .select({
      userId: pageViews.userId,
      userName: users.name,
      userEmail: users.email,
      pageViews: sql<number>`COUNT(*)`,
      lastActive: sql<Date>`MAX(${pageViews.viewedAt})`,
    })
    .from(pageViews)
    .leftJoin(users, eq(pageViews.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(pageViews.userId, users.name, users.email)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(limit);
}

// ==================== CONTENT VERIFICATION FUNCTIONS ====================

export async function getContentVerification(articleId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(contentVerification)
    .where(eq(contentVerification.articleId, articleId))
    .limit(1);
  return result[0] || null;
}

export async function upsertContentVerification(articleId: number, data: Partial<InsertContentVerification>) {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await getContentVerification(articleId);
  
  if (existing) {
    await db
      .update(contentVerification)
      .set(data)
      .where(eq(contentVerification.articleId, articleId));
    return { ...existing, ...data };
  } else {
    const result = await db.insert(contentVerification).values({
      articleId,
      ...data,
    });
    return { id: result[0].insertId, articleId, ...data };
  }
}

export async function verifyArticle(articleId: number, userId: number, expiresAt?: Date, notes?: string) {
  return upsertContentVerification(articleId, {
    isVerified: true,
    verifiedById: userId,
    verifiedAt: new Date(),
    expiresAt,
    notes,
  });
}

export async function unverifyArticle(articleId: number) {
  return upsertContentVerification(articleId, {
    isVerified: false,
    verifiedById: null,
    verifiedAt: null,
    expiresAt: null,
  });
}

export async function getExpiredVerifications() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  
  return db
    .select({
      verification: contentVerification,
      article: {
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
      },
    })
    .from(contentVerification)
    .leftJoin(articles, eq(contentVerification.articleId, articles.id))
    .where(and(
      eq(contentVerification.isVerified, true),
      sql`${contentVerification.expiresAt} IS NOT NULL`,
      sql`${contentVerification.expiresAt} <= ${now}`
    ))
    .orderBy(contentVerification.expiresAt);
}

export async function getVerificationOverview() {
  const db = await getDb();
  if (!db) return { verified: 0, unverified: 0, expired: 0, expiringSoon: 0 };
  
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  // Get all published articles
  const allArticles = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(articles)
    .where(eq(articles.status, "published"));
  
  // Get verified articles
  const verifiedResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(contentVerification)
    .where(eq(contentVerification.isVerified, true));
  
  // Get expired verifications
  const expiredResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(contentVerification)
    .where(and(
      eq(contentVerification.isVerified, true),
      sql`${contentVerification.expiresAt} IS NOT NULL`,
      sql`${contentVerification.expiresAt} <= ${now}`
    ));
  
  // Get expiring soon (within 7 days)
  const expiringSoonResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(contentVerification)
    .where(and(
      eq(contentVerification.isVerified, true),
      sql`${contentVerification.expiresAt} IS NOT NULL`,
      sql`${contentVerification.expiresAt} > ${now}`,
      sql`${contentVerification.expiresAt} <= ${sevenDaysFromNow}`
    ));
  
  const totalArticles = allArticles[0]?.count || 0;
  const verified = verifiedResult[0]?.count || 0;
  
  return {
    verified,
    unverified: totalArticles - verified,
    expired: expiredResult[0]?.count || 0,
    expiringSoon: expiringSoonResult[0]?.count || 0,
  };
}

export async function getArticlesWithVerificationStatus(filters?: { 
  isVerified?: boolean; 
  isExpired?: boolean;
  expiringSoon?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const result = await db
    .select({
      article: {
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        status: articles.status,
        updatedAt: articles.updatedAt,
      },
      verification: contentVerification,
      verifiedBy: {
        id: users.id,
        name: users.name,
      },
    })
    .from(articles)
    .leftJoin(contentVerification, eq(articles.id, contentVerification.articleId))
    .leftJoin(users, eq(contentVerification.verifiedById, users.id))
    .where(eq(articles.status, "published"))
    .orderBy(articles.title);
  
  // Apply filters in memory for complex conditions
  return result.filter(row => {
    if (filters?.isVerified !== undefined) {
      if (filters.isVerified && !row.verification?.isVerified) return false;
      if (!filters.isVerified && row.verification?.isVerified) return false;
    }
    if (filters?.isExpired) {
      if (!row.verification?.expiresAt) return false;
      if (new Date(row.verification.expiresAt) > now) return false;
    }
    if (filters?.expiringSoon) {
      if (!row.verification?.expiresAt) return false;
      const expiresAt = new Date(row.verification.expiresAt);
      if (expiresAt <= now || expiresAt > sevenDaysFromNow) return false;
    }
    return true;
  });
}


// ==================== USER DASHBOARD SETTINGS FUNCTIONS ====================

const DEFAULT_WIDGET_ORDER = [
  "welcomeHero",
  "announcements",
  "navigation",
  "stats",
  "recentArticles",
  "activityFeed",
  "favorites",
  "onboardingProgress"
];

export async function getUserDashboardSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(userDashboardSettings)
    .where(eq(userDashboardSettings.userId, userId))
    .limit(1);
  
  if (result[0]) {
    return result[0];
  }
  
  // Return default settings if none exist
  return {
    id: 0,
    userId,
    showWelcomeHero: true,
    showAnnouncements: true,
    showNavigation: true,
    showStats: true,
    showRecentArticles: true,
    showActivityFeed: true,
    showFavorites: true,
    showOnboardingProgress: true,
    widgetOrder: DEFAULT_WIDGET_ORDER,
    widgetSizes: {} as Record<string, "small" | "medium" | "large">,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function upsertUserDashboardSettings(userId: number, settings: Partial<InsertUserDashboardSetting>) {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await db
    .select()
    .from(userDashboardSettings)
    .where(eq(userDashboardSettings.userId, userId))
    .limit(1);
  
  if (existing[0]) {
    await db
      .update(userDashboardSettings)
      .set(settings)
      .where(eq(userDashboardSettings.userId, userId));
    return { ...existing[0], ...settings };
  } else {
    const result = await db.insert(userDashboardSettings).values({
      userId,
      ...settings,
    });
    return { id: result[0].insertId, userId, ...settings };
  }
}

export async function updateWidgetVisibility(userId: number, widgetId: string, visible: boolean) {
  const db = await getDb();
  if (!db) return null;
  
  const fieldMap: Record<string, keyof typeof userDashboardSettings.$inferSelect> = {
    welcomeHero: "showWelcomeHero",
    announcements: "showAnnouncements",
    navigation: "showNavigation",
    stats: "showStats",
    recentArticles: "showRecentArticles",
    activityFeed: "showActivityFeed",
    favorites: "showFavorites",
    onboardingProgress: "showOnboardingProgress",
  };
  
  const field = fieldMap[widgetId];
  if (!field) return null;
  
  return upsertUserDashboardSettings(userId, { [field]: visible });
}

export async function updateWidgetOrder(userId: number, widgetOrder: string[]) {
  return upsertUserDashboardSettings(userId, { widgetOrder });
}

export async function resetDashboardSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  await db
    .delete(userDashboardSettings)
    .where(eq(userDashboardSettings.userId, userId));
  
  return getUserDashboardSettings(userId);
}

export async function updateWidgetSize(userId: number, widgetId: string, size: "small" | "medium" | "large") {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await db
    .select()
    .from(userDashboardSettings)
    .where(eq(userDashboardSettings.userId, userId))
    .limit(1);
  
  const currentSizes = (existing[0]?.widgetSizes as Record<string, "small" | "medium" | "large"> | null) || {};
  const newSizes: Record<string, "small" | "medium" | "large"> = { ...currentSizes, [widgetId]: size };
  
  return upsertUserDashboardSettings(userId, { widgetSizes: newSizes });
}


// ==================== CALENDAR FUNCTIONS ====================

export async function createCalendarEvent(event: InsertCalendarEvent) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(calendarEvents).values(event);
  const insertId = result[0].insertId;
  
  const created = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, insertId))
    .limit(1);
  
  return created[0] || null;
}

export async function updateCalendarEvent(
  eventId: number,
  userId: number,
  updates: Partial<InsertCalendarEvent>
) {
  const db = await getDb();
  if (!db) return null;
  
  await db
    .update(calendarEvents)
    .set(updates)
    .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)));
  
  const updated = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, eventId))
    .limit(1);
  
  return updated[0] || null;
}

export async function deleteCalendarEvent(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  
  await db
    .delete(calendarEvents)
    .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)));
  
  return true;
}

export async function getCalendarEvent(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)))
    .limit(1);
  
  return result[0] || null;
}

export async function getCalendarEventsByDateRange(
  userId: number,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];
  
  // Get events that overlap with the date range
  // An event overlaps if: event.startDate <= endDate AND event.endDate >= startDate
  const result = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, userId),
        lte(calendarEvents.startDate, endDate),
        gte(calendarEvents.endDate, startDate)
      )
    )
    .orderBy(calendarEvents.startDate);
  
  return result;
}

export async function getCalendarEventsForMonth(userId: number, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month
  
  return getCalendarEventsByDateRange(userId, startDate, endDate);
}

export async function getCalendarEventsForWeek(userId: number, weekStart: Date) {
  const startDate = new Date(weekStart);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  return getCalendarEventsByDateRange(userId, startDate, endDate);
}

export async function getCalendarEventsForDay(userId: number, date: Date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  return getCalendarEventsByDateRange(userId, startDate, endDate);
}

export async function getCalendarEventsForYear(userId: number, year: number) {
  const startDate = new Date(year, 0, 1, 0, 0, 0);
  const endDate = new Date(year, 11, 31, 23, 59, 59);
  
  return getCalendarEventsByDateRange(userId, startDate, endDate);
}

// Get approved leave requests as calendar events for a user
export async function getApprovedLeavesAsCalendarEvents(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const leaves = await db
    .select({
      id: leaveRequests.id,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      leaveType: leaveRequests.leaveType,
      reason: leaveRequests.reason,
      userId: leaveRequests.userId,
    })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.userId, userId),
        eq(leaveRequests.status, "approved"),
        lte(leaveRequests.startDate, endDate),
        gte(leaveRequests.endDate, startDate)
      )
    )
    .orderBy(leaveRequests.startDate);
  
  // Convert leave requests to calendar event format
  return leaves.map((leave) => ({
    id: -leave.id, // Negative ID to distinguish from regular events
    userId: leave.userId,
    title: leave.leaveType === "vacation" ? "Urlaub" : 
           leave.leaveType === "sick" ? "Krankheit" :
           leave.leaveType === "personal" ? "Persönlich" : "Sonstiges",
    description: leave.reason,
    startDate: leave.startDate,
    endDate: leave.endDate,
    isAllDay: true,
    color: "green",
    eventType: "vacation" as const,
    linkedResourceType: "leave_request" as const,
    linkedResourceId: leave.id,
    isRecurring: false,
    recurrenceRule: null,
    location: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

// Get all team leaves (for admin/manager view)
export async function getTeamLeavesAsCalendarEvents(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const leaves = await db
    .select({
      id: leaveRequests.id,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      leaveType: leaveRequests.leaveType,
      reason: leaveRequests.reason,
      userId: leaveRequests.userId,
      userName: users.name,
    })
    .from(leaveRequests)
    .leftJoin(users, eq(leaveRequests.userId, users.id))
    .where(
      and(
        eq(leaveRequests.status, "approved"),
        lte(leaveRequests.startDate, endDate),
        gte(leaveRequests.endDate, startDate)
      )
    )
    .orderBy(leaveRequests.startDate);
  
  return leaves.map((leave) => ({
    id: -leave.id,
    userId: leave.userId,
    title: `${leave.userName || "Mitarbeiter"} - ${
      leave.leaveType === "vacation" ? "Urlaub" : 
      leave.leaveType === "sick" ? "Krankheit" :
      leave.leaveType === "personal" ? "Persönlich" : "Sonstiges"
    }`,
    description: leave.reason,
    startDate: leave.startDate,
    endDate: leave.endDate,
    isAllDay: true,
    color: "green",
    eventType: "vacation" as const,
    linkedResourceType: "leave_request" as const,
    linkedResourceId: leave.id,
    isRecurring: false,
    recurrenceRule: null,
    location: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}


// ==================== Google Calendar Connection Functions ====================

// Get Google Calendar connection for a user
export async function getGoogleCalendarConnection(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [connection] = await db
    .select()
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId))
    .limit(1);
  
  return connection || null;
}

// Create or update Google Calendar connection
export async function upsertGoogleCalendarConnection(
  data: InsertGoogleCalendarConnection
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getGoogleCalendarConnection(data.userId);
  
  if (existing) {
    await db
      .update(googleCalendarConnections)
      .set({
        googleEmail: data.googleEmail,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        calendarId: data.calendarId,
        syncEnabled: data.syncEnabled,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarConnections.userId, data.userId));
    
    return { ...existing, ...data };
  } else {
    const [result] = await db
      .insert(googleCalendarConnections)
      .values(data);
    
    return { id: result.insertId, ...data };
  }
}

// Update Google Calendar tokens
export async function updateGoogleCalendarTokens(
  userId: number,
  accessToken: string,
  refreshToken: string,
  tokenExpiresAt: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(googleCalendarConnections)
    .set({
      accessToken,
      refreshToken,
      tokenExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(googleCalendarConnections.userId, userId));
}

// Update sync status
export async function updateGoogleCalendarSyncStatus(
  userId: number,
  status: "success" | "error" | "pending",
  error?: string,
  syncToken?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(googleCalendarConnections)
    .set({
      lastSyncAt: new Date(),
      lastSyncStatus: status,
      lastSyncError: error || null,
      syncToken: syncToken,
      updatedAt: new Date(),
    })
    .where(eq(googleCalendarConnections.userId, userId));
}

// Delete Google Calendar connection
export async function deleteGoogleCalendarConnection(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete sync mappings first
  await db
    .delete(calendarEventSyncMap)
    .where(eq(calendarEventSyncMap.userId, userId));
  
  // Delete connection
  await db
    .delete(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId));
  
  return { success: true };
}

// ==================== Calendar Event Sync Map Functions ====================

// Get sync mapping by local event ID
export async function getSyncMapByLocalEventId(userId: number, localEventId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [mapping] = await db
    .select()
    .from(calendarEventSyncMap)
    .where(
      and(
        eq(calendarEventSyncMap.userId, userId),
        eq(calendarEventSyncMap.localEventId, localEventId)
      )
    )
    .limit(1);
  
  return mapping || null;
}

// Get sync mapping by Google event ID
export async function getSyncMapByGoogleEventId(userId: number, googleEventId: string) {
  const db = await getDb();
  if (!db) return null;
  
  const [mapping] = await db
    .select()
    .from(calendarEventSyncMap)
    .where(
      and(
        eq(calendarEventSyncMap.userId, userId),
        eq(calendarEventSyncMap.googleEventId, googleEventId)
      )
    )
    .limit(1);
  
  return mapping || null;
}

// Create sync mapping
export async function createSyncMapping(data: InsertCalendarEventSyncMap) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db
    .insert(calendarEventSyncMap)
    .values(data);
  
  return { id: result.insertId, ...data };
}

// Update sync mapping
export async function updateSyncMapping(
  id: number,
  data: Partial<InsertCalendarEventSyncMap>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(calendarEventSyncMap)
    .set({
      ...data,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(calendarEventSyncMap.id, id));
}

// Delete sync mapping
export async function deleteSyncMapping(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(calendarEventSyncMap)
    .where(eq(calendarEventSyncMap.id, id));
}

// Get all sync mappings for a user
export async function getUserSyncMappings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(calendarEventSyncMap)
    .where(eq(calendarEventSyncMap.userId, userId));
}


// ==================== EVENT TYPES (SCHEDULING) FUNCTIONS ====================

import {
  eventTypes,
  InsertEventType,
  eventTypeAvailability,
  InsertEventTypeAvailability,
  eventTypeDateOverrides,
  InsertEventTypeDateOverride,
  eventBookings,
  InsertEventBooking,
} from "../drizzle/schema";

// Create event type
export async function createEventType(data: InsertEventType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(eventTypes).values(data);
  return { id: result.insertId, ...data };
}

// Update event type
export async function updateEventType(id: number, data: Partial<InsertEventType>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(eventTypes).set(data).where(eq(eventTypes.id, id));
}

// Delete event type
export async function deleteEventType(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Also delete related availability and overrides
  await db.delete(eventTypeAvailability).where(eq(eventTypeAvailability.eventTypeId, id));
  await db.delete(eventTypeDateOverrides).where(eq(eventTypeDateOverrides.eventTypeId, id));
  await db.delete(eventTypes).where(eq(eventTypes.id, id));
}

// Get event type by ID
export async function getEventTypeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(eventTypes).where(eq(eventTypes.id, id)).limit(1);
  return result[0];
}

// Get event type by slug
export async function getEventTypeBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(eventTypes).where(eq(eventTypes.slug, slug)).limit(1);
  return result[0];
}

// Get all event types for a host
export async function getEventTypesByHost(hostId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(eventTypes)
    .where(eq(eventTypes.hostId, hostId))
    .orderBy(desc(eventTypes.createdAt));
}

// Get all active event types
export async function getActiveEventTypes() {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(eventTypes)
    .where(eq(eventTypes.isActive, true))
    .orderBy(eventTypes.name);
}

// ==================== EVENT TYPE AVAILABILITY FUNCTIONS ====================

// Set availability for event type (replaces existing)
export async function setEventTypeAvailability(eventTypeId: number, availabilities: InsertEventTypeAvailability[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete existing availability
  await db.delete(eventTypeAvailability).where(eq(eventTypeAvailability.eventTypeId, eventTypeId));
  
  // Insert new availability
  if (availabilities.length > 0) {
    await db.insert(eventTypeAvailability).values(availabilities);
  }
}

// Get availability for event type
export async function getEventTypeAvailability(eventTypeId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(eventTypeAvailability)
    .where(eq(eventTypeAvailability.eventTypeId, eventTypeId))
    .orderBy(eventTypeAvailability.dayOfWeek, eventTypeAvailability.startTime);
}

// ==================== EVENT TYPE DATE OVERRIDES FUNCTIONS ====================

// Add date override
export async function addDateOverride(data: InsertEventTypeDateOverride) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(eventTypeDateOverrides).values(data);
  return { id: result.insertId, ...data };
}

// Update date override
export async function updateDateOverride(id: number, data: Partial<InsertEventTypeDateOverride>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(eventTypeDateOverrides).set(data).where(eq(eventTypeDateOverrides.id, id));
}

// Delete date override
export async function deleteDateOverride(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(eventTypeDateOverrides).where(eq(eventTypeDateOverrides.id, id));
}

// Get date overrides for event type
export async function getDateOverrides(eventTypeId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(eventTypeDateOverrides)
    .where(eq(eventTypeDateOverrides.eventTypeId, eventTypeId))
    .orderBy(eventTypeDateOverrides.date);
}

// Get date override for specific date
export async function getDateOverrideForDate(eventTypeId: number, date: Date) {
  const db = await getDb();
  if (!db) return undefined;
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const result = await db
    .select()
    .from(eventTypeDateOverrides)
    .where(
      and(
        eq(eventTypeDateOverrides.eventTypeId, eventTypeId),
        gte(eventTypeDateOverrides.date, startOfDay),
        lte(eventTypeDateOverrides.date, endOfDay)
      )
    )
    .limit(1);
  
  return result[0];
}

// ==================== EVENT BOOKINGS FUNCTIONS ====================

// Create booking
export async function createEventBooking(data: InsertEventBooking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(eventBookings).values(data);
  return { id: result.insertId, ...data };
}

// Update booking
export async function updateEventBooking(id: number, data: Partial<InsertEventBooking>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(eventBookings).set(data).where(eq(eventBookings.id, id));
}

// Get booking by ID
export async function getEventBookingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(eventBookings).where(eq(eventBookings.id, id)).limit(1);
  return result[0];
}

// Get bookings for event type
export async function getBookingsForEventType(eventTypeId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db
    .select()
    .from(eventBookings)
    .where(
      and(
        eq(eventBookings.eventTypeId, eventTypeId),
        or(
          eq(eventBookings.status, "confirmed"),
          eq(eventBookings.status, "pending")
        )
      )
    );
  
  if (startDate && endDate) {
    query = db
      .select()
      .from(eventBookings)
      .where(
        and(
          eq(eventBookings.eventTypeId, eventTypeId),
          or(
            eq(eventBookings.status, "confirmed"),
            eq(eventBookings.status, "pending")
          ),
          gte(eventBookings.startTime, startDate),
          lte(eventBookings.startTime, endDate)
        )
      );
  }
  
  return query.orderBy(eventBookings.startTime);
}

// Get bookings for host
export async function getBookingsForHost(hostId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(eventBookings.hostId, hostId)];
  
  if (startDate) {
    conditions.push(gte(eventBookings.startTime, startDate));
  }
  if (endDate) {
    conditions.push(lte(eventBookings.startTime, endDate));
  }
  
  return db
    .select()
    .from(eventBookings)
    .where(and(...conditions))
    .orderBy(eventBookings.startTime);
}

// Get bookings for guest user
export async function getBookingsForGuest(guestUserId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(eventBookings)
    .where(eq(eventBookings.guestUserId, guestUserId))
    .orderBy(desc(eventBookings.startTime));
}

// Cancel booking
export async function cancelEventBooking(id: number, cancelledById: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(eventBookings)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledById,
      cancellationReason: reason,
    })
    .where(eq(eventBookings.id, id));
}

// Check if time slot is available
export async function isTimeSlotAvailable(
  eventTypeId: number,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: number
) {
  const db = await getDb();
  if (!db) return false;
  
  const conditions = [
    eq(eventBookings.eventTypeId, eventTypeId),
    or(
      eq(eventBookings.status, "confirmed"),
      eq(eventBookings.status, "pending")
    ),
    // Check for overlapping bookings
    or(
      // New booking starts during existing booking
      and(
        lte(eventBookings.startTime, startTime),
        gte(eventBookings.endTime, startTime)
      ),
      // New booking ends during existing booking
      and(
        lte(eventBookings.startTime, endTime),
        gte(eventBookings.endTime, endTime)
      ),
      // New booking contains existing booking
      and(
        gte(eventBookings.startTime, startTime),
        lte(eventBookings.endTime, endTime)
      )
    ),
  ];
  
  if (excludeBookingId) {
    conditions.push(sql`${eventBookings.id} != ${excludeBookingId}`);
  }
  
  const overlapping = await db
    .select()
    .from(eventBookings)
    .where(and(...conditions))
    .limit(1);
  
  return overlapping.length === 0;
}


// Get upcoming bookings that need reminders
export async function getBookingsNeedingReminders() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  // Look ahead 25 hours to catch all reminders (max 24h reminder + 1h buffer)
  const lookAhead = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  
  // Get confirmed bookings in the next 25 hours
  const bookings = await db
    .select({
      booking: eventBookings,
      eventType: eventTypes,
    })
    .from(eventBookings)
    .innerJoin(eventTypes, eq(eventBookings.eventTypeId, eventTypes.id))
    .where(
      and(
        eq(eventBookings.status, "confirmed"),
        gte(eventBookings.startTime, now),
        lte(eventBookings.startTime, lookAhead)
      )
    )
    .orderBy(eventBookings.startTime);
  
  return bookings;
}

// Update booking reminders sent
export async function updateBookingRemindersSent(bookingId: number, remindersSent: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(eventBookings)
    .set({ remindersSent })
    .where(eq(eventBookings.id, bookingId));
}


// ==================== SCHEDULES FUNCTIONS ====================

// Create schedule
export async function createSchedule(data: InsertSchedule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(schedules).values(data);
  return { id: result.insertId, ...data };
}

// Update schedule
export async function updateSchedule(id: number, data: Partial<InsertSchedule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(schedules).set(data).where(eq(schedules.id, id));
}

// Delete schedule
export async function deleteSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete related availability
  await db.delete(scheduleAvailability).where(eq(scheduleAvailability.scheduleId, id));
  // Remove schedule reference from event types
  await db.update(eventTypes).set({ scheduleId: null }).where(eq(eventTypes.scheduleId, id));
  // Delete schedule
  await db.delete(schedules).where(eq(schedules.id, id));
}

// Get schedule by ID
export async function getScheduleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
  return result[0];
}

// Get all schedules for an owner
export async function getSchedulesByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(schedules)
    .where(eq(schedules.ownerId, ownerId))
    .orderBy(desc(schedules.isDefault), schedules.name);
}

// Get default schedule for owner
export async function getDefaultSchedule(ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.ownerId, ownerId), eq(schedules.isDefault, true)))
    .limit(1);
  return result[0];
}

// Set schedule as default (unset others)
export async function setDefaultSchedule(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Unset all other defaults for this owner
  await db
    .update(schedules)
    .set({ isDefault: false })
    .where(eq(schedules.ownerId, ownerId));
  
  // Set this one as default
  await db
    .update(schedules)
    .set({ isDefault: true })
    .where(eq(schedules.id, id));
}

// ==================== SCHEDULE AVAILABILITY FUNCTIONS ====================

// Set availability for schedule (replaces existing)
export async function setScheduleAvailability(scheduleId: number, availabilities: InsertScheduleAvailability[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete existing availability
  await db.delete(scheduleAvailability).where(eq(scheduleAvailability.scheduleId, scheduleId));
  
  // Insert new availability
  if (availabilities.length > 0) {
    await db.insert(scheduleAvailability).values(availabilities);
  }
}

// Get availability for schedule
export async function getScheduleAvailability(scheduleId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(scheduleAvailability)
    .where(eq(scheduleAvailability.scheduleId, scheduleId))
    .orderBy(scheduleAvailability.dayOfWeek, scheduleAvailability.startTime);
}

// Create or get default "Working Hours" schedule for a user
export async function ensureDefaultSchedule(ownerId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if user already has a default schedule
  const existing = await getDefaultSchedule(ownerId);
  if (existing) {
    return existing.id;
  }
  
  // Create default "Working Hours" schedule
  const schedule = await createSchedule({
    name: "Arbeitszeiten",
    timezone: "Europe/Berlin",
    isDefault: true,
    ownerId,
  });
  
  // Set default availability (Mon-Fri 9:00-17:00)
  const defaultAvailability: InsertScheduleAvailability[] = [];
  for (let day = 1; day <= 5; day++) { // Monday to Friday
    defaultAvailability.push({
      scheduleId: schedule.id,
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "17:00",
      isAvailable: true,
    });
  }
  
  await setScheduleAvailability(schedule.id, defaultAvailability);
  
  return schedule.id;
}


// ==================== TEAMS FUNCTIONS ====================

// Create team
export async function createTeam(data: InsertTeam) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(teams).values(data);
  return { id: result.insertId, ...data };
}

// Update team
export async function updateTeam(id: number, data: Partial<InsertTeam>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(teams).set(data).where(eq(teams.id, id));
}

// Delete team
export async function deleteTeam(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete team members
  await db.delete(teamMembers).where(eq(teamMembers.teamId, id));
  // Delete team chat room
  await db.delete(chatRooms).where(eq(chatRooms.teamId, id));
  // Delete team
  await db.delete(teams).where(eq(teams.id, id));
}

// Get team by ID
export async function getTeamById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  return result[0];
}

// Get team by slug
export async function getTeamBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(teams).where(eq(teams.slug, slug)).limit(1);
  return result[0];
}

// Get all teams
export async function getAllTeams() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(teams).orderBy(teams.name);
}

// Get teams for user
export async function getTeamsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      team: teams,
      membership: teamMembers,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId))
    .orderBy(teams.name);
}

// ==================== TEAM MEMBERS FUNCTIONS ====================

// Add team member
export async function addTeamMember(data: InsertTeamMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if already a member
  const existing = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, data.teamId), eq(teamMembers.userId, data.userId)))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  const [result] = await db.insert(teamMembers).values(data);
  return { id: result.insertId, ...data };
}

// Remove team member
export async function removeTeamMember(teamId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(teamMembers).where(
    and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
  );
}

// Update team member role
export async function updateTeamMemberRole(teamId: number, userId: number, role: "member" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(teamMembers)
    .set({ role })
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
}

// Get team members
export async function getTeamMembers(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      membership: teamMembers,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: users.role,
      },
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(users.name);
}

// ==================== CHAT ROOMS FUNCTIONS ====================

// Create chat room
export async function createChatRoom(data: InsertChatRoom) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(chatRooms).values(data);
  return { id: result.insertId, ...data };
}

// Get or create direct message room between two users
export async function getOrCreateDirectMessageRoom(userId1: number, userId2: number, createdById: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Find existing DM room between these two users
  const existingRooms = await db
    .select({ roomId: chatRoomParticipants.roomId })
    .from(chatRoomParticipants)
    .innerJoin(chatRooms, eq(chatRoomParticipants.roomId, chatRooms.id))
    .where(
      and(
        eq(chatRooms.type, "direct"),
        eq(chatRoomParticipants.userId, userId1)
      )
    );
  
  for (const room of existingRooms) {
    const participants = await db
      .select()
      .from(chatRoomParticipants)
      .where(eq(chatRoomParticipants.roomId, room.roomId));
    
    if (participants.length === 2 && participants.some(p => p.userId === userId2)) {
      const [fullRoom] = await db.select().from(chatRooms).where(eq(chatRooms.id, room.roomId));
      return fullRoom;
    }
  }
  
  // Create new DM room
  const newRoom = await createChatRoom({
    type: "direct",
    createdById,
  });
  
  // Add both participants
  await addChatRoomParticipant({ roomId: newRoom.id, userId: userId1 });
  await addChatRoomParticipant({ roomId: newRoom.id, userId: userId2 });
  
  return newRoom;
}

// Get or create team chat room
export async function getOrCreateTeamChatRoom(teamId: number, createdById: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Find existing team room
  const [existing] = await db
    .select()
    .from(chatRooms)
    .where(and(eq(chatRooms.type, "team"), eq(chatRooms.teamId, teamId)))
    .limit(1);
  
  if (existing) return existing;
  
  // Get team name
  const team = await getTeamById(teamId);
  
  // Create new team room
  const newRoom = await createChatRoom({
    name: team?.name || "Team Chat",
    type: "team",
    teamId,
    createdById,
  });
  
  // Add all team members as participants
  const members = await getTeamMembers(teamId);
  for (const member of members) {
    await addChatRoomParticipant({ roomId: newRoom.id, userId: member.user.id });
  }
  
  return newRoom;
}

// Create group chat
export async function createGroupChat(name: string, createdById: number, memberIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const newRoom = await createChatRoom({
    name,
    type: "group",
    createdById,
  });
  
  // Add all members including creator
  const allMembers = Array.from(new Set([createdById, ...memberIds]));
  for (const userId of allMembers) {
    await addChatRoomParticipant({ roomId: newRoom.id, userId });
  }
  
  return newRoom;
}

// Get chat room by ID
export async function getChatRoomById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, id)).limit(1);
  return room;
}

// Get chat rooms for user
export async function getChatRoomsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      room: chatRooms,
      participant: chatRoomParticipants,
    })
    .from(chatRoomParticipants)
    .innerJoin(chatRooms, eq(chatRoomParticipants.roomId, chatRooms.id))
    .where(eq(chatRoomParticipants.userId, userId))
    .orderBy(desc(chatRooms.lastMessageAt));
}

// Update last message time
export async function updateChatRoomLastMessage(roomId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(chatRooms)
    .set({ lastMessageAt: new Date() })
    .where(eq(chatRooms.id, roomId));
}

// ==================== CHAT ROOM PARTICIPANTS FUNCTIONS ====================

// Add participant
export async function addChatRoomParticipant(data: InsertChatRoomParticipant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if already a participant
  const existing = await db
    .select()
    .from(chatRoomParticipants)
    .where(and(eq(chatRoomParticipants.roomId, data.roomId), eq(chatRoomParticipants.userId, data.userId)))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  const [result] = await db.insert(chatRoomParticipants).values(data);
  return { id: result.insertId, ...data };
}

// Remove participant
export async function removeChatRoomParticipant(roomId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(chatRoomParticipants).where(
    and(eq(chatRoomParticipants.roomId, roomId), eq(chatRoomParticipants.userId, userId))
  );
}

// Get participants for room
export async function getChatRoomParticipants(roomId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      participant: chatRoomParticipants,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(chatRoomParticipants)
    .innerJoin(users, eq(chatRoomParticipants.userId, users.id))
    .where(eq(chatRoomParticipants.roomId, roomId))
    .orderBy(users.name);
}

// Update last read time
export async function updateLastReadTime(roomId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(chatRoomParticipants)
    .set({ lastReadAt: new Date() })
    .where(and(eq(chatRoomParticipants.roomId, roomId), eq(chatRoomParticipants.userId, userId)));
}

// ==================== OHWEEES FUNCTIONS ====================

// Create ohweee
export async function createOhweee(data: InsertOhweee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(ohweees).values(data);
  
  // Update room's last message time
  await updateChatRoomLastMessage(data.roomId);
  
  return { id: result.insertId, ...data };
}

// Update ohweee
export async function updateOhweee(id: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(ohweees)
    .set({ content, isEdited: true, editedAt: new Date() })
    .where(eq(ohweees.id, id));
}

// Delete ohweee (soft delete)
export async function deleteOhweee(id: number, deletedById: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(ohweees)
    .set({ isDeleted: true, deletedAt: new Date(), deletedById })
    .where(eq(ohweees.id, id));
}

// Get ohweee by ID
export async function getOhweeeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const [ohweee] = await db.select().from(ohweees).where(eq(ohweees.id, id)).limit(1);
  return ohweee;
}

// Get ohweees for room
export async function getOhweeesForRoom(roomId: number, limit = 50, beforeId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(ohweees.roomId, roomId), eq(ohweees.isDeleted, false)];
  
  if (beforeId) {
    conditions.push(sql`${ohweees.id} < ${beforeId}`);
  }
  
  const messages = await db
    .select({
      ohweee: ohweees,
      sender: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(ohweees)
    .innerJoin(users, eq(ohweees.senderId, users.id))
    .where(and(...conditions))
    .orderBy(desc(ohweees.createdAt))
    .limit(limit);
  
  // Return in chronological order
  return messages.reverse();
}

// Get thread replies
export async function getOhweeeReplies(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      ohweee: ohweees,
      sender: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(ohweees)
    .innerJoin(users, eq(ohweees.senderId, users.id))
    .where(and(eq(ohweees.parentId, parentId), eq(ohweees.isDeleted, false)))
    .orderBy(ohweees.createdAt);
}

// Pin/unpin ohweee
export async function toggleOhweeePin(id: number, pinnedById: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [ohweee] = await db.select().from(ohweees).where(eq(ohweees.id, id)).limit(1);
  
  if (!ohweee) throw new Error("Ohweee not found");
  
  await db
    .update(ohweees)
    .set({
      isPinned: !ohweee.isPinned,
      pinnedById: !ohweee.isPinned ? pinnedById : null,
      pinnedAt: !ohweee.isPinned ? new Date() : null,
    })
    .where(eq(ohweees.id, id));
}

// Get pinned ohweees for room
export async function getPinnedOhweees(roomId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      ohweee: ohweees,
      sender: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(ohweees)
    .innerJoin(users, eq(ohweees.senderId, users.id))
    .where(and(eq(ohweees.roomId, roomId), eq(ohweees.isPinned, true), eq(ohweees.isDeleted, false)))
    .orderBy(desc(ohweees.pinnedAt));
}

// Get unread count for user in room
export async function getUnreadCountForRoom(roomId: number, userId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  // Get user's last read time
  const [participant] = await db
    .select()
    .from(chatRoomParticipants)
    .where(and(eq(chatRoomParticipants.roomId, roomId), eq(chatRoomParticipants.userId, userId)))
    .limit(1);
  
  if (!participant) return 0;
  
  const conditions = [
    eq(ohweees.roomId, roomId),
    eq(ohweees.isDeleted, false),
    sql`${ohweees.senderId} != ${userId}`,
  ];
  
  if (participant.lastReadAt) {
    conditions.push(sql`${ohweees.createdAt} > ${participant.lastReadAt}`);
  }
  
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ohweees)
    .where(and(...conditions));
  
  return result?.count || 0;
}

// Get total unread count for user across all rooms
export async function getTotalUnreadCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const rooms = await getChatRoomsForUser(userId);
  let total = 0;
  
  for (const { room } of rooms) {
    total += await getUnreadCountForRoom(room.id, userId);
  }
  
  return total;
}

// Search ohweees
export async function searchOhweees(userId: number, query: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  
  // Get rooms user is part of
  const userRooms = await getChatRoomsForUser(userId);
  const roomIds = userRooms.map(r => r.room.id);
  
  if (roomIds.length === 0) return [];
  
  return db
    .select({
      ohweee: ohweees,
      sender: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      },
      room: chatRooms,
    })
    .from(ohweees)
    .innerJoin(users, eq(ohweees.senderId, users.id))
    .innerJoin(chatRooms, eq(ohweees.roomId, chatRooms.id))
    .where(
      and(
        inArray(ohweees.roomId, roomIds),
        eq(ohweees.isDeleted, false),
        like(ohweees.content, `%${query}%`)
      )
    )
    .orderBy(desc(ohweees.createdAt))
    .limit(limit);
}


// ==================== OHWEEE REACTIONS FUNCTIONS ====================

// Add reaction to ohweee
export async function addOhweeeReaction(ohweeeId: number, userId: number, emoji: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if user already reacted with this emoji
  const existing = await db
    .select()
    .from(ohweeeReactions)
    .where(
      and(
        eq(ohweeeReactions.ohweeeId, ohweeeId),
        eq(ohweeeReactions.userId, userId),
        eq(ohweeeReactions.emoji, emoji)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  const [result] = await db.insert(ohweeeReactions).values({
    ohweeeId,
    userId,
    emoji,
  });
  
  return { id: result.insertId, ohweeeId, userId, emoji };
}

// Remove reaction from ohweee
export async function removeOhweeeReaction(ohweeeId: number, userId: number, emoji: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(ohweeeReactions)
    .where(
      and(
        eq(ohweeeReactions.ohweeeId, ohweeeId),
        eq(ohweeeReactions.userId, userId),
        eq(ohweeeReactions.emoji, emoji)
      )
    );
}

// Get reactions for ohweee
export async function getOhweeeReactions(ohweeeId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      reaction: ohweeeReactions,
      user: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(ohweeeReactions)
    .innerJoin(users, eq(ohweeeReactions.userId, users.id))
    .where(eq(ohweeeReactions.ohweeeId, ohweeeId))
    .orderBy(ohweeeReactions.createdAt);
}

// Get reactions for multiple ohweees (batch)
export async function getOhweeeReactionsBatch(ohweeeIds: number[]) {
  const db = await getDb();
  if (!db || ohweeeIds.length === 0) return [];
  
  return db
    .select({
      reaction: ohweeeReactions,
      user: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(ohweeeReactions)
    .innerJoin(users, eq(ohweeeReactions.userId, users.id))
    .where(inArray(ohweeeReactions.ohweeeId, ohweeeIds))
    .orderBy(ohweeeReactions.createdAt);
}

// Get ohweees since timestamp (for polling)
export async function getOhweeesSince(roomId: number, sinceTimestamp: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      ohweee: ohweees,
      sender: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(ohweees)
    .innerJoin(users, eq(ohweees.senderId, users.id))
    .where(
      and(
        eq(ohweees.roomId, roomId),
        eq(ohweees.isDeleted, false),
        sql`${ohweees.createdAt} > ${sinceTimestamp}`
      )
    )
    .orderBy(ohweees.createdAt);
}

// Get reply count for ohweee
export async function getOhweeeReplyCount(ohweeeId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ohweees)
    .where(and(eq(ohweees.parentId, ohweeeId), eq(ohweees.isDeleted, false)));
  
  return result?.count || 0;
}

// Get reply counts for multiple ohweees (batch)
export async function getOhweeeReplyCountsBatch(ohweeeIds: number[]) {
  const db = await getDb();
  if (!db || ohweeeIds.length === 0) return {};
  
  const results = await db
    .select({
      parentId: ohweees.parentId,
      count: sql<number>`COUNT(*)`,
    })
    .from(ohweees)
    .where(and(inArray(ohweees.parentId, ohweeeIds), eq(ohweees.isDeleted, false)))
    .groupBy(ohweees.parentId);
  
  const counts: Record<number, number> = {};
  for (const r of results) {
    if (r.parentId) {
      counts[r.parentId] = r.count;
    }
  }
  return counts;
}

// ==================== OHWEEE READ RECEIPTS ====================

export async function markOhweeeAsRead(ohweeeId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  
  // Check if already marked as read
  const existing = await db
    .select()
    .from(ohweeeReadReceipts)
    .where(and(eq(ohweeeReadReceipts.ohweeeId, ohweeeId), eq(ohweeeReadReceipts.userId, userId)))
    .limit(1);
  
  if (existing.length === 0) {
    await db.insert(ohweeeReadReceipts).values({ ohweeeId, userId });
  }
}

export async function markMultipleOhweeesAsRead(ohweeeIds: number[], userId: number) {
  const db = await getDb();
  if (!db || ohweeeIds.length === 0) return;
  
  // Get already read ones
  const existing = await db
    .select({ ohweeeId: ohweeeReadReceipts.ohweeeId })
    .from(ohweeeReadReceipts)
    .where(and(inArray(ohweeeReadReceipts.ohweeeId, ohweeeIds), eq(ohweeeReadReceipts.userId, userId)));
  
  const existingIds = new Set(existing.map(e => e.ohweeeId));
  const toInsert = ohweeeIds.filter(id => !existingIds.has(id));
  
  if (toInsert.length > 0) {
    await db.insert(ohweeeReadReceipts).values(toInsert.map(ohweeeId => ({ ohweeeId, userId })));
  }
}

export async function getReadReceiptsForOhweee(ohweeeId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      userId: ohweeeReadReceipts.userId,
      readAt: ohweeeReadReceipts.readAt,
      userName: users.name,
      userAvatar: users.avatarUrl,
    })
    .from(ohweeeReadReceipts)
    .innerJoin(users, eq(ohweeeReadReceipts.userId, users.id))
    .where(eq(ohweeeReadReceipts.ohweeeId, ohweeeId))
    .orderBy(ohweeeReadReceipts.readAt);
}

export async function getReadReceiptsBatch(ohweeeIds: number[]): Promise<Record<number, { userId: number; userName: string | null; userAvatar: string | null }[]>> {
  const db = await getDb();
  if (!db || ohweeeIds.length === 0) return {};
  
  const results = await db
    .select({
      ohweeeId: ohweeeReadReceipts.ohweeeId,
      userId: ohweeeReadReceipts.userId,
      userName: users.name,
      userAvatar: users.avatarUrl,
    })
    .from(ohweeeReadReceipts)
    .innerJoin(users, eq(ohweeeReadReceipts.userId, users.id))
    .where(inArray(ohweeeReadReceipts.ohweeeId, ohweeeIds));
  
  const receipts: Record<number, { userId: number; userName: string | null; userAvatar: string | null }[]> = {};
  for (const r of results) {
    if (!receipts[r.ohweeeId]) receipts[r.ohweeeId] = [];
    receipts[r.ohweeeId].push({ userId: r.userId, userName: r.userName, userAvatar: r.userAvatar });
  }
  return receipts;
}



// ==================== PUSH SUBSCRIPTIONS ====================

export async function savePushSubscription(userId: number, subscription: { endpoint: string; p256dh: string; auth: string }) {
  const db = await getDb();
  if (!db) return;
  
  // Check if subscription already exists for this endpoint
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing subscription
    await db
      .update(pushSubscriptions)
      .set({ userId, p256dh: subscription.p256dh, auth: subscription.auth })
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
  } else {
    // Insert new subscription
    await db.insert(pushSubscriptions).values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    });
  }
}

export async function removePushSubscription(endpoint: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function getPushSubscriptionsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function getPushSubscriptionsForUsers(userIds: number[]) {
  const db = await getDb();
  if (!db || userIds.length === 0) return [];
  return db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
}


// ==================== OHWEEE UNREAD MARKERS ====================

// Mark a message as unread (for later review)
export async function markOhweeeAsUnread(ohweeeId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  
  // Check if already marked
  const existing = await db
    .select()
    .from(ohweeeUnreadMarkers)
    .where(and(eq(ohweeeUnreadMarkers.ohweeeId, ohweeeId), eq(ohweeeUnreadMarkers.userId, userId)))
    .limit(1);
  
  if (existing.length === 0) {
    await db.insert(ohweeeUnreadMarkers).values({ ohweeeId, userId });
  }
}

// Remove unread marker from a message
export async function removeUnreadMarker(ohweeeId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db
    .delete(ohweeeUnreadMarkers)
    .where(and(eq(ohweeeUnreadMarkers.ohweeeId, ohweeeId), eq(ohweeeUnreadMarkers.userId, userId)));
}

// Get all unread markers for a user
export async function getUnreadMarkersForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      marker: ohweeeUnreadMarkers,
      ohweee: ohweees,
      sender: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      },
      room: chatRooms,
    })
    .from(ohweeeUnreadMarkers)
    .innerJoin(ohweees, eq(ohweeeUnreadMarkers.ohweeeId, ohweees.id))
    .innerJoin(users, eq(ohweees.senderId, users.id))
    .innerJoin(chatRooms, eq(ohweees.roomId, chatRooms.id))
    .where(eq(ohweeeUnreadMarkers.userId, userId))
    .orderBy(desc(ohweeeUnreadMarkers.markedAt));
}

// Check if a message is marked as unread by user
export async function isOhweeeMarkedUnread(ohweeeId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const existing = await db
    .select()
    .from(ohweeeUnreadMarkers)
    .where(and(eq(ohweeeUnreadMarkers.ohweeeId, ohweeeId), eq(ohweeeUnreadMarkers.userId, userId)))
    .limit(1);
  
  return existing.length > 0;
}

// Get unread markers for multiple messages (batch)
export async function getUnreadMarkersBatch(ohweeeIds: number[], userId: number): Promise<Set<number>> {
  const db = await getDb();
  if (!db || ohweeeIds.length === 0) return new Set();
  
  const results = await db
    .select({ ohweeeId: ohweeeUnreadMarkers.ohweeeId })
    .from(ohweeeUnreadMarkers)
    .where(and(inArray(ohweeeUnreadMarkers.ohweeeId, ohweeeIds), eq(ohweeeUnreadMarkers.userId, userId)));
  
  return new Set(results.map(r => r.ohweeeId));
}


// ==================== OHWEEE TYPING INDICATORS ====================

// Set typing status for a user in a room
export async function setTypingStatus(roomId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  
  // Check if record exists
  const existing = await db
    .select()
    .from(ohweeeTypingIndicators)
    .where(and(eq(ohweeeTypingIndicators.roomId, roomId), eq(ohweeeTypingIndicators.userId, userId)))
    .limit(1);
  
  if (existing.length > 0) {
    // Update timestamp
    await db
      .update(ohweeeTypingIndicators)
      .set({ lastTypingAt: new Date() })
      .where(and(eq(ohweeeTypingIndicators.roomId, roomId), eq(ohweeeTypingIndicators.userId, userId)));
  } else {
    // Insert new record
    await db.insert(ohweeeTypingIndicators).values({ roomId, userId });
  }
}

// Clear typing status for a user in a room
export async function clearTypingStatus(roomId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db
    .delete(ohweeeTypingIndicators)
    .where(and(eq(ohweeeTypingIndicators.roomId, roomId), eq(ohweeeTypingIndicators.userId, userId)));
}

// Get users currently typing in a room (within last 5 seconds)
export async function getTypingUsersInRoom(roomId: number, excludeUserId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get typing indicators from last 5 seconds
  const fiveSecondsAgo = new Date(Date.now() - 5000);
  
  return db
    .select({
      userId: ohweeeTypingIndicators.userId,
      userName: users.name,
      userAvatar: users.avatarUrl,
      lastTypingAt: ohweeeTypingIndicators.lastTypingAt,
    })
    .from(ohweeeTypingIndicators)
    .innerJoin(users, eq(ohweeeTypingIndicators.userId, users.id))
    .where(
      and(
        eq(ohweeeTypingIndicators.roomId, roomId),
        sql`${ohweeeTypingIndicators.userId} != ${excludeUserId}`,
        sql`${ohweeeTypingIndicators.lastTypingAt} > ${fiveSecondsAgo}`
      )
    );
}

// Clean up old typing indicators (older than 10 seconds)
export async function cleanupOldTypingIndicators() {
  const db = await getDb();
  if (!db) return;
  
  const tenSecondsAgo = new Date(Date.now() - 10000);
  
  await db
    .delete(ohweeeTypingIndicators)
    .where(sql`${ohweeeTypingIndicators.lastTypingAt} < ${tenSecondsAgo}`);
}
