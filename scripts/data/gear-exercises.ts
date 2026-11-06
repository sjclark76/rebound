// Exercises for the user's own gear: Bowflex Xtreme 2 SE, Metolius wooden fingerboard, TRX straps.
// Loaded by `npm run db:seed:gear`. Each is tagged with its equipment, so it only appears when that gear is switched on.
// Muscles are chosen from the ones the generator's splits use (push: chest/shoulders/triceps, pull: lats/middle back/biceps/traps,
// legs: quadriceps/hamstrings/glutes/calves; core: abdominals), so each exercise can actually be suggested.
import type { Equipment } from "../../src/db/vocab";

export type GearExercise = {
  id: string;
  name: string;
  equipment: Equipment;
  category: "strength";
  level: "beginner" | "intermediate";
  force: "push" | "pull" | "static" | null;
  mechanic: "compound" | "isolation";
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
};

type Row = [name: string, primary: string, secondary: string[], mechanic: "compound" | "isolation", force: "push" | "pull" | null, how: string, level?: "intermediate"];

const slug = (name: string) => name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
const build = (prefix: string, equipment: Equipment, pre: string, rows: Row[]): GearExercise[] =>
  rows.map(([name, primary, secondary, mechanic, force, how, level]) => ({
    id: `${prefix}_${slug(name)}`,
    name: `${name} (${prefix === "Bowflex" ? "Bowflex" : prefix === "TRX" ? "TRX" : "Fingerboard"})`,
    equipment,
    category: "strength",
    level: level ?? "beginner",
    force,
    mechanic,
    primaryMuscles: [primary],
    secondaryMuscles: secondary,
    instructions: [pre, how],
    images: [],
  }));

const BOWFLEX_PRE = "Set the Power Rods to a load you can move with control for the planned reps, and attach the bar or handles as the owner's manual shows for this exercise.";

