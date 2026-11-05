# Rebound — set logging handoff

Canvas: https://claude.ai/artifact/VK9gJXVGzaAPVyzu5Y27K2

- `screenshots/` — 2x PNGs. `NN-name.png` shows the whole artboard (every state, light and dark). `NN-name--MM-state.png` shows one phone state. `*-desktop--light/dark.png` show the 1280px layouts.
- `design/` — canvas artboards (`.dc.html`), `canvas.json`, and `build.py`, which generates them all from one source.

## Behaviour
- Pre-fill: use the same set number from last time; if there isn't one, copy the previous set from today. The source line on each set says which rule applied.
- The dashed box under the source line is reserved for a future suggested weight. It's empty for now and keeps its height.
- The Focused/List view choice is remembered. The workout saves after every set and resumes from the banner on Today.
- Delete set, Skip and Discard each ask for confirmation first. Red (destructive) is used only for Delete set and Discard.
- Volume counts weighted sets only (kg × reps). Recovering lists the muscles trained today.
- Every state shows an icon and a word: Done, Now, To do, Skipped, Extra set, Exercise complete.
- After the last planned set the bottom button becomes "Next: <exercise>", or "Finish workout" on the final exercise (08).
- A weighted exercise that has never been logged is pre-filled with a starting weight, labelled "Starting weight".
- In List view, any exercise's next set can be opened. Opening one collapses the set that was open, and the Now marker stays on the last logged set.
- A workout left open more than 24 hours is saved as finished, and Today shows a one-time notice that can be dismissed.
- The core finisher counts as an exercise everywhere (5 exercises).
