---
name: build-story
description: Build a Rebound story that is labelled ready - tests first for logic, implementation exactly to the spec and designs, verification against the designs, and a PR into develop. Refuses to start unless the story is ready. Use when the user asks to build or implement a story.
---

# Build a story

Goal: deliver exactly what the spec and designs say, verified, as a PR the user can review.

Argument: the issue number.

## Gate

Run `gh issue view <n> --json labels,body`. If the issue does not have the `ready` label, **stop** and say which step is missing (`/spec-story` or `/attach-designs`). Do not build from a story that is not ready.

## Process

1. **Read** the issue spec, the committed designs in `docs/designs/<n>/`, `CLAUDE.md`, `AGENTS.md` (Next.js here differs from your training data: read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code), and the code the story touches.
2. **Plan briefly** in chat: the files you will change and any technical decision the user might care about (data model, route structure, new dependencies). Ask before anything surprising. Then set the state: `scripts/story-state.sh <n> in-progress`.
3. **Branch** `feature/<short-name>` from an up-to-date `develop`.
4. **Logic first.** Write failing unit tests for non-trivial logic (rules, prefill, lifecycle), then implement. Keep pure logic separate from UI so it is testable.
5. **Build the UI** to the designs: reuse the theme tokens and components in `src/components/` and `src/components/ui/`; do not invent new colours or fonts. Cover every state in the spec.
6. **Do not add anything the spec does not say.** If you hit a gap or a better idea, stop and ask the user. Record agreed changes in the issue.
7. **Verify.**
   - `npm run typecheck`, `npm run lint`, `npm test` all pass.
   - Run the app against the Neon `development` branch (never `production`), exercise every behaviour in the spec, and compare each screen with its design at phone (390px) and desktop widths. Note every visual difference.
   - Check accessibility basics: tap targets, contrast, labels.
8. **Open the PR** into `develop` (`gh pr create --base develop`), body: `Closes #<n>`, a summary of behaviour delivered, how it was verified, and a **Differences from the design** section (or "None"). Then `scripts/story-state.sh <n> in-review`.
9. Tell the user what to look at when reviewing. The user merges; do not merge yourself unless asked.

## Rules

- Migrations: generate with `npm run db:generate`, apply to `development` only, and call it out in the PR. Never run against `production` without asking.
- Commits end with the Co-Authored-By line from the harness.
- Deploys are rationed: never trigger or merge to `main` from this skill.
