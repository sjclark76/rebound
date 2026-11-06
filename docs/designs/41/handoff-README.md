# Rebound · Owned weights only — design handoff (#41)

Story: the weight Rebound suggests, and any weight you change it to, is one you own, in the unit it's marked in, so you never pick up or log a weight you don't have.
Builds on docs/designs/38: kg | lb control, weight tiles, logging weight stepper, equipment list rows. Canvas: https://claude.ai/artifact/KPEynfuaJbxL14gqJku1ND

prototype/   .dc.html artboards (22, light and dark), canvas.json, rebound-ui.css
             Source artboards take a theme prop; the *-dark files import them with theme="t-dark".
             Log.dc.html takes a state prop (prompt, added, cancelled, snapTyped, snapped).
screenshots/ not included. Export from the canvas (Share › Export) if wanted.

1. Today (Main, Today-desktop)
- Weighted rows: "3 × 8–10 · **20 kg** · Dumbbells". Weight in bold, in its own unit, so one workout can mix kg and lb (20 kg, 25 lb Bowflex, 45 lb).
- Bodyweight, timed and reps-only rows show no weight: "3 × 10–15 · Body only", "3 × 30 s · Body only", "3 × 10–12 · TRX straps".
- Desktop detail panel dose: "3 × 8–10 · 20 kg".

2. Logging (Log*)
- The box starts at the suggested weight; − and + step through owned weights only.
- Typed weight not owned (11 kg): when you leave the box, a prompt appears under it: "Add 11 kg to your dumbbells?" / "You don't have an 11 kg dumbbell yet. Adding it saves it to your equipment." with Cancel and Add. Complete set is disabled while it's open.
- Add: saves to Dumbbells, the box stays at 11 kg, status line "11 kg added to your dumbbells." Cancel: the box goes back to 20 kg, no message.
- Typed weight owned: just works, no prompt.
- Adjustable-only gear (5–50 lb every 2.5): typing 55 snaps to 50 lb on leaving the box, with no prompt and one status line: "Set to 50 lb, the top of your adjustable dumbbells' range."

3. Bowflex weights page (Bowflex) and equipment list (Settings)
- Same page as Dumbbells: Selected strip, "Show tiles in" kg | lb, tiles, "Another weight".
- Defaults: 5–105 lb every 5 ticked (standard 210 lb Power Rods per side). Note: "Ticked for the standard 210 lb of Power Rods. Add heavier weights if you have the 310 or 410 lb upgrade."
- Equipment row: kg | lb control removed; summary link "Weights · 5–105 lb every 5" (aria-label "Bowflex weights: 5 to 105 lb, every 5 lb").
- Summary format (agreed): an even run of 3+ weights shortens to "first–last unit every step". The Selected strip uses the same form.

4. Fixed gear on, no weights (Row-empty, also in Settings)
- "Add weights" link, plus one muted hint line under it (aria-describedby): "Kettlebell exercises are left out of your workouts until you add a weight." It goes away once a weight is added.

Proposed, not in the spec (confirm before building)
- The prompt opens on leaving the box (Done or tap away), not while typing.
- Complete set is disabled while the prompt is open.
- An adjustable value inside the range but off the step (46 lb) snaps to the nearest step, the same way. Described, not drawn.
- Weighted rows keep the gear name after the weight; the brief's example showed only "3 × 8–10 · 12 kg".
