import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

// Only these emails may create an account (comma-separated in env).
const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // Dev-only email/password login; never enabled in production.
  emailAndPassword: { enabled: process.env.NODE_ENV !== "production" },
  socialProviders: process.env.GOOGLE_CLIENT_ID
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          if (!allowedEmails.includes(newUser.email.toLowerCase())) {
            throw new APIError("FORBIDDEN", { message: "Not invited" });
          }
          return { data: newUser };
        },
      },
    },
  },
  plugins: [nextCookies()],
});
