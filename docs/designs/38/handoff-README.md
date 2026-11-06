# Rebound · Per-item units (kg | lb) — design handoff

Story: suggested workouts use the Bowflex Xtreme 2 SE, Metolius fingerboard and TRX straps, and each piece of gear keeps its weights in its own unit. Replaces the earlier global Units setting (there is no Units section). Extends docs/designs/8; the lb weight-group screens in docs/designs/38 (screen 5) are unchanged.

screenshots/   12 PNGs at 2x, light and dark
  1-equipment-units          phone 390 + desktop 1280. Dumbbell, kettlebells in kg; Bowflex in lb; fingerboard and TRX with no unit
  2-switch-dumbbell-confirm  phone bottom sheet + desktop dialog
  3-unit-save-failed         phone: Dumbbell row stays kg, inline error + Try again
  4-unit-blocked-workout-open  phone: unit controls disabled, notice + Go to workout
design-files/  .dc.html artboards, canvas.json, rebound-ui.css (design-8 CSS + "Per-item unit" block at the end)

Build notes
- Groups follow EQUIPMENT_GROUPS in src/db/vocab.ts (Bowflex under Machines & cables; fingerboard and TRX under Accessories).
- Lede gains one clause: "Switch on what you own, and set the unit each piece is marked in. Changes save as you go and apply from your next suggested workout."
- Unit line: its own line under the On/Off row, left-aligned and labelled "Unit", so it never sits beside the switch. <fieldset> (legend, visually hidden: "<Item> unit") with two radios, kg and lb, drawn as a bordered 2-segment control (68px segments, 48px total height). Selected = spruce-tinted fill + check + text. The switch keeps its track/thumb look; the 64px <label> row still toggles On/Off only.
- Shown whether the item is on or off. Not shown for items with no weights: Metolius wooden fingerboard, TRX straps. Default kg.
- Order inside a row: On/Off row → Unit line → Weights summary link (weighted items that are on).
- Choosing the other unit opens the confirmation; nothing changes until "Switch to lb". Title names the item: "Switch Dumbbell to pounds?" Body: "Only Dumbbell's weights change. They're converted from kg to lb and saved again:" then Weight sets (with the item's current summary), Starting weights ("For exercises that use dumbbells"), Logged sets ("Of exercises that use dumbbells"). Note: "Weights round to the nearest 0.5 lb, so 22.5 kg becomes 49.5 lb. Your other equipment keeps its own unit." Actions "Switch to lb" (primary) / "Keep kg". lb→kg mirrors it. Weight sets only appear for items that have them.
- Phone: bottom sheet; desktop: centred 520px dialog. role="dialog", aria-modal, focus moves into it, Esc / scrim = keep.
- Save failed: the conversion is all-or-nothing. Row tints, control stays on the old unit, error inside the row (role="alert", aria-describedby on the fieldset): "Couldn't switch Dumbbell to lb. Nothing was changed: its weights are still in kg. Check your connection and try again." + Try again (reruns without asking again). Clears on success or next change.
- Blocked: with a workout open, every unit fieldset is disabled (aria-describedby the notice), and one notice sits under the lede: lock + "A workout is open, so units can't change. Finish or end it first, so its sets stay in one unit. On and Off still work." + "Go to workout". The server should refuse too (workout opened elsewhere), and the row then shows the same message inline.
- Weight groups use the item's unit everywhere (summary row, edit screens, presets): see docs/designs/38.

Open questions
- Should Bands, Exercise ball, Foam roll and Other have a unit? The spec says every row except TRX and fingerboard, so they're drawn with one, but none of them store weights today.
- How does a range convert? 2–24 kg every 1 kg doesn't map to whole or 2.5 lb steps. Convert to a picked set, or re-step the range (and say which in the confirmation)?
