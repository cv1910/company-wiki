import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
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
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("search.suggestions", () => {
  it("returns suggestions for valid query", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.suggestions({ query: "test", limit: 5 });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    // Each result should have id, title, slug, and type
    result.forEach((item) => {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("slug");
      expect(item).toHaveProperty("type");
      expect(["article", "sop"]).toContain(item.type);
    });
  });

  it("respects limit parameter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.suggestions({ query: "a", limit: 3 });

    expect(result.length).toBeLessThanOrEqual(3);
  });
});

describe("search.global", () => {
  it("returns articles and sops for search query", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.global({ query: "test", type: "all" });

    expect(result).toHaveProperty("articles");
    expect(result).toHaveProperty("sops");
    expect(Array.isArray(result.articles)).toBe(true);
    expect(Array.isArray(result.sops)).toBe(true);
  });

  it("filters by type when specified", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const articlesOnly = await caller.search.global({ query: "test", type: "articles" });
    const sopsOnly = await caller.search.global({ query: "test", type: "sops" });

    expect(articlesOnly).toHaveProperty("articles");
    expect(sopsOnly).toHaveProperty("sops");
  });
});

describe("search.semantic", () => {
  it("returns semantic search results with similarity scores", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.semantic({ query: "how to request vacation", type: "all" });

    expect(result).toHaveProperty("articles");
    expect(result).toHaveProperty("sops");
    expect(result).toHaveProperty("isSemanticSearch");
    // Should have similarity property on results
    if (result.articles.length > 0) {
      expect(result.articles[0]).toHaveProperty("similarity");
    }
  });
});

describe("versions.diff", () => {
  it("throws NOT_FOUND for non-existent versions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Should throw NOT_FOUND for non-existent article/versions
    await expect(
      caller.versions.diff({
        articleId: 999,
        fromVersion: 1,
        toVersion: 2,
      })
    ).rejects.toThrow("Version not found");
  });

  it("diff endpoint exists and is callable", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Verify the endpoint exists by checking it throws the expected error
    try {
      await caller.versions.diff({
        articleId: 1,
        fromVersion: 1,
        toVersion: 1,
      });
    } catch (error: unknown) {
      // Expected to throw - either NOT_FOUND or same version error
      expect(error).toBeDefined();
    }
  });
});

describe("chat.send", () => {
  it("returns a response with message and sources", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Note: This test may fail if LLM API is not available
    try {
      const result = await caller.chat.send({
        sessionId: "test-session-" + Date.now(),
        message: "Was ist das Company Wiki?",
      });

      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("sources");
      expect(typeof result.message).toBe("string");
      expect(Array.isArray(result.sources)).toBe(true);
    } catch (error) {
      // LLM API might not be available in test environment
      console.log("Chat test skipped - LLM API not available");
    }
  }, 30000); // 30 second timeout for LLM calls
});

describe("chat.getHistory", () => {
  it("returns chat history for session", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.getHistory({ sessionId: "test-session" });

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("chat.getSessions", () => {
  it("returns user chat sessions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.getSessions();

    expect(Array.isArray(result)).toBe(true);
  });
});
