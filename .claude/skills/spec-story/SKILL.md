---
name: spec-story
description: Interactively spec a Rebound story (or several) before anything is built. Interviews the user one question at a time, writes the agreed spec into the GitHub issue, and produces a Claude Design prompt for the screens. Use when the user wants to spec, refine or break down a story, or when starting any new feature.
---

# Spec a story

Goal: agree *what* will be built, with the user, before design or code. The user is an experienced engineer and wants to be involved in decisions. **Build nothing in this phase.**

Argument: an issue number, or "new" (create the issue first with `gh issue create`, milestone chosen with the user).

## Process

1. **Ground yourself (read-only).** Read the issue, `CLAUDE.md`, `src/db/schema.ts`, and the code the story touches. Note what already exists so the questions are informed, not generic.
2. **Draft the story** in one line: "As a ..., I want ..., so ...". Confirm it with the user.
3. **Interview, one question at a time** with `AskUserQuestion`. Put your recommended option first, labelled "(Recommended)". Cover: behaviour and flow, data, edge cases and failure states, what is out of scope, and which screens are needed. If an answer reveals a bigger idea, say so and offer to split it into its own backlog issue rather than absorbing it.
4. **Summarise the spec** in chat (plain, short) and get explicit approval with `AskUserQuestion`. Do not post until approved.
5. **Post to the issue** (`gh issue edit <n> --body ...`) using this structure:
   - **Story**, **Behaviour** (numbered), **Out of scope** (with links to split-out issues), **Screens to design** (numbered list), **Data** (tables touched, migrations), **Acceptance criteria**, and **Status** (`Spec agreed. Waiting on screen designs.`).
6. **Create issues for split-out ideas** as backlog items with only their intent, then run `scripts/story-state.sh <n> needs-spec` for each.
7. **Hand off to design.** Write a ready-to-paste Claude Design prompt: app context, the story, each screen from the list (phone 390px, plus desktop where relevant), states to cover (empty, loading, error, injured/rest/rehab), and the existing design system (palette and fonts are in `src/app/globals.css` and `src/app/layout.tsx`). Output it in a code block.
8. **Set the state:** `scripts/story-state.sh <n> needs-design`.
9. Tell the user the next step: take the prompt to Claude Design, then run `/attach-designs <n>`.

## Rules

- One question at a time. No walls of questions.
- Never add behaviour the user has not agreed. Raise it as a question.
- Keep text short: lead with the intent, 1-3 sentences per point.
