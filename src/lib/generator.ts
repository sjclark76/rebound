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

/** The areas of the body a workout can cover. */
export type Area = "full" | "upper" | "legs" | "core";
/** A focus within an area: the muscles that push, or the muscles that pull. Core has none. */
export type Movement = "push" | "pull";
/** A type of workout: an area, optionally narrowed to push or pull ("upper-push", "legs-pull", "full"). */
export type Split = Area | `${Exclude<Area, "core">}-${Movement}`;

export const AREAS: Area[] = ["full", "upper", "legs", "core"];
export const MOVEMENTS: Movement[] = ["push", "pull"];
const AREA_NAMES: Record<Area, string> = { full: "Full body", upper: "Upper body", legs: "Legs", core: "Core" };

const PUSH_MUSCLES: Muscle[] = ["chest", "shoulders", "triceps", "quadriceps", "calves"];
/** The muscles each area works, in the order exercises are picked for them. */
const AREA_MUSCLES: Record<Area, Muscle[]> = {
  upper: ["chest", "lats", "shoulders", "middle back", "triceps", "biceps", "traps"],
  legs: ["quadriceps", "hamstrings", "glutes", "calves"],
  full: ["quadriceps", "chest", "lats", "shoulders", "hamstrings", "glutes"],
  core: ["abdominals", "lower back"],
};

export function splitParts(split: Split): { area: Area; movement: Movement | undefined } {
  const [area, movement] = split.split("-") as [Area, Movement | undefined];
  return { area, movement };
}
/** The type for an area and a focus. Core has no push or pull, so it ignores one. */
export function makeSplit(area: Area, movement?: Movement): Split {
  return area === "core" || !movement ? area : (`${area}-${movement}` as Split);
}
/** Reads a type from a URL or the database. "push" and "pull" were types of their own before they became a focus; they mean upper body push and pull. Null if it isn't a type. */
export function normalizeSplit(s: unknown): Split | null {
  if (s === "push" || s === "pull") return `upper-${s}`;
  if (typeof s !== "string") return null;
  const [area, movement] = s.split("-");
  if (!(AREAS as string[]).includes(area) || (movement !== undefined && !(MOVEMENTS as string[]).includes(movement)) || (area === "core" && movement)) return null;
  return s as Split;
}
export const isSplit = (s: unknown): s is Split => normalizeSplit(s) === s;

function musclesOf(split: Split): Muscle[] {
  const { area, movement } = splitParts(split);
  const all = AREA_MUSCLES[area];
  return movement ? all.filter((m) => PUSH_MUSCLES.includes(m) === (movement === "push")) : all;
}
/** The muscles each type works. */
export const SPLITS = Object.fromEntries(
  AREAS.flatMap((a) => (a === "core" ? [a] : [a, `${a}-push`, `${a}-pull`])).map((s) => [s, musclesOf(s as Split)]),
) as Record<Split, Muscle[]>;

/** What a type is called: "Upper body push", "Legs pull", "Full body". Also reads old saved types, and gives "Workout" for anything unknown. */
export function splitName(split: string | null): string {
  const s = normalizeSplit(split);
  if (!s) return "Workout";
  const { area, movement } = splitParts(s);
  return movement ? `${AREA_NAMES[area]} ${movement}` : AREA_NAMES[area];
}
export const areaName = (a: Area) => AREA_NAMES[a];

/** The phrase for "…are the most rested" when a type is recommended. */
export function restedPhrase(split: Split): string {
  const { area, movement } = splitParts(split);
  if (area === "upper" && movement) return `${movement[0].toUpperCase()}${movement.slice(1)} muscles`;
  return area === "legs" && !movement ? "Leg muscles" : `${splitName(split)} muscles`;
}

/** How a type is built: the most exercises, how many times round the muscles it goes, and whether a core finisher follows. */
function shapeOf(split: Split): { max: number; rounds: number; finisher: boolean } {
  const { area, movement } = splitParts(split);
  if (area === "core") return { max: 5, rounds: 3, finisher: false };
  if (!movement) return { max: area === "legs" ? 5 : 6, rounds: 1, finisher: true };
  // Legs split in two leaves only two muscles each, so go round twice to fill a session.
  return { max: 5, rounds: area === "legs" ? 2 : 1, finisher: true };
}
/** Only these are ever recommended; every other type is chosen. */
const SPLIT_ORDER: Split[] = ["upper-push", "upper-pull", "legs"];

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
  const { equipment, injuries, recent, today } = input;
  const chosen = normalizeSplit(input.split) ?? undefined;
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
    const { max, rounds } = shapeOf(split);
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
    if (shapeOf(split).finisher && isFree("abdominals")) {
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
  const { area, movement } = splitParts(split);
  const who = movement
    ? `${area === "legs" ? "Leg" : AREA_NAMES[area]} ${movement} muscles were`
    : area === "legs"
      ? "Legs were"
      : `${AREA_NAMES[area]} was`;
  return `${who} trained ${daysAgo === 0 ? "today" : "yesterday"}.`;
}
