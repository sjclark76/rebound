import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { exercise, injury, muscleFatigue, workout, workoutSet } from "@/db/schema";
import { FINE_MUSCLES, GROUP_OF, type FineMuscle } from "@/db/vocab";
import { bandOf, computeFatigue, currentValue, tauOf, valueOf, type Band, type FatigueSet } from "./fatigue";
import { convert } from "./units";

const DAY = 24 * 3600_000;
/** 21 days of fatigue plus the 28 days the novelty check looks back. */
const LOOKBACK_DAYS = 49;
const KEYS = [...FINE_MUSCLES, "whole"] as const;

/** Rebuilds a user's saved fatigue from their recent sets. Called whenever a set is logged, edited or deleted. */
export async function recomputeFatigue(userId: string, now = new Date()) {
  const rows = await db
    .select({
      exerciseId: workoutSet.exerciseId,
      at: workout.startedAt,
      reps: workoutSet.reps,
      weight: workoutSet.weight,
      unit: workoutSet.unit,
      durationSec: workoutSet.durationSec,
      finePrimary: exercise.finePrimary,
      fineSecondary: exercise.fineSecondary,
      lengthened: exercise.lengthened,
      mechanic: exercise.mechanic,
    })
    .from(workoutSet)
    .innerJoin(workout, eq(workout.id, workoutSet.workoutId))
    .innerJoin(exercise, eq(exercise.id, workoutSet.exerciseId))
    .where(and(eq(workout.userId, userId), gte(workout.startedAt, new Date(now.getTime() - LOOKBACK_DAYS * DAY))));
  const sets: FatigueSet[] = rows.map((r) => ({
    exerciseId: r.exerciseId,
    at: r.at,
    reps: r.reps,
    weightKg: r.weight != null && r.weight > 0 ? convert(r.weight, r.unit, "kg") : null,
    durationSec: r.durationSec,
    finePrimary: r.finePrimary as FineMuscle[],
    fineSecondary: r.fineSecondary as FineMuscle[],
    lengthened: r.lengthened,
    compound: r.mechanic === "compound",
  }));
  const state = computeFatigue(sets, now);
  await db.transaction(async (tx) => {
    await tx.delete(muscleFatigue).where(eq(muscleFatigue.userId, userId));
    await tx.insert(muscleFatigue).values(
      KEYS.map((k) => {
        const p = k === "whole" ? state.whole : state.muscles[k];
        return { userId, muscle: k, value: currentValue(state, k), fast: p.fast, slow: p.slow, lastTrainedAt: p.lastTrained, updatedAt: now };
      }),
    );
  });
}

export type MuscleReading = {
  muscle: FineMuscle;
  /** 0-100 now, or null when the muscle is injured (it isn't on the fatigue scale). */
  value: number | null;
  band: Band | null;
  lastTrained: Date | null;
  injury: "rest" | "rehab" | null;
};

/** What the Body screen shows: every muscle aged to `now`, plus the whole-body value. */
export async function loadBody(userId: string, now = new Date()): Promise<{ muscles: MuscleReading[]; whole: number; wholeBand: Band }> {
  const [saved, injuries] = await Promise.all([
    db.select().from(muscleFatigue).where(eq(muscleFatigue.userId, userId)),
    db.select({ muscle: injury.muscle, mode: injury.mode }).from(injury).where(and(eq(injury.userId, userId), isNull(injury.resolvedAt))),
  ]);
  const byKey = new Map(saved.map((r) => [r.muscle, r]));
  const read = (k: (typeof KEYS)[number]) => {
    const r = byKey.get(k);
    return r ? { value: valueOf(r, tauOf(k), r.updatedAt, now), lastTrained: r.lastTrainedAt } : { value: 0, lastTrained: null };
  };
  const muscles = FINE_MUSCLES.map((muscle): MuscleReading => {
    const hurt = injuries.filter((i) => i.muscle === GROUP_OF[muscle]);
    const mode = hurt.some((i) => i.mode === "rest") ? "rest" : hurt.length ? "rehab" : null;
    const { value, lastTrained } = read(muscle);
    return mode ? { muscle, value: null, band: null, lastTrained, injury: mode } : { muscle, value, band: bandOf(value), lastTrained, injury: null };
  });
  const whole = read("whole").value;
  return { muscles, whole, wholeBand: bandOf(whole) };
}
