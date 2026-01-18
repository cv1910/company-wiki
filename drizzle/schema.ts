import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role-based permissions for the Company Wiki.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "editor", "admin"]).default("user").notNull(),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Categories for organizing wiki articles hierarchically.
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  parentId: int("parentId"),
  icon: varchar("icon", { length: 64 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdById: int("createdById").notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Wiki articles with rich content.
 */
export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  content: text("content"),
  excerpt: text("excerpt"),
  categoryId: int("categoryId"),
  status: mysqlEnum("status", ["draft", "pending_review", "published", "archived"]).default("draft").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  publishedAt: timestamp("publishedAt"),
  createdById: int("createdById").notNull(),
  lastEditedById: int("lastEditedById"),
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

/**
 * Article versions for tracking changes and enabling rollback.
 */
export const articleVersions = mysqlTable("articleVersions", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  versionNumber: int("versionNumber").notNull(),
  changeDescription: text("changeDescription"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdById: int("createdById").notNull(),
});

export type ArticleVersion = typeof articleVersions.$inferSelect;
export type InsertArticleVersion = typeof articleVersions.$inferInsert;

/**
 * Granular permissions for users on categories and articles.
 */
export const permissions = mysqlTable("permissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  resourceType: mysqlEnum("resourceType", ["category", "article"]).notNull(),
  resourceId: int("resourceId").notNull(),
  permissionLevel: mysqlEnum("permissionLevel", ["read", "edit", "admin"]).notNull(),
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  grantedById: int("grantedById").notNull(),
});

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

/**
 * SOPs (Standard Operating Procedures) with Scribe integration.
 */
export const sops = mysqlTable("sops", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  description: text("description"),
  scribeUrl: text("scribeUrl"),
  scribeEmbedCode: text("scribeEmbedCode"),
  categoryId: int("categoryId"),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdById: int("createdById").notNull(),
  lastEditedById: int("lastEditedById"),
});

export type SOP = typeof sops.$inferSelect;
export type InsertSOP = typeof sops.$inferInsert;

/**
 * SOP Categories for organizing SOPs.
 */
export const sopCategories = mysqlTable("sopCategories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  parentId: int("parentId"),
  icon: varchar("icon", { length: 64 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdById: int("createdById").notNull(),
});

export type SOPCategory = typeof sopCategories.$inferSelect;
export type InsertSOPCategory = typeof sopCategories.$inferInsert;

/**
 * Chat history for AI assistant conversations.
 */
export const chatHistory = mysqlTable("chatHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  sources: json("sources"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatHistory.$inferSelect;
export type InsertChatMessage = typeof chatHistory.$inferInsert;

/**
 * Activity log for tracking user actions.
 */
export const activityLog = mysqlTable("activityLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  resourceType: varchar("resourceType", { length: 64 }).notNull(),
  resourceId: int("resourceId"),
  resourceTitle: varchar("resourceTitle", { length: 500 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type InsertActivityLogEntry = typeof activityLog.$inferInsert;

/**
 * Article comments for collaboration.
 */
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  parentId: int("parentId"),
  isResolved: boolean("isResolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

/**
 * User notifications.
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  resourceType: varchar("resourceType", { length: 64 }),
  resourceId: int("resourceId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;


/**
 * Article feedback for improving content quality.
 * Users can rate articles and provide suggestions.
 */
export const articleFeedback = mysqlTable("articleFeedback", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  userId: int("userId").notNull(),
  rating: mysqlEnum("rating", ["helpful", "not_helpful", "needs_improvement"]).notNull(),
  feedbackType: mysqlEnum("feedbackType", ["content", "accuracy", "clarity", "completeness", "other"]).notNull(),
  comment: text("comment"),
  status: mysqlEnum("status", ["pending", "reviewed", "resolved", "dismissed"]).default("pending").notNull(),
  adminResponse: text("adminResponse"),
  respondedById: int("respondedById"),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ArticleFeedback = typeof articleFeedback.$inferSelect;
export type InsertArticleFeedback = typeof articleFeedback.$inferInsert;


/**
 * Article templates for quick content creation.
 * Provides predefined structures for common document types.
 */
export const articleTemplates = mysqlTable("articleTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  content: text("content").notNull(),
  icon: varchar("icon", { length: 64 }),
  isSystem: boolean("isSystem").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdById: int("createdById"),
});

export type ArticleTemplate = typeof articleTemplates.$inferSelect;
export type InsertArticleTemplate = typeof articleTemplates.$inferInsert;

/**
 * Media files uploaded by users.
 * Stores S3 references and metadata for images and documents.
 */
export const media = mysqlTable("media", {
  id: int("id").autoincrement().primaryKey(),
  filename: varchar("filename", { length: 500 }).notNull(),
  originalFilename: varchar("originalFilename", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  size: int("size").notNull(),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  width: int("width"),
  height: int("height"),
  uploadedById: int("uploadedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Media = typeof media.$inferSelect;
export type InsertMedia = typeof media.$inferInsert;


/**
 * Comprehensive audit log for tracking all system actions.
 * Essential for compliance and security monitoring.
 */
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  userEmail: varchar("userEmail", { length: 320 }),
  userName: varchar("userName", { length: 255 }),
  action: varchar("action", { length: 64 }).notNull(),
  resourceType: varchar("resourceType", { length: 64 }).notNull(),
  resourceId: int("resourceId"),
  resourceTitle: varchar("resourceTitle", { length: 500 }),
  oldValue: json("oldValue"),
  newValue: json("newValue"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = typeof auditLog.$inferInsert;

/**
 * Article review requests for the approval workflow.
 * Tracks draft submissions and their review status.
 */
export const articleReviews = mysqlTable("articleReviews", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  requestedById: int("requestedById").notNull(),
  reviewerId: int("reviewerId"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "changes_requested"]).default("pending").notNull(),
  requestMessage: text("requestMessage"),
  reviewMessage: text("reviewMessage"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export type ArticleReview = typeof articleReviews.$inferSelect;
export type InsertArticleReview = typeof articleReviews.$inferInsert;