const bowflex: Row[] = [
  // Chest
  ["Bench Press", "chest", ["triceps", "shoulders"], "compound", "push", "Lie on the bench, take the bar at chest height, press up until your arms are straight, then lower slowly."],
  ["Incline Bench Press", "chest", ["shoulders", "triceps"], "compound", "push", "With the bench inclined, press the bar up and slightly back over your upper chest, then lower with control."],
  ["Decline Bench Press", "chest", ["triceps", "shoulders"], "compound", "push", "With the bench declined, press the bar up from your lower chest until your arms are straight, then lower slowly."],
  ["Standing Chest Press", "chest", ["triceps", "shoulders"], "compound", "push", "Stand facing away from the machine with the handles at chest height, press forward until your arms are straight, then return slowly."],
  ["Single-Arm Chest Press", "chest", ["triceps", "shoulders"], "compound", "push", "Stand facing away with one handle at chest height, press it forward without twisting, then return slowly. Repeat on the other side."],
  ["Bench Fly", "chest", ["shoulders"], "isolation", "push", "Lie on the bench with the handles out wide and arms slightly bent, bring them together over your chest, then open back out slowly."],
  ["Incline Fly", "chest", ["shoulders"], "isolation", "push", "On an inclined bench, sweep the handles together in an arc over your upper chest, then lower them out wide with control."],
  ["Standing Chest Fly", "chest", ["shoulders"], "isolation", "push", "Stand facing away with arms out wide and slightly bent, bring the handles together in front of your chest, then return slowly."],
  // Shoulders
  ["Seated Shoulder Press", "shoulders", ["triceps"], "compound", "push", "Sit upright with the handles at shoulder height, press overhead until your arms are straight, then lower slowly."],
  ["Standing Shoulder Press", "shoulders", ["triceps", "abdominals"], "compound", "push", "Stand with the handles at shoulder height, brace your core, press overhead, then lower with control."],
  ["Single-Arm Overhead Press", "shoulders", ["triceps", "abdominals"], "compound", "push", "Hold one handle at shoulder height, press it overhead without leaning, then lower slowly. Repeat on the other side."],
  ["Lateral Raise", "shoulders", [], "isolation", "pull", "Stand side-on with a handle in the far hand and raise your arm out to shoulder height with a slight bend, then lower slowly."],
  ["Front Raise", "shoulders", ["chest"], "isolation", "push", "Stand facing away with the handles by your thighs, raise your arms straight forward to shoulder height, then lower slowly."],
  ["Rear Delt Fly", "shoulders", ["middle back"], "isolation", "pull", "Hinge forward with the handles in front of you and arms slightly bent, sweep them out and back to shoulder height, then return slowly."],
  ["Upright Row", "shoulders", ["traps", "biceps"], "compound", "pull", "Hold the bar at your thighs and pull it up along your body to chest height, elbows high, then lower slowly."],
  ["Shrug", "traps", ["shoulders"], "isolation", "pull", "Hold the bar or handles at your sides and lift your shoulders straight up toward your ears, pause, then lower slowly."],
  ["Face Pull", "shoulders", ["middle back", "traps"], "compound", "pull", "With the handles at face height, pull them toward your face with elbows high and wide, then return slowly."],
  // Triceps
  ["Triceps Pushdown", "triceps", [], "isolation", "push", "Keep your elbows by your sides and press the handles down until your arms are straight, then let them rise slowly."],
  ["Single-Arm Triceps Pushdown", "triceps", [], "isolation", "push", "With one handle and your elbow tucked in, press down until your arm is straight, then return slowly. Repeat on the other side."],
  ["Overhead Triceps Extension", "triceps", [], "isolation", "push", "Hold the handles behind your head with elbows pointing up, straighten your arms overhead, then bend them back slowly."],
  ["Lying Triceps Extension", "triceps", [], "isolation", "push", "Lie on the bench holding the bar over your chest, bend only at the elbows to lower it toward your forehead, then press back up."],
  ["Triceps Kickback", "triceps", [], "isolation", "push", "Hinge forward with your upper arm parallel to the floor, straighten your elbow to push the handle back, then return slowly."],
  // Biceps
  ["Biceps Curl", "biceps", ["forearms"], "isolation", "pull", "Stand with the bar at your thighs and curl it to your chest, keeping your elbows by your sides, then lower slowly."],
  ["Hammer Curl", "biceps", ["forearms"], "isolation", "pull", "Hold the handles with palms facing in and curl them up without turning your wrists, then lower slowly."],
  ["Preacher Curl", "biceps", [], "isolation", "pull", "Rest your upper arms on the pad, curl the bar up, and lower it slowly until your arms are nearly straight."],
  ["Seated Incline Curl", "biceps", [], "isolation", "pull", "Sit back on the inclined bench with your arms hanging, curl the handles up, and lower them slowly."],
  ["Reverse Curl", "biceps", ["forearms"], "isolation", "pull", "Hold the bar with an overhand grip and curl it up with your elbows by your sides, then lower slowly."],
  ["Single-Arm Curl", "biceps", ["forearms"], "isolation", "pull", "Curl one handle up with your elbow by your side, then lower slowly. Repeat on the other side."],
  ["Concentration Curl", "biceps", [], "isolation", "pull", "Sit with your elbow braced against your inner thigh, curl the handle up, and lower it slowly. Repeat on the other side."],
  // Back
  ["Lat Pulldown", "lats", ["biceps", "middle back"], "compound", "pull", "Sit under the pulley and pull the bar down to your upper chest, leading with your elbows, then let it rise slowly."],
  ["Wide-Grip Pulldown", "lats", ["biceps", "middle back"], "compound", "pull", "Take a wide overhand grip, pull the bar down to your upper chest, then return slowly."],
  ["Close-Grip Pulldown", "lats", ["biceps"], "compound", "pull", "Take a narrow grip, pull the handle down to your chest with your elbows close to your sides, then return slowly."],
  ["Reverse-Grip Pulldown", "lats", ["biceps"], "compound", "pull", "Take an underhand grip, pull the bar down to your upper chest, then let it rise slowly."],
  ["Single-Arm Pulldown", "lats", ["biceps"], "compound", "pull", "Pull one handle down beside your chest, elbow leading, then return slowly. Repeat on the other side."],
  ["Seated Row", "middle back", ["lats", "biceps"], "compound", "pull", "Sit tall, pull the handles to your lower ribs and squeeze your shoulder blades together, then return slowly."],
  ["Low Row", "middle back", ["lats", "biceps"], "compound", "pull", "With the handles low, pull them to your waist with your back straight, then return slowly."],
  ["High Row", "middle back", ["lats", "biceps", "traps"], "compound", "pull", "With the handles high, pull them down and back toward your chest, then return slowly."],
  ["Bent-Over Row", "middle back", ["lats", "biceps"], "compound", "pull", "Hinge forward with a flat back, pull the bar to your lower chest, then lower slowly."],
  ["Single-Arm Row", "middle back", ["lats", "biceps"], "compound", "pull", "Brace one hand on the bench, row the handle to your hip, then lower slowly. Repeat on the other side."],
  ["Hammer-Grip Row", "middle back", ["lats", "biceps"], "compound", "pull", "Hold the handles with palms facing in, row them to your sides, then return slowly."],
  ["Straight-Arm Pulldown", "lats", ["triceps"], "isolation", "pull", "With arms nearly straight, sweep the bar down to your thighs, then let it rise slowly."],
  ["Pullover", "lats", ["chest", "triceps"], "isolation", "pull", "Lie on the bench holding the bar overhead, arc it down to your thighs with straight arms, then return slowly."],
  ["Reverse Fly", "middle back", ["shoulders"], "isolation", "pull", "Bend forward and sweep the handles out and back with slightly bent arms, then return slowly."],
  // Legs
  ["Squat", "quadriceps", ["glutes", "hamstrings"], "compound", "push", "Stand with the bar across your shoulders, squat until your thighs are parallel to the floor, then drive back up."],
  ["Front Squat", "quadriceps", ["glutes", "abdominals"], "compound", "push", "Rack the bar at the front of your shoulders, squat with an upright chest, then stand back up."],
  ["Sumo Squat", "quadriceps", ["glutes", "adductors"], "compound", "push", "Take a wide stance with toes turned out, squat with knees tracking over your toes, then stand."],
  ["Leg Press", "quadriceps", ["glutes", "hamstrings"], "compound", "push", "Seated on the bench, press the bar away with your feet until your legs are nearly straight, then return slowly."],
  ["Leg Extension", "quadriceps", [], "isolation", "push", "Seated with the leg attachment, straighten your knees, pause, then lower slowly."],
  ["Lunge", "quadriceps", ["glutes", "hamstrings"], "compound", "push", "Step forward into a lunge until both knees reach about 90 degrees, then push back to standing. Alternate legs."],
  ["Reverse Lunge", "quadriceps", ["glutes", "hamstrings"], "compound", "push", "Step back into a lunge, lowering your back knee toward the floor, then push through your front foot to stand."],
  ["Bulgarian Split Squat", "quadriceps", ["glutes", "hamstrings"], "compound", "push", "Rest your rear foot on the bench, lower until your front thigh is parallel to the floor, then drive up.", "intermediate"],
  ["Step-Up", "quadriceps", ["glutes"], "compound", "push", "Step onto the bench with one foot and stand fully, then lower with control. Alternate legs."],
  ["Leg Curl", "hamstrings", ["calves"], "isolation", "pull", "With the leg attachment, curl your heels toward your glutes, pause, then lower slowly."],
  ["Stiff-Leg Deadlift", "hamstrings", ["glutes", "lower back"], "compound", "pull", "Holding the bar, hinge at the hips with nearly straight legs until you feel a hamstring stretch, then stand tall."],
  ["Romanian Deadlift", "hamstrings", ["glutes", "lower back"], "compound", "pull", "With a soft knee bend, push your hips back and slide the bar down your thighs, then drive your hips forward."],
  ["Deadlift", "hamstrings", ["glutes", "lower back", "quadriceps"], "compound", "pull", "Set your feet under the bar, brace, and stand by driving through your legs and hips, then lower with control.", "intermediate"],
  ["Good Morning", "hamstrings", ["glutes", "lower back"], "compound", "pull", "With the bar across your shoulders, hinge forward at the hips with a flat back, then stand tall."],
  ["Glute Kickback", "glutes", ["hamstrings"], "isolation", "pull", "With the ankle strap on, kick one leg straight back, squeeze, then return slowly. Repeat on the other side."],
  ["Hip Extension", "glutes", ["hamstrings"], "isolation", "pull", "Hinge forward holding the bench and extend one leg back and up, then return with control."],
  ["Hip Thrust", "glutes", ["hamstrings"], "compound", "push", "With your upper back on the bench and the bar across your hips, drive your hips up until your body is level, then lower."],
  ["Standing Calf Raise", "calves", [], "isolation", "push", "Hold the bar on your shoulders, rise onto your toes, pause, then lower your heels slowly."],
  ["Seated Calf Raise", "calves", [], "isolation", "push", "Seated with the bar over your knees, rise onto your toes, pause, then lower slowly."],
  // Abs
  ["Seated Ab Crunch", "abdominals", [], "isolation", "pull", "Hold the handles by your head, curl your ribs toward your hips, then return slowly."],
  ["Standing Cable Crunch", "abdominals", [], "isolation", "pull", "Hold the handles at your head and crunch forward and down, rounding your spine, then return slowly."],
  ["Kneeling Crunch", "abdominals", [], "isolation", "pull", "Kneel facing away holding the handles by your head, crunch down toward your knees, then return slowly."],
  ["Decline Crunch", "abdominals", [], "isolation", "pull", "On the declined bench, curl your shoulders up toward your hips, then lower slowly."],
  ["Woodchop", "abdominals", ["shoulders"], "compound", "pull", "Start with the handle high on one side and pull it diagonally down across your body, rotating from the trunk."],
  ["Reverse Woodchop", "abdominals", ["shoulders"], "compound", "pull", "Start with the handle low on one side and pull it diagonally up across your body, rotating from the trunk."],
  ["Standing Torso Rotation", "abdominals", [], "isolation", "pull", "Hold the handle at chest height and rotate your trunk away from the machine, keeping your hips still, then return."],
  ["Seated Oblique Twist", "abdominals", [], "isolation", "pull", "Sit tall holding the handle and twist from your waist to each side with control."],
  ["Pallof Press", "abdominals", ["shoulders"], "isolation", null, "Stand side-on holding the handle at your chest, press it straight out and hold briefly without twisting, then return."],
  ["Side Bend", "abdominals", ["lower back"], "isolation", null, "Hold a handle at your side and bend sideways at the waist, then return upright. Repeat on the other side."],
];

