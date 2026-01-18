import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
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

function createEditorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "editor-user",
    email: "editor@example.com",
    name: "Editor User",
    loginMethod: "manus",
    role: "editor",
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

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
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

describe("Audit Log Router", () => {
  it("allows admin to list audit log entries", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auditLog.list({});
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to count audit log entries", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auditLog.count({});
    
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("allows admin to get distinct actions", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auditLog.getActions();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to get distinct resource types", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auditLog.getResourceTypes();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("denies regular user access to audit log", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auditLog.list({})).rejects.toThrow();
  });

  it("denies editor access to audit log", async () => {
    const ctx = createEditorContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auditLog.list({})).rejects.toThrow();
  });
});

describe("Reviews Router", () => {
  it("allows editor to get pending reviews", async () => {
    const ctx = createEditorContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reviews.getPending();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows editor to get pending review count", async () => {
    const ctx = createEditorContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reviews.pendingCount();
    
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("allows admin to get pending reviews", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reviews.getPending();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("denies regular user access to pending reviews", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.reviews.getPending()).rejects.toThrow();
  });

  it("allows user to get their own review requests", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reviews.getUserRequests();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows user to get reviews by article", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reviews.getByArticle({ articleId: 1 });
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows user to get latest review for article", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reviews.getLatest({ articleId: 1 });
    
    // Result can be undefined if no review exists
    expect(result === undefined || typeof result === "object").toBe(true);
  });
});

describe("Templates Router", () => {
  it("allows user to list templates", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.templates.list();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows user to get system templates", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.templates.getSystem();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows user to get custom templates", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.templates.getCustom();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows editor to create template", async () => {
    const ctx = createEditorContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.templates.create({
      name: "Test Template",
      description: "A test template",
      content: "# Test\n\nThis is a test template.",
    });
    
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("slug");
  });

  it("denies regular user from creating template", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.templates.create({
        name: "User Template",
        content: "# Test",
      })
    ).rejects.toThrow();
  });
});

describe("Media Router", () => {
  it("allows user to list their own media", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.media.list({});
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows editor to list all media", async () => {
    const ctx = createEditorContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.media.listAll({});
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("denies regular user from listing all media", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.media.listAll({})).rejects.toThrow();
  });
});
