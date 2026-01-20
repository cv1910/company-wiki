import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { nanoid } from "nanoid";
import * as embeddings from "./embeddings";
import DiffMatchPatch from "diff-match-patch";
import * as googleCalendarService from "./googleCalendar";

// Initialize diff-match-patch
const dmp = new DiffMatchPatch();

// Helper to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[äöüß]/g, (char) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" })[char] || char)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

// Admin check middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Editor check middleware (editor or admin)
const editorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "editor") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Editor access required" });
  }
  return next({ ctx });
});

// iCal Helper Functions
function formatDateIcal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatDateTimeIcal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

interface ParsedIcalEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  location?: string;
  categories?: string[];
  uid?: string;
}

function parseIcalContent(content: string): ParsedIcalEvent[] {
  const events: ParsedIcalEvent[] = [];
  const lines = content.replace(/\r\n /g, "").split(/\r?\n/);
  
  let currentEvent: Partial<ParsedIcalEvent> | null = null;
  
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      currentEvent = {};
    } else if (line === "END:VEVENT" && currentEvent) {
      if (currentEvent.title && currentEvent.startDate && currentEvent.endDate) {
        events.push({
          title: currentEvent.title,
          description: currentEvent.description,
          startDate: currentEvent.startDate,
          endDate: currentEvent.endDate,
          isAllDay: currentEvent.isAllDay || false,
          location: currentEvent.location,
          categories: currentEvent.categories,
          uid: currentEvent.uid,
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;
      
      const key = line.substring(0, colonIndex);
      const value = line.substring(colonIndex + 1);
      
      if (key === "SUMMARY") {
        currentEvent.title = unescapeIcalText(value);
      } else if (key === "DESCRIPTION") {
        currentEvent.description = unescapeIcalText(value);
      } else if (key === "LOCATION") {
        currentEvent.location = unescapeIcalText(value);
      } else if (key === "UID") {
        currentEvent.uid = value;
      } else if (key === "CATEGORIES") {
        currentEvent.categories = value.split(",").map(c => c.trim());
      } else if (key.startsWith("DTSTART")) {
        if (key.includes("VALUE=DATE")) {
          currentEvent.isAllDay = true;
          currentEvent.startDate = parseIcalDate(value);
        } else {
          currentEvent.isAllDay = false;
          currentEvent.startDate = parseIcalDateTime(value);
        }
      } else if (key.startsWith("DTEND")) {
        if (key.includes("VALUE=DATE")) {
          currentEvent.endDate = parseIcalDate(value);
        } else {
          currentEvent.endDate = parseIcalDateTime(value);
        }
      }
    }
  }
  
  return events;
}

function unescapeIcalText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseIcalDate(value: string): Date {
  const year = parseInt(value.substring(0, 4), 10);
  const month = parseInt(value.substring(4, 6), 10) - 1;
  const day = parseInt(value.substring(6, 8), 10);
  return new Date(year, month, day);
}

function parseIcalDateTime(value: string): Date {
  // Remove timezone suffix if present
  const cleanValue = value.replace(/Z$/, "");
  const year = parseInt(cleanValue.substring(0, 4), 10);
  const month = parseInt(cleanValue.substring(4, 6), 10) - 1;
  const day = parseInt(cleanValue.substring(6, 8), 10);
  const hours = parseInt(cleanValue.substring(9, 11), 10) || 0;
  const minutes = parseInt(cleanValue.substring(11, 13), 10) || 0;
  const seconds = parseInt(cleanValue.substring(13, 15), 10) || 0;
  return new Date(year, month, day, hours, minutes, seconds);
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== USER MANAGEMENT ====================
  users: router({
    list: adminProcedure.query(async () => {
      return db.getAllUsers();
    }),

    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getUserById(input.id);
    }),

    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "editor", "admin"]) }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
  }),

  // ==================== CATEGORIES ====================
  categories: router({
    list: protectedProcedure.query(async () => {
      return db.getAllCategories();
    }),

    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getCategoryById(input.id);
    }),

    getBySlug: protectedProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
      return db.getCategoryBySlug(input.slug);
    }),

    create: editorProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          parentId: z.number().optional(),
          icon: z.string().optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const slug = generateSlug(input.name) + "-" + nanoid(6);
        const id = await db.createCategory({
          ...input,
          slug,
          createdById: ctx.user.id,
        });
        await db.logActivity({
          userId: ctx.user.id,
          action: "create",
          resourceType: "category",
          resourceId: id,
          resourceTitle: input.name,
        });
        return { id, slug };
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          parentId: z.number().nullable().optional(),
          icon: z.string().optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateCategory(id, data);
        await db.logActivity({
          userId: ctx.user.id,
          action: "update",
          resourceType: "category",
          resourceId: id,
          resourceTitle: input.name,
        });
        return { success: true };
      }),

    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const category = await db.getCategoryById(input.id);
      await db.deleteCategory(input.id);
      await db.logActivity({
        userId: ctx.user.id,
        action: "delete",
        resourceType: "category",
        resourceId: input.id,
        resourceTitle: category?.name,
      });
      return { success: true };
    }),
  }),

  // ==================== ARTICLES ====================
  articles: router({
    list: protectedProcedure
      .input(z.object({ 
        status: z.enum(["draft", "published", "archived"]).optional(),
        categorySlug: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        if (input?.categorySlug) {
          const category = await db.getCategoryBySlug(input.categorySlug);
          if (category) {
            const articles = await db.getArticlesByCategory(category.id);
            if (input.status) {
              return articles.filter(a => a.status === input.status).slice(0, input.limit || 100);
            }
            return articles.slice(0, input.limit || 100);
          }
          return [];
        }
        return db.getAllArticles(input?.status);
      }),

    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const article = await db.getArticleById(input.id);
      if (article) {
        await db.incrementArticleViewCount(input.id);
      }
      return article;
    }),

    getBySlug: protectedProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
      const article = await db.getArticleBySlug(input.slug);
      if (article) {
        await db.incrementArticleViewCount(article.id);
      }
      return article;
    }),

    getByCategory: protectedProcedure.input(z.object({ categoryId: z.number() })).query(async ({ input }) => {
      return db.getArticlesByCategory(input.categoryId);
    }),

    getRecent: protectedProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getRecentArticles(input?.limit || 10);
    }),

    create: editorProcedure
      .input(
        z.object({
          title: z.string().min(1),
          content: z.string().optional(),
          excerpt: z.string().optional(),
          categoryId: z.number().optional(),
          status: z.enum(["draft", "published", "archived"]).optional(),
          isPinned: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const slug = generateSlug(input.title) + "-" + nanoid(6);
        const id = await db.createArticle({
          ...input,
          slug,
          createdById: ctx.user.id,
          lastEditedById: ctx.user.id,
          publishedAt: input.status === "published" ? new Date() : undefined,
        });

        // Create initial version
        await db.createArticleVersion({
          articleId: id,
          title: input.title,
          content: input.content || "",
          versionNumber: 1,
          changeDescription: "Initial version",
          createdById: ctx.user.id,
        });

        await db.logActivity({
          userId: ctx.user.id,
          action: "create",
          resourceType: "article",
          resourceId: id,
          resourceTitle: input.title,
        });

        return { id, slug };
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          content: z.string().optional(),
          excerpt: z.string().optional(),
          categoryId: z.number().nullable().optional(),
          status: z.enum(["draft", "published", "archived"]).optional(),
          isPinned: z.boolean().optional(),
          changeDescription: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, changeDescription, ...data } = input;
        const article = await db.getArticleById(id);
        if (!article) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });
        }

        // Update article
        await db.updateArticle(id, {
          ...data,
          lastEditedById: ctx.user.id,
          publishedAt: data.status === "published" && article.status !== "published" ? new Date() : article.publishedAt,
        });

        // Create new version if content or title changed
        if (input.title || input.content) {
          const latestVersion = await db.getLatestVersionNumber(id);
          await db.createArticleVersion({
            articleId: id,
            title: input.title || article.title,
            content: input.content ?? article.content ?? "",
            versionNumber: latestVersion + 1,
            changeDescription: changeDescription || "Updated",
            createdById: ctx.user.id,
          });
        }

        await db.logActivity({
          userId: ctx.user.id,
          action: "update",
          resourceType: "article",
          resourceId: id,
          resourceTitle: input.title || article.title,
        });

        return { success: true };
      }),

    delete: editorProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const article = await db.getArticleById(input.id);
      await db.deleteArticle(input.id);
      await db.logActivity({
        userId: ctx.user.id,
        action: "delete",
        resourceType: "article",
        resourceId: input.id,
        resourceTitle: article?.title,
      });
      return { success: true };
    }),

    search: protectedProcedure
      .input(z.object({ query: z.string(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return db.searchArticles(input.query, input.limit);
      }),
  }),

  // ==================== ARTICLE VERSIONS ====================
  versions: router({
    list: protectedProcedure.input(z.object({ articleId: z.number() })).query(async ({ input }) => {
      return db.getArticleVersions(input.articleId);
    }),

    get: protectedProcedure
      .input(z.object({ articleId: z.number(), versionNumber: z.number() }))
      .query(async ({ input }) => {
        return db.getArticleVersion(input.articleId, input.versionNumber);
      }),

    restore: editorProcedure
      .input(z.object({ articleId: z.number(), versionNumber: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const version = await db.getArticleVersion(input.articleId, input.versionNumber);
        if (!version) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
        }

        await db.updateArticle(input.articleId, {
          title: version.title,
          content: version.content,
          lastEditedById: ctx.user.id,
        });

        const latestVersion = await db.getLatestVersionNumber(input.articleId);
        await db.createArticleVersion({
          articleId: input.articleId,
          title: version.title,
          content: version.content || "",
          versionNumber: latestVersion + 1,
          changeDescription: `Restored from version ${input.versionNumber}`,
          createdById: ctx.user.id,
        });

        await db.logActivity({
          userId: ctx.user.id,
          action: "restore",
          resourceType: "article",
          resourceId: input.articleId,
          resourceTitle: version.title,
          metadata: { restoredVersion: input.versionNumber },
        });

        return { success: true };
      }),

    // Compare two versions and return diff
    diff: protectedProcedure
      .input(
        z.object({
          articleId: z.number(),
          fromVersion: z.number(),
          toVersion: z.number(),
        })
      )
      .query(async ({ input }) => {
        const [fromVer, toVer] = await Promise.all([
          db.getArticleVersion(input.articleId, input.fromVersion),
          db.getArticleVersion(input.articleId, input.toVersion),
        ]);

        if (!fromVer || !toVer) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
        }

        // Generate diff for title
        const titleDiffs = dmp.diff_main(fromVer.title || "", toVer.title || "");
        dmp.diff_cleanupSemantic(titleDiffs);

        // Generate diff for content
        const contentDiffs = dmp.diff_main(fromVer.content || "", toVer.content || "");
        dmp.diff_cleanupSemantic(contentDiffs);

        // Convert diffs to a more usable format
        // -1 = deletion, 0 = equal, 1 = insertion
        const formatDiffs = (diffs: [number, string][]) =>
          diffs.map(([type, text]) => ({
            type: type === -1 ? "removed" : type === 1 ? "added" : "unchanged",
            text,
          }));

        return {
          fromVersion: {
            versionNumber: fromVer.versionNumber,
            title: fromVer.title,
            createdAt: fromVer.createdAt,
          },
          toVersion: {
            versionNumber: toVer.versionNumber,
            title: toVer.title,
            createdAt: toVer.createdAt,
          },
          titleDiff: formatDiffs(titleDiffs),
          contentDiff: formatDiffs(contentDiffs),
        };
      }),
  }),

  // ==================== PERMISSIONS ====================
  permissions: router({
    getUserPermissions: protectedProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
      return db.getUserPermissions(input.userId);
    }),

    getResourcePermissions: adminProcedure
      .input(z.object({ resourceType: z.enum(["category", "article"]), resourceId: z.number() }))
      .query(async ({ input }) => {
        return db.getResourcePermissions(input.resourceType, input.resourceId);
      }),

    grant: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          resourceType: z.enum(["category", "article"]),
          resourceId: z.number(),
          permissionLevel: z.enum(["read", "edit", "admin"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await db.createPermission({
          ...input,
          grantedById: ctx.user.id,
        });
        return { id };
      }),

    revoke: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deletePermission(input.id);
      return { success: true };
    }),
  }),

  // ==================== SOPs ====================
  sops: router({
    list: protectedProcedure
      .input(z.object({ status: z.enum(["draft", "published", "archived"]).optional() }).optional())
      .query(async ({ input }) => {
        return db.getAllSOPs(input?.status);
      }),

    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getSOPById(input.id);
    }),

    getBySlug: protectedProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
      return db.getSOPBySlug(input.slug);
    }),

    getByCategory: protectedProcedure.input(z.object({ categoryId: z.number() })).query(async ({ input }) => {
      return db.getSOPsByCategory(input.categoryId);
    }),

    create: editorProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          scribeUrl: z.string().optional(),
          scribeEmbedCode: z.string().optional(),
          categoryId: z.number().optional(),
          status: z.enum(["draft", "published", "archived"]).optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const slug = generateSlug(input.title) + "-" + nanoid(6);
        const id = await db.createSOP({
          ...input,
          slug,
          createdById: ctx.user.id,
          lastEditedById: ctx.user.id,
        });

        await db.logActivity({
          userId: ctx.user.id,
          action: "create",
          resourceType: "sop",
          resourceId: id,
          resourceTitle: input.title,
        });

        // Generate embeddings for semantic search (async, don't block)
        if (input.status === "published") {
          embeddings.updateSOPEmbedding(id)
            .catch((err: Error) => console.error("Failed to generate SOP embedding:", err));
        }

        return { id, slug };
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          scribeUrl: z.string().optional(),
          scribeEmbedCode: z.string().optional(),
          categoryId: z.number().nullable().optional(),
          status: z.enum(["draft", "published", "archived"]).optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const sop = await db.getSOPById(id);
        if (!sop) {
          throw new TRPCError({ code: "NOT_FOUND", message: "SOP not found" });
        }

        await db.updateSOP(id, {
          ...data,
          lastEditedById: ctx.user.id,
        });

        await db.logActivity({
          userId: ctx.user.id,
          action: "update",
          resourceType: "sop",
          resourceId: id,
          resourceTitle: input.title || sop.title,
        });

        // Generate embeddings for semantic search when published (async, don't block)
        const updatedStatus = input.status || sop.status;
        if (updatedStatus === "published") {
          embeddings.updateSOPEmbedding(id)
            .catch((err: Error) => console.error("Failed to generate SOP embedding:", err));
        }

        return { success: true };
      }),

    delete: editorProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const sop = await db.getSOPById(input.id);
      await db.deleteSOP(input.id);
      await db.logActivity({
        userId: ctx.user.id,
        action: "delete",
        resourceType: "sop",
        resourceId: input.id,
        resourceTitle: sop?.title,
      });
      return { success: true };
    }),

    search: protectedProcedure
      .input(z.object({ query: z.string(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return db.searchSOPs(input.query, input.limit);
      }),
  }),

  // ==================== SOP CATEGORIES ====================
  sopCategories: router({
    list: protectedProcedure.query(async () => {
      return db.getAllSOPCategories();
    }),

    create: editorProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          parentId: z.number().optional(),
          icon: z.string().optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const slug = generateSlug(input.name) + "-" + nanoid(6);
        const id = await db.createSOPCategory({
          ...input,
          slug,
          createdById: ctx.user.id,
        });
        return { id, slug };
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          parentId: z.number().nullable().optional(),
          icon: z.string().optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSOPCategory(id, data);
        return { success: true };
      }),

    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteSOPCategory(input.id);
      return { success: true };
    }),
  }),
  // ==================== AI CHAT ====================
  chat: router({
    send: protectedProcedure     .input(
        z.object({
          sessionId: z.string(),
          message: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Save user message
        await db.saveChatMessage({
          userId: ctx.user.id,
          sessionId: input.sessionId,
          role: "user",
          content: input.message,
        });

        // Use semantic search for better context retrieval
        let relevantArticles: Awaited<ReturnType<typeof db.searchArticles>> = [];
        let relevantSOPs: Awaited<ReturnType<typeof db.searchSOPs>> = [];
        let usedSemanticSearch = false;

        try {
          // Try semantic search first
          const semanticResults = await embeddings.semanticSearch(input.message, 8);
          
          // Fetch full content for semantic results
          for (const result of semanticResults) {
            if (result.type === "article" && relevantArticles.length < 5) {
              const article = await db.getArticleById(result.id);
              if (article && article.status === "published") {
                relevantArticles.push(article);
              }
            } else if (result.type === "sop" && relevantSOPs.length < 3) {
              const sop = await db.getSOPById(result.id);
              if (sop && sop.status === "published") {
                relevantSOPs.push(sop);
              }
            }
          }
          usedSemanticSearch = true;
        } catch (error) {
          console.error("Semantic search failed, falling back to text search:", error);
          // Fallback to traditional search
          relevantArticles = await db.searchArticles(input.message, 5);
          relevantSOPs = await db.searchSOPs(input.message, 3);
        }

        // If semantic search returned no results, try text search as backup
        if (usedSemanticSearch && relevantArticles.length === 0 && relevantSOPs.length === 0) {
          relevantArticles = await db.searchArticles(input.message, 5);
          relevantSOPs = await db.searchSOPs(input.message, 3);
        }

        // If still no results, get some recent published articles as context
        if (relevantArticles.length === 0 && relevantSOPs.length === 0) {
          relevantArticles = await db.getPublishedArticles(5);
          relevantSOPs = await db.getPublishedSOPs(3);
        }

        // Build context from wiki content
        const context = [
          ...relevantArticles.map((a) => `Artikel: ${a.title}\n${a.content?.substring(0, 1500) || ""}`),
          ...relevantSOPs.map((s) => `SOP: ${s.title}\n${s.description || ""}`),
        ].join("\n\n---\n\n");

        // Get chat history for context
        const history = await db.getChatHistory(ctx.user.id, input.sessionId, 10);

        // Build conversation summary if history is long
        let conversationContext = "";
        if (history.length > 4) {
          // Summarize older messages for context
          const olderMessages = history.slice(0, -4);
          conversationContext = `\n\nBisheriger Gesprächsverlauf (Zusammenfassung):\n${olderMessages.map(m => `${m.role === 'user' ? 'Benutzer' : 'Assistent'}: ${m.content.substring(0, 150)}${m.content.length > 150 ? '...' : ''}`).join('\n')}`;
        }

        // Build messages for LLM with improved system prompt
        const messages = [
          {
            role: "system" as const,
            content: `Du bist ein hilfreicher Assistent für das Company Wiki. Deine Aufgaben:

1. **Beantworte Fragen** basierend auf den Wiki-Inhalten unten.
2. **Zitiere Quellen** explizit mit dem Format: "Laut dem Artikel '[Titel]'..." oder "In der SOP '[Titel]' steht..."
3. **Beziehe dich auf frühere Fragen** wenn der Benutzer Folgefragen stellt (z.B. "Erkläre das genauer", "Was meinst du damit?").
4. **Schlage verwandte Themen vor** am Ende deiner Antwort, wenn passend.
5. Antworte auf Deutsch, es sei denn, der Benutzer fragt auf Englisch.

Relevante Wiki-Inhalte:
${context || "Keine relevanten Inhalte gefunden."}${conversationContext}`,
          },
          ...history.slice(-8).map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
          {
            role: "user" as const,
            content: input.message,
          },
        ];

        try {
          const response = await invokeLLM({ messages });
          const rawContent = response.choices[0]?.message?.content;
          const assistantMessage = typeof rawContent === 'string' ? rawContent : "Entschuldigung, ich konnte keine Antwort generieren.";

          // Save assistant response
          const sources = [
            ...relevantArticles.map((a) => ({ type: "article", id: a.id, title: a.title, slug: a.slug })),
            ...relevantSOPs.map((s) => ({ type: "sop", id: s.id, title: s.title, slug: s.slug })),
          ];

          await db.saveChatMessage({
            userId: ctx.user.id,
            sessionId: input.sessionId,
            role: "assistant",
            content: assistantMessage,
            sources: sources.length > 0 ? sources : null,
          });

          return {
            message: assistantMessage,
            sources,
          };
        } catch (error) {
          console.error("LLM error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate response",
          });
        }
      }),

    getHistory: protectedProcedure.input(z.object({ sessionId: z.string() })).query(async ({ input, ctx }) => {
      return db.getChatHistory(ctx.user.id, input.sessionId);
    }),

    getSessions: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserChatSessions(ctx.user.id);
    }),
  }),

  // ==================== ACTIVITY ====================
  activity: router({
    getRecent: protectedProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getRecentActivity(input?.limit || 20);
    }),

    getUserActivity: protectedProcedure
      .input(z.object({ userId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getUserActivity(input.userId, input.limit);
      }),
  }),

  // ==================== COMMENTS ====================
  comments: router({
    getByArticle: protectedProcedure.input(z.object({ articleId: z.number() })).query(async ({ input }) => {
      return db.getArticleComments(input.articleId);
    }),

    create: protectedProcedure
      .input(
        z.object({
          articleId: z.number(),
          content: z.string().min(1),
          parentId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await db.createComment({
          ...input,
          userId: ctx.user.id,
        });

        // Notify article author
        const article = await db.getArticleById(input.articleId);
        if (article && article.createdById !== ctx.user.id) {
          await db.createNotification({
            userId: article.createdById,
            type: "comment",
            title: "Neuer Kommentar",
            message: `${ctx.user.name || "Ein Benutzer"} hat einen Kommentar zu "${article.title}" hinzugefügt.`,
            resourceType: "article",
            resourceId: input.articleId,
          });

          // Send email notification to article author
          const author = await db.getUserById(article.createdById);
          if (author?.email) {
            const { notifyNewComment } = await import("./email");
            notifyNewComment(
              article.createdById,
              author.email,
              ctx.user.name || "Ein Benutzer",
              article.title,
              input.content.substring(0, 200),
              `/wiki/article/${article.slug}`
            ).catch(console.error);
          }
        }

        // Process @mentions in comment content
        const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
        const mentionMatches = input.content.match(mentionRegex);
        if (mentionMatches && article) {
          const allUsers = await db.getAllUsers();
          for (const match of mentionMatches) {
            const mentionName = match.substring(1).toLowerCase(); // Remove @ and lowercase
            const mentionedUser = allUsers.find(
              (u) => u.name?.toLowerCase().includes(mentionName) || u.email?.toLowerCase().startsWith(mentionName)
            );
            if (mentionedUser && mentionedUser.id !== ctx.user.id) {
              // Create mention record
              await db.createMention({
                mentionedUserId: mentionedUser.id,
                mentionedByUserId: ctx.user.id,
                contextType: "comment",
                contextId: id,
                contextTitle: article.title,
              });

              // Create in-app notification
              await db.createNotification({
                userId: mentionedUser.id,
                type: "mention",
                title: `${ctx.user.name || "Jemand"} hat Sie erwähnt`,
                message: `In einem Kommentar zu: ${article.title}`,
                resourceType: "article",
                resourceId: input.articleId,
              });

              // Send email notification
              if (mentionedUser.email) {
                const { notifyMention } = await import("./email");
                notifyMention(
                  mentionedUser.id,
                  mentionedUser.email,
                  ctx.user.name || "Jemand",
                  "comment",
                  article.title,
                  `/wiki/article/${article.slug}`
                ).catch(console.error);
              }
            }
          }
        }

        return { id };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), content: z.string().min(1) }))
      .mutation(async ({ input }) => {
        await db.updateComment(input.id, { content: input.content });
        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteComment(input.id);
      return { success: true };
    }),

    resolve: editorProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.updateComment(input.id, { isResolved: true });
      return { success: true };
    }),
  }),

  // ==================== NOTIFICATIONS ====================
  notifications: router({
    list: protectedProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      return db.getUserNotifications(ctx.user.id, input?.limit || 20);
    }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadNotificationCount(ctx.user.id);
    }),

    markAsRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.markNotificationAsRead(input.id);
      return { success: true };
    }),

    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ==================== GLOBAL SEARCH ====================
  search: router({
    // Autocomplete suggestions
    suggestions: protectedProcedure
      .input(z.object({ query: z.string().min(1), limit: z.number().optional() }))
      .query(async ({ input }) => {
        const limit = input.limit || 5;
        const query = input.query.toLowerCase();
        
        // Get matching articles
        const articlesResult = await db.searchArticles(query, limit);
        const articles = articlesResult.map(a => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          type: "article" as const,
        }));
        
        // Get matching SOPs
        const sopsResult = await db.searchSOPs(query, limit);
        const sopsList = sopsResult.map(s => ({
          id: s.id,
          title: s.title,
          slug: s.slug,
          type: "sop" as const,
        }));
        
        // Combine and limit
        const combined = [...articles, ...sopsList]
          .slice(0, limit);
        
        return combined;
      }),

    // Traditional full-text search
    global: protectedProcedure
      .input(
        z.object({
          query: z.string().min(1),
          type: z.enum(["all", "articles", "sops"]).optional(),
          limit: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const limit = input.limit || 20;
        const results: {
          articles: Awaited<ReturnType<typeof db.searchArticles>>;
          sops: Awaited<ReturnType<typeof db.searchSOPs>>;
        } = {
          articles: [],
          sops: [],
        };

        if (input.type === "all" || input.type === "articles" || !input.type) {
          results.articles = await db.searchArticles(input.query, limit);
        }

        if (input.type === "all" || input.type === "sops" || !input.type) {
          results.sops = await db.searchSOPs(input.query, limit);
        }

        return results;
      }),

    // Semantic AI-powered search
    semantic: protectedProcedure
      .input(
        z.object({
          query: z.string().min(1),
          type: z.enum(["all", "articles", "sops"]).optional(),
          limit: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const limit = input.limit || 10;
        
        try {
          // Get semantic search results
          const semanticResults = await embeddings.semanticSearch(input.query, limit * 2);
          
          // Filter by type if specified
          const filteredResults = semanticResults.filter((r) => {
            if (!input.type || input.type === "all") return true;
            if (input.type === "articles") return r.type === "article";
            if (input.type === "sops") return r.type === "sop";
            return true;
          }).slice(0, limit);

          // Fetch full article/SOP data for results
          const articlesData: Array<{ id: number; title: string; excerpt: string | null; slug: string; similarity: number }> = [];
          const sopsData: Array<{ id: number; title: string; description: string | null; slug: string; similarity: number }> = [];

          for (const result of filteredResults) {
            if (result.type === "article") {
              const article = await db.getArticleById(result.id);
              if (article && article.status === "published") {
                articlesData.push({
                  id: article.id,
                  title: article.title,
                  excerpt: article.excerpt,
                  slug: article.slug,
                  similarity: result.similarity,
                });
              }
            } else if (result.type === "sop") {
              const sop = await db.getSOPById(result.id);
              if (sop && sop.status === "published") {
                sopsData.push({
                  id: sop.id,
                  title: sop.title,
                  description: sop.description,
                  slug: sop.slug,
                  similarity: result.similarity,
                });
              }
            }
          }

          return {
            articles: articlesData,
            sops: sopsData,
            isSemanticSearch: true,
          };
        } catch (error) {
          console.error("Semantic search failed, falling back to text search:", error);
          // Fallback to traditional search if semantic search fails
          const articles = input.type !== "sops" ? await db.searchArticles(input.query, limit) : [];
          const sops = input.type !== "articles" ? await db.searchSOPs(input.query, limit) : [];
          return {
            articles: articles.map((a) => ({ ...a, similarity: 0 })),
            sops: sops.map((s) => ({ ...s, similarity: 0 })),
            isSemanticSearch: false,
          };
        }
      }),

    // Find similar articles
    similar: protectedProcedure
      .input(z.object({ articleId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        try {
          const similarResults = await embeddings.findSimilarArticles(input.articleId, input.limit || 5);
          
          const articles = await Promise.all(
            similarResults.map(async (r) => {
              const article = await db.getArticleById(r.articleId);
              return article ? { ...article, similarity: r.similarity } : null;
            })
          );

          return articles.filter((a) => a !== null && a.status === "published");
        } catch (error) {
          console.error("Similar articles search failed:", error);
          return [];
        }
      }),
  }),

  // ==================== EMBEDDINGS MANAGEMENT ====================
  embeddings: router({
    // Update embedding for a specific article
    updateArticle: editorProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input }) => {
        await embeddings.updateArticleEmbedding(input.articleId);
        return { success: true };
      }),

    // Update embedding for a specific SOP
    updateSOP: editorProcedure
      .input(z.object({ sopId: z.number() }))
      .mutation(async ({ input }) => {
        await embeddings.updateSOPEmbedding(input.sopId);
        return { success: true };
      }),

    // Regenerate all embeddings (admin only)
    regenerateAll: adminProcedure.mutation(async () => {
      const result = await embeddings.regenerateAllEmbeddings();
      return result;
    }),
  }),

  // ==================== DASHBOARD STATS ====================
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      const [articles, sops, categories, sopCats, users] = await Promise.all([
        db.getAllArticles("published"),
        db.getAllSOPs("published"),
        db.getAllCategories(),
        db.getAllSOPCategories(),
        db.getAllUsers(),
      ]);

      return {
        articleCount: articles.length,
        sopCount: sops.length,
        categoryCount: categories.length,
        sopCategoryCount: sopCats.length,
        userCount: users.length,
      };
    }),

    recentArticles: protectedProcedure.query(async () => {
      return db.getRecentArticles(5);
    }),

    recentActivity: protectedProcedure.query(async () => {
      return db.getRecentActivity(10);
    }),
  }),

  // ==================== ARTICLE TEMPLATES ====================
  templates: router({
    list: protectedProcedure.query(async () => {
      return db.getAllTemplates();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getTemplateById(input.id);
      }),

    getBySlug: protectedProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getTemplateBySlug(input.slug);
      }),

    getSystem: protectedProcedure.query(async () => {
      return db.getSystemTemplates();
    }),

    getCustom: protectedProcedure.query(async () => {
      return db.getCustomTemplates();
    }),

    create: editorProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          content: z.string(),
          icon: z.string().optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const slug = generateSlug(input.name) + "-" + nanoid(6);
        const id = await db.createTemplate({
          ...input,
          slug,
          isSystem: false,
          createdById: ctx.user.id,
        });
        return { id, slug };
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          content: z.string().optional(),
          icon: z.string().optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        // Don't allow editing system templates' core content
        const template = await db.getTemplateById(id);
        if (template?.isSystem) {
          delete (data as any).content;
        }
        await db.updateTemplate(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTemplate(input.id);
        return { success: true };
      }),
  }),

  // ==================== MEDIA UPLOAD ====================
  media: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        return db.getUserMedia(ctx.user.id, input?.limit || 50);
      }),

    listAll: editorProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getAllMedia(input?.limit || 100);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getMediaById(input.id);
      }),

    upload: protectedProcedure
      .input(
        z.object({
          filename: z.string(),
          originalFilename: z.string(),
          mimeType: z.string(),
          size: z.number(),
          url: z.string(),
          fileKey: z.string(),
          width: z.number().optional(),
          height: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await db.createMedia({
          ...input,
          uploadedById: ctx.user.id,
        });
        return { id, url: input.url };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Check ownership or admin
        const mediaItem = await db.getMediaById(input.id);
        if (!mediaItem) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (mediaItem.uploadedById !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.deleteMedia(input.id);
        return { success: true };
      }),
  }),

  // ==================== AUDIT LOG ====================
  auditLog: router({
    list: adminProcedure
      .input(
        z.object({
          userId: z.number().optional(),
          action: z.string().optional(),
          resourceType: z.string().optional(),
          resourceId: z.number().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return db.getAuditLog(input || {});
      }),

    count: adminProcedure
      .input(
        z.object({
          userId: z.number().optional(),
          action: z.string().optional(),
          resourceType: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return db.getAuditLogCount(input || {});
      }),

    getActions: adminProcedure.query(async () => {
      return db.getDistinctAuditActions();
    }),

    getResourceTypes: adminProcedure.query(async () => {
      return db.getDistinctAuditResourceTypes();
    }),
  }),

  // ==================== ARTICLE REVIEWS (WORKFLOW) ====================
  reviews: router({
    // Get pending reviews for editors/admins
    getPending: editorProcedure.query(async ({ ctx }) => {
      return db.getPendingReviews(ctx.user.id);
    }),

    // Get pending review count
    pendingCount: editorProcedure.query(async () => {
      return db.getPendingReviewCount();
    }),

    // Get reviews for an article
    getByArticle: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .query(async ({ input }) => {
        return db.getArticleReviewsByArticle(input.articleId);
      }),

    // Get latest review for an article
    getLatest: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .query(async ({ input }) => {
        return db.getLatestArticleReview(input.articleId);
      }),

    // Get user's review requests
    getUserRequests: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserReviewRequests(ctx.user.id);
    }),

    // Request review for an article
    requestReview: protectedProcedure
      .input(
        z.object({
          articleId: z.number(),
          message: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Update article status to pending_review
        await db.updateArticle(input.articleId, { status: "pending_review" });

        // Create review request
        const id = await db.createArticleReview({
          articleId: input.articleId,
          requestedById: ctx.user.id,
          requestMessage: input.message,
        });

        // Log audit
        const article = await db.getArticleById(input.articleId);
        await db.createAuditLogEntry({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "review_requested",
          resourceType: "article",
          resourceId: input.articleId,
          resourceTitle: article?.title,
        });

        // Notify editors
        const editors = await db.getAllUsers();
        const editorUsers = editors.filter(u => u.role === "editor" || u.role === "admin");
        for (const editor of editorUsers) {
          if (editor.id !== ctx.user.id) {
            await db.createNotification({
              userId: editor.id,
              type: "review_request",
              title: "Neue Review-Anfrage",
              message: `${ctx.user.name || "Ein Benutzer"} hat eine Review für "${article?.title}" angefragt.`,
              resourceType: "article",
              resourceId: input.articleId,
            });
          }
        }

        return { id };
      }),

    // Approve article
    approve: editorProcedure
      .input(
        z.object({
          reviewId: z.number(),
          message: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const review = await db.getArticleReviewById(input.reviewId);
        if (!review) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Update review
        await db.updateArticleReview(input.reviewId, {
          status: "approved",
          reviewerId: ctx.user.id,
          reviewMessage: input.message,
          reviewedAt: new Date(),
        });

        // Publish article
        await db.updateArticle(review.articleId, {
          status: "published",
          publishedAt: new Date(),
        });

        // Log audit
        const article = await db.getArticleById(review.articleId);
        await db.createAuditLogEntry({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "review_approved",
          resourceType: "article",
          resourceId: review.articleId,
          resourceTitle: article?.title,
        });

        // Notify author
        await db.createNotification({
          userId: review.requestedById,
          type: "review_approved",
          title: "Artikel genehmigt",
          message: `Ihr Artikel "${article?.title}" wurde genehmigt und veröffentlicht.`,
          resourceType: "article",
          resourceId: review.articleId,
        });

        // Generate embeddings for semantic search (async, don't block)
        if (article) {
          embeddings.updateArticleEmbedding(article.id)
            .catch((err: Error) => console.error("Failed to generate embedding:", err));
        }

        return { success: true };
      }),

    // Reject article
    reject: editorProcedure
      .input(
        z.object({
          reviewId: z.number(),
          message: z.string().min(1, "Bitte geben Sie einen Grund an"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const review = await db.getArticleReviewById(input.reviewId);
        if (!review) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Update review
        await db.updateArticleReview(input.reviewId, {
          status: "rejected",
          reviewerId: ctx.user.id,
          reviewMessage: input.message,
          reviewedAt: new Date(),
        });

        // Set article back to draft
        await db.updateArticle(review.articleId, { status: "draft" });

        // Log audit
        const article = await db.getArticleById(review.articleId);
        await db.createAuditLogEntry({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "review_rejected",
          resourceType: "article",
          resourceId: review.articleId,
          resourceTitle: article?.title,
        });

        // Notify author
        await db.createNotification({
          userId: review.requestedById,
          type: "review_rejected",
          title: "Artikel abgelehnt",
          message: `Ihr Artikel "${article?.title}" wurde abgelehnt. Grund: ${input.message}`,
          resourceType: "article",
          resourceId: review.articleId,
        });

        return { success: true };
      }),

    // Request changes
    requestChanges: editorProcedure
      .input(
        z.object({
          reviewId: z.number(),
          message: z.string().min(1, "Bitte geben Sie die gewünschten Änderungen an"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const review = await db.getArticleReviewById(input.reviewId);
        if (!review) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Update review
        await db.updateArticleReview(input.reviewId, {
          status: "changes_requested",
          reviewerId: ctx.user.id,
          reviewMessage: input.message,
          reviewedAt: new Date(),
        });

        // Set article back to draft
        await db.updateArticle(review.articleId, { status: "draft" });

        // Log audit
        const article = await db.getArticleById(review.articleId);
        await db.createAuditLogEntry({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "review_changes_requested",
          resourceType: "article",
          resourceId: review.articleId,
          resourceTitle: article?.title,
        });

        // Notify author
        await db.createNotification({
          userId: review.requestedById,
          type: "review_changes_requested",
          title: "Änderungen angefordert",
          message: `Für Ihren Artikel "${article?.title}" wurden Änderungen angefordert.`,
          resourceType: "article",
          resourceId: review.articleId,
        });

        return { success: true };
      }),
  }),

  // ==================== ARTICLE FEEDBACK ====================
  feedback: router({
    // Get feedback for an article
    getByArticle: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .query(async ({ input }) => {
        return db.getArticleFeedback(input.articleId);
      }),

    // Get user's feedback for an article
    getUserFeedback: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .query(async ({ input, ctx }) => {
        return db.getUserFeedbackForArticle(input.articleId, ctx.user.id);
      }),

    // Get feedback stats for an article
    getStats: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .query(async ({ input }) => {
        return db.getFeedbackStats(input.articleId);
      }),

    // Get all feedback (for admins/editors)
    list: editorProcedure
      .input(
        z.object({
          status: z.enum(["pending", "reviewed", "resolved", "dismissed"]).optional(),
          limit: z.number().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return db.getAllFeedback(input?.status, input?.limit);
      }),

    // Get pending feedback count
    pendingCount: editorProcedure.query(async () => {
      return db.getPendingFeedbackCount();
    }),

    // Submit feedback
    submit: protectedProcedure
      .input(
        z.object({
          articleId: z.number(),
          rating: z.enum(["helpful", "not_helpful", "needs_improvement"]),
          feedbackType: z.enum(["content", "accuracy", "clarity", "completeness", "other"]),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Check if user already submitted feedback for this article
        const existing = await db.getUserFeedbackForArticle(input.articleId, ctx.user.id);
        if (existing) {
          // Update existing feedback
          await db.updateArticleFeedback(existing.id, {
            rating: input.rating,
            feedbackType: input.feedbackType,
            comment: input.comment,
            status: "pending",
          });
          return { id: existing.id, updated: true };
        }

        // Create new feedback
        const id = await db.createArticleFeedback({
          articleId: input.articleId,
          userId: ctx.user.id,
          rating: input.rating,
          feedbackType: input.feedbackType,
          comment: input.comment,
        });

        // Notify article author
        const article = await db.getArticleById(input.articleId);
        if (article && article.createdById !== ctx.user.id) {
          await db.createNotification({
            userId: article.createdById,
            type: "feedback",
            title: "Neues Feedback",
            message: `${ctx.user.name || "Ein Benutzer"} hat Feedback zu "${article.title}" gegeben.`,
            resourceType: "article",
            resourceId: input.articleId,
          });
        }

        await db.logActivity({
          userId: ctx.user.id,
          action: "feedback",
          resourceType: "article",
          resourceId: input.articleId,
          resourceTitle: article?.title,
        });

        return { id, updated: false };
      }),

    // Update feedback status (for editors/admins)
    updateStatus: editorProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pending", "reviewed", "resolved", "dismissed"]),
          adminResponse: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.updateArticleFeedback(input.id, {
          status: input.status,
          adminResponse: input.adminResponse,
          respondedById: ctx.user.id,
          respondedAt: new Date(),
        });

        // Notify the feedback author
        const feedback = await db.getArticleFeedbackById(input.id);
        if (feedback && feedback.userId !== ctx.user.id) {
          const article = await db.getArticleById(feedback.articleId);
          await db.createNotification({
            userId: feedback.userId,
            type: "feedback_response",
            title: "Feedback beantwortet",
            message: `Ihr Feedback zu "${article?.title || "einem Artikel"}" wurde bearbeitet.`,
            resourceType: "article",
            resourceId: feedback.articleId,
          });
        }

        return { success: true };
      }),

    // Delete feedback
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteArticleFeedback(input.id);
        return { success: true };
      }),
  }),

  // ==================== FAVORITES ====================
  favorites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserFavorites(ctx.user.id);
    }),

    add: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return db.addFavorite(ctx.user.id, input.articleId);
      }),

    remove: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return db.removeFavorite(ctx.user.id, input.articleId);
      }),

    check: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .query(async ({ input, ctx }) => {
        return db.isFavorite(ctx.user.id, input.articleId);
      }),
  }),

  // ==================== RECENTLY VIEWED ====================
  recentlyViewed: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        return db.getRecentlyViewed(ctx.user.id, input?.limit || 10);
      }),

    add: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return db.addRecentlyViewed(ctx.user.id, input.articleId);
      }),
  }),

  // ==================== USER PREFERENCES ====================
  preferences: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserPreferences(ctx.user.id);
    }),

    update: protectedProcedure
      .input(
        z.object({
          theme: z.enum(["light", "dark", "system"]).optional(),
          sidebarCollapsed: z.boolean().optional(),
          keyboardShortcutsEnabled: z.boolean().optional(),
          emailNotifications: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.upsertUserPreferences(ctx.user.id, input);
      }),
  }),

  // ==================== LEAVE REQUESTS ====================
  leave: router({
    // Get current user's leave requests
    myRequests: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLeaveRequests(ctx.user.id);
    }),

    // Get current user's leave balance
    myBalance: protectedProcedure
      .input(z.object({ year: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const year = input?.year || new Date().getFullYear();
        return db.getLeaveBalance(ctx.user.id, year);
      }),

    // Create a new leave request
    create: protectedProcedure
      .input(
        z.object({
          leaveType: z.enum(["vacation", "sick", "personal", "parental", "other"]),
          startDate: z.string(),
          endDate: z.string(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);
        
        // Validate date range
        if (endDate < startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Enddatum darf nicht vor dem Startdatum liegen",
          });
        }
        
        // Calculate total days (simple calculation, excluding weekends)
        let totalDays = 0;
        const current = new Date(startDate);
        while (current <= endDate) {
          const dayOfWeek = current.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            totalDays++;
          }
          current.setDate(current.getDate() + 1);
        }

        const request = await db.createLeaveRequest({
          userId: ctx.user.id,
          leaveType: input.leaveType,
          startDate,
          endDate,
          totalDays,
          reason: input.reason,
        });

        // Notify admins (in-app)
        const admins = await db.getAllUsers();
        for (const admin of admins.filter(u => u.role === "admin")) {
          await db.createNotification({
            userId: admin.id,
            type: "leave_request",
            title: "Neuer Urlaubsantrag",
            message: `${ctx.user.name || "Ein Mitarbeiter"} hat einen Urlaubsantrag gestellt.`,
            resourceType: "leave",
            resourceId: request?.id,
          });
        }

        // Send email notifications to admins (async)
        const { notifyAdminsOfLeaveRequest } = await import("./email");
        notifyAdminsOfLeaveRequest(
          ctx.user.name || "Ein Mitarbeiter",
          input.leaveType,
          startDate,
          endDate,
          totalDays,
          input.reason
        ).catch(console.error);

        return request;
      }),

    // Cancel own leave request
    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return db.cancelLeaveRequest(input.id, ctx.user.id);
      }),

    // Get all pending requests (for admins)
    pending: adminProcedure.query(async () => {
      return db.getPendingLeaveRequests();
    }),

    // Get all requests with filters (for admins)
    all: adminProcedure
      .input(
        z.object({
          status: z.string().optional(),
          userId: z.number().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return db.getAllLeaveRequests(input);
      }),

    // Approve leave request (for admins)
    approve: adminProcedure
      .input(
        z.object({
          id: z.number(),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const request = await db.approveLeaveRequest(input.id, ctx.user.id, input.comment);
        
        if (request) {
          await db.createNotification({
            userId: request.userId,
            type: "leave_approved",
            title: "Urlaubsantrag genehmigt",
            message: `Ihr Urlaubsantrag wurde genehmigt.${input.comment ? ` Kommentar: ${input.comment}` : ""}`,
            resourceType: "leave",
            resourceId: request.id,
          });

          // Send email notification (async)
          const { notifyLeaveRequestDecision } = await import("./email");
          const user = await db.getUserById(request.userId);
          if (user?.email) {
            notifyLeaveRequestDecision(
              user.email,
              user.name || "Mitarbeiter",
              "approved",
              new Date(request.startDate),
              new Date(request.endDate),
              input.comment
            ).catch(console.error);
          }
        }

        return request;
      }),

    // Reject leave request (for admins)
    reject: adminProcedure
      .input(
        z.object({
          id: z.number(),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const request = await db.rejectLeaveRequest(input.id, ctx.user.id, input.comment);
        
        if (request) {
          await db.createNotification({
            userId: request.userId,
            type: "leave_rejected",
            title: "Urlaubsantrag abgelehnt",
            message: `Ihr Urlaubsantrag wurde abgelehnt.${input.comment ? ` Grund: ${input.comment}` : ""}`,
            resourceType: "leave",
            resourceId: request.id,
          });

          // Send email notification (async)
          const { notifyLeaveRequestDecision } = await import("./email");
          const user = await db.getUserById(request.userId);
          if (user?.email) {
            notifyLeaveRequestDecision(
              user.email,
              user.name || "Mitarbeiter",
              "rejected",
              new Date(request.startDate),
              new Date(request.endDate),
              input.comment
            ).catch(console.error);
          }
        }

        return request;
      }),

    // Get team calendar (approved leaves)
    calendar: protectedProcedure
      .input(
        z.object({
          startDate: z.string(),
          endDate: z.string(),
        })
      )
      .query(async ({ input }) => {
        return db.getTeamLeaveCalendar(
          new Date(input.startDate),
          new Date(input.endDate)
        );
      }),

    // Pending count for badge
    pendingCount: adminProcedure.query(async () => {
      const pending = await db.getPendingLeaveRequests();
      return pending.length;
    }),

    // Get all users with their leave balances (for admins)
    allBalances: adminProcedure
      .input(z.object({ year: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const year = input?.year || new Date().getFullYear();
        return db.getAllLeaveBalances(year);
      }),

    // Update a user's leave balance (for admins)
    updateBalance: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          year: z.number(),
          totalDays: z.number().min(0).max(365),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await db.updateLeaveBalance(input.userId, input.year, {
          totalDays: input.totalDays,
        });

        // Log the action
        await db.createAuditLogEntry({
          userId: ctx.user.id,
          action: "leave_balance_updated",
          resourceType: "leave_balance",
          resourceId: input.userId,
          newValue: `${input.totalDays} Tage für ${input.year}`,
        });

        return result;
      }),

    // Carry over remaining leave days to next year (for admins)
    carryOver: adminProcedure
      .input(
        z.object({
          fromYear: z.number(),
          maxCarryOverDays: z.number().min(0).max(30).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const maxDays = input.maxCarryOverDays ?? 10;
        const results = await db.carryOverLeaveBalances(input.fromYear, maxDays);

        // Log the action
        await db.createAuditLogEntry({
          userId: ctx.user.id,
          action: "leave_carry_over",
          resourceType: "leave_balance",
          newValue: `Übertrag von ${input.fromYear} nach ${input.fromYear + 1} (max ${maxDays} Tage) für ${results.length} Mitarbeiter`,
        });

        return {
          fromYear: input.fromYear,
          toYear: input.fromYear + 1,
          maxCarryOverDays: maxDays,
          affectedUsers: results.length,
          details: results,
        };
      }),

    // Get carry over settings
    carryOverSettings: adminProcedure.query(async () => {
      return db.getLeaveCarryOverSettings();
    }),

    // Update carry over settings
    updateCarryOverSettings: adminProcedure
      .input(
        z.object({
          maxCarryOverDays: z.number().min(0).max(30),
          autoCarryOver: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.updateLeaveCarryOverSettings(input);

        // Log the action
        await db.createAuditLogEntry({
          userId: ctx.user.id,
          action: "leave_settings_update",
          resourceType: "system_settings",
          newValue: `Auto-Übertrag: ${input.autoCarryOver ? "aktiviert" : "deaktiviert"}, Max. Tage: ${input.maxCarryOverDays}`,
        });

        return { success: true };
      }),
  }),

  // ==================== EMAIL SETTINGS ====================
  emailSettings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const settings = await db.getEmailSettings(ctx.user.id);
      // Return defaults if no settings exist
      return settings || {
        leaveRequestSubmitted: true,
        leaveRequestApproved: true,
        leaveRequestRejected: true,
        articleReviewRequested: true,
        articleApproved: true,
        articleRejected: true,
        articleFeedback: true,
        mentioned: true,
        dailyDigest: false,
        weeklyDigest: true,
      };
    }),

    update: protectedProcedure
      .input(
        z.object({
          leaveRequestSubmitted: z.boolean().optional(),
          leaveRequestApproved: z.boolean().optional(),
          leaveRequestRejected: z.boolean().optional(),
          articleReviewRequested: z.boolean().optional(),
          articleApproved: z.boolean().optional(),
          articleRejected: z.boolean().optional(),
          articleFeedback: z.boolean().optional(),
          mentioned: z.boolean().optional(),
          dailyDigest: z.boolean().optional(),
          weeklyDigest: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.upsertEmailSettings(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ==================== MENTIONS ====================
  mentions: router({
    // Get user mentions
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getUserMentions(ctx.user.id, input?.limit || 50);
      }),

    // Get unread mentions
    unread: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadMentions(ctx.user.id);
    }),

    // Get unread count
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadMentionCount(ctx.user.id);
    }),

    // Mark mention as read
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markMentionAsRead(input.id);
        return { success: true };
      }),

    // Mark all as read
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllMentionsAsRead(ctx.user.id);
      return { success: true };
    }),

    // Search users for @mention autocomplete
    searchUsers: protectedProcedure
      .input(z.object({ query: z.string().min(1), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return db.searchUsers(input.query, input.limit || 10);
      }),

    // Create mention (called when saving content with @mentions)
    create: protectedProcedure
      .input(
        z.object({
          mentionedUserId: z.number(),
          contextType: z.enum(["article", "comment", "sop"]),
          contextId: z.number(),
          contextTitle: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Don't create mention for self
        if (input.mentionedUserId === ctx.user.id) {
          return { success: true, id: null };
        }

        const id = await db.createMention({
          mentionedUserId: input.mentionedUserId,
          mentionedByUserId: ctx.user.id,
          contextType: input.contextType,
          contextId: input.contextId,
          contextTitle: input.contextTitle,
        });

        // Create in-app notification
        await db.createNotification({
          userId: input.mentionedUserId,
          type: "mention",
          title: `${ctx.user.name || "Jemand"} hat Sie erwähnt`,
          message: input.contextTitle ? `In: ${input.contextTitle}` : "In einem Inhalt",
          resourceType: input.contextType,
          resourceId: input.contextId,
        });

        // Send email notification (async, don't wait)
        const mentionedUser = await db.getUserById(input.mentionedUserId);
        if (mentionedUser?.email) {
          const { notifyMention } = await import("./email");
          notifyMention(
            input.mentionedUserId,
            mentionedUser.email,
            ctx.user.name || "Jemand",
            input.contextType,
            input.contextTitle || "Unbenannt",
            input.contextType === "article" ? `/wiki/article/${input.contextId}` :
            input.contextType === "sop" ? `/sops/${input.contextId}` : "/"
          ).catch(console.error);
        }

        return { success: true, id };
      }),
  }),

  // ==================== ASSIGNMENTS ====================
  assignments: router({
    // Get my assignments
    getMyAssignments: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserAssignments(ctx.user.id);
    }),

    // Get assignment by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getAssignment(input.id);
      }),

    // Get assignments for a resource
    getByResource: protectedProcedure
      .input(z.object({
        resourceType: z.enum(["article", "sop"]),
        resourceId: z.number(),
      }))
      .query(async ({ input }) => {
        return db.getAssignmentsByResource(input.resourceType, input.resourceId);
      }),

    // Check if current user has an assignment for a resource
    checkMyAssignment: protectedProcedure
      .input(z.object({
        resourceType: z.enum(["article", "sop"]),
        resourceId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        return db.getAssignmentByUserAndResource(ctx.user.id, input.resourceType, input.resourceId);
      }),

    // Create assignment (admin/editor only)
    create: editorProcedure
      .input(z.object({
        userId: z.number(),
        resourceType: z.enum(["article", "sop"]),
        resourceId: z.number(),
        resourceSlug: z.string(),
        resourceTitle: z.string(),
        dueDate: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const assignment = await db.createAssignment({
          ...input,
          assignedById: ctx.user.id,
        });

        // Create notification for the assigned user
        if (assignment) {
          await db.createNotification({
            userId: input.userId,
            type: "assignment",
            title: "Neue Zuweisung",
            message: `Dir wurde "${input.resourceTitle}" zugewiesen.`,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
          });
        }

        return assignment;
      }),

    // Mark assignment as started
    start: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const assignment = await db.getAssignment(input.id);
        if (!assignment || assignment.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your assignment" });
        }
        return db.markAssignmentStarted(input.id);
      }),

    // Mark assignment as completed
    complete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const assignment = await db.getAssignment(input.id);
        if (!assignment || assignment.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your assignment" });
        }
        return db.markAssignmentCompleted(input.id);
      }),

    // Delete assignment (admin/editor only)
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAssignment(input.id);
        return { success: true };
      }),

    // Get all assignments (admin only)
    list: adminProcedure
      .input(z.object({
        status: z.string().optional(),
        userId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAllAssignments(input);
      }),
  }),

  // ==================== ANNOUNCEMENTS ====================
  announcements: router({
    getActive: publicProcedure.query(async () => {
      return db.getActiveAnnouncements();
    }),

    getAll: adminProcedure.query(async () => {
      return db.getAllAnnouncements();
    }),

    create: adminProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          content: z.string().min(1),
          type: z.enum(["info", "warning", "success", "urgent"]).default("info"),
          isPinned: z.boolean().default(false),
          startsAt: z.date().optional(),
          expiresAt: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createAnnouncement({
          ...input,
          createdById: ctx.user.id,
        });
        return { success: true, id };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(255).optional(),
          content: z.string().min(1).optional(),
          type: z.enum(["info", "warning", "success", "urgent"]).optional(),
          isPinned: z.boolean().optional(),
          isActive: z.boolean().optional(),
          startsAt: z.date().optional().nullable(),
          expiresAt: z.date().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateAnnouncement(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAnnouncement(input.id);
        return { success: true };
      }),
  }),

  // ==================== ANALYTICS ====================
  analytics: router({
    // Track page view
    trackView: protectedProcedure
      .input(
        z.object({
          resourceType: z.enum(["article", "sop", "category"]),
          resourceId: z.number(),
          resourceSlug: z.string().optional(),
          resourceTitle: z.string().optional(),
          referrer: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.trackPageView({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),

    // Track search query
    trackSearch: protectedProcedure
      .input(
        z.object({
          query: z.string(),
          resultsCount: z.number(),
          clickedResourceType: z.enum(["article", "sop"]).optional(),
          clickedResourceId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.trackSearchQuery({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),

    // Get analytics summary (admin only)
    summary: adminProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const startDate = input?.startDate ? new Date(input.startDate) : undefined;
        const endDate = input?.endDate ? new Date(input.endDate) : undefined;
        return db.getAnalyticsSummary(startDate, endDate);
      }),

    // Get popular articles
    popularArticles: adminProcedure
      .input(
        z.object({
          limit: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const startDate = input?.startDate ? new Date(input.startDate) : undefined;
        const endDate = input?.endDate ? new Date(input.endDate) : undefined;
        return db.getPopularArticles(input?.limit || 10, startDate, endDate);
      }),

    // Get popular SOPs
    popularSOPs: adminProcedure
      .input(
        z.object({
          limit: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const startDate = input?.startDate ? new Date(input.startDate) : undefined;
        const endDate = input?.endDate ? new Date(input.endDate) : undefined;
        return db.getPopularSOPs(input?.limit || 10, startDate, endDate);
      }),

    // Get top search queries
    topSearches: adminProcedure
      .input(
        z.object({
          limit: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const startDate = input?.startDate ? new Date(input.startDate) : undefined;
        const endDate = input?.endDate ? new Date(input.endDate) : undefined;
        return db.getTopSearchQueries(input?.limit || 20, startDate, endDate);
      }),

    // Get views over time
    viewsOverTime: adminProcedure
      .input(z.object({ days: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getViewsOverTime(input?.days || 30);
      }),

    // Get user activity
    userActivity: adminProcedure
      .input(
        z.object({
          limit: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const startDate = input?.startDate ? new Date(input.startDate) : undefined;
        const endDate = input?.endDate ? new Date(input.endDate) : undefined;
        return db.getAnalyticsUserActivity(input?.limit || 20, startDate, endDate);
      }),
  }),

  // ==================== CONTENT VERIFICATION ====================
  verification: router({
    // Get verification status for an article
    get: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .query(async ({ input }) => {
        return db.getContentVerification(input.articleId);
      }),

    // Verify an article (editor/admin only)
    verify: editorProcedure
      .input(
        z.object({
          articleId: z.number(),
          expiresAt: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
        await db.verifyArticle(input.articleId, ctx.user.id, expiresAt, input.notes);
        
        // Log audit
        const article = await db.getArticleById(input.articleId);
        await db.createAuditLogEntry({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "verify",
          resourceType: "article",
          resourceId: input.articleId,
          resourceTitle: article?.title,
        });
        
        return { success: true };
      }),

    // Remove verification (editor/admin only)
    unverify: editorProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.unverifyArticle(input.articleId);
        
        // Log audit
        const article = await db.getArticleById(input.articleId);
        await db.createAuditLogEntry({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "unverify",
          resourceType: "article",
          resourceId: input.articleId,
          resourceTitle: article?.title,
        });
        
        return { success: true };
      }),

    // Get verification overview (admin only)
    overview: adminProcedure.query(async () => {
      return db.getVerificationOverview();
    }),

    // Get expired verifications
    expired: adminProcedure.query(async () => {
      return db.getExpiredVerifications();
    }),

    // Get all articles with verification status
    list: adminProcedure
      .input(
        z.object({
          isVerified: z.boolean().optional(),
          isExpired: z.boolean().optional(),
          expiringSoon: z.boolean().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return db.getArticlesWithVerificationStatus(input);
      }),
  }),

  // ==================== DASHBOARD SETTINGS ====================
  dashboardSettings: router({
    // Get current user's dashboard settings
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserDashboardSettings(ctx.user.id);
    }),

    // Update widget visibility
    updateVisibility: protectedProcedure
      .input(
        z.object({
          widgetId: z.string(),
          visible: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.updateWidgetVisibility(ctx.user.id, input.widgetId, input.visible);
      }),

    // Update widget order
    updateOrder: protectedProcedure
      .input(
        z.object({
          widgetOrder: z.array(z.string()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.updateWidgetOrder(ctx.user.id, input.widgetOrder);
      }),

    // Update all settings at once
    update: protectedProcedure
      .input(
        z.object({
          showWelcomeHero: z.boolean().optional(),
          showAnnouncements: z.boolean().optional(),
          showNavigation: z.boolean().optional(),
          showStats: z.boolean().optional(),
          showRecentArticles: z.boolean().optional(),
          showActivityFeed: z.boolean().optional(),
          showFavorites: z.boolean().optional(),
          showOnboardingProgress: z.boolean().optional(),
          widgetOrder: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.upsertUserDashboardSettings(ctx.user.id, input);
      }),

    // Reset to default settings
    reset: protectedProcedure.mutation(async ({ ctx }) => {
      return db.resetDashboardSettings(ctx.user.id);
    }),

    // Update widget size
    updateSize: protectedProcedure
      .input(
        z.object({
          widgetId: z.string(),
          size: z.enum(["small", "medium", "large"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.updateWidgetSize(ctx.user.id, input.widgetId, input.size);
      }),
  }),

  // ==================== CALENDAR ====================
  calendar: router({
    // Get events for a date range
    getEvents: protectedProcedure
      .input(
        z.object({
          startDate: z.string(),
          endDate: z.string(),
          includeTeamLeaves: z.boolean().optional().default(false),
        })
      )
      .query(async ({ ctx, input }) => {
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);
        
        // Get user's own events
        const userEvents = await db.getCalendarEventsByDateRange(
          ctx.user.id,
          startDate,
          endDate
        );
        
        // Get user's approved leaves as events
        const userLeaves = await db.getApprovedLeavesAsCalendarEvents(
          ctx.user.id,
          startDate,
          endDate
        );
        
        // Optionally get team leaves (for admins)
        let teamLeaves: Awaited<ReturnType<typeof db.getTeamLeavesAsCalendarEvents>> = [];
        if (input.includeTeamLeaves && (ctx.user.role === "admin" || ctx.user.role === "editor")) {
          teamLeaves = await db.getTeamLeavesAsCalendarEvents(startDate, endDate);
          // Filter out current user's leaves to avoid duplicates
          teamLeaves = teamLeaves.filter((leave) => leave.userId !== ctx.user.id);
        }
        
        return {
          events: userEvents,
          leaves: userLeaves,
          teamLeaves,
        };
      }),

    // Get events for a specific month
    getMonthEvents: protectedProcedure
      .input(
        z.object({
          year: z.number(),
          month: z.number().min(1).max(12),
        })
      )
      .query(async ({ ctx, input }) => {
        const startDate = new Date(input.year, input.month - 1, 1);
        const endDate = new Date(input.year, input.month, 0, 23, 59, 59);
        
        const userEvents = await db.getCalendarEventsForMonth(
          ctx.user.id,
          input.year,
          input.month
        );
        
        const userLeaves = await db.getApprovedLeavesAsCalendarEvents(
          ctx.user.id,
          startDate,
          endDate
        );
        
        return {
          events: userEvents,
          leaves: userLeaves,
        };
      }),

    // Get events for a specific year
    getYearEvents: protectedProcedure
      .input(
        z.object({
          year: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        const startDate = new Date(input.year, 0, 1);
        const endDate = new Date(input.year, 11, 31, 23, 59, 59);
        
        const userEvents = await db.getCalendarEventsForYear(ctx.user.id, input.year);
        const userLeaves = await db.getApprovedLeavesAsCalendarEvents(
          ctx.user.id,
          startDate,
          endDate
        );
        
        return {
          events: userEvents,
          leaves: userLeaves,
        };
      }),

    // Create a new event
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(500),
          description: z.string().optional(),
          startDate: z.string(),
          endDate: z.string(),
          isAllDay: z.boolean().optional().default(false),
          color: z.string().optional().default("blue"),
          eventType: z.enum(["personal", "meeting", "reminder", "vacation", "other"]).optional().default("personal"),
          location: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const event = await db.createCalendarEvent({
          userId: ctx.user.id,
          title: input.title,
          description: input.description || null,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          isAllDay: input.isAllDay,
          color: input.color,
          eventType: input.eventType,
          location: input.location || null,
          notes: input.notes || null,
        });
        
        if (!event) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create event",
          });
        }
        
        return event;
      }),

    // Update an event
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(500).optional(),
          description: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          isAllDay: z.boolean().optional(),
          color: z.string().optional(),
          eventType: z.enum(["personal", "meeting", "reminder", "vacation", "other"]).optional(),
          location: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        
        const updateData: Record<string, unknown> = {};
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.startDate !== undefined) updateData.startDate = new Date(updates.startDate);
        if (updates.endDate !== undefined) updateData.endDate = new Date(updates.endDate);
        if (updates.isAllDay !== undefined) updateData.isAllDay = updates.isAllDay;
        if (updates.color !== undefined) updateData.color = updates.color;
        if (updates.eventType !== undefined) updateData.eventType = updates.eventType;
        if (updates.location !== undefined) updateData.location = updates.location;
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        
        const event = await db.updateCalendarEvent(id, ctx.user.id, updateData);
        
        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found or access denied",
          });
        }
        
        return event;
      }),

    // Delete an event
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.deleteCalendarEvent(input.id, ctx.user.id);
        return { success };
      }),

    // Get a single event
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const event = await db.getCalendarEvent(input.id, ctx.user.id);
        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }
        return event;
      }),

    // Export events as iCal
    exportIcal: protectedProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Get all events for the user (optionally filtered by date range)
        let events;
        if (input.startDate && input.endDate) {
          const result = await db.getCalendarEventsByDateRange(
            ctx.user.id,
            new Date(input.startDate),
            new Date(input.endDate)
          );
          events = result;
        } else {
          // Get all events for the current year
          const now = new Date();
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
          events = await db.getCalendarEventsByDateRange(ctx.user.id, startOfYear, endOfYear);
        }

        // Generate iCal content
        const icalLines: string[] = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//Company Wiki//Calendar//DE",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          "X-WR-CALNAME:Company Wiki Kalender",
        ];

        for (const event of events) {
          const uid = `event-${event.id}@companywiki`;
          const dtstart = event.isAllDay
            ? formatDateIcal(event.startDate)
            : formatDateTimeIcal(event.startDate);
          const dtend = event.isAllDay
            ? formatDateIcal(event.endDate)
            : formatDateTimeIcal(event.endDate);

          icalLines.push("BEGIN:VEVENT");
          icalLines.push(`UID:${uid}`);
          icalLines.push(`DTSTAMP:${formatDateTimeIcal(new Date())}`);
          if (event.isAllDay) {
            icalLines.push(`DTSTART;VALUE=DATE:${dtstart}`);
            icalLines.push(`DTEND;VALUE=DATE:${dtend}`);
          } else {
            icalLines.push(`DTSTART:${dtstart}`);
            icalLines.push(`DTEND:${dtend}`);
          }
          icalLines.push(`SUMMARY:${escapeIcalText(event.title)}`);
          if (event.description) {
            icalLines.push(`DESCRIPTION:${escapeIcalText(event.description)}`);
          }
          if (event.location) {
            icalLines.push(`LOCATION:${escapeIcalText(event.location)}`);
          }
          icalLines.push(`CATEGORIES:${event.eventType || "personal"}`);
          icalLines.push("END:VEVENT");
        }

        icalLines.push("END:VCALENDAR");

        return {
          content: icalLines.join("\r\n"),
          filename: `company-wiki-calendar-${new Date().toISOString().split("T")[0]}.ics`,
          eventCount: events.length,
        };
      }),

    // Import events from iCal
    importIcal: protectedProcedure
      .input(
        z.object({
          content: z.string(),
          overwriteExisting: z.boolean().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { content, overwriteExisting } = input;
        
        // Parse iCal content
        const events = parseIcalContent(content);
        
        let imported = 0;
        let skipped = 0;
        let errors: string[] = [];

        for (const event of events) {
          try {
            // Check if event with same UID already exists
            const existingEvents = await db.getCalendarEventsByDateRange(
              ctx.user.id,
              event.startDate,
              event.endDate
            );
            
            const duplicate = existingEvents?.find(
              (e: { title: string; startDate: Date }) => e.title === event.title && 
                     e.startDate.getTime() === event.startDate.getTime()
            );

            if (duplicate && !overwriteExisting) {
              skipped++;
              continue;
            }

            if (duplicate && overwriteExisting) {
              await db.updateCalendarEvent(duplicate.id, ctx.user.id, {
                title: event.title,
                description: event.description,
                startDate: event.startDate,
                endDate: event.endDate,
                isAllDay: event.isAllDay,
                location: event.location,
              });
            } else {
              await db.createCalendarEvent({
                userId: ctx.user.id,
                title: event.title,
                description: event.description || null,
                startDate: event.startDate,
                endDate: event.endDate,
                isAllDay: event.isAllDay,
                color: "blue",
                eventType: (event.categories?.[0] as "personal" | "meeting" | "reminder" | "vacation" | "other") || "personal",
                location: event.location || null,
                notes: null,
              });
            }
            imported++;
          } catch (err) {
            errors.push(`Fehler bei "${event.title}": ${err instanceof Error ? err.message : "Unbekannter Fehler"}`);
          }
        }

        return {
          success: true,
          imported,
          skipped,
          total: events.length,
          errors: errors.length > 0 ? errors : undefined,
        };
      }),
  }),

  // ==================== GOOGLE CALENDAR ====================
  googleCalendar: router({
    // Check if Google Calendar is configured
    isConfigured: publicProcedure.query(() => {
      return { configured: googleCalendarService.isGoogleCalendarConfigured() };
    }),

    // Get connection status for current user
    getConnection: protectedProcedure.query(async ({ ctx }) => {
      const connection = await db.getGoogleCalendarConnection(ctx.user.id);
      if (!connection) {
        return null;
      }
      return {
        id: connection.id,
        googleEmail: connection.googleEmail,
        syncEnabled: connection.syncEnabled,
        lastSyncAt: connection.lastSyncAt,
        lastSyncStatus: connection.lastSyncStatus,
        lastSyncError: connection.lastSyncError,
        calendarId: connection.calendarId,
      };
    }),

    // Get OAuth authorization URL
    getAuthUrl: protectedProcedure.query(({ ctx }) => {
      if (!googleCalendarService.isGoogleCalendarConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Google Calendar ist nicht konfiguriert. Bitte API-Zugangsdaten hinzufügen.",
        });
      }
      // Use user ID as state for security
      const state = Buffer.from(JSON.stringify({ userId: ctx.user.id, timestamp: Date.now() })).toString("base64");
      return { url: googleCalendarService.getGoogleAuthUrl(state) };
    }),

    // Handle OAuth callback
    handleCallback: protectedProcedure
      .input(
        z.object({
          code: z.string(),
          state: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify state
        try {
          const stateData = JSON.parse(Buffer.from(input.state, "base64").toString());
          if (stateData.userId !== ctx.user.id) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Ungültiger State-Parameter" });
          }
          // Check if state is not too old (5 minutes)
          if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "State ist abgelaufen" });
          }
        } catch (e) {
          if (e instanceof TRPCError) throw e;
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Ungültiger State-Parameter" });
        }

        // Exchange code for tokens
        const tokens = await googleCalendarService.exchangeCodeForTokens(input.code);

        // Save connection
        await db.upsertGoogleCalendarConnection({
          userId: ctx.user.id,
          googleEmail: tokens.email,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          calendarId: "primary",
          syncEnabled: true,
        });

        return { success: true, email: tokens.email };
      }),

    // Disconnect Google Calendar
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      await db.deleteGoogleCalendarConnection(ctx.user.id);
      return { success: true };
    }),

    // Toggle sync enabled
    toggleSync: protectedProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const connection = await db.getGoogleCalendarConnection(ctx.user.id);
        if (!connection) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Keine Google Calendar-Verbindung gefunden" });
        }
        await db.upsertGoogleCalendarConnection({
          ...connection,
          syncEnabled: input.enabled,
        });
        return { success: true };
      }),

    // Manual sync from Google
    syncFromGoogle: protectedProcedure.mutation(async ({ ctx }) => {
      const connection = await db.getGoogleCalendarConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Keine Google Calendar-Verbindung gefunden" });
      }
      const result = await googleCalendarService.syncGoogleToLocal(ctx.user.id);
      return result;
    }),

    // Manual sync to Google
    syncToGoogle: protectedProcedure.mutation(async ({ ctx }) => {
      const connection = await db.getGoogleCalendarConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Keine Google Calendar-Verbindung gefunden" });
      }
      const result = await googleCalendarService.syncLocalToGoogle(ctx.user.id);
      return result;
    }),

    // Full two-way sync
    fullSync: protectedProcedure.mutation(async ({ ctx }) => {
      const connection = await db.getGoogleCalendarConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Keine Google Calendar-Verbindung gefunden" });
      }
      const result = await googleCalendarService.fullSync(ctx.user.id);
      return result;
    }),
  }),

  // ==================== SCHEDULING (CALENDLY-STYLE) ====================
  scheduling: router({
    // ==================== SCHEDULES ====================
    schedules: router({
      // List all schedules for current user
      list: protectedProcedure.query(async ({ ctx }) => {
        return db.getSchedulesByOwner(ctx.user.id);
      }),

      // Get schedule by ID with availability
      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input, ctx }) => {
          const schedule = await db.getScheduleById(input.id);
          if (!schedule) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Schedule nicht gefunden" });
          }
          if (schedule.ownerId !== ctx.user.id && ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung" });
          }
          const availability = await db.getScheduleAvailability(input.id);
          return { ...schedule, availability };
        }),

      // Create schedule
      create: protectedProcedure
        .input(
          z.object({
            name: z.string().min(1),
            timezone: z.string().optional(),
            isDefault: z.boolean().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          // If setting as default, unset other defaults
          if (input.isDefault) {
            await db.setDefaultSchedule(-1, ctx.user.id); // Unset all
          }
          const schedule = await db.createSchedule({
            ...input,
            ownerId: ctx.user.id,
          });
          return schedule;
        }),

      // Update schedule
      update: protectedProcedure
        .input(
          z.object({
            id: z.number(),
            name: z.string().min(1).optional(),
            timezone: z.string().optional(),
            isDefault: z.boolean().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const schedule = await db.getScheduleById(input.id);
          if (!schedule) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Schedule nicht gefunden" });
          }
          if (schedule.ownerId !== ctx.user.id && ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung" });
          }
          // If setting as default, unset other defaults first
          if (input.isDefault) {
            await db.setDefaultSchedule(input.id, ctx.user.id);
          }
          const { id, ...data } = input;
          await db.updateSchedule(id, data);
          return { success: true };
        }),

      // Delete schedule
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          const schedule = await db.getScheduleById(input.id);
          if (!schedule) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Schedule nicht gefunden" });
          }
          if (schedule.ownerId !== ctx.user.id && ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung" });
          }
          await db.deleteSchedule(input.id);
          return { success: true };
        }),

      // Set schedule availability
      setAvailability: protectedProcedure
        .input(
          z.object({
            scheduleId: z.number(),
            availabilities: z.array(
              z.object({
                dayOfWeek: z.number().min(0).max(6),
                startTime: z.string().regex(/^\d{2}:\d{2}$/),
                endTime: z.string().regex(/^\d{2}:\d{2}$/),
                isAvailable: z.boolean().optional(),
              })
            ),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const schedule = await db.getScheduleById(input.scheduleId);
          if (!schedule) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Schedule nicht gefunden" });
          }
          if (schedule.ownerId !== ctx.user.id && ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung" });
          }
          await db.setScheduleAvailability(
            input.scheduleId,
            input.availabilities.map((a) => ({
              ...a,
              scheduleId: input.scheduleId,
              isAvailable: a.isAvailable ?? true,
            }))
          );
          return { success: true };
        }),

      // Ensure default schedule exists
      ensureDefault: protectedProcedure.mutation(async ({ ctx }) => {
        const scheduleId = await db.ensureDefaultSchedule(ctx.user.id);
        return { scheduleId };
      }),
    }),

    // ==================== EVENT TYPES ====================
    eventTypes: router({
      // List all event types for current user (host)
      list: protectedProcedure.query(async ({ ctx }) => {
        return db.getEventTypesByHost(ctx.user.id);
      }),

      // List all active event types (public for booking)
      listActive: publicProcedure.query(async () => {
        return db.getActiveEventTypes();
      }),

      // Get event type by ID
      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          const eventType = await db.getEventTypeById(input.id);
          if (!eventType) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Event-Typ nicht gefunden" });
          }
          return eventType;
        }),

      // Get event type by slug (public for booking page)
      getBySlug: publicProcedure
        .input(z.object({ slug: z.string() }))
        .query(async ({ input }) => {
          const eventType = await db.getEventTypeBySlug(input.slug);
          if (!eventType) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Event-Typ nicht gefunden" });
          }
          // Get host info
          const host = await db.getUserById(eventType.hostId);
          return { ...eventType, host };
        }),

      // Create event type
      create: protectedProcedure
        .input(
          z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            duration: z.number().min(5).max(480),
            color: z.string().optional(),
            locationType: z.enum(["google_meet", "phone", "in_person", "custom"]).optional(),
            locationDetails: z.string().optional(),
            minNoticeHours: z.number().optional(),
            maxDaysInFuture: z.number().optional(),
            bufferBefore: z.number().optional(),
            bufferAfter: z.number().optional(),
            requiresConfirmation: z.boolean().optional(),
            confirmationMessage: z.string().optional(),
            reminderMinutes: z.string().optional(),
            sendGuestReminder: z.boolean().optional(),
            sendHostReminder: z.boolean().optional(),
            scheduleId: z.number().nullable().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const slug = generateSlug(input.name) + "-" + nanoid(8);
          const eventType = await db.createEventType({
            ...input,
            slug,
            hostId: ctx.user.id,
          });
          return eventType;
        }),

      // Update event type
      update: protectedProcedure
        .input(
          z.object({
            id: z.number(),
            name: z.string().min(1).optional(),
            description: z.string().optional(),
            duration: z.number().min(5).max(480).optional(),
            color: z.string().optional(),
            locationType: z.enum(["google_meet", "phone", "in_person", "custom"]).optional(),
            locationDetails: z.string().optional(),
            isActive: z.boolean().optional(),
            minNoticeHours: z.number().optional(),
            maxDaysInFuture: z.number().optional(),
            bufferBefore: z.number().optional(),
            bufferAfter: z.number().optional(),
            requiresConfirmation: z.boolean().optional(),
            confirmationMessage: z.string().optional(),
            reminderMinutes: z.string().optional(),
            sendGuestReminder: z.boolean().optional(),
            sendHostReminder: z.boolean().optional(),
            scheduleId: z.number().nullable().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const eventType = await db.getEventTypeById(input.id);
          if (!eventType) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Event-Typ nicht gefunden" });
          }
          if (eventType.hostId !== ctx.user.id && ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung" });
          }
          const { id, ...data } = input;
          await db.updateEventType(id, data);
          return { success: true };
        }),

      // Delete event type
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          const eventType = await db.getEventTypeById(input.id);
          if (!eventType) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Event-Typ nicht gefunden" });
          }
          if (eventType.hostId !== ctx.user.id && ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung" });
          }
          await db.deleteEventType(input.id);
          return { success: true };
        }),
    }),

    // ==================== AVAILABILITY ====================
    availability: router({
      // Get availability for event type
      get: protectedProcedure
        .input(z.object({ eventTypeId: z.number() }))
        .query(async ({ input }) => {
          return db.getEventTypeAvailability(input.eventTypeId);
        }),

      // Set availability for event type
      set: protectedProcedure
        .input(
          z.object({
            eventTypeId: z.number(),
            availabilities: z.array(
              z.object({
                dayOfWeek: z.number().min(0).max(6),
                startTime: z.string().regex(/^\d{2}:\d{2}$/),
                endTime: z.string().regex(/^\d{2}:\d{2}$/),
                isAvailable: z.boolean().optional(),
              })
            ),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const eventType = await db.getEventTypeById(input.eventTypeId);
          if (!eventType) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Event-Typ nicht gefunden" });
          }
          if (eventType.hostId !== ctx.user.id && ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung" });
          }
          await db.setEventTypeAvailability(
            input.eventTypeId,
            input.availabilities.map((a) => ({
              ...a,
              eventTypeId: input.eventTypeId,
              isAvailable: a.isAvailable ?? true,
            }))
          );
          return { success: true };
        }),
    }),

    // ==================== DATE OVERRIDES ====================
    dateOverrides: router({
      // Get date overrides for event type
      list: protectedProcedure
        .input(z.object({ eventTypeId: z.number() }))
        .query(async ({ input }) => {
          return db.getDateOverrides(input.eventTypeId);
        }),

      // Add date override
      add: protectedProcedure
        .input(
          z.object({
            eventTypeId: z.number(),
            date: z.string(), // ISO date string
            isAvailable: z.boolean(),
            startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
            endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
            reason: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const eventType = await db.getEventTypeById(input.eventTypeId);
          if (!eventType) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Event-Typ nicht gefunden" });
          }
          if (eventType.hostId !== ctx.user.id && ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung" });
          }
          const override = await db.addDateOverride({
            eventTypeId: input.eventTypeId,
            date: new Date(input.date),
            isAvailable: input.isAvailable,
            startTime: input.startTime,
            endTime: input.endTime,
            reason: input.reason,
          });
          return override;
        }),

      // Delete date override
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.deleteDateOverride(input.id);
          return { success: true };
        }),
    }),

    // ==================== BOOKINGS ====================
    bookings: router({
      // Get available time slots for a date
      getAvailableSlots: publicProcedure
        .input(
          z.object({
            eventTypeId: z.number(),
            date: z.string(), // ISO date string (YYYY-MM-DD)
          })
        )
        .query(async ({ input }) => {
          const eventType = await db.getEventTypeById(input.eventTypeId);
          if (!eventType || !eventType.isActive) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Event-Typ nicht gefunden" });
          }

          const date = new Date(input.date);
          const dayOfWeek = date.getDay();

          // Check for date override
          const override = await db.getDateOverrideForDate(input.eventTypeId, date);
          if (override && !override.isAvailable) {
            return []; // Day is blocked
          }

          // Get availability for this day
          const availabilities = await db.getEventTypeAvailability(input.eventTypeId);
          let dayAvailability = availabilities.filter((a) => a.dayOfWeek === dayOfWeek && a.isAvailable);

          // Use override times if available
          if (override && override.isAvailable && override.startTime && override.endTime) {
            dayAvailability = [
              {
                id: 0,
                eventTypeId: input.eventTypeId,
                dayOfWeek,
                startTime: override.startTime,
                endTime: override.endTime,
                isAvailable: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ];
          }

          if (dayAvailability.length === 0) {
            return []; // No availability for this day
          }

          // Get existing bookings for this day
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);
          const existingBookings = await db.getBookingsForEventType(input.eventTypeId, startOfDay, endOfDay);

          // Generate time slots
          const slots: { time: string; available: boolean }[] = [];
          const duration = eventType.duration;
          const bufferBefore = eventType.bufferBefore || 0;
          const bufferAfter = eventType.bufferAfter || 0;
          const minNoticeHours = eventType.minNoticeHours || 4;
          const now = new Date();
          const minBookingTime = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);

          for (const avail of dayAvailability) {
            const [startHour, startMin] = avail.startTime.split(":").map(Number);
            const [endHour, endMin] = avail.endTime.split(":").map(Number);

            let currentTime = new Date(date);
            currentTime.setHours(startHour, startMin, 0, 0);
            const endTime = new Date(date);
            endTime.setHours(endHour, endMin, 0, 0);

            while (currentTime.getTime() + duration * 60 * 1000 <= endTime.getTime()) {
              const slotStart = new Date(currentTime);
              const slotEnd = new Date(currentTime.getTime() + duration * 60 * 1000);
              const slotStartWithBuffer = new Date(slotStart.getTime() - bufferBefore * 60 * 1000);
              const slotEndWithBuffer = new Date(slotEnd.getTime() + bufferAfter * 60 * 1000);

              // Check if slot is in the past or within minimum notice
              let available = slotStart > minBookingTime;

              // Check for conflicts with existing bookings
              if (available) {
                for (const booking of existingBookings) {
                  const bookingStart = new Date(booking.startTime);
                  const bookingEnd = new Date(booking.endTime);
                  // Check for overlap including buffer
                  if (slotStartWithBuffer < bookingEnd && slotEndWithBuffer > bookingStart) {
                    available = false;
                    break;
                  }
                }
              }

              slots.push({
                time: `${String(slotStart.getHours()).padStart(2, "0")}:${String(slotStart.getMinutes()).padStart(2, "0")}`,
                available,
              });

              currentTime = new Date(currentTime.getTime() + duration * 60 * 1000);
            }
          }

          return slots;
        }),

      // Get available dates for a month
      getAvailableDates: publicProcedure
        .input(
          z.object({
            eventTypeId: z.number(),
            year: z.number(),
            month: z.number(), // 1-12
          })
        )
        .query(async ({ input }) => {
          const eventType = await db.getEventTypeById(input.eventTypeId);
          if (!eventType || !eventType.isActive) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Event-Typ nicht gefunden" });
          }

          const availabilities = await db.getEventTypeAvailability(input.eventTypeId);
          const availableDays = new Set(availabilities.filter((a) => a.isAvailable).map((a) => a.dayOfWeek));

          const daysInMonth = new Date(input.year, input.month, 0).getDate();
          const now = new Date();
          const minNoticeHours = eventType.minNoticeHours || 4;
          const maxDaysInFuture = eventType.maxDaysInFuture || 60;
          const maxDate = new Date(now.getTime() + maxDaysInFuture * 24 * 60 * 60 * 1000);

          const dates: { date: string; available: boolean }[] = [];

          for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(input.year, input.month - 1, day);
            const dayOfWeek = date.getDay();
            const dateStr = `${input.year}-${String(input.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            // Check basic availability
            let available = availableDays.has(dayOfWeek);

            // Check if date is in the past or too far in the future
            if (date < now || date > maxDate) {
              available = false;
            }

            // Check for date overrides
            const override = await db.getDateOverrideForDate(input.eventTypeId, date);
            if (override) {
              available = override.isAvailable;
            }

            dates.push({ date: dateStr, available });
          }

          return dates;
        }),

      // Create booking
      create: publicProcedure
        .input(
          z.object({
            eventTypeId: z.number(),
            startTime: z.string(), // ISO datetime string
            guestName: z.string().min(1),
            guestEmail: z.string().email(),
            guestNotes: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const eventType = await db.getEventTypeById(input.eventTypeId);
          if (!eventType || !eventType.isActive) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Event-Typ nicht gefunden" });
          }

          const startTime = new Date(input.startTime);
          const endTime = new Date(startTime.getTime() + eventType.duration * 60 * 1000);

          // Check if slot is available
          const isAvailable = await db.isTimeSlotAvailable(input.eventTypeId, startTime, endTime);
          if (!isAvailable) {
            throw new TRPCError({ code: "CONFLICT", message: "Dieser Zeitslot ist nicht mehr verfügbar" });
          }

          // Generate Google Meet link if needed
          let meetingLink: string | undefined;
          let googleEventId: string | undefined;
          if (eventType.locationType === "google_meet") {
            // Try to create Google Meet link via Google Calendar
            const connection = await db.getGoogleCalendarConnection(eventType.hostId);
            if (connection) {
              try {
                const result = await googleCalendarService.createGoogleCalendarEvent(eventType.hostId, {
                  title: `${eventType.name} mit ${input.guestName}`,
                  description: `Gebucht von: ${input.guestName} (${input.guestEmail})\n\n${input.guestNotes || ""}`,
                  startDate: startTime,
                  endDate: endTime,
                  isAllDay: false,
                  location: "",
                  addGoogleMeet: true, // Request Google Meet link creation
                });
                googleEventId = result.googleEventId;
                meetingLink = result.meetLink;
                console.log("Google Meet link created:", meetingLink);
              } catch (error) {
                console.error("Failed to create Google Meet link:", error);
              }
            }
          }

          const booking = await db.createEventBooking({
            eventTypeId: input.eventTypeId,
            hostId: eventType.hostId,
            guestUserId: ctx.user?.id,
            guestName: input.guestName,
            guestEmail: input.guestEmail,
            guestNotes: input.guestNotes,
            startTime,
            endTime,
            status: eventType.requiresConfirmation ? "pending" : "confirmed",
            meetingLink,
            googleEventId,
          });

          // Send confirmation email to guest
          const host = await db.getUserById(eventType.hostId);
          const { sendBookingConfirmationEmail, sendBookingNotificationToHost } = await import("./email");
          
          // Email to guest
          sendBookingConfirmationEmail({
            guestEmail: input.guestEmail,
            guestName: input.guestName,
            eventTypeName: eventType.name,
            hostName: host?.name || "Host",
            startTime,
            endTime,
            locationType: eventType.locationType || "google_meet",
            locationDetails: eventType.locationDetails,
            meetingLink,
            guestNotes: input.guestNotes,
          });

          // Email to host
          if (host?.email) {
            sendBookingNotificationToHost({
              hostId: eventType.hostId,
              hostEmail: host.email,
              hostName: host.name || "Host",
              guestName: input.guestName,
              guestEmail: input.guestEmail,
              eventTypeName: eventType.name,
              startTime,
              endTime,
              locationType: eventType.locationType || "google_meet",
              meetingLink,
              guestNotes: input.guestNotes,
            });
          }

          return booking;
        }),

      // Get bookings for host
      listForHost: protectedProcedure
        .input(
          z.object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
          }).optional()
        )
        .query(async ({ ctx, input }) => {
          const startDate = input?.startDate ? new Date(input.startDate) : undefined;
          const endDate = input?.endDate ? new Date(input.endDate) : undefined;
          const bookings = await db.getBookingsForHost(ctx.user.id, startDate, endDate);
          
          // Get event type info for each booking
          const bookingsWithEventType = await Promise.all(
            bookings.map(async (booking) => {
              const eventType = await db.getEventTypeById(booking.eventTypeId);
              return { ...booking, eventType };
            })
          );
          
          return bookingsWithEventType;
        }),

      // Get bookings for guest (logged in user)
      listForGuest: protectedProcedure.query(async ({ ctx }) => {
        const bookings = await db.getBookingsForGuest(ctx.user.id);
        
        // Get event type and host info for each booking
        const bookingsWithDetails = await Promise.all(
          bookings.map(async (booking) => {
            const eventType = await db.getEventTypeById(booking.eventTypeId);
            const host = eventType ? await db.getUserById(eventType.hostId) : null;
            return { ...booking, eventType, host };
          })
        );
        
        return bookingsWithDetails;
      }),

      // Cancel booking
      cancel: protectedProcedure
        .input(
          z.object({
            id: z.number(),
            reason: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const booking = await db.getEventBookingById(input.id);
          if (!booking) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Buchung nicht gefunden" });
          }
          // Allow cancellation by host, guest, or admin
          if (
            booking.hostId !== ctx.user.id &&
            booking.guestUserId !== ctx.user.id &&
            ctx.user.role !== "admin"
          ) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung" });
          }
          await db.cancelEventBooking(input.id, ctx.user.id, input.reason);
          return { success: true };
        }),

      // Confirm booking (for hosts)
      confirm: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          const booking = await db.getEventBookingById(input.id);
          if (!booking) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Buchung nicht gefunden" });
          }
          if (booking.hostId !== ctx.user.id && ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung" });
          }
          await db.updateEventBooking(input.id, { status: "confirmed" });
          return { success: true };
        }),
    }),
  }),

  // ==================== TEAMS ====================
  teams: router({
    // List all teams
    list: protectedProcedure.query(async () => {
      return db.getAllTeams();
    }),

    // Get teams for current user
    myTeams: protectedProcedure.query(async ({ ctx }) => {
      return db.getTeamsForUser(ctx.user.id);
    }),

    // Get team by ID with members
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const team = await db.getTeamById(input.id);
        if (!team) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team nicht gefunden" });
        }
        const members = await db.getTeamMembers(input.id);
        return { ...team, members };
      }),

    // Create team (admin only)
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          color: z.string().optional(),
          icon: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const slug = generateSlug(input.name) + "-" + nanoid(6);
        const team = await db.createTeam({
          ...input,
          slug,
          createdById: ctx.user.id,
        });
        return team;
      }),

    // Update team (admin only)
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          color: z.string().optional(),
          icon: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTeam(id, data);
        return { success: true };
      }),

    // Delete team (admin only)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTeam(input.id);
        return { success: true };
      }),

    // Add member to team (admin only)
    addMember: adminProcedure
      .input(
        z.object({
          teamId: z.number(),
          userId: z.number(),
          role: z.enum(["member", "admin"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const member = await db.addTeamMember({
          teamId: input.teamId,
          userId: input.userId,
          role: input.role || "member",
        });
        // Also add to team chat room if exists
        const room = await db.getOrCreateTeamChatRoom(input.teamId, input.userId);
        await db.addChatRoomParticipant({ roomId: room.id, userId: input.userId });
        return member;
      }),

    // Remove member from team (admin only)
    removeMember: adminProcedure
      .input(
        z.object({
          teamId: z.number(),
          userId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        await db.removeTeamMember(input.teamId, input.userId);
        return { success: true };
      }),

    // Update member role (admin only)
    updateMemberRole: adminProcedure
      .input(
        z.object({
          teamId: z.number(),
          userId: z.number(),
          role: z.enum(["member", "admin"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateTeamMemberRole(input.teamId, input.userId, input.role);
        return { success: true };
      }),
  }),

  // ==================== OHWEEES (CHAT) ====================
  ohweees: router({
    // Get all chat rooms for current user
    rooms: protectedProcedure.query(async ({ ctx }) => {
      const rooms = await db.getChatRoomsForUser(ctx.user.id);
      
      // Add unread count and participants info
      const roomsWithDetails = await Promise.all(
        rooms.map(async ({ room, participant }) => {
          const unreadCount = await db.getUnreadCountForRoom(room.id, ctx.user.id);
          const participants = await db.getChatRoomParticipants(room.id);
          return {
            ...room,
            unreadCount,
            participants: participants.map((p) => p.user),
            lastReadAt: participant.lastReadAt,
          };
        })
      );
      
      return roomsWithDetails;
    }),

    // Get room by ID with messages
    getRoom: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const room = await db.getChatRoomById(input.id);
        if (!room) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Chat-Raum nicht gefunden" });
        }
        
        // Check if user is participant
        const participants = await db.getChatRoomParticipants(input.id);
        const isParticipant = participants.some((p) => p.user.id === ctx.user.id);
        if (!isParticipant) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kein Zugriff auf diesen Chat" });
        }
        
        const messages = await db.getOhweeesForRoom(input.id);
        const pinnedMessages = await db.getPinnedOhweees(input.id);
        
        // Mark as read
        await db.updateLastReadTime(input.id, ctx.user.id);
        
        return {
          ...room,
          participants: participants.map((p) => p.user),
          messages,
          pinnedMessages,
        };
      }),

    // Get more messages (pagination)
    getMessages: protectedProcedure
      .input(
        z.object({
          roomId: z.number(),
          beforeId: z.number().optional(),
          limit: z.number().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        // Verify access
        const participants = await db.getChatRoomParticipants(input.roomId);
        if (!participants.some((p) => p.user.id === ctx.user.id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kein Zugriff" });
        }
        
        return db.getOhweeesForRoom(input.roomId, input.limit || 50, input.beforeId);
      }),

    // Start direct message with user
    startDM: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Kann keinen Chat mit sich selbst starten" });
        }
        const room = await db.getOrCreateDirectMessageRoom(ctx.user.id, input.userId, ctx.user.id);
        return room;
      }),

    // Create group chat
    createGroup: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          memberIds: z.array(z.number()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const room = await db.createGroupChat(input.name, ctx.user.id, input.memberIds);
        return room;
      }),

    // Get team chat room
    getTeamRoom: protectedProcedure
      .input(z.object({ teamId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Verify user is team member
        const teams = await db.getTeamsForUser(ctx.user.id);
        if (!teams.some((t) => t.team.id === input.teamId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kein Teammitglied" });
        }
        
        const room = await db.getOrCreateTeamChatRoom(input.teamId, ctx.user.id);
        const messages = await db.getOhweeesForRoom(room.id);
        const participants = await db.getChatRoomParticipants(room.id);
        
        // Mark as read
        await db.updateLastReadTime(room.id, ctx.user.id);
        
        return {
          ...room,
          participants: participants.map((p) => p.user),
          messages,
        };
      }),

    // Send ohweee (message)
    send: protectedProcedure
      .input(
        z.object({
          roomId: z.number(),
          content: z.string().min(1),
          parentId: z.number().optional(),
          attachments: z.array(
            z.object({
              url: z.string(),
              filename: z.string(),
              mimeType: z.string(),
              size: z.number(),
            })
          ).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Verify access
        const participants = await db.getChatRoomParticipants(input.roomId);
        if (!participants.some((p) => p.user.id === ctx.user.id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kein Zugriff" });
        }
        
        const ohweee = await db.createOhweee({
          roomId: input.roomId,
          senderId: ctx.user.id,
          content: input.content,
          parentId: input.parentId,
          attachments: input.attachments || null,
        });
        
        return ohweee;
      }),

    // Edit ohweee
    edit: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          content: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const ohweee = await db.getOhweeeById(input.id);
        if (!ohweee) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Nachricht nicht gefunden" });
        }
        if (ohweee.senderId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur eigene Nachrichten bearbeiten" });
        }
        
        await db.updateOhweee(input.id, input.content);
        return { success: true };
      }),

    // Delete ohweee
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const ohweee = await db.getOhweeeById(input.id);
        if (!ohweee) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Nachricht nicht gefunden" });
        }
        // Allow deletion by sender or admin
        if (ohweee.senderId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung" });
        }
        
        await db.deleteOhweee(input.id, ctx.user.id);
        return { success: true };
      }),

    // Toggle pin
    togglePin: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.toggleOhweeePin(input.id, ctx.user.id);
        return { success: true };
      }),

    // Get thread replies
    getReplies: protectedProcedure
      .input(z.object({ parentId: z.number() }))
      .query(async ({ input }) => {
        return db.getOhweeeReplies(input.parentId);
      }),

    // Mark room as read
    markRead: protectedProcedure
      .input(z.object({ roomId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateLastReadTime(input.roomId, ctx.user.id);
        return { success: true };
      }),

    // Get total unread count
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getTotalUnreadCount(ctx.user.id);
    }),

    // Search messages
    search: protectedProcedure
      .input(
        z.object({
          query: z.string().min(1),
          limit: z.number().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        return db.searchOhweees(ctx.user.id, input.query, input.limit);
      }),

    // Upload file for ohweee attachment
    uploadFile: protectedProcedure
      .input(
        z.object({
          filename: z.string(),
          mimeType: z.string(),
          base64Data: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import("./storage");
        
        // Decode base64 data
        const buffer = Buffer.from(input.base64Data, "base64");
        const size = buffer.length;
        
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (size > maxSize) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Datei zu groß (max. 10MB)",
          });
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const safeFilename = input.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
        const key = `ohweees/${ctx.user.id}/${timestamp}-${randomSuffix}-${safeFilename}`;
        
        // Upload to S3
        const { url } = await storagePut(key, buffer, input.mimeType);
        
        return {
          url,
          filename: input.filename,
          mimeType: input.mimeType,
          size,
        };
      }),

    // Get all users for starting DM (with recent chats first)
    getUsers: protectedProcedure.query(async ({ ctx }) => {
      const allUsers = await db.getAllUsers();
      const rooms = await db.getChatRoomsForUser(ctx.user.id);
      
      // Get users from recent DMs
      const recentDMUserIds = new Set<number>();
      for (const { room } of rooms) {
        if (room.type === "direct") {
          const participants = await db.getChatRoomParticipants(room.id);
          for (const p of participants) {
            if (p.user.id !== ctx.user.id) {
              recentDMUserIds.add(p.user.id);
            }
          }
        }
      }
      
      // Sort: recent DMs first, then alphabetically
      const sortedUsers = allUsers
        .filter((u) => u.id !== ctx.user.id)
        .sort((a, b) => {
          const aRecent = recentDMUserIds.has(a.id);
          const bRecent = recentDMUserIds.has(b.id);
          if (aRecent && !bRecent) return -1;
          if (!aRecent && bRecent) return 1;
          return (a.name || "").localeCompare(b.name || "");
        });
      
      return sortedUsers;
    }),
  }),
});

export type AppRouter = typeof appRouter;
