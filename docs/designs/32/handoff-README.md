# Rebound · Muscle fatigue body map: design handoff (#32)

Story: a body map showing how fatigued each muscle is, so you can see at a glance what is rested and what is worked, and choose training accordingly.
Canvas: https://claude.ai/artifact/VD15VTdcEyzp5f7qkHM9yw

Screenshots (2x, light and dark) are at the top level, numbered by the spec's screen list. Light and dark use the same layout.
prototype/   .dc.html artboards and canvas.json. Main (phone), Desktop and Figure are the sources; the other files import them with props:
             theme (light|dark), mode (normal|empty|loading), view (front|back), selected (muscle id).
             figure-data.json holds the body outline and muscle shapes; figure-data.LICENSE is its MIT licence (see Figure, below).

1. Body screen (1-body-*)
- Phone: back arrow and "Body" title (like Today's workout). Whole-body fatigue at the top: date kicker, number in num-xl, swatch and band label.
- Front | Back toggle (segmented, 48px), then the figure on its own card, then the key, then "All muscles".
- Key: a plum bar 0–100, four named bands (Rested 0–24, Slightly tired 25–49, Tired 50–74, Very tired 75–100), and a marker each for Resting and Rehab.
- All muscles: grouped Chest, Shoulders, Arms, Core, Back, Legs and hips, Neck. Each row is a button: swatch, name, number and band label; injured rows show the existing Resting / Rehab chip instead of a number.
- Desktop: front and back side by side on one card with the key under them, the detail card to the right, the list below in three columns. Shown with Quadriceps selected.

2. A muscle selected (2a/2b/2c-selected-*)
- Tapping a muscle or a list row selects it: a thin spruce outline on the figure (mint in dark), the row highlighted, and a detail card under the figure (beside it on desktop).
- Fatigue card: name, number in num-lg, band label with swatch, a position marker on the plum bar, "Last trained 2 days ago" (or "Not trained this week").
- Resting card (lower back): Resting chip, "Injured and resting. Rebound keeps it out of your workouts, so it isn't on the fatigue scale.", last trained.
- Rehab card (front delts): Rehab chip, "Injured and in rehab. Rebound gives it gentle work only, so it isn't on the fatigue scale.", last trained.
- Tapping a row for a muscle only on the other side flips the toggle to that side.

3. Empty (3-empty-*)
- Everything at 0 · Rested, every row "Not trained yet", and the line "Nothing trained yet. The map fills in as you log workouts."

4. Loading (4-loading-*)
- Real header; skeleton blocks for the whole-body value, toggle and list; the figure as one even skeleton tone, pulsing as a single shape.

5. Top bar (5-top-bar-phone-and-desktop)
- New Body link before Settings (Lucide person-standing icon). Phone: icon only, 48px, aria-label "Body". Desktop: icon plus "Body"; on the Body screen it is marked current (secondary fill, aria-current="page").

Colour
- Fatigue scale is plum, its own ramp (not a design-system token). Light: #ebe8ef, #dcc6e0, #bb8dc2, #8f5592, #5b2861 at 0/25/50/75/100. Dark: #686479, #87709e, #aa84b9, #cca2d6, #f3d6f7. Lightness changes in one direction in each theme, so bands differ for colour-blind users too; the number and band label are always shown in words.
- Injured muscles are neutral grey on the figure (light #c4bdb0, dark #5a6561) with a marker in the existing rest (pause) or rehab (waves) colour.
- Dark mode puts the figure on a lighter slate card (#2b3633) so the body reads; head, hands and feet are #7d8884, hair #636e6a. Light: card white, body #dcd6cb, hair #c3bcae.

Figure
- Outline and muscle shapes come from react-muscle-highlighter (MIT License, Copyright (c) 2024 My Muscle Contributors), regrouped into Rebound's muscles. The licence notice must ship with the build.
- Its shapes are coarser than our list, so some are split with curved cuts: chest into upper and lower, deltoids into front and side (front view) and rear and side (back view), trapezius into upper and lower (back view).
- Mapping notes: rhomboids use its "upper back" pieces (close, not exact); abductors are the upper outer glute (gluteus medius); hip flexors are the upper inner thigh piece; shins and knees stay neutral.
- On the canvas Figure.dc.html fetches the shape data from an uploaded copy of figure-data.json; in the app it would be a local module.

Accessibility
- Muscles on the figure are not keyboard-reachable; the list of real buttons is the keyboard and screen-reader route, and each SVG has role="img" with a label saying so.

Departures from the #32 spec, to agree before `ready`
- Muscle count: the spec says 24 but its lists name 23 distinct muscles; the design shows those 23.
- Triceps and adductors also appear on the front view (the figure draws them there); the spec lists them on the back only.
- Injured muscles on the figure are grey with a coloured marker, not filled in the rest and rehab colours.
- Selected-row highlight uses the apricot accent; whole-body value averages uninjured muscles only; injured muscles show no fatigue number.
- "Legs carry most of it, from Thursday's session." under the whole-body value is sample copy, not in the spec.

Sample data: legs trained Thursday (quadriceps 62, hamstrings 56, glutes 78), front delts in rehab, lower back resting.
