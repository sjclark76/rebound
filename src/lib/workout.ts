/** Pure rules for logging a workout: prefill, the "Now" marker, totals and auto-close. No I/O. */

export type Kind = "weighted" | "bodyweight" | "timed";

export type LoggedSet = {
  id: number;
  exerciseId: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
};

export const STALE_MS = 24 * 3_600_000;

export function exerciseKind(e: { equipment: string | null; force: string | null }): Kind {
  if (e.force === "static") return "timed";
  return e.equipment === null || e.equipment === "body only" ? "bodyweight" : "weighted";
}

/** "8–10" -> 10. A planned range's top end is where a new exercise starts. */
export function upperBound(range: string): number {
  const nums = range.match(/\d+/g)?.map(Number) ?? [];
  return nums.length ? Math.max(...nums) : 0;
}

export type PrefillSource =
  | { rule: "last-time"; setNumber: number }
  | { rule: "previous-set"; setNumber: number; lastTimeSets: number }
  | { rule: "starting-weight" }
  | { rule: "plan" };

export type Prefill = { weightKg: number | null; reps: number | null; durationSec: number | null; source: PrefillSource };

type Values = Pick<LoggedSet, "setNumber" | "reps" | "weightKg" | "durationSec">;

/**
 * What a set starts as: the same set number last time, else the previous set in this workout,
 * else (first set, no history) a starting weight / the plan. A weighted exercise always has a weight.
 */
export function prefill(input: {
  kind: Kind;
  setNumber: number;
  plannedReps: string;
  startingKg: number | null;
  lastTime: Values[];
  thisWorkout: Values[];
}): Prefill {
  const { kind, setNumber, plannedReps, startingKg, lastTime, thisWorkout } = input;
  const pick = (v: Values, source: PrefillSource): Prefill => ({
    weightKg: kind === "weighted" ? (v.weightKg ?? 0) : null,
    reps: kind === "timed" ? null : v.reps,
    durationSec: kind === "timed" ? v.durationSec : null,
    source,
  });

  const same = lastTime.find((s) => s.setNumber === setNumber);
  if (same) return pick(same, { rule: "last-time", setNumber });

  const previous = thisWorkout.filter((s) => s.setNumber < setNumber).sort((a, b) => b.setNumber - a.setNumber)[0];
  if (previous) return pick(previous, { rule: "previous-set", setNumber: previous.setNumber, lastTimeSets: lastTime.length });

  const planned = upperBound(plannedReps);
  return {
    weightKg: kind === "weighted" ? (startingKg ?? 0) : null,
    reps: kind === "timed" ? null : planned,
    durationSec: kind === "timed" ? planned : null,
    source: kind === "weighted" && startingKg !== null ? { rule: "starting-weight" } : { rule: "plan" },
  };
}

/**
 * Prefill for set `setNumber` when earlier sets may not be logged yet: each unlogged earlier set
 * is filled the same way in turn, so set 3 reads "Copied from set 1" before anything is logged.
 */
export function prefillFor(input: {
  kind: Kind;
  setNumber: number;
  plannedReps: string;
  startingKg: number | null;
  lastTime: Values[];
  logged: Values[];
}): Prefill {
  const { setNumber, logged, ...rest } = input;
  const earlier: Values[] = [];
  let result!: Prefill;
  for (let n = 1; n <= setNumber; n++) {
    const done = logged.find((s) => s.setNumber === n);
    if (done && n < setNumber) {
      earlier.push(done);
      continue;
    }
    result = prefill({ ...rest, setNumber: n, thisWorkout: earlier });
    // A set copied from a copy points back at where the value first came from.
    const prev = earlier.find((e) => e.setNumber === n - 1) as (Values & { origin?: number }) | undefined;
    if (result.source.rule === "previous-set" && prev?.origin) result = { ...result, source: { ...result.source, setNumber: prev.origin } };
    const origin = result.source.rule === "previous-set" ? result.source.setNumber : n;
    earlier.push({ setNumber: n, reps: result.reps, weightKg: result.weightKg, durationSec: result.durationSec, origin } as Values);
  }
  return result;
}

export type PlanItem = { exerciseId: string; plannedSets: number; skipped: boolean };

/**
 * The next unlogged set after the one last logged (highest id), in plan order. Wraps to the first
 * gap if nothing follows. Skipped exercises are passed over. Null when every set is logged.
 */
export function nowSlot(plan: PlanItem[], logged: LoggedSet[]): { exerciseId: string; setNumber: number } | null {
  const done = new Set(logged.map((s) => `${s.exerciseId}:${s.setNumber}`));
  const slots = plan
    .filter((p) => !p.skipped)
    .flatMap((p) => {
      const extra = Math.max(0, ...logged.filter((s) => s.exerciseId === p.exerciseId).map((s) => s.setNumber));
      return Array.from({ length: Math.max(p.plannedSets, extra) }, (_, i) => ({ exerciseId: p.exerciseId, setNumber: i + 1 }));
    });
  const open = (s: (typeof slots)[number]) => !done.has(`${s.exerciseId}:${s.setNumber}`);
  const last = logged.reduce<LoggedSet | null>((a, s) => (!a || s.id > a.id ? s : a), null);
  const from = last ? slots.findIndex((s) => s.exerciseId === last.exerciseId && s.setNumber === last.setNumber) + 1 : 0;
  return slots.slice(from).find(open) ?? slots.find(open) ?? null;
}

export function summarise(
  plan: { exerciseId: string; skipped: boolean; kind: Kind }[],
  logged: LoggedSet[],
  startedAt: Date,
  endedAt: Date,
) {
  const loggedIds = new Set(logged.map((s) => s.exerciseId));
  const done = plan.filter((p) => !p.skipped && loggedIds.has(p.exerciseId));
  const volumeKg = logged.reduce((sum, s) => sum + (s.weightKg && s.reps ? s.weightKg * s.reps : 0), 0);
  return {
    exercisesDone: done.length,
    exercisesTotal: plan.length,
    skipped: plan.length - done.length,
    sets: logged.length,
    volumeKg,
    minutes: Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000),
  };
}

export function isStale(startedAt: Date, now: Date) {
  return now.getTime() - startedAt.getTime() > STALE_MS;
}

export const num = (n: number | null) => (n === null ? "" : String(Math.round(n * 100) / 100));

/** "22.5 kg × 10", "12 reps" or "45 sec". */
export function formatSet(kind: Kind, s: { weightKg: number | null; reps: number | null; durationSec: number | null }) {
  if (kind === "timed") return `${s.durationSec ?? 0} sec`;
  if (kind === "bodyweight") return `${s.reps ?? 0} reps`;
  return `${num(s.weightKg ?? 0)} kg × ${s.reps ?? 0}`;
}

