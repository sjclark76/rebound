import { and, desc, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { exercise, injury, startingWeight, workout, workoutExercise, workoutSet } from "@/db/schema";
import type { Unit } from "@/db/vocab";
import { getGear, type Gear } from "./equipment-data";
import { exerciseKind, isStale, prefill, type Kind, type LoggedSet, type Starting } from "./workout";
import { equipmentLabel, FIXED_EQUIPMENT, isAdjustable, isFixed, poolItems, type Equipment, type FixedEquipment } from "@/db/vocab";
import { poolFor, type Weight } from "./weights";

/** Closes workouts left open for more than 24 hours; empty ones are simply removed. */
export async function closeStaleWorkouts(userId: string, now = new Date()) {
  const open = await db.select().from(workout).where(and(eq(workout.userId, userId), isNull(workout.completedAt)));
  for (const w of open.filter((w) => isStale(w.startedAt, now))) {
    const sets = await db.select({ id: workoutSet.id }).from(workoutSet).where(eq(workoutSet.workoutId, w.id));
    if (sets.length === 0) {
      await db.delete(workout).where(eq(workout.id, w.id));
      continue;
    }
    await db
      .update(workout)
      .set({ completedAt: now, autoClosedAt: now })
      .where(eq(workout.id, w.id));
    // Exercises never logged show as skipped, as they do when finishing by hand.
    const logged = new Set((await db.select({ e: workoutSet.exerciseId }).from(workoutSet).where(eq(workoutSet.workoutId, w.id))).map((r) => r.e));
    const plan = await db.select().from(workoutExercise).where(eq(workoutExercise.workoutId, w.id));
    const unlogged = plan.filter((p) => !logged.has(p.exerciseId)).map((p) => p.exerciseId);
    if (unlogged.length)
      await db
        .update(workoutExercise)
        .set({ skippedAt: now })
        .where(and(eq(workoutExercise.workoutId, w.id), inArray(workoutExercise.exerciseId, unlogged)));
  }
}

export type PlanRow = {
  exerciseId: string;
  name: string;
  equipment: string | null;
  kind: Kind;
  /** The unit to start in when there is nothing to copy: that of the lightest weight the equipment has, else kg. */
  unit: Unit;
  /** The real weights the equipment has (ticked weights plus an adjustable range), lightest to heaviest. - and + step through them. */
  options: Weight[];
  /** The fixed item a typed weight the user doesn't own can be added to (their dumbbells, for a dumbbell exercise), if it is switched on. */
  addTo: { item: FixedEquipment; noun: string; plural: string } | null;
  /** When there is nothing to add to but an adjustable item gives the weights: its name, for the line that says a typed weight was snapped. */
  snapLabel: string | null;
  position: number;
  plannedSets: number;
  reps: string;
  skipped: boolean;
  core: boolean;
  starting: Starting | null;
  lastTime: { dateLabel: string; sets: LoggedSet[] } | null;
};

export type LoadedWorkout = {
  id: number;
  split: string | null;
  startedAt: Date;
  completedAt: Date | null;
  plan: PlanRow[];
  sets: LoggedSet[];
};

/** One workout with its saved plan, its logged sets, and "last time" for each exercise. */
export async function loadWorkout(userId: string, workoutId: number): Promise<LoadedWorkout | null> {
  const [w] = await db.select().from(workout).where(and(eq(workout.id, workoutId), eq(workout.userId, userId)));
  if (!w) return null;

  const [gear, planRows, sets] = await Promise.all([
    getGear(userId),
    db
      .select({ p: workoutExercise, e: exercise })
      .from(workoutExercise)
      .innerJoin(exercise, eq(workoutExercise.exerciseId, exercise.id))
      .where(eq(workoutExercise.workoutId, w.id))
      .orderBy(workoutExercise.position),
    db.select().from(workoutSet).where(eq(workoutSet.workoutId, w.id)).orderBy(workoutSet.setNumber),
  ]);
  const ids = planRows.map((r) => r.e.id);
  const [starts, history] = ids.length
    ? await Promise.all([
        db
          .select()
          .from(startingWeight)
          .where(and(eq(startingWeight.userId, userId), inArray(startingWeight.exerciseId, ids))),
        db
          .select({ s: workoutSet, at: workout.startedAt })
          .from(workoutSet)
          .innerJoin(workout, eq(workoutSet.workoutId, workout.id))
          .where(
            and(
              eq(workout.userId, userId),
              ne(workout.id, w.id),
              isNotNull(workout.completedAt),
              inArray(workoutSet.exerciseId, ids),
            ),
          )
          .orderBy(desc(workout.startedAt), workoutSet.setNumber),
      ])
    : [[], []];

  // Last time = every set from the most recent earlier workout that included the exercise.
  const last = new Map<string, { dateLabel: string; workoutId: number; sets: LoggedSet[] }>();
  for (const { s, at } of history) {
    const cur = last.get(s.exerciseId);
    if (!cur) last.set(s.exerciseId, { dateLabel: at.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }), workoutId: s.workoutId, sets: [s] });
    else if (cur.workoutId === s.workoutId) cur.sets.push(s);
  }

  return {
    id: w.id,
    split: w.split,
    startedAt: w.startedAt,
    completedAt: w.completedAt,
    sets,
    plan: planRows.map(({ p, e }) => {
      const options = poolFor(e.equipment, gear);
      return {
      exerciseId: e.id,
      name: e.name,
      equipment: e.equipment,
      kind: exerciseKind(e),
      unit: options[0]?.unit ?? "kg",
      options,
      addTo: addToFor(e.equipment, gear.owned),
      snapLabel: addToFor(e.equipment, gear.owned) || options.length === 0 ? null : snapLabelFor(e.equipment, gear.owned),
      position: p.position,
      plannedSets: p.plannedSets,
      reps: p.reps,
      skipped: p.skippedAt !== null,
      core: e.primaryMuscles[0] === "abdominals" && w.split !== "core", // a Core workout has no separate finisher
      starting: ((s) => (s ? { weight: s.weight, unit: s.unit } : null))(starts.find((s) => s.exerciseId === e.id)),
      lastTime: last.get(e.id) ?? null,
      };
    }),
  };
}

