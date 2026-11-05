# Rebound

Personal strength-training planner. Suggests workouts from your own equipment, works around injuries (rest or rehab), and will later factor in endurance load from Strava.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind + shadcn/ui · Neon Postgres + Drizzle · Better Auth (Google) · Vercel · installable PWA.

## First-time setup

1. **Database:** `npm i -g neon`, `neon login`, then `neon deploy`. The project is linked in `.neon`/`neon.ts`; this writes `DATABASE_URL` (pooled, used by the app) and `DATABASE_URL_UNPOOLED` (direct, used by migrations) into `.env.local`.
2. **Google login:** in Google Cloud Console create an OAuth client (type "Web application") with redirect URI `http://localhost:3000/api/auth/callback/google`.
3. **Env:** `cp .env.example .env` and fill in the auth values. `ALLOWED_EMAILS` restricts who can sign up.
4. **Install and migrate:**
   ```sh
   npm install
   npm run db:migrate   # create tables
   npm run db:seed      # load ~800 exercises from free-exercise-db
   npm run dev
   ```

## Deploying (Vercel)

Import the GitHub repo in Vercel, add the same env vars (with `BETTER_AUTH_URL` set to the Vercel URL), and add `https://<your-app>.vercel.app/api/auth/callback/google` to the Google OAuth redirect URIs. On your phone, open the site and use "Add to Home Screen".

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run typecheck` / `lint` / `test` | Checks |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Browse the database |
| `npm run db:seed` | Refresh the exercise catalogue |
| `npm run db:seed:equipment -- <email> <equipment...>` | Replace a user's owned equipment (dev data) |
| `npm run db:seed:injuries -- <email> add\|resolve\|list ...` | Add, resolve or list a user's injuries (dev data) |

## Layout

- `src/db/` — Drizzle schema (`schema.ts`), shared vocabularies for equipment, muscles and injury modes (`vocab.ts`)
- `src/lib/auth.ts` — Better Auth config, including the email allowlist
- `src/proxy.ts` — redirects signed-out users to `/login`
- `scripts/seed-exercises.ts` — exercise catalogue import
