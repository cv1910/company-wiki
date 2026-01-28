import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { SignJWT } from "jose";
import { nanoid } from "nanoid";

const getSessionSecret = () => {
  const secret = process.env.JWT_SECRET || "dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
};

async function createSessionToken(
  openId: string,
  options: { name?: string; expiresInMs?: number } = {}
): Promise<string> {
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({
    openId,
    appId: process.env.VITE_APP_ID || "company-wiki",
    name: options.name || "",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export function registerSimpleAuthRoutes(app: Express) {
  app.post("/api/auth/simple-login", async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;

      if (!email || typeof email !== "string") {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      let user = await db.getUserByEmail(normalizedEmail);
      
      if (!user) {
        const openId = `local_${nanoid(16)}`;
        await db.upsertUser({
          openId,
          name: name || normalizedEmail.split("@")[0],
          email: normalizedEmail,
          loginMethod: "email",
          lastSignedIn: new Date(),
        });
        user = await db.getUserByOpenId(openId);
      } else {
        await db.upsertUser({
          openId: user.openId,
          lastSignedIn: new Date(),
        });
      }

      if (!user) {
        res.status(500).json({ error: "Failed to create user" });
        return;
      }

      const sessionToken = await createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ 
        success: true, 
        user: { id: user.id, name: user.name, email: user.email } 
      });
    } catch (error) {
      console.error("[SimpleAuth] Login failed:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
}