/** The user's in-progress workout, after closing any left open too long. */
export async function getActiveWorkout(userId: string) {
  await closeStaleWorkouts(userId);
  const [w] = await db
    .select({ id: workout.id })
    .from(workout)
    .where(and(eq(workout.userId, userId), isNull(workout.completedAt)))
    .orderBy(desc(workout.startedAt))
    .limit(1);
  return w ? loadWorkout(userId, w.id) : null;
}

/** The most recent workout finished today, if any. */
export async function getCompletedToday(userId: string, today: Date) {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const rows = await db
    .select()
    .from(workout)
    .where(and(eq(workout.userId, userId), isNotNull(workout.completedAt), isNull(workout.autoClosedAt)))
    .orderBy(desc(workout.completedAt))
    .limit(1);
  const [w] = rows;
  if (!w || !w.completedAt || w.completedAt < start) return null;
  return loadWorkout(userId, w.id);
}

/** An auto-closed workout whose notice hasn't been dismissed. */
export async function getAutoClosedNotice(userId: string) {
  const [w] = await db
    .select()
    .from(workout)
    .where(and(eq(workout.userId, userId), isNotNull(workout.autoClosedAt), isNull(workout.noticeDismissedAt)))
    .orderBy(desc(workout.startedAt))
    .limit(1);
  if (!w) return null;
  const sets = await db.select({ id: workoutSet.id }).from(workoutSet).where(eq(workoutSet.workoutId, w.id));
  return { id: w.id, startedAt: w.startedAt, sets: sets.length };
}

/** Muscles with an active injury, split by mode, for the chips shown on workout screens. */
export async function getInjuryChips(userId: string) {
  const rows = await db
    .select({ muscle: injury.muscle, mode: injury.mode })
    .from(injury)
    .where(and(eq(injury.userId, userId), isNull(injury.resolvedAt)));
  return {
    resting: rows.filter((r) => r.mode === "rest").map((r) => r.muscle),
    rehab: rows.filter((r) => r.mode === "rehab").map((r) => r.muscle),
  };
}

function addToFor(equipment: string | null, owned: string[]): PlanRow["addTo"] {
  if (!equipment || !isFixed(equipment) || !owned.includes(equipment)) return null;
  const { noun, plural } = FIXED_EQUIPMENT[equipment];
  return { item: equipment, noun, plural };
}

function snapLabelFor(equipment: string | null, owned: string[]): string | null {
  const twin = equipment ? poolItems(equipment).find((i) => isAdjustable(i) && owned.includes(i)) : undefined;
  return twin ? equipmentLabel(twin as Equipment).toLowerCase() : null;
}

type Suggested = { id: string; equipment: string | null; force: string | null; reps: string };

/** The weight each suggested weighted exercise starts at: what logging's first set would be prefilled with (last time's first set, else the starting weight), moved to a weight the user owns. Exercises with no weight are left out. */
export async function suggestedWeights(userId: string, exercises: Suggested[], knownGear?: Gear): Promise<Record<string, Weight>> {
  const ids = exercises.map((e) => e.id);
  if (ids.length === 0) return {};
  const [gear, starts, history] = await Promise.all([
    knownGear ?? getGear(userId),
    db.select().from(startingWeight).where(and(eq(startingWeight.userId, userId), inArray(startingWeight.exerciseId, ids))),
    db
      .select({ s: workoutSet })
      .from(workoutSet)
      .innerJoin(workout, eq(workoutSet.workoutId, workout.id))
      .where(and(eq(workout.userId, userId), isNotNull(workout.completedAt), inArray(workoutSet.exerciseId, ids)))
      .orderBy(desc(workout.startedAt), workoutSet.setNumber),
  ]);
  const out: Record<string, Weight> = {};
  for (const e of exercises) {
    const kind = exerciseKind(e);
    if (kind !== "weighted") continue;
    const options = poolFor(e.equipment, gear);
    if (options.length === 0) continue;
    const s = starts.find((x) => x.exerciseId === e.id);
    const first = history.find((h) => h.s.exerciseId === e.id)?.s;
    const pf = prefill({ kind, setNumber: 1, plannedReps: e.reps, starting: s ? { weight: s.weight, unit: s.unit } : null, defaultUnit: "kg", options, lastTime: first ? [first] : [], thisWorkout: [] });
    if (pf.weight !== null) out[e.id] = { value: pf.weight, unit: pf.unit };
  }
  return out;
}
