---
name: attach-designs
description: Take a Claude Design handoff bundle for a Rebound story, commit it with the story, check it against the agreed spec, and either produce a revision prompt for Claude Design or mark the story ready to build once the user approves. Use after the user has designed a story's screens in Claude Design.
---

# Attach and review designs

Goal: make sure the designs match the agreed spec before any code is written, and keep them with the story. **Build nothing in this phase.** Claude Design is a manual step for the user; this skill processes what comes out of it and prepares what goes back in.

Argument: the issue number, and the path to the handoff bundle (a folder or zip exported from Claude Design; loose images are also fine).

## Process

1. **Read the issue** and confirm it is labelled `needs-design`. If it is `needs-spec`, stop and suggest `/spec-story` first. The issue's collapsed "Design brief" is what the designs were asked to deliver.
2. **Ingest the bundle.** Unzip into a scratch directory outside the repo and look at what it actually contains. The expected shape (from third-party reports, not yet verified) is screenshots of each screen and state, HTML/CSS/JS design files, design tokens, and a README for the coding agent. Describe to the user what you found, and note anything that differs from that expectation.
3. **Commit it** to `docs/designs/<issue-number>/` on a branch `design/<issue-number>` from `develop`:
   - screenshots at the top level, named after the spec's screen list (`01-focused-logging.png`, ...);
   - design files under `prototype/`;
   - the bundle's own README as `handoff-README.md`.
   Open a PR into `develop`.
4. **Embed in the issue** as a "Designs" section: each screenshot with its screen name from the spec, using `https://raw.githubusercontent.com/sjclark76/rebound/<commit-sha>/docs/designs/<n>/<file>` pinned to the commit SHA so links survive the branch being deleted, plus a link to the Claude Design file if the user supplies one.
5. **Review against the spec.** Look at every screenshot and read the handoff README and prototype for states and interactions. For each numbered behaviour, screen and state in the spec, say whether the design covers it. List: **gaps** (spec item with no screen), **additions** (design shows something the spec does not), and **questions**. Be specific and short.
6. **Resolve with the user, one question at a time.** For each addition, ask whether it is in or out of scope; if in, update the spec in the issue so the spec stays the source of truth. For each gap, ask whether to redesign or drop it.
7. **If anything needs redesigning, write a revision prompt** and stop here. Make it a self-contained, copy-paste prompt for the same Claude Design project: which screens to change, exactly what to add, remove or fix (one item per line), what must stay as it is, and a request to re-export the handoff bundle. Print it in a code block. Tell the user to paste it into Claude Design, re-export, and run `/attach-designs <n>` again. Replacing files on the design branch keeps the earlier versions in git history. Repeat steps 2-7 until nothing needs changing.
8. **Get explicit approval** (`AskUserQuestion`) that spec and designs are final.
9. **Set the state:** `scripts/story-state.sh <n> ready`. The design PR is merged by the user.
10. Tell the user the story is Ready and the next step is `/build-story <n>`.

## Rules

- The spec, not the picture, wins disagreements until the user decides otherwise.
- Do not touch `src/` in this phase.
- If the bundle's format is not what is described above, say so and adapt. After the first real use, tell the user what to correct in this skill and in the README's "Not yet verified" note.
