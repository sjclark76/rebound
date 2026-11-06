# Rebound · Unit per weight group — design handoff

Story: describe gear the way it's marked (dumbbells and kettlebells in a mix of kg and lb, plus Bowflex, fingerboard, TRX) and log against those real weights, so no weight is ever converted in your head.
Replaces the per-item "switch unit" confirmation and the blocked state from the earlier docs/designs/38 handoff; they're dropped. Extends docs/designs/8 (settings) and docs/designs/7 (logging).

screenshots/   16 PNGs at 2x, light and dark
  1-edit-group-range-lb       Adjustable dumbbells: 5–50 lb every 2.5 lb, Unit = lb
  1-edit-group-picked-kg      Fixed dumbbells: 20, 24 kg picked, Unit = kg, kg preset tiles
  2-weight-groups-mixed       Dumbbell weights page: "5–50 lb + 20, 24 kg", each group in its own unit
  2-3-equipment-default-unit  Settings list: mixed summary on Dumbbell; row control labelled "Default unit"
  3-default-unit-save-failed  phone: Dumbbell row, still kg, inline error + Try again
  3-equipment-default-unit    desktop list
  4-logging-20kg / 4-logging-next-45lb   the weight field before and after tapping +
prototype/     .dc.html artboards, canvas.json, rebound-ui.css

Weight group (edit screen)
- New "Unit" block after "Kind of group": the same kg | lb control as the equipment row (fieldset, legend "Unit", check + text on the selected segment).
- Note under it (aria-describedby): "As marked on this gear. Changing it relabels the numbers, so 5 lb becomes 5 kg." The example uses the group's own first weight.
- Changing it relabels: the numbers stay and only the unit changes. No confirmation. Saves as you go; a failed save uses the editor's existing "Couldn't save that change. It's been undone." banner.
- lb: Go up by steps through whole pounds and 2.5 lb (existing note "Steps go up in whole pounds or 2.5 lb."). Preset tiles, the "Another weight" suffix and its aria-label follow the group's unit. If a relabel leaves a step that isn't allowed (0.5 → lb), snap to the nearest allowed step.
- New groups start in the item's default unit.

Weight groups page and summaries
- Each group line shows its own unit: "Range · 5–50 lb", "Picked · 20, 24 kg".
- The total and the Settings row summary join the groups in their own units, lb and kg parts each sorted, lightest group first: "5–50 lb + 20, 24 kg". The count unions by true weight (exact matches only).
- Lede: "Add a weight group for each kind you own, in the unit it's marked in. …" Footnote: "New groups start in kg, Dumbbell's default unit. A weight in more than one group counts once."

Equipment row: default unit
- Same control, label "Unit" → "Default unit" (legend "<Item> default unit"). Used for new groups, typed weights, starting weights and items with no groups (Bowflex). Converts nothing: no confirmation, saves as you go like On/Off.
- Settings lede: "Switch on what you own. The default unit is used for new weight groups and weights you type. Changes save as you go and apply from your next suggested workout."
- Save failed: revert, tint the row, error inside it (role="alert", aria-describedby on the fieldset): "Couldn't save Dumbbell's default unit. It's still kg. Check your connection and try again." + Try again. Clears on success or next change.
- No control for TRX straps or the Metolius wooden fingerboard.

Logging
- Layout unchanged (docs/designs/7). Only the number and its unit label change.
- − / + step through the weights in the exercise's item's groups, sorted by true weight, each with its own unit. Example for Dumbbell: … 42.5 lb, 20 kg (about 44.1 lb), 45 lb, 47.5 lb, 50 lb, 24 kg. From 20 kg, + gives 45 lb.
- Typing still works and keeps the field's current unit.
- Set rows and "Last time" show each logged set in the unit it was logged in.
- Screen readers: the input's unit is in aria-describedby, so "45, lb" is announced after a step.

Proposed, not in the spec (confirm before building)
- Relabelling a 0.5 kg-step range to lb snaps the step to the nearest allowed lb step.
- After typing a weight that isn't in a group, − / + jump to the nearest group weight below / above.
- Summary order: lightest group first, and the count unions only exact matches.
