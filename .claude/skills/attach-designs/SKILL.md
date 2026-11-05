---
name: attach-designs
description: Attach Claude Design screens to a Rebound story, check them against the agreed spec, and mark the story ready to build once the user approves. Use after the user has designed a story's screens in Claude Design.
---

# Attach designs

Goal: make sure the designs match the agreed spec before any code is written, and keep them with the story. **Build nothing in this phase.**

Argument: the issue number. The user hands over the exported images/files from Claude Design (paths, or already placed in the repo).

## Process

1. **Read the issue** and confirm it is labelled `needs-design`. If it is `needs-spec`, stop and suggest `/spec-story` first.
2. **Commit the designs** to `docs/designs/<issue-number>/` (one file per screen, named after the spec's screen list, e.g. `01-focused-logging.png`). Work on a branch `design/<issue-number>` from `develop` and open a PR into `develop`. Keep any HTML/React prototype files alongside the images.
3. **Embed them in the issue** as a "Designs" section: each screen's image (use `https://raw.githubusercontent.com/sjclark76/rebound/<commit-sha>/docs/designs/<n>/<file>` pinned to the commit SHA, so the link survives the branch being deleted) with its name from the spec, plus a link to the Claude Design file if the user supplies one.
4. **Review against the spec.** Look at every image. For each numbered behaviour, screen and state in the spec, say whether the design covers it. List: gaps (spec item with no screen), additions (design shows something the spec does not), and questions. Be specific and short.
5. **Resolve with the user, one question at a time.** For each addition, ask whether it is in or out of scope; if in, update the spec in the issue so the spec stays the source of truth. For each gap, ask whether to redesign or drop it.
6. **Get explicit approval** (`AskUserQuestion`) that spec and designs are final.
7. **Set the state:** `scripts/story-state.sh <n> ready`. The design PR is merged by the user.
8. Tell the user the story is Ready and the next step is `/build-story <n>`.

## Rules

- The spec, not the picture, wins disagreements until the user decides otherwise.
- Do not touch `src/` in this phase.