// Fingerboard hangs are timed (force: static). The primary muscle is the one doing the pulling, so the generator can suggest them on pull days; forearms (grip) are secondary.
const FINGERBOARD_PRE = "Hang from the board on the edge or pocket named below with your feet off the floor (or take some weight on your toes if you need to), and keep your shoulders engaged.";
const fingerboard: Row[] = [
  ["Dead Hang", "lats", ["forearms", "traps"], "isolation", null, "Hang from both hands with straight arms and a relaxed neck, for the planned time."],
  ["Active Hang", "lats", ["forearms", "traps"], "isolation", null, "Hang with your shoulders pulled down and back away from your ears, arms straight, for the planned time."],
  ["Half-Crimp Hang", "lats", ["forearms"], "isolation", null, "Hang on the edge with your fingers bent about 90 degrees at the middle joint and thumbs beside them, for the planned time.", "intermediate"],
  ["Open-Hand Hang", "lats", ["forearms"], "isolation", null, "Hang on the edge with your fingers extended and relaxed over it, for the planned time."],
  ["Sloper Hang", "lats", ["forearms", "traps"], "isolation", null, "Hang from the rounded edge with your fingers spread and palms pressing in, for the planned time."],
  ["Pocket Hang", "lats", ["forearms"], "isolation", null, "Hang from the pockets with two or three fingers, taking weight off your feet as needed, for the planned time.", "intermediate"],
  ["Flexed-Arm Hang", "biceps", ["lats", "forearms"], "isolation", null, "Pull up so your chin is level with the board and hold with elbows bent, for the planned time."],
  ["Scapular Hang", "traps", ["lats", "forearms"], "isolation", null, "Hang with straight arms and lift your body a little by pulling your shoulder blades down, holding for the planned time."],
  ["One-Arm Assisted Hang", "lats", ["forearms", "biceps"], "isolation", null, "Hang from one hand with the other lightly holding a strap or your toes for help, for the planned time. Repeat on the other side.", "intermediate"],
];

