// The muscle fatigue model. Each logged set adds "hard-set equivalents" to the muscles it loads; fatigue then
// falls in two parts (a fast one and a slow, damage-driven one), and a saturating curve turns the total into 0-100.
// Every constant is a starting value from the research notes on #32, to be tuned from feedback.
import { FINE_MUSCLES, type FineMuscle } from "../db/vocab";

export type FatigueSet = {
  exerciseId: string;
  /** When the set was done (its workout's start). */
  at: Date;
  reps: number | null;
  /** The set's weight in kg, or null for bodyweight and timed sets. */
  weightKg: number | null;
  durationSec: number | null;
  finePrimary: FineMuscle[];
  fineSecondary: FineMuscle[];
  lengthened: boolean;
  compound: boolean;
};

export type Part = { fast: number; slow: number; lastTrained: Date | null };
export type FatigueState = { muscles: Record<FineMuscle, Part>; whole: Part };

const HOUR = 3600_000;
const FAST_TAU = 8;
const FAST_SHARE = 0.5;
/** How much a pile of fatigue stretches the slow time constant: 10 hard sets make recovery 1.4x slower. */
const SLOW_STRETCH = 0.04;
const SCORE_SCALE = 6;
const SECONDARY = 0.5;
const NOVELTY = 1.3;
const NOVELTY_DAYS = 28;
const LENGTHENED = 1.2;
const WHOLE_SHARE = 0.4;
const WINDOW_DAYS = 21;
/** Reps in reserve assumed until the difficulty rating (#31) exists. */
const DEFAULT_RIR = 2;
/** Experience multiplier: intermediate until #49 exists. */
const EXPERIENCE = 1;

/** The slow compartment's time constant in hours, by how long each muscle takes to recover. */
export const SLOW_TAU: Record<FineMuscle, number> = {
  "upper chest": 36,
  "lower chest": 36,
  "front delts": 30,
  "side delts": 30,
  "rear delts": 30,
  biceps: 30,
  triceps: 30,
  forearms: 24,
  abdominals: 24,
  obliques: 24,
  "hip flexors": 30,
  "lower back": 48,
  "upper traps": 36,
  "lower traps": 36,
  lats: 36,
  rhomboids: 36,
  quadriceps: 48,
  hamstrings: 48,
  glutes: 48,
  adductors: 36,
  abductors: 30,
  calves: 24,
  neck: 24,
};
const WHOLE_TAU = 48;
const LOWER_BODY = new Set<FineMuscle>(["quadriceps", "glutes", "hamstrings", "lower back"]);

export const epley = (kg: number, reps: number) => kg * (1 + reps / 30);

/** 0-100 from a fatigue total: roughly 15 for one hard set, 47 for four, 86 for ten. */
export const scoreOf = (total: number) => Math.round(100 * (1 - Math.exp(-Math.max(0, total) / SCORE_SCALE)));

export const BANDS = ["Rested", "Slightly tired", "Tired", "Very tired"] as const;
export type Band = (typeof BANDS)[number];
export const bandOf = (value: number): Band => BANDS[value < 25 ? 0 : value < 50 ? 1 : value < 75 ? 2 : 3];

const empty = (): Part => ({ fast: 0, slow: 0, lastTrained: null });

/** Lets a part recover for `dt` hours, a step at a time, because a bigger pile recovers slower. */
function advance(p: Part, tau: number, dt: number): Part {
  let { fast, slow } = p;
  for (let left = dt; left > 0; left -= 1) {
    const step = Math.min(1, left);
    fast *= Math.exp(-step / FAST_TAU);
    slow *= Math.exp(-step / (tau * (1 + SLOW_STRETCH * slow)));
  }
  return { ...p, fast, slow };
}

/** Effort of a set: 1 when it was hard (2 or fewer reps in reserve), less the further it was from the best recent effort. */
function effortOf(s: FatigueSet, best: number | null): number {
  if (s.weightKg == null || s.reps == null || s.weightKg <= 0 || best == null) return 1;
  const reserve = Math.min(6, Math.max(0, 30 * (best / s.weightKg - 1) - s.reps));
  return Math.max(0.3, 1 - 0.2 * Math.max(0, reserve - DEFAULT_RIR));
}

