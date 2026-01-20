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


/**
 * User favorites for quick access to frequently used articles.
 */
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  articleId: int("articleId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

/**
 * Recently viewed articles for user history.
 */
export const recentlyViewed = mysqlTable("recentlyViewed", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  articleId: int("articleId").notNull(),
  viewedAt: timestamp("viewedAt").defaultNow().notNull(),
});

export type RecentlyViewed = typeof recentlyViewed.$inferSelect;
export type InsertRecentlyViewed = typeof recentlyViewed.$inferInsert;

/**
 * User preferences for personalization (theme, shortcuts, etc.).
 */
export const userPreferences = mysqlTable("userPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  theme: mysqlEnum("theme", ["light", "dark", "system"]).default("system").notNull(),
  sidebarCollapsed: boolean("sidebarCollapsed").default(false).notNull(),
  keyboardShortcutsEnabled: boolean("keyboardShortcutsEnabled").default(true).notNull(),
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;

/**
 * Leave/vacation requests for employees.
 */
export const leaveRequests = mysqlTable("leaveRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  leaveType: mysqlEnum("leaveType", ["vacation", "sick", "personal", "parental", "other"]).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  totalDays: int("totalDays").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  approverId: int("approverId"),
  approverComment: text("approverComment"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = typeof leaveRequests.$inferInsert;

/**
 * Leave balances for tracking remaining vacation days.
 */
export const leaveBalances = mysqlTable("leaveBalances", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  year: int("year").notNull(),
  totalDays: int("totalDays").default(30).notNull(),
  usedDays: int("usedDays").default(0).notNull(),
  pendingDays: int("pendingDays").default(0).notNull(),
  carryOverDays: int("carryOverDays").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type InsertLeaveBalance = typeof leaveBalances.$inferInsert;


/**
 * Article embeddings for semantic search.
 * Stores vector representations of article content for similarity matching.
 */
export const articleEmbeddings = mysqlTable("articleEmbeddings", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull().unique(),
  embedding: json("embedding").notNull(), // Vector as JSON array
  embeddingModel: varchar("embeddingModel", { length: 64 }).default("text-embedding-3-small").notNull(),
  contentHash: varchar("contentHash", { length: 64 }).notNull(), // To detect content changes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ArticleEmbedding = typeof articleEmbeddings.$inferSelect;
export type InsertArticleEmbedding = typeof articleEmbeddings.$inferInsert;

/**
 * SOP embeddings for semantic search.
 * Stores vector representations of SOP content for similarity matching.
 */
export const sopEmbeddings = mysqlTable("sopEmbeddings", {
  id: int("id").autoincrement().primaryKey(),
  sopId: int("sopId").notNull().unique(),
  embedding: json("embedding").notNull(), // Vector as JSON array
  embeddingModel: varchar("embeddingModel", { length: 64 }).default("text-embedding-3-small").notNull(),
  contentHash: varchar("contentHash", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SOPEmbedding = typeof sopEmbeddings.$inferSelect;
export type InsertSOPEmbedding = typeof sopEmbeddings.$inferInsert;


/**
 * Email notification settings per user.
 * Controls which events trigger email notifications.
 */
export const emailSettings = mysqlTable("emailSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Leave request notifications
  leaveRequestSubmitted: boolean("leaveRequestSubmitted").default(true).notNull(),
  leaveRequestApproved: boolean("leaveRequestApproved").default(true).notNull(),
  leaveRequestRejected: boolean("leaveRequestRejected").default(true).notNull(),
  // Article notifications
  articleReviewRequested: boolean("articleReviewRequested").default(true).notNull(),
  articleApproved: boolean("articleApproved").default(true).notNull(),
  articleRejected: boolean("articleRejected").default(true).notNull(),
  articleFeedback: boolean("articleFeedback").default(true).notNull(),
  // Mention notifications
  mentioned: boolean("mentioned").default(true).notNull(),
  // Digest settings
  dailyDigest: boolean("dailyDigest").default(false).notNull(),
  weeklyDigest: boolean("weeklyDigest").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailSetting = typeof emailSettings.$inferSelect;
export type InsertEmailSetting = typeof emailSettings.$inferInsert;

/**
 * Mentions tracking for @user references in articles and comments.
 */
export const mentions = mysqlTable("mentions", {
  id: int("id").autoincrement().primaryKey(),
  mentionedUserId: int("mentionedUserId").notNull(),
  mentionedByUserId: int("mentionedByUserId").notNull(),
  contextType: mysqlEnum("contextType", ["article", "comment", "sop"]).notNull(),
  contextId: int("contextId").notNull(),
  contextTitle: varchar("contextTitle", { length: 500 }),
  isRead: boolean("isRead").default(false).notNull(),
  emailSent: boolean("emailSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Mention = typeof mentions.$inferSelect;
export type InsertMention = typeof mentions.$inferInsert;

/**
 * Email queue for tracking sent emails and preventing duplicates.
 */
export const emailQueue = mysqlTable("emailQueue", {
  id: int("id").autoincrement().primaryKey(),
  recipientId: int("recipientId").notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  emailType: varchar("emailType", { length: 64 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  content: text("content").notNull(),
  relatedType: varchar("relatedType", { length: 64 }),
  relatedId: int("relatedId"),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailQueueEntry = typeof emailQueue.$inferSelect;
export type InsertEmailQueueEntry = typeof emailQueue.$inferInsert;

/**
 * Company-wide announcements for the dashboard.
 */
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["info", "warning", "success", "urgent"]).default("info").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  startsAt: timestamp("startsAt"),
  expiresAt: timestamp("expiresAt"),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;


/**
 * Assignments for tracking assigned SOPs and articles to users.
 * Used for onboarding and training purposes.
 */
export const assignments = mysqlTable("assignments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  resourceType: mysqlEnum("resourceType", ["article", "sop"]).notNull(),
  resourceId: int("resourceId").notNull(),
  resourceSlug: varchar("resourceSlug", { length: 500 }).notNull(),
  resourceTitle: varchar("resourceTitle", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  dueDate: timestamp("dueDate"),
  assignedById: int("assignedById").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
});

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;


/**
 * System settings for global configuration.
 * Key-value store for application-wide settings.
 */
export const systemSettings = mysqlTable("systemSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: varchar("description", { length: 500 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;


/**
 * Page views for analytics tracking.
 * Records each page view with user and resource information.
 */
export const pageViews = mysqlTable("pageViews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  resourceType: mysqlEnum("resourceType", ["article", "sop", "category"]).notNull(),
  resourceId: int("resourceId").notNull(),
  resourceSlug: varchar("resourceSlug", { length: 500 }),
  resourceTitle: varchar("resourceTitle", { length: 500 }),
  sessionId: varchar("sessionId", { length: 100 }),
  referrer: varchar("referrer", { length: 500 }),
  userAgent: text("userAgent"),
  viewedAt: timestamp("viewedAt").defaultNow().notNull(),
});

export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = typeof pageViews.$inferInsert;

/**
 * Search queries for analytics.
 * Tracks what users are searching for.
 */
export const searchQueries = mysqlTable("searchQueries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  query: varchar("query", { length: 500 }).notNull(),
  resultsCount: int("resultsCount").default(0).notNull(),
  clickedResourceType: mysqlEnum("clickedResourceType", ["article", "sop"]),
  clickedResourceId: int("clickedResourceId"),
  searchedAt: timestamp("searchedAt").defaultNow().notNull(),
});

export type SearchQuery = typeof searchQueries.$inferSelect;
export type InsertSearchQuery = typeof searchQueries.$inferInsert;

/**
 * Content verification status for articles.
 * Tracks when content was last verified and when it needs review.
 */
export const contentVerification = mysqlTable("contentVerification", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull().unique(),
  isVerified: boolean("isVerified").default(false).notNull(),
  verifiedById: int("verifiedById"),
  verifiedAt: timestamp("verifiedAt"),
  expiresAt: timestamp("expiresAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentVerification = typeof contentVerification.$inferSelect;
export type InsertContentVerification = typeof contentVerification.$inferInsert;


/**
 * User dashboard settings for personalized widget configuration.
 * Stores which widgets are visible and their order.
 */
export const userDashboardSettings = mysqlTable("userDashboardSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Widget visibility settings
  showWelcomeHero: boolean("showWelcomeHero").default(true).notNull(),
  showAnnouncements: boolean("showAnnouncements").default(true).notNull(),
  showNavigation: boolean("showNavigation").default(true).notNull(),
  showStats: boolean("showStats").default(true).notNull(),
  showRecentArticles: boolean("showRecentArticles").default(true).notNull(),
  showActivityFeed: boolean("showActivityFeed").default(true).notNull(),
  showFavorites: boolean("showFavorites").default(true).notNull(),
  showOnboardingProgress: boolean("showOnboardingProgress").default(true).notNull(),
  // Widget order (JSON array of widget IDs)
  widgetOrder: json("widgetOrder").$type<string[]>().default([
    "welcomeHero",
    "announcements",
    "navigation",
    "stats",
    "recentArticles",
    "activityFeed",
    "favorites",
    "onboardingProgress"
  ]).notNull(),
  // Widget sizes (JSON object mapping widget ID to size: "small" | "medium" | "large")
  widgetSizes: json("widgetSizes").$type<Record<string, "small" | "medium" | "large">>().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserDashboardSetting = typeof userDashboardSettings.$inferSelect;
export type InsertUserDashboardSetting = typeof userDashboardSettings.$inferInsert;


/**
 * Calendar events for personal scheduling.
 * Supports single-day, multi-day, and all-day events.
 */
export const calendarEvents = mysqlTable("calendarEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  // Event timing
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  isAllDay: boolean("isAllDay").default(false).notNull(),
  // Event styling and categorization
  color: varchar("color", { length: 20 }).default("blue").notNull(),
  eventType: mysqlEnum("eventType", ["personal", "meeting", "reminder", "vacation", "other"]).default("personal").notNull(),
  // Linked resources (optional)
  linkedResourceType: mysqlEnum("linkedResourceType", ["leave_request", "article", "sop"]),
  linkedResourceId: int("linkedResourceId"),
  // Recurrence (for future expansion)
  isRecurring: boolean("isRecurring").default(false).notNull(),
  recurrenceRule: varchar("recurrenceRule", { length: 255 }),
  // Metadata
  location: varchar("location", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;
