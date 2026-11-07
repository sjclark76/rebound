import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { exercise, injury, workout, workoutSet } from "@/db/schema";
import { gearWithoutWeights, suggestionEquipment, type Muscle } from "@/db/vocab";
import { getGear } from "./equipment-data";
import { suggestedWeights } from "./workout-data";
import { normalizeSplit, recoveringMuscles, type Split, suggestWorkout } from "./generator";

const LOOKBACK_MS = 7 * 86_400_000;

export type SuggestionOptions = { split?: Split; bodyweightOnly?: boolean };

/** Reads the options the home and exercise pages pass in their query string. */
export function parseOptions(params: Record<string, string | string[] | undefined>): SuggestionOptions {
  const split = normalizeSplit(params.split) ?? undefined;
  return { split, bodyweightOnly: params.equipment === "none" };
}

/** The query string that keeps the same options across pages. */
export function optionsQuery({ split, bodyweightOnly }: SuggestionOptions) {
  const q = new URLSearchParams();
  if (split) q.set("split", split);
  if (bodyweightOnly) q.set("equipment", "none");
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Loads a user's equipment, injuries and recent training, and suggests today's workout. */
export async function loadSuggestion(userId: string, today: Date, options: SuggestionOptions = {}) {
  const [gear, injuries, recentSets, exercises] = await Promise.all([
    getGear(userId),
    db
      .select({ muscle: injury.muscle, mode: injury.mode, notes: injury.notes })
      .from(injury)
      .where(and(eq(injury.userId, userId), isNull(injury.resolvedAt))),
    db
      .select({ muscles: exercise.primaryMuscles, trainedAt: workout.startedAt })
      .from(workoutSet)
      .innerJoin(workout, eq(workoutSet.workoutId, workout.id))
      .innerJoin(exercise, eq(workoutSet.exerciseId, exercise.id))
      .where(
        and(eq(workout.userId, userId), gte(workout.startedAt, new Date(today.getTime() - LOOKBACK_MS))),
      ),
    // Only what the generator and the lists need. Photos and steps are many kilobytes per exercise, so the one shown in detail is fetched on its own.
    db
      .select({
        id: exercise.id,
        name: exercise.name,
        equipment: exercise.equipment,
        category: exercise.category,
        level: exercise.level,
        force: exercise.force,
        mechanic: exercise.mechanic,
        primaryMuscles: exercise.primaryMuscles,
        secondaryMuscles: exercise.secondaryMuscles,
      })
      .from(exercise)
      .where(eq(exercise.category, "strength")),
  ]);

  const recent = recentSets.flatMap((s) => s.muscles.map((muscle) => ({ muscle, trainedAt: s.trainedAt })));
  const input = {
    exercises,
    equipment: options.bodyweightOnly ? [] : suggestionEquipment(gear.owned),
    withoutWeights: gearWithoutWeights(gear.owned, Object.fromEntries(Object.entries(gear.weights).map(([k, v]) => [k, v.length]))),
    injuries: injuries.map((i) => ({ muscle: i.muscle as Muscle, mode: i.mode })),
    recent,
    today,
    split: options.split,
  };
  const suggestion = suggestWorkout(input);
  // What Rebound would recommend with no type chosen, so the picker can offer a way back. Pure, so no second trip to the database.
  const recommended = options.split ? suggestWorkout({ ...input, split: undefined })?.split : suggestion?.split;
  const weights = suggestion
    ? await suggestedWeights(userId, suggestion.exercises.map((e) => ({ id: e.exercise.id, equipment: e.exercise.equipment, force: e.exercise.force ?? null, reps: e.reps })), gear)
    : {};
  return { suggestion, recommended, injuries, hasEquipment: gear.owned.length > 0, recovering: recoveringMuscles(recent, today), weights };
}

/** One exercise in full, with its photos and steps, for the detail view. */
export async function loadExerciseDetail(id: string) {
  const [row] = await db.select().from(exercise).where(eq(exercise.id, id));
  return row ?? null;
}
