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
  }),
});

export type AppRouter = typeof appRouter;
