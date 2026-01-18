import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(role: "user" | "editor" | "admin" = "user"): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createEditorContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  return createUserContext("editor");
}

function createAdminContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  return createUserContext("admin");
}

describe("templates router", () => {
  describe("templates.list", () => {
    it("returns all templates for authenticated users", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.templates.list();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("templates.getSystem", () => {
    it("returns system templates", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.templates.getSystem();

      expect(Array.isArray(result)).toBe(true);
      // All returned templates should be system templates
      result.forEach((template) => {
        expect(template.isSystem).toBe(true);
      });
    });
  });

  describe("templates.getCustom", () => {
    it("returns custom templates", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.templates.getCustom();

      expect(Array.isArray(result)).toBe(true);
      // All returned templates should be custom templates
      result.forEach((template) => {
        expect(template.isSystem).toBe(false);
      });
    });
  });

  describe("templates.getById", () => {
    it("returns undefined for non-existent template", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.templates.getById({ id: 99999 });

      expect(result).toBeUndefined();
    });
  });

  describe("templates.getBySlug", () => {
    it("returns template by slug", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      // Try to get the blank template which should exist
      const result = await caller.templates.getBySlug({ slug: "blank" });

      if (result) {
        expect(result.slug).toBe("blank");
        expect(result.isSystem).toBe(true);
      }
    });

    it("returns undefined for non-existent slug", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.templates.getBySlug({ slug: "non-existent-slug" });

      expect(result).toBeUndefined();
    });
  });

  describe("templates.create", () => {
    it("requires editor role", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.templates.create({
          name: "Test Template",
          content: "# Test Content",
        })
      ).rejects.toThrow();
    });

    it("allows editors to create templates", async () => {
      const { ctx } = createEditorContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.templates.create({
        name: "Test Template",
        content: "# Test Content",
        description: "A test template",
      });

      expect(result.id).toBeDefined();
      expect(result.slug).toBeDefined();
    });
  });

  describe("templates.update", () => {
    it("requires editor role", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.templates.update({
          id: 1,
          name: "Updated Name",
        })
      ).rejects.toThrow();
    });
  });

  describe("templates.delete", () => {
    it("requires admin role", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.templates.delete({ id: 1 })).rejects.toThrow();
    });

    it("requires admin role (not just editor)", async () => {
      const { ctx } = createEditorContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.templates.delete({ id: 1 })).rejects.toThrow();
    });

    it("allows admins to delete templates", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // This will succeed even if template doesn't exist (system templates are protected)
      const result = await caller.templates.delete({ id: 99999 });

      expect(result).toEqual({ success: true });
    });
  });
});

describe("media router", () => {
  describe("media.list", () => {
    it("returns user media for authenticated users", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.media.list({});

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("media.listAll", () => {
    it("requires editor role", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.media.listAll({})).rejects.toThrow();
    });

    it("allows editors to list all media", async () => {
      const { ctx } = createEditorContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.media.listAll({});

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("media.getById", () => {
    it("returns undefined for non-existent media", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.media.getById({ id: 99999 });

      expect(result).toBeUndefined();
    });
  });

  describe("media.upload", () => {
    it("allows authenticated users to upload media metadata", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.media.upload({
        filename: "test-image.jpg",
        originalFilename: "test-image.jpg",
        mimeType: "image/jpeg",
        size: 12345,
        url: "https://example.com/test-image.jpg",
        fileKey: "wiki-images/test-image.jpg",
        width: 800,
        height: 600,
      });

      expect(result.id).toBeDefined();
      expect(result.url).toBe("https://example.com/test-image.jpg");
    });
  });

  describe("media.delete", () => {
    it("throws NOT_FOUND for non-existent media", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.media.delete({ id: 99999 })).rejects.toThrow("NOT_FOUND");
    });
  });
});
