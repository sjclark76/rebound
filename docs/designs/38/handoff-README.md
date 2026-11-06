# Rebound · Gear described as owned (fixed tiles, adjustable ranges) — design handoff

Story: describe gear the way you own it (fixed and adjustable dumbbells and kettlebells in a mix of kg and lb, plus Bowflex, fingerboard, TRX) and log against those real weights.
Replaces the weight-group screens in docs/designs/38 (dropped). The logging weight stepper from docs/designs/38 (screen 4) is unchanged and not repeated here. Reuses the kg | lb control, weight tiles and range steppers from docs/designs/38 and 8.

screenshots/   14 PNGs at 2x, light and dark
  1-equipment-list            phone 390 + desktop 1280
  1-bowflex-unit-save-failed  phone: Bowflex row tinted, still lb, inline error + Try again
  2-dumbbell-weights-kg-tiles / -lb-tiles   same item, two views: 20, 24 kg and 45, 50 lb ticked
  3-adjustable-dumbbells-lb / -kg           range editor, unit control, preview
prototype/     .dc.html artboards, canvas.json, rebound-ui.css

Equipment list
- Free weights: Dumbbells, Adjustable dumbbells, Kettlebells, Adjustable kettlebells (new items; add to EQUIPMENT / EQUIPMENT_GROUPS in src/db/vocab.ts). Machines & cables: Bowflex Xtreme 2 SE. Accessories: Bands, Medicine ball, Exercise ball, Foam roll, Other, Metolius wooden fingerboard, TRX straps.
- Fixed and adjustable items that are on show a 48px summary link under the switch: "Weights · 20, 24 kg + 45, 50 lb" (fixed) or "Range · 5–50 lb" (adjustable), going to their weights page. The full aria-label is spelled out ("Dumbbell weights: 20 and 24 kg, 45 and 50 lb").
- Summary format: kg weights then lb weights, each run ascending with its unit once, joined by " + ". The Selected strip uses the same format. (The brief's example "20, 24 kg, 45, 50 lb" used a comma; "+" matches the row summaries.)
- Bowflex: "Unit" line with the kg | lb control (same as docs/designs/38). Saves as you go, converts nothing. Failure: revert, tint the row, role="alert" message under it: "Couldn't save the Bowflex unit. It's still lb. Check your connection and try again." + Try again.
- Reps-only items (bands, exercise ball, foam roll, Other, TRX, fingerboard) have only the On/Off switch.
- Lede back to: "Switch on what you own. Changes save as you go and apply from your next suggested workout."

Fixed weights page (Dumbbells; same for Kettlebells, Medicine ball)
- Selected strip at the top (role="status", aria-live polite): "Selected · 4 weights" / "20, 24 kg + 45, 50 lb". Lists every owned weight across both units.
- "Show tiles in" kg | lb control. It only changes which preset tiles show and which unit Add uses. Note: "Ticked weights stay selected when you switch."
- "Tap the weights you own", with a count for the unit shown ("2 in kg"). Tiles are toggle buttons (aria-pressed) with check + text. kg tiles: the existing presets; lb tiles drawn: 5–60 lb every 5.
- "Another weight" field + Add, in the unit shown (suffix and aria-label follow it). Added weights appear as ticked tiles in that unit.
- Saves as you go; a failed save uses the existing editor banner ("Couldn't save that change. It's been undone.").

Adjustable page (Adjustable dumbbells; same for Adjustable kettlebells)
- "Unit" kg | lb control, then one range card: Start at, Up to, Step (56px steppers; − / + disabled at limits; Up to never below Start at).
- lb: Step is whole pounds or 2.5 lb, with the note "Steps are whole pounds or 2.5 lb." kg keeps the existing steps.
- Preview (role="status"): "This range makes 19 weights" / "5, 7.5, 10, 12.5 … 45, 47.5, 50 lb" (first four … last three).

Open questions
- What does changing an adjustable item's unit do to its numbers: relabel (5 lb → 5 kg) or keep the range as it is? It's drawn without a note; add one once decided.
- Off fixed and adjustable items show no summary, as in docs/designs/8. Do you want the summary shown while they're off too?
