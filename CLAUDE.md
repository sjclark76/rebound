# Rebound

Personal strength-training planner: suggests workouts from owned equipment, works around injuries, and later factors in Strava endurance load. See `README.md` for setup and layout.

@AGENTS.md

## Commands

- `npm run dev` / `typecheck` / `lint` / `test`: run `typecheck` and `lint` before committing.
- `npm run db:generate` after editing `src/db/schema.ts`, then `db:migrate`. Migrations use the unpooled URL.
- `npm run db:seed` loads the exercise catalogue.

## Database (Neon)

- Project `twilight-wave-13258791`. Branches: `production` (default, `br-odd-tree-a7e567gp`) and `development` (`br-raspy-wave-a7dpoq2r`).
- Local work uses `development` via `.env.local`. Never point local at `production`, and never run migrations or destructive Neon tools against it without asking.

## Auth

- Better Auth in `src/lib/auth.ts`, with an email allowlist (`ALLOWED_EMAILS`).
- Dev-only email/password login on `/login` (disabled when `NODE_ENV=production`). Local dev email is `dev@rebound.local`.

## Ways of working

Spec first. Never build a screen or feature before the story is specced and the user has agreed it. The user is an experienced engineer and wants to be involved; ask one question at a time.

Each story moves through three skills, with a human gate between them:

1. `/spec-story <issue|new>`: interview, write the spec into the issue, produce a Claude Design prompt. Label `needs-design`.
2. `/attach-designs <issue>`: commit designs to `docs/designs/<issue>/`, embed them in the issue, check them against the spec. Label `ready` once the user approves.
3. `/build-story <issue>`: refuses unless `ready`. Tests first, build to the spec and designs, verify, PR into `develop`. Labels `in-progress` then `in-review`.

State lives in issue labels (`needs-spec`, `needs-design`, `ready`, `in-progress`, `in-review`) and is mirrored to the board's Stage column by `scripts/story-state.sh <issue> <state>`. Anything not in the agreed spec is raised with the user, not added.

## GitHub

- This repo is owned by `sjclark76`. `.envrc` (direnv) sets `GH_TOKEN` for that account, so `gh` works here without switching your global account. If `gh` shows the wrong account, run `direnv allow` or use `direnv exec . gh ...`.
- Features are tracked as GitHub issues, grouped by milestone on the Rebound project board.
- Branching: feature branches -> PR into `develop` (the default branch). `main` is production; a release is a `develop` -> `main` PR merged with a merge commit (not squashed). Netlify builds only `main`, so keep deploys rare (free tier: 15 credits per deploy of 300/month).
