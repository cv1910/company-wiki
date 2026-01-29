import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// Procedure that allows guest users (read-only access)
const requireUserOrGuest = t.middleware(async opts => {
  const { ctx, next } = opts;

  // For guest access, we create a virtual guest user
  const guestUser = {
    id: 0,
    openId: "guest",
    name: "Gast",
    email: null,
    loginMethod: "guest",
    role: "guest" as const,
    avatarUrl: null,
    phone: null,
    location: null,
    bio: null,
    department: null,
    jobTitle: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return next({
    ctx: {
      ...ctx,
      user: ctx.user ?? guestUser,
    },
  });
});

export const guestProcedure = t.procedure.use(requireUserOrGuest);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
