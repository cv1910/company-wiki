import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { sendWelcomeEmail } from "../email";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Check if this is a new user (first time login)
      const existingUser = await db.getUserByOpenId(userInfo.openId);
      const isNewUser = !existingUser;

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // If user has an email, check for pending invitation and mark as accepted
      if (userInfo.email) {
        const invitation = await db.getPendingInvitationByEmail(userInfo.email);
        if (invitation && invitation.status === "pending") {
          const user = await db.getUserByOpenId(userInfo.openId);
          if (user) {
            await db.acceptPendingInvitation(invitation.id, user.id);
            console.log(`[OAuth] Invitation accepted for ${userInfo.email}`);
          }
        }
      }

      // Send welcome email to new users
      if (isNewUser && userInfo.email) {
        try {
          await sendWelcomeEmail({
            recipientEmail: userInfo.email,
            userName: userInfo.name || "Neuer Benutzer",
          });
          console.log(`[OAuth] Welcome email sent to ${userInfo.email}`);
        } catch (emailError) {
          console.error("[OAuth] Failed to send welcome email:", emailError);
        }
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
