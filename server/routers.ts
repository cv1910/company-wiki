import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { nanoid } from "nanoid";

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
      .input(z.object({ status: z.enum(["draft", "published", "archived"]).optional() }).optional())
      .query(async ({ input }) => {
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
    send: protectedProcedure
      .input(
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

        // Get relevant articles for context
        const relevantArticles = await db.searchArticles(input.message, 5);
        const relevantSOPs = await db.searchSOPs(input.message, 3);

        // Build context from wiki content
        const context = [
          ...relevantArticles.map((a) => `Artikel: ${a.title}\n${a.content?.substring(0, 1000) || ""}`),
          ...relevantSOPs.map((s) => `SOP: ${s.title}\n${s.description || ""}`),
        ].join("\n\n---\n\n");

        // Get chat history for context
        const history = await db.getChatHistory(ctx.user.id, input.sessionId, 10);

        // Build messages for LLM
        const messages = [
          {
            role: "system" as const,
            content: `Du bist ein hilfreicher Assistent für das Company Wiki. Beantworte Fragen basierend auf den Wiki-Inhalten. 
Wenn du Informationen aus dem Wiki verwendest, gib die Quelle an.
Antworte auf Deutsch, es sei denn, der Benutzer fragt auf Englisch.

Relevante Wiki-Inhalte:
${context || "Keine relevanten Inhalte gefunden."}`,
          },
          ...history.slice(-6).map((msg) => ({
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
  }),

  // ==================== DASHBOARD STATS ====================
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      const [articles, sops, categories, sopCats] = await Promise.all([
        db.getAllArticles("published"),
        db.getAllSOPs("published"),
        db.getAllCategories(),
        db.getAllSOPCategories(),
      ]);

      return {
        articleCount: articles.length,
        sopCount: sops.length,
        categoryCount: categories.length,
        sopCategoryCount: sopCats.length,
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
});

export type AppRouter = typeof appRouter;
