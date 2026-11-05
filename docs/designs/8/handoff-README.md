# Rebound · Equipment settings — design handoff

Story: turn owned equipment on and off in settings so the next suggested workout only uses it.
Canvas: "Rebound · Equipment settings" (Claude Design). Tokens: src/app/globals.css (Rebound design system).

screenshots/   28 PNGs at 2x — every screen and state, light and dark
  1-equipment-list   phone 390 + desktop 1280
  2-nothing-selected phone 390 (hint visible, everything off)
  3-save-failed      phone 390 (Barbell reverted to Off, inline error + Try again)
  4-home-header      phone 390 + desktop 1280 (settings entry point)
  5-weight-sets       Dumbbell weights: summary + list of sets, phone + desktop
  6-add-a-set         choose Range or Pick weights, optional name
  7-edit-set-range    Adjustable dumbbells: 2–24 kg, every 1 kg
  8-edit-set-picked   Fixed dumbbells: 26, 28, 30 kg
design-files/  the .dc.html artboards, canvas.json, rebound-ui.css (tokens + shared pieces)
               open any .dc.html in a browser to view it (fonts load from Google Fonts)

Build notes
- Route /settings; Equipment is a section of it. Header: gear icon button (48px, aria-label "Settings") left of Sign out on phone; gear + "Settings" on desktop, shown as current on /settings.
- Sign out drawn at 48px tall (code today: ghost size sm, 28px) so both header targets meet the 44px rule.
- Groups are data-driven: {group, items[]}; new items append to a group, new groups append (stacked on phone, auto-fill grid minmax(320px,1fr) on desktop).
- Row = <label> wrapping <input type="checkbox" role="switch">; whole 64px row is the tap target. State is icon + text: "On" + check in the thumb, or "Off" + empty outlined track.
- Toggle saves immediately (optimistic). On failure: revert the switch, tint the row, show the error under it (role="alert", aria-describedby on the input) with a Try again button. Error clears on retry success or the next toggle.
- Group count ("2 of 4 on") and the hint update live. With nothing on (incl. first visit): "Nothing selected: workouts will be bodyweight only." (role="status").
- Lede states the timing: "Changes save as you go and apply from your next suggested workout."
- Home empty state copy "Equipment setup is coming soon" should now link to /settings.

Weights as sets
- Weighted items that are on (dumbbell, kettlebells, medicine ball) show a 48px "Weights" summary row under the switch ("2–24 kg + 26, 28, 30 kg"), linking to /settings/equipment/<item>.
- An item holds a list of sets. Set = { name?, type: "range", start, step, top } or { name?, type: "picked", weights[] }. kg, 0.5 kg allowed.
- The item's weights = union of all sets (a weight in two sets counts once). The sets page shows that total at the top.
- Add a set: radio cards (Range / Pick weights) + optional name, Continue opens the edit screen.
- Edit set: name, type (segmented), then 56px steppers (Range) or 56px toggle tiles with aria-pressed + "Another weight" field (Picked). Range -> Picked keeps the set's weights. Up to can't go below Start at.
- Remove this set at the bottom of the edit screen (undo toast, or confirm if no undo).
- Everything saves as you go; a failed save reverts and uses the inline row error from the switches.
- Barbell / E-Z bar later: a "bar + plates" set type fits this model.
