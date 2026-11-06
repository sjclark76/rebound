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
  /** Switched-on gear that has no weights yet: exercises that use it are left out. */
  withoutWeights?: readonly string[];
  injuries: ActiveInjury[];
  recent: TrainedMuscle[];
  today: Date;
  /** Use this split instead of the most rested one. */
  split?: Split;
};

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
  /** Muscles trained within the recovery window. A recommendation leaves them out; a type the user chose includes them. */
  recovering: string[];
  /** Whole days since any of the type's muscles was trained; null if not in `recent`. */
  lastTrainedDays: number | null;
};

/** The types of workout. Only push, pull and legs are ever recommended; the rest are chosen. */
export type Split = "push" | "pull" | "legs" | "upper" | "full" | "core";

/** The muscles each type works, in the order exercises are picked for them. */
export const SPLITS: Record<Split, Muscle[]> = {
  push: ["chest", "shoulders", "triceps"],
  pull: ["lats", "middle back", "biceps", "traps"],
  legs: ["quadriceps", "hamstrings", "glutes", "calves"],
  upper: ["chest", "lats", "shoulders", "middle back", "triceps", "biceps", "traps"],
  full: ["quadriceps", "chest", "lats", "shoulders", "hamstrings", "glutes"],
  core: ["abdominals", "lower back"],
};
export const SPLIT_NAMES: Record<Split, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  upper: "Upper body",
  full: "Full body",
  core: "Core",
};
/** How a type is built: the most exercises, how many times round the muscles it goes, and whether a core finisher follows. */
const SHAPE: Record<Split, { max: number; rounds: number; finisher: boolean }> = {
  push: { max: 5, rounds: 1, finisher: true },
  pull: { max: 5, rounds: 1, finisher: true },
  legs: { max: 5, rounds: 1, finisher: true },
  upper: { max: 6, rounds: 1, finisher: true },
  full: { max: 6, rounds: 1, finisher: true },
  core: { max: 5, rounds: 3, finisher: false },
};
/** The order the picker shows the types in. */
export const TYPE_ORDER: Split[] = ["full", "upper", "push", "pull", "legs", "core"];
export const isSplit = (s: unknown): s is Split => typeof s === "string" && s in SPLITS;
const SPLIT_ORDER: Split[] = ["push", "pull", "legs"];

const DAY_MS = 86_400_000;
export const RECOVERY_DAYS = 2;
const RECOVERY_MS = RECOVERY_DAYS * DAY_MS;
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
  const noWeights = new Set(input.withoutWeights ?? []);
  const safe = input.exercises
    .filter(
      (e) =>
        e.category === "strength" &&
        e.level in LEVEL_RANK &&
        (e.equipment === null || e.equipment === "body only" || (owned.has(e.equipment) && !noWeights.has(e.equipment))) &&
        !e.primaryMuscles.some((m) => blockedPrimary.has(m as Muscle)) &&
        !e.secondaryMuscles.some((m) => blockedAny.has(m as Muscle)),
    )
    .sort(rank);

  const lastTrained = new Map<string, number>();
  for (const { muscle, trainedAt } of recent) {
    lastTrained.set(muscle, Math.max(lastTrained.get(muscle) ?? 0, trainedAt.getTime()));
  }
  const recovering = recoveringMuscles(recent, today);
  // A recommendation steers clear of muscles still recovering. A type the user chose is built anyway; injuries are always avoided.
  const isFree = (m: string) => (chosen !== undefined || !recovering.includes(m)) && !blockedPrimary.has(m as Muscle);

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
    const { max, rounds } = SHAPE[split];
    const muscles = SPLITS[split].filter(isFree);
    const taken = new Set<string>();
    const picked: E[] = [];
    // A compound per muscle first, then isolations, until the session is full. Core has no compound/isolation split, so it just goes round the muscles.
    const mechanics = split === "core" ? [null] : ["compound", "isolation"];
    for (let r = 0; r < rounds; r++) {
      for (const mechanic of mechanics) {
        for (const muscle of muscles) {
          if (picked.length >= max) break;
          const e = pick(muscle, mechanic, taken);
          if (e) {
            taken.add(e.id);
            picked.push(e);
          }
        }
      }
    }
    return picked;
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
    const exercises = picked.map((e) => prescribe(e, split === "core"));
    if (SHAPE[split].finisher && isFree("abdominals")) {
      const core = pick("abdominals", null, new Set(picked.map((e) => e.id)));
      if (core) exercises.push(prescribe(core, true));
    }
    const last = Math.max(...SPLITS[split].map((m) => lastTrained.get(m) ?? -Infinity));
    const lastTrainedDays = last === -Infinity ? null : Math.floor((today.getTime() - last) / DAY_MS);
    return { split, exercises, resting: [...blockedAny].sort(), recovering, lastTrainedDays };
  }
  return null;
}

/** The note shown when a chosen type was trained within the recovery window ("Legs were trained yesterday."), else null. */
export function recoveryNote(split: Split, daysAgo: number | null): string | null {
  if (daysAgo === null || daysAgo >= RECOVERY_DAYS) return null;
  const who: Record<Split, string> = {
    push: "Push muscles were",
    pull: "Pull muscles were",
    legs: "Legs were",
    upper: "Upper body was",
    full: "Full body was",
    core: "Core was",
  };
  return `${who[split]} trained ${daysAgo === 0 ? "today" : "yesterday"}.`;
}