const repFactor = (reps: number | null) => (reps == null ? 1 : Math.min(1.3, Math.max(0.7, Math.sqrt(reps / 8))));

/** Replays the sets in time order and returns each muscle's fatigue aged to `now`. Only the last 21 days count; older sets just tell novelty. */
export function computeFatigue(allSets: FatigueSet[], now: Date): FatigueState {
  const sets = [...allSets].sort((a, b) => a.at.getTime() - b.at.getTime());
  const windowStart = now.getTime() - WINDOW_DAYS * 24 * HOUR;
  const state: FatigueState = { muscles: Object.fromEntries(FINE_MUSCLES.map((m) => [m, empty()])) as Record<FineMuscle, Part>, whole: empty() };
  let clock = Math.max(windowStart, sets[0]?.at.getTime() ?? now.getTime());
  const tick = (to: number) => {
    const dt = (to - clock) / HOUR;
    if (dt > 0) {
      for (const m of FINE_MUSCLES) state.muscles[m] = advance(state.muscles[m], SLOW_TAU[m], dt);
      state.whole = advance(state.whole, WHOLE_TAU, dt);
      clock = to;
    }
  };
  sets.forEach((s, i) => {
    const t = s.at.getTime();
    if (t < windowStart || t > now.getTime()) return;
    tick(t);
    const earlier = sets.slice(0, i).filter((x) => x.exerciseId === s.exerciseId && x.at.getTime() < t);
    const novel = !earlier.some((x) => t - x.at.getTime() <= NOVELTY_DAYS * 24 * HOUR);
    const recent = earlier.filter((x) => t - x.at.getTime() <= WINDOW_DAYS * 24 * HOUR).concat(sets.slice(0, i + 1).filter((x) => x.exerciseId === s.exerciseId && x.at.getTime() === t));
    const best = recent.reduce<number | null>((b, x) => (x.weightKg != null && x.reps != null && x.weightKg > 0 ? Math.max(b ?? 0, epley(x.weightKg, x.reps)) : b), null);
    const base = effortOf(s, best) * repFactor(s.reps) * (novel ? NOVELTY : 1) * (s.lengthened ? LENGTHENED : 1) * EXPERIENCE;
    const add = (m: FineMuscle, role: number) => {
      const p = state.muscles[m];
      const u = base * role;
      state.muscles[m] = { fast: p.fast + u * FAST_SHARE, slow: p.slow + u * (1 - FAST_SHARE), lastTrained: s.at };
    };
    s.finePrimary.forEach((m) => add(m, 1));
    s.fineSecondary.filter((m) => !s.finePrimary.includes(m)).forEach((m) => add(m, SECONDARY));
    if (s.compound && s.finePrimary.some((m) => LOWER_BODY.has(m))) {
      const w = state.whole;
      const u = base * WHOLE_SHARE;
      state.whole = { fast: w.fast + u * FAST_SHARE, slow: w.slow + u * (1 - FAST_SHARE), lastTrained: s.at };
    }
  });
  tick(now.getTime());
  return state;
}

/** A stored part aged from `from` to `now`, as a 0-100 score. Reads a saved row without replaying any sets. */
export function valueOf(part: Pick<Part, "fast" | "slow">, tau: number, from: Date, now: Date): number {
  const aged = advance({ ...part, lastTrained: null }, tau, Math.max(0, (now.getTime() - from.getTime()) / HOUR));
  return scoreOf(aged.fast + aged.slow);
}

/** The 0-100 score of one muscle (or the whole-body pool) in a freshly computed state. */
export function currentValue(state: FatigueState, muscle: FineMuscle | "whole"): number {
  const p = muscle === "whole" ? state.whole : state.muscles[muscle];
  return scoreOf(p.fast + p.slow);
}

/** The slow time constant to age a saved row with. */
export const tauOf = (muscle: FineMuscle | "whole") => (muscle === "whole" ? WHOLE_TAU : SLOW_TAU[muscle]);
