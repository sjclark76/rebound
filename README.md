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

## Ways of working

Spec first: nothing is built until the story has been specced and agreed. Work is tracked as GitHub issues in milestones, on the [Rebound project board](https://github.com/users/sjclark76/projects/3). Feature branches go to `develop` by PR; a release is a `develop` to `main` PR, because deploys are rationed (see `CLAUDE.md`).

Each story moves through four phases, with a human gate between them. Claude Design is a manual step: it can't run this repo's skills, so the skills prepare what goes in and process what comes out.

| Phase | Where | What happens | Gate |
|---|---|---|---|
| 1. Spec | Claude Code: `/spec-story` | One-question-at-a-time interview; the spec and a **design brief** (a copy-paste Claude Design prompt) are posted to the issue. | Spec approved |
| 2. Design | Claude Design | Paste the brief, iterate, export the handoff bundle. | Screens agreed |
| 3. Attach and review | Claude Code: `/attach-designs` | Commits the bundle to `docs/designs/<issue>/`, embeds the screenshots in the issue, and checks them against the spec. Gaps produce a **revision prompt** to paste back into Claude Design, repeated until the designs match. | Designs approved, story `ready` |
| 4. Build | Claude Code: `/build-story` | Refuses unless `ready`. Tests first, builds to the spec and designs, verifies against the designs, opens a PR into `develop`. | PR reviewed and merged |

**Story state** lives in issue labels (`needs-spec`, `needs-design`, `ready`, `in-progress`, `in-review`) and is mirrored to the board's Status column by `scripts/story-state.sh <issue> <state>`.

**Not yet verified:** what the Claude Design handoff bundle contains, and whether `/design` exists in Claude Code. The first story run through this process (#7) will test both; the notes here and the skills in `.claude/skills/` should be adjusted from what we learn. Planned: revision-prompt output in `/attach-designs`, bundle support, and a short `DESIGN.md` describing the look for Claude Design's repo import.

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
| `npm run db:seed:weights -- <email>` | Give a user starting weights for weighted exercises (dev data; replaced later by the strength assessment) |

## Layout

- `src/db/` — Drizzle schema (`schema.ts`), shared vocabularies for equipment, muscles and injury modes (`vocab.ts`)
- `src/lib/auth.ts` — Better Auth config, including the email allowlist
- `src/proxy.ts` — redirects signed-out users to `/login`
- `scripts/seed-exercises.ts` — exercise catalogue import