const TRX_PRE = "Adjust the strap length and your foot position so the move is hard but controlled: the closer your feet to the anchor, the harder it gets.";
const trx: Row[] = [
  ["Chest Press", "chest", ["triceps", "shoulders"], "compound", "push", "Lean forward holding the handles at chest height, lower your chest between your hands, then press back up with a straight body."],
  ["Push-Up", "chest", ["triceps", "shoulders", "abdominals"], "compound", "push", "With your feet in the straps in a plank, lower your chest to the floor, then press back up.", "intermediate"],
  ["Triceps Extension", "triceps", ["shoulders"], "isolation", "push", "Lean forward with arms extended overhead, bend your elbows to lower your head between your hands, then straighten them."],
  ["Row", "middle back", ["lats", "biceps"], "compound", "pull", "Lean back holding the handles, pull your chest to your hands with elbows close, then lower with control."],
  ["Low Row", "lats", ["middle back", "biceps"], "compound", "pull", "Lean back with a steeper angle and pull your hands to your ribs, squeezing your shoulder blades, then lower slowly."],
  ["Y Fly", "shoulders", ["traps", "middle back"], "isolation", "pull", "Lean back with arms forward and sweep them up and out into a Y shape, then lower slowly."],
  ["Biceps Curl", "biceps", ["forearms"], "isolation", "pull", "Lean back with arms straight, curl your hands to your forehead keeping elbows high, then lower slowly."],
  ["Squat", "quadriceps", ["glutes", "hamstrings"], "compound", "push", "Hold the handles for balance, sit back and down into a squat, then stand up pulling lightly on the straps."],
  ["Hamstring Curl", "hamstrings", ["glutes"], "isolation", "pull", "Lie on your back with your heels in the handles and hips lifted, curl your heels toward you, then straighten."],
  ["Hip Bridge", "glutes", ["hamstrings"], "compound", "push", "Lie on your back with your heels in the straps, lift your hips until your body is straight, then lower slowly."],
  ["Reverse Lunge", "quadriceps", ["glutes", "hamstrings"], "compound", "push", "Hold the handles, step one foot back into a lunge, then drive up to standing. Alternate legs."],
  ["Knee Tuck", "abdominals", ["shoulders"], "compound", null, "In a plank with your feet in the straps, draw your knees toward your chest, then extend back out.", "intermediate"],
];

export const GEAR_EXERCISES: GearExercise[] = [
  ...build("Bowflex", "bowflex xtreme 2 se", BOWFLEX_PRE, bowflex),
  ...build("Fingerboard", "metolius wooden fingerboard", FINGERBOARD_PRE, fingerboard).map((e) => ({ ...e, force: "static" as const })),
  ...build("TRX", "trx straps", TRX_PRE, trx),
];
