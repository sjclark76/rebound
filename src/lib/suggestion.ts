import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { exercise, injury, workout, workoutSet } from "@/db/schema";
import { gearWithoutWeights, suggestionEquipment, type Muscle } from "@/db/vocab";
import { getGear } from "./equipment-data";
import { suggestedWeights } from "./workout-data";
import { recoveringMuscles, type Split, SPLITS, suggestWorkout } from "./generator";

const LOOKBACK_MS = 7 * 86_400_000;

export type SuggestionOptions = { split?: Split; bodyweightOnly?: boolean };

/** Reads the options the home and exercise pages pass in their query string. */
export function parseOptions(params: Record<string, string | string[] | undefined>): SuggestionOptions {
  const split = typeof params.split === "string" && params.split in SPLITS ? (params.split as Split) : undefined;
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
    db.select().from(exercise).where(eq(exercise.category, "strength")),
  ]);

  const recent = recentSets.flatMap((s) => s.muscles.map((muscle) => ({ muscle, trainedAt: s.trainedAt })));
  const suggestion = suggestWorkout({
    exercises,
    equipment: options.bodyweightOnly ? [] : suggestionEquipment(gear.owned),
    withoutWeights: gearWithoutWeights(gear.owned, Object.fromEntries(Object.entries(gear.weights).map(([k, v]) => [k, v.length]))),
    injuries: injuries.map((i) => ({ muscle: i.muscle as Muscle, mode: i.mode })),
    recent,
    today,
    split: options.split,
  });
  const weights = suggestion
    ? await suggestedWeights(userId, suggestion.exercises.map((e) => ({ id: e.exercise.id, equipment: e.exercise.equipment, force: e.exercise.force ?? null, reps: e.reps })))
    : {};
  return { suggestion, injuries, hasEquipment: gear.owned.length > 0, recovering: recoveringMuscles(recent, today), weights };
}
