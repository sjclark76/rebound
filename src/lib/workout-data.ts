import { and, desc, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { exercise, injury, startingWeight, workout, workoutExercise, workoutSet } from "@/db/schema";
import { exerciseKind, isStale, type Kind, type LoggedSet } from "./workout";

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
  position: number;
  plannedSets: number;
  reps: string;
  skipped: boolean;
  core: boolean;
  startingKg: number | null;
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

  const [planRows, sets] = await Promise.all([
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
    plan: planRows.map(({ p, e }) => ({
      exerciseId: e.id,
      name: e.name,
      equipment: e.equipment,
      kind: exerciseKind(e),
      position: p.position,
      plannedSets: p.plannedSets,
      reps: p.reps,
      skipped: p.skippedAt !== null,
      core: e.primaryMuscles[0] === "abdominals",
      startingKg: starts.find((s) => s.exerciseId === e.id)?.weightKg ?? null,
      lastTime: last.get(e.id) ?? null,
    })),
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
