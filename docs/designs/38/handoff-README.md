# Rebound · Units (kg / lb) — design handoff

Story: suggested workouts use the Bowflex Xtreme 2 SE, Metolius fingerboard and TRX straps, logged in the unit the user picks. New on screen: a kg / lb setting. Extends docs/designs/8 (Equipment settings); same tokens (src/app/globals.css) and shared CSS.

screenshots/   16 PNGs at 2x, light and dark
  1-settings-units           phone 390 + desktop 1280 (Units section above Equipment, kg selected)
  2-switch-confirm           phone bottom sheet + desktop dialog
  3-unit-save-failed         phone (reverted to kg, inline error + Try again)
  4-switch-blocked-workout-open  phone (control disabled, reason + Go to workout)
  5-edit-set-range-lb        phone: 5–50 lb, every 2.5 lb
  5-edit-set-picked-lb       phone: lb preset tiles, 55, 60, 65 lb picked
design-files/  .dc.html artboards, canvas.json, rebound-ui.css (the design-8 file plus a "Units story" block at the end)

Build notes
- Units is the first section on /settings (it's short, and it changes how everything below reads). Heading "Units", lede "Weights are shown and logged in this unit."
- Control: <fieldset> legend "Weight unit" + two radios drawn as the existing segmented control (.seg), 56px tall. Selected = card fill + check icon + text, so it's never colour alone. Options "Kilograms (kg)" / "Pounds (lb)". kg is the default.
- Choosing the other unit does not change anything yet: it opens the confirmation (phone bottom sheet, desktop centred dialog; role="dialog", aria-modal, labelled by the title). Focus goes to the dialog; Esc / scrim tap = "Keep kg".
- Confirm copy: "Switch to pounds?" / "Rebound will convert every weight you've saved from kg to lb and save it again:" Logged sets · Starting weights · Dumbbell and kettlebell weights / "After that, weights show and are logged in lb. You can switch back the same way." Actions: primary "Switch to lb" (64px phone), secondary "Keep kg". The kg→lb direction mirrors this ("Switch to kilograms?", "Switch to kg", "Keep lb").
- While converting: the selected segment holds, and the primary button shows progress and is disabled (not drawn).
- Save failed: the conversion should be all-or-nothing. The control stays on kg, the card tints, and the error sits inside it (role="alert", aria-describedby on the radios): "Couldn't switch to lb. Nothing was changed: your weights are still in kg. Check your connection and try again." + Try again, which reruns the conversion without asking again. Clears on success.
- Blocked: when a workout is open, the fieldset is disabled and a note sits below it (aria-describedby): lock icon + "A workout is open. Finish or end it to switch units, so its sets stay in one unit." + "Go to workout" link. The server should refuse the switch too (a workout opened in another tab) and show the same message.
- Weight groups: every value, tile, field suffix and summary uses the chosen unit ("lb" in the steppers, the "Another weight" field suffix and its aria-label "Add a weight in pounds", the Settings summary rows).
- lb range: "Go up by" steps through whole pounds and 2.5 lb (note under the steppers: "Steps go up in whole pounds or 2.5 lb."). Start/Up to snap to the step.
- lb presets drawn: 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 100 lb (kg presets unchanged).
- Open question: how converted values round (e.g. 22.5 kg = 49.6 lb). The design doesn't promise a rule; the spec should set one.
