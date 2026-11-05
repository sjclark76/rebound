import type { InjuryMode, Muscle } from "../db/vocab";

/** The catalogue fields the generator reads. */
export type CatalogueExercise = {
  id: string;
  name: string;
  equipment: string | null;
  category: string;
  level: string;
  mechanic: string | null;
  /** push, pull or static; static holds are prescribed in seconds. */
  force?: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
};

export type ActiveInjury = { muscle: Muscle; mode: InjuryMode };

/** A muscle worked as a primary mover in a logged workout. */
export type TrainedMuscle = { muscle: string; trainedAt: Date };

export type GeneratorInput = {
  exercises: CatalogueExercise[];
  equipment: readonly string[];
  injuries: ActiveInjury[];
  recent: TrainedMuscle[];
  today: Date;
  /** Use this split instead of the most rested one. */
  split?: Split;
};

export type Split = "push" | "pull" | "legs";

export type SuggestedExercise<E extends CatalogueExercise = CatalogueExercise> = {
  exercise: E;
  sets: number;
  reps: string;
};

export type Suggestion<E extends CatalogueExercise = CatalogueExercise> = {
  split: Split;
  exercises: SuggestedExercise<E>[];
  /** Injured muscles in rest mode: nothing that loads them is suggested. */
  resting: Muscle[];
  /** Muscles trained within the recovery window, left out of today's focus. */
  recovering: string[];
  /** Whole days since any of the split's muscles was trained; null if not in `recent`. */
  lastTrainedDays: number | null;
};

export const SPLITS: Record<Split, Muscle[]> = {
  push: ["chest", "shoulders", "triceps"],
  pull: ["lats", "middle back", "biceps", "traps"],
  legs: ["quadriceps", "hamstrings", "glutes", "calves"],
};
export const SPLIT_NAMES: Record<Split, string> = { push: "Push", pull: "Pull", legs: "Legs" };
const SPLIT_ORDER: Split[] = ["push", "pull", "legs"];

const DAY_MS = 86_400_000;
const RECOVERY_MS = 2 * DAY_MS;
const MAX_EXERCISES = 5;
const MIN_EXERCISES = 3;
/** Each day rotates among this many of the best-ranked candidates, for variety. */
const VARIETY = 3;

/** Muscles worked as a primary mover within the recovery window, sorted. */
export function recoveringMuscles(recent: TrainedMuscle[], today: Date): string[] {
  const last = new Map<string, number>();
  for (const { muscle, trainedAt } of recent) last.set(muscle, Math.max(last.get(muscle) ?? 0, trainedAt.getTime()));
  return [...last]
    .filter(([, at]) => today.getTime() - at < RECOVERY_MS)
    .map(([m]) => m)
    .sort();
}

const LEVEL_RANK: Record<string, number> = { beginner: 0, intermediate: 1 };

function rank(a: CatalogueExercise, b: CatalogueExercise) {
  const compound = Number(b.mechanic === "compound") - Number(a.mechanic === "compound");
  return compound || LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || a.id.localeCompare(b.id);
}

function prescribe<E extends CatalogueExercise>(exercise: E, core = false): SuggestedExercise<E> {
  if (exercise.force === "static") return { exercise, sets: 3, reps: "30–45" };
  if (core) return { exercise, sets: 3, reps: "12–15" };
  return exercise.mechanic === "compound"
    ? { exercise, sets: 3, reps: "8–10" }
    : { exercise, sets: 3, reps: "10–12" };
}

/**
 * Suggests today's workout. Pure and deterministic: the same input always gives the same
 * suggestion, and `today` only varies which of the top-ranked exercises is picked.
 * Returns null when no split has enough safe exercises.
 */
export function suggestWorkout<E extends CatalogueExercise>(
  input: Omit<GeneratorInput, "exercises"> & { exercises: E[] },
): Suggestion<E> | null {
  const { equipment, injuries, recent, today, split: chosen } = input;
  const day = Math.floor(today.getTime() / DAY_MS);

  // Rest mode keeps any load off the muscle; rehab mode only avoids it as a primary mover.
  const blockedAny = new Set(injuries.filter((i) => i.mode === "rest").map((i) => i.muscle));
  const blockedPrimary = new Set(injuries.map((i) => i.muscle));

  const owned = new Set(equipment);
  const safe = input.exercises
    .filter(
      (e) =>
        e.category === "strength" &&
        e.level in LEVEL_RANK &&
        (e.equipment === null || e.equipment === "body only" || owned.has(e.equipment)) &&
        !e.primaryMuscles.some((m) => blockedPrimary.has(m as Muscle)) &&
        !e.secondaryMuscles.some((m) => blockedAny.has(m as Muscle)),
    )
    .sort(rank);

  const lastTrained = new Map<string, number>();
  for (const { muscle, trainedAt } of recent) {
    lastTrained.set(muscle, Math.max(lastTrained.get(muscle) ?? 0, trainedAt.getTime()));
  }
  const recovering = recoveringMuscles(recent, today);
  const isFree = (m: string) => !recovering.includes(m) && !blockedPrimary.has(m as Muscle);

  const pick = (muscle: string, mechanic: string | null, taken: Set<string>) => {
    const options = safe.filter(
      (e) =>
        e.primaryMuscles[0] === muscle &&
        (mechanic === null || e.mechanic === mechanic) &&
        !taken.has(e.id),
    );
    return options.length ? options[day % Math.min(VARIETY, options.length)] : undefined;
  };

  function build(split: Split) {
    const muscles = SPLITS[split].filter(isFree);
    const taken = new Set<string>();
    const chosen: E[] = [];
    // A compound per muscle first, then isolations, until the session is full.
    for (const mechanic of ["compound", "isolation"]) {
      for (const muscle of muscles) {
        if (chosen.length >= MAX_EXERCISES) break;
        const e = pick(muscle, mechanic, taken);
        if (e) {
          taken.add(e.id);
          chosen.push(e);
        }
      }
    }
    return chosen;
  }

  // Most rested split first; ties (e.g. no history yet) rotate by day.
  const restedFor = (split: Split) =>
    Math.min(...SPLITS[split].map((m) => today.getTime() - (lastTrained.get(m) ?? -Infinity)));
  const order = SPLIT_ORDER.map((s, i) => ({ s, i: (i - (day % 3) + 3) % 3 }))
    .sort((a, b) => restedFor(b.s) - restedFor(a.s) || a.i - b.i)
    .map(({ s }) => s);

  // A chosen split is honoured even when short, as long as something is safe.
  for (const split of chosen ? [chosen] : order) {
    const picked = build(split);
    if (picked.length < (chosen ? 1 : MIN_EXERCISES)) continue;
    const exercises = picked.map((e) => prescribe(e));
    if (isFree("abdominals")) {
      const core = pick("abdominals", null, new Set(picked.map((e) => e.id)));
      if (core) exercises.push(prescribe(core, true));
    }
    const last = Math.max(...SPLITS[split].map((m) => lastTrained.get(m) ?? -Infinity));
    const lastTrainedDays = last === -Infinity ? null : Math.floor((today.getTime() - last) / DAY_MS);
    return { split, exercises, resting: [...blockedAny].sort(), recovering, lastTrainedDays };
  }
  return null;
}
