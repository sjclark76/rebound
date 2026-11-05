import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { exercise, injury, userEquipment, workout, workoutSet } from "@/db/schema";
import type { Muscle } from "@/db/vocab";
import { suggestWorkout } from "./generator";

const LOOKBACK_MS = 7 * 86_400_000;

/** Loads a user's equipment, injuries and recent training, and suggests today's workout. */
export async function loadSuggestion(userId: string, today: Date) {
  const [owned, injuries, recentSets, exercises] = await Promise.all([
    db.select({ equipment: userEquipment.equipment }).from(userEquipment).where(eq(userEquipment.userId, userId)),
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

  const suggestion = suggestWorkout({
    exercises,
    equipment: owned.map((o) => o.equipment),
    injuries: injuries.map((i) => ({ muscle: i.muscle as Muscle, mode: i.mode })),
    recent: recentSets.flatMap((s) => s.muscles.map((muscle) => ({ muscle, trainedAt: s.trainedAt }))),
    today,
  });
  return { suggestion, injuries, hasEquipment: owned.length > 0 };
}
