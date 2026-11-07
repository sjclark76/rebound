"use server";

import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { workout, workoutExercise, workoutSet } from "@/db/schema";
import { isUnit, type Unit } from "@/db/vocab";
import { requireSession } from "@/lib/session";
import { loadSuggestion, parseOptions } from "@/lib/suggestion";
import { recomputeFatigue } from "@/lib/fatigue-data";
import { closeStaleWorkouts } from "@/lib/workout-data";

export type SetValues = { reps: number | null; weight: number | null; unit: Unit; durationSec: number | null };

/** Confirms the workout belongs to the signed-in user and is still open. */
async function ownOpenWorkout(workoutId: number) {
  const { user } = await requireSession();
  const [w] = await db
    .select()
    .from(workout)
    .where(and(eq(workout.id, workoutId), eq(workout.userId, user.id), isNull(workout.completedAt)));
  if (!w) throw new Error("Workout not found");
  return w;
}

const done = () => {
  revalidatePath("/workout");
  revalidatePath("/");
  revalidatePath("/body");
};

/** Brings the saved muscle fatigue up to date after a set changes. */
const refreshFatigue = async (userId: string) => recomputeFatigue(userId);

/** Starts today's workout from the suggestion, saving its exercises so the plan can't shift. */
export async function startWorkout(query: Record<string, string>) {
  const { user } = await requireSession();
  await closeStaleWorkouts(user.id);
  const [open] = await db.select().from(workout).where(and(eq(workout.userId, user.id), isNull(workout.completedAt)));
  if (!open) {
    const { suggestion } = await loadSuggestion(user.id, new Date(), parseOptions(query));
    if (!suggestion) throw new Error("No workout to start");
    const [w] = await db.insert(workout).values({ userId: user.id, split: suggestion.split }).returning();
    await db.insert(workoutExercise).values(
      suggestion.exercises.map((e, i) => ({
        workoutId: w.id,
        exerciseId: e.exercise.id,
        position: i,
        plannedSets: e.sets,
        reps: e.reps,
      })),
    );
  }
  done();
  redirect("/workout");
}

/** Saves a set when Complete is tapped, or replaces it if that set number is already logged. */
export async function logSet(workoutId: number, exerciseId: string, setNumber: number, values: SetValues) {
  const w = await ownOpenWorkout(workoutId);
  if (!isUnit(values.unit)) throw new Error("Unknown unit");
  const [existing] = await db
    .select({ id: workoutSet.id })
    .from(workoutSet)
    .where(and(eq(workoutSet.workoutId, workoutId), eq(workoutSet.exerciseId, exerciseId), eq(workoutSet.setNumber, setNumber)));
  if (existing) await db.update(workoutSet).set(values).where(eq(workoutSet.id, existing.id));
  else await db.insert(workoutSet).values({ workoutId, exerciseId, setNumber, ...values });
  // Logging against a skipped exercise brings it back.
  await db
    .update(workoutExercise)
    .set({ skippedAt: null })
    .where(and(eq(workoutExercise.workoutId, workoutId), eq(workoutExercise.exerciseId, exerciseId)));
  await refreshFatigue(w.userId);
  done();
}

export async function editSet(workoutId: number, setId: number, values: SetValues) {
  const w = await ownOpenWorkout(workoutId);
  if (!isUnit(values.unit)) throw new Error("Unknown unit");
  await db.update(workoutSet).set(values).where(and(eq(workoutSet.id, setId), eq(workoutSet.workoutId, workoutId)));
  await refreshFatigue(w.userId);
  done();
}

/** Deletes a set and closes the gap so set numbers stay 1, 2, 3... */
export async function deleteSet(workoutId: number, setId: number) {
  const w = await ownOpenWorkout(workoutId);
  const [s] = await db
    .select()
    .from(workoutSet)
    .where(and(eq(workoutSet.id, setId), eq(workoutSet.workoutId, workoutId)));
  if (!s) return;
  await db.delete(workoutSet).where(eq(workoutSet.id, setId));
  await db
    .update(workoutSet)
    .set({ setNumber: sql`${workoutSet.setNumber} - 1` })
    .where(and(eq(workoutSet.workoutId, workoutId), eq(workoutSet.exerciseId, s.exerciseId), gt(workoutSet.setNumber, s.setNumber)));
  await refreshFatigue(w.userId);
  done();
}

export async function skipExercise(workoutId: number, exerciseId: string) {
  await ownOpenWorkout(workoutId);
  await db
    .update(workoutExercise)
    .set({ skippedAt: new Date() })
    .where(and(eq(workoutExercise.workoutId, workoutId), eq(workoutExercise.exerciseId, exerciseId)));
  done();
}

export async function unskipExercise(workoutId: number, exerciseId: string) {
  await ownOpenWorkout(workoutId);
  await db
    .update(workoutExercise)
    .set({ skippedAt: null })
    .where(and(eq(workoutExercise.workoutId, workoutId), eq(workoutExercise.exerciseId, exerciseId)));
  done();
}

/** Finishes the workout; exercises with nothing logged are marked skipped. */
export async function finishWorkout(workoutId: number) {
  await ownOpenWorkout(workoutId);
  const logged = new Set((await db.select({ e: workoutSet.exerciseId }).from(workoutSet).where(eq(workoutSet.workoutId, workoutId))).map((r) => r.e));
  const plan = await db.select().from(workoutExercise).where(eq(workoutExercise.workoutId, workoutId)).orderBy(asc(workoutExercise.position));
  const now = new Date();
  for (const p of plan.filter((p) => !logged.has(p.exerciseId) && !p.skippedAt)) {
    await db
      .update(workoutExercise)
      .set({ skippedAt: now })
      .where(and(eq(workoutExercise.workoutId, workoutId), eq(workoutExercise.exerciseId, p.exerciseId)));
  }
  await db.update(workout).set({ completedAt: now }).where(eq(workout.id, workoutId));
  done();
  redirect(`/workout/${workoutId}/summary`);
}

export async function discardWorkout(workoutId: number) {
  const w = await ownOpenWorkout(workoutId);
  await db.delete(workout).where(eq(workout.id, workoutId));
  await refreshFatigue(w.userId);
  done();
  redirect("/");
}

export async function dismissNotice(workoutId: number) {
  const { user } = await requireSession();
  await db
    .update(workout)
    .set({ noticeDismissedAt: new Date() })
    .where(and(eq(workout.id, workoutId), eq(workout.userId, user.id)));
  revalidatePath("/");
}

/** Remembers the Focused/List choice. */
export async function setView(view: "focused" | "list") {
  (await cookies()).set("rebound-view", view, { maxAge: 60 * 60 * 24 * 365, path: "/" });
}
