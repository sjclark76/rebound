/** Pure rules for logging a workout: prefill, the "Now" marker, totals and auto-close. No I/O. */
import type { Unit } from "../db/vocab";
import { convert, formatWeight, snapHalf } from "./units";
import { snapToOptions, type Weight } from "./weights";

export type Kind = "weighted" | "bodyweight" | "timed";

export type LoggedSet = {
  id: number;
  exerciseId: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  /** The unit the weight was logged in. */
  unit: Unit;
  durationSec: number | null;
};


export const STALE_MS = 24 * 3_600_000;

/** Gear where the load is your own body, so only reps are logged. */
const NO_WEIGHT_EQUIPMENT = ["body only", "trx straps", "bands", "exercise ball", "foam roll", "other"];

export function exerciseKind(e: { equipment: string | null; force: string | null }): Kind {
  if (e.force === "static") return "timed";
  return e.equipment === null || NO_WEIGHT_EQUIPMENT.includes(e.equipment) ? "bodyweight" : "weighted";
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

export type Prefill = { weight: number | null; unit: Unit; reps: number | null; durationSec: number | null; source: PrefillSource };

type Values = Pick<LoggedSet, "setNumber" | "reps" | "weight" | "unit" | "durationSec">;

/** A starting weight and the unit it is in. */
export type Starting = { weight: number; unit: Unit };

/**
 * What a set starts as: the same set number last time, else the previous set in this workout,
 * else (first set, no history) a starting weight / the plan. A weighted exercise always has a weight.
 */
export function prefill(input: {
  kind: Kind;
  setNumber: number;
  plannedReps: string;
  starting: Starting | null;
  /** The item's default unit, used when there is no earlier weight to copy. */
  defaultUnit: Unit;
  /** The weights the user owns for this gear. A weighted set is only ever prefilled with one of them. Empty when the gear has no weight list. */
  options?: Weight[];
  lastTime: Values[];
  thisWorkout: Values[];
}): Prefill {
  const { kind, setNumber, plannedReps, starting, defaultUnit, lastTime, thisWorkout, options = [] } = input;
  /** Moves a weight nobody owns to the nearest one the user does. */
  const owned = (p: Prefill): Prefill => {
    const snap = kind === "weighted" ? snapToOptions(options, { value: p.weight ?? 0, unit: p.unit }) : null;
    return snap ? { ...p, weight: snap.weight.value, unit: snap.weight.unit } : p;
  };
  const pick = (v: Values, source: PrefillSource): Prefill => owned({
    weight: kind === "weighted" ? (v.weight ?? 0) : null,
    unit: v.unit,
    reps: kind === "timed" ? null : v.reps,
    durationSec: kind === "timed" ? v.durationSec : null,
    source,
  });

  const same = lastTime.find((s) => s.setNumber === setNumber);
  if (same) return pick(same, { rule: "last-time", setNumber });

  const previous = thisWorkout.filter((s) => s.setNumber < setNumber).sort((a, b) => b.setNumber - a.setNumber)[0];
  if (previous) return pick(previous, { rule: "previous-set", setNumber: previous.setNumber, lastTimeSets: lastTime.length });

  const planned = upperBound(plannedReps);
  return owned({
    weight: kind === "weighted" ? (starting?.weight ?? 0) : null,
    unit: starting?.unit ?? defaultUnit,
    reps: kind === "timed" ? null : planned,
    durationSec: kind === "timed" ? planned : null,
    source: kind === "weighted" && starting !== null ? { rule: "starting-weight" } : { rule: "plan" },
  });
}

/**
 * Prefill for set `setNumber` when earlier sets may not be logged yet: each unlogged earlier set
 * is filled the same way in turn, so set 3 reads "Copied from set 1" before anything is logged.
 */
export function prefillFor(input: {
  kind: Kind;
  setNumber: number;
  plannedReps: string;
  starting: Starting | null;
  defaultUnit: Unit;
  options?: Weight[];
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
    earlier.push({ setNumber: n, reps: result.reps, weight: result.weight, unit: result.unit, durationSec: result.durationSec, origin } as Values);
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
  // Each set carries its own unit; volume is always totalled in kg.
  const volume = logged.reduce((sum, s) => sum + (s.weight && s.reps ? convert(s.weight, s.unit, "kg") * s.reps : 0), 0);
  return {
    exercisesDone: done.length,
    exercisesTotal: plan.length,
    skipped: plan.length - done.length,
    sets: logged.length,
    volume,
    minutes: Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000),
  };
}

export function isStale(startedAt: Date, now: Date) {
  return now.getTime() - startedAt.getTime() > STALE_MS;
}

/** A weight as typed into a field: nearest 0.5, blank for none. */
export const num = (n: number | null) => (n === null ? "" : formatWeight(n));

/** A drafted weight on the 0.5 grid, so a converted 49.6 starts as 49.5 and steps cleanly. */
export const draftWeight = (n: number | null) => (n === null ? null : snapHalf(n));

/** "22.5 kg × 10" (or lb), "12 reps" or "45 sec". */
export function formatSet(kind: Kind, s: { weight: number | null; unit: Unit; reps: number | null; durationSec: number | null }) {
  if (kind === "timed") return `${s.durationSec ?? 0} sec`;
  if (kind === "bodyweight") return `${s.reps ?? 0} reps`;
  return `${num(s.weight ?? 0)} ${s.unit} × ${s.reps ?? 0}`;
}

