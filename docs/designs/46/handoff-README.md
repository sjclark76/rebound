# Rebound · Start any time, choose the workout type: design handoff (#46)

Story: start a workout whenever you like and choose its type, so Rebound recommends the right exercises for what you want to train today.
Builds on the Today screen (`src/app/page.tsx`) and the #41 list rows. Canvas: https://claude.ai/artifact/UJ9d7ufCbLKWrAnpzbKbWP

Screenshots (2x, light and dark) are at the top level, numbered by the spec's screen list. Light and dark use the same layout.
prototype/   .dc.html artboards and canvas.json. Main (home), Choose (type picker) and Desktop/DesktopHome are the sources;
             the other files import them with props: theme (light|dark), done (true after a finished workout),
             start-type (full|upper|push|pull|legs|core), mode (preview = Today's workout, no type row).
             The Claude Design export was a single bundled HTML page with no README or screenshots; the screenshots were rendered from it.

1. Home (1-home-*)
- Only the recommendation: kicker "Sat 7 Nov · Recommended", type in num-xl, "Last trained 4 days ago · 5 exercises and a core finisher", the why line, injury chips.
- Two actions in the bottom third: "See pull workout" (primary, arrow) and "Choose a workout" (secondary, grid icon).
- Desktop: the same content in one centred card, actions side by side.

2. Today's workout (2-todays-workout-*)
- Reached from "See pull workout". Back arrow, title "Today's workout", the recommendation, the exercise list and core finisher, sticky Start workout.
- No type row. Desktop keeps today's three columns (session + Start, list, exercise detail) with a "Home" back link.

3. Choose a workout (3-choose-*)
- Same as Today's workout plus a "Workout type" section above the list: six 48px buttons in a 3 × 2 grid (Full body, Upper body, Push, Pull, Legs, Core). Selected = filled primary + check icon, aria-pressed.
- The recommended type starts selected. Picking another changes the exercises and the why line ("You chose upper body today."), and shows "Back to Pull" on the section header.
- Recovering: a note under the type row on the secondary fill with a clock icon, e.g. "Legs were trained yesterday." The workout still shows.
- Core: five abdominal and lower-back exercises, no core finisher.

4. Home after finishing (4-home-after-finishing-*)
- "Done today" card at the top (circle-check, "Pull · 7:42 am · 18 sets", "Summary" link to the finished workout).
- Fresh recommendation below (Push), kicker "Next workout".

Exercises, weights and timings are sample data from the user's equipment; the exercise detail panel on desktop is a placeholder for the existing component.
