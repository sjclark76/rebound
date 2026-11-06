import { RANGE_STEPS, WEIGHT_BOUNDS, isUnit, poolItems, type Unit } from "../db/vocab";
import { formatWeight, LB_PER_KG, snapHalf } from "./units";

export { formatWeight };

/** A weight as marked on the gear: a number and the unit it is in. */
export type Weight = { value: number; unit: Unit };
const toKg = (w: Weight) => (w.unit === "kg" ? w.value : w.value / LB_PER_KG);

/** The range one adjustable item adjusts through, in the unit it is marked in. */
export type Range = { start: number; step: number; top: number };
export type AdjustableRange = Range & { unit: Unit };

const HALF = 0.5;
const round = (n: number) => Math.round(n * 100) / 100;

/** Every weight from start to top in steps of step. */
export function expandRange(start: number, step: number, top: number): number[] {
  if (step <= 0 || start > top) return [];
  const out: number[] = [];
  for (let i = 0; round(start + i * step) <= top; i++) out.push(round(start + i * step));
  return out;
}

/** Every weight an exercise's equipment has: the weights ticked on the fixed item plus the range of its adjustable twin, lightest to heaviest by true weight, each in its own unit. The same number in the same unit counts once; in another unit it is a different weight. */
export function weightPool(owned: Weight[], ranges: AdjustableRange[]): Weight[] {
  const seen = new Set<string>();
  const all: Weight[] = [];
  const add = (value: number, unit: Unit) => {
    const key = `${value}${unit}`;
    if (!seen.has(key)) {
      seen.add(key);
      all.push({ value, unit });
    }
  };
  for (const o of owned) add(o.value, o.unit);
  for (const g of ranges) for (const v of expandRange(g.start, g.step, g.top)) add(v, g.unit);
  return all.sort((a, b) => toKg(a) - toKg(b) || a.unit.localeCompare(b.unit));
}

const SAME_KG = 0.005;
/** The next heavier (direction 1) or lighter (-1) weight than the current one, by true weight, whatever its unit. Null past either end. Works from a typed weight that isn't in the list. */
export function stepWeight(options: Weight[], current: Weight, direction: 1 | -1): Weight | null {
  const now = toKg(current);
  const beyond = options.filter((o) => (direction > 0 ? toKg(o) > now + SAME_KG : toKg(o) < now - SAME_KG));
  if (beyond.length === 0) return null;
  return beyond.reduce((best, o) => ((direction > 0 ? toKg(o) < toKg(best) : toKg(o) > toKg(best)) ? o : best));
}

/** One run per unit, kg first, each ascending. */
function runs(owned: Weight[]): { unit: Unit; values: number[] }[] {
  return (["kg", "lb"] as const)
    .map((unit) => ({ unit, values: [...new Set(owned.filter((o) => o.unit === unit).map((o) => round(o.value)))].sort((a, b) => a - b) }))
    .filter((r) => r.values.length > 0);
}

/** The gap, if a run of three or more weights is evenly spaced. */
const evenStep = (values: number[]): number | null => {
  if (values.length < 3) return null;
  const gap = round(values[1] - values[0]);
  return values.every((v, i) => i === 0 || round(v - values[i - 1]) === gap) ? gap : null;
};

/** "20, 24 kg + 45, 50 lb": kg weights then lb weights, each run ascending with its unit once. An even run of three or more is shortened ("5–105 lb every 5"). Null with no weights. */
export function summariseOwned(owned: Weight[]): string | null {
  const r = runs(owned);
  return r.length > 0
    ? r
        .map(({ unit, values }) => {
          const step = evenStep(values);
          return step ? `${formatWeight(values[0])}–${formatWeight(values.at(-1)!)} ${unit} every ${formatWeight(step)}` : `${values.map(formatWeight).join(", ")} ${unit}`;
        })
        .join(" + ")
    : null;
}

const and = (ns: number[]) => (ns.length < 2 ? ns.map(formatWeight).join("") : `${ns.slice(0, -1).map(formatWeight).join(", ")} and ${formatWeight(ns.at(-1)!)}`);
/** The summary spelled out for screen readers: "20 and 24 kg, 45 and 50 lb", or "5 to 105 lb, every 5 lb" for an even run. Null with no weights. */
export function describeOwned(owned: Weight[]): string | null {
  const r = runs(owned);
  return r.length > 0
    ? r
        .map(({ unit, values }) => {
          const step = evenStep(values);
          return step ? `${formatWeight(values[0])} to ${formatWeight(values.at(-1)!)} ${unit}, every ${formatWeight(step)} ${unit}` : `${and(values)} ${unit}`;
        })
        .join(", ")
    : null;
}

/** "5–50 lb". */
export const summariseRange = (r: AdjustableRange) => `${formatWeight(r.start)}–${formatWeight(r.top)} ${r.unit}`;

/** A short look at a weight list: all of it when short, otherwise the first four and last three. */
export function previewWeights(weights: number[], unit: Unit): string {
  const shown = weights.length > 8 ? [...weights.slice(0, 4).map(formatWeight), "…", ...weights.slice(-3).map(formatWeight)] : weights.map(formatWeight);
  return `${shown.join(", ").replace(", …,", " …")} ${unit}`;
}

/** Moves one field of a range, keeping start ≤ top and start ≥ the unit's minimum. Start and top move 0.5 at a time (landing on a 0.5 after a conversion); "step" moves through the unit's allowed sizes. */
export function adjustRange(r: Range, field: keyof Range, direction: number, unit: Unit): Range {
  const steps = RANGE_STEPS[unit];
  const { min, max } = WEIGHT_BOUNDS[unit];
  if (field === "step") {
    const i = steps.findIndex((s) => s >= r.step);
    const next = steps[Math.min(steps.length - 1, Math.max(0, (i === -1 ? steps.length - 1 : i) + Math.sign(direction)))];
    return { ...r, step: next };
  }
  const moved = snapHalf(r[field] + direction * HALF);
  if (field === "start") return { ...r, start: Math.min(r.top, Math.max(min, moved)) };
  return { ...r, top: Math.min(max, Math.max(r.start, moved)) };
}

/** A typed weight: whole or half units within the unit's bounds. Null if it isn't one. */
export function parseWeight(input: string, unit: Unit): number | null {
  const n = Number(input.trim());
  const { min, max } = WEIGHT_BOUNDS[unit];
  if (!input.trim() || !Number.isFinite(n) || n < min || n > max || (n * 2) % 1 !== 0) return null;
  return n;
}

/** Checks a range before saving. Steps and bounds are judged in the range's own unit. Null if invalid. */
export function cleanRange(g: AdjustableRange): AdjustableRange | null {
  const { unit, start, step, top } = g;
  if (!isUnit(unit)) return null;
  const { min, max } = WEIGHT_BOUNDS[unit];
  const inBounds = (w: number) => Number.isFinite(w) && w >= min && w <= max;
  return RANGE_STEPS[unit].includes(step) && inBounds(start) && inBounds(top) && start <= top ? { unit, start, step, top } : null;
}

/** Changes a range's unit and keeps its numbers (5-50 lb becomes 5-50 kg): the unit says how the gear is marked. A step the new unit doesn't allow moves to the nearest one that it does; a start below the new minimum is lifted. */
export function relabelRange(g: AdjustableRange, to: Unit): AdjustableRange {
  const step = RANGE_STEPS[to].reduce((best, s) => (Math.abs(s - g.step) < Math.abs(best - g.step) ? s : best));
  const start = Math.max(WEIGHT_BOUNDS[to].min, g.start);
  return { unit: to, start, step, top: Math.max(start, g.top) };
}

/** The tiles shown for one unit: the item's presets plus any weight owned in that unit that isn't a preset, ascending. */
export function tileWeights(presets: readonly number[], owned: Weight[], unit: Unit): number[] {
  return [...new Set([...presets, ...owned.filter((o) => o.unit === unit).map((o) => o.value)])].sort((a, b) => a - b);
}

/** The owned list with this weight added, or removed if it was there. Number and unit must both match. */
export const toggleOwned = (owned: Weight[], w: Weight): Weight[] =>
  owned.some((o) => o.value === w.value && o.unit === w.unit) ? owned.filter((o) => !(o.value === w.value && o.unit === w.unit)) : [...owned, w];

export type Snap = { weight: Weight; how: "same" | "above" | "below" | "between" };
/** The weight in `options` nearest to `target` by true weight, whatever its unit; the lighter one on a tie. `how` says where the target was: already there, above the top, below the bottom, or between two. Null with no options. */
export function snapToOptions(options: Weight[], target: Weight): Snap | null {
  if (options.length === 0) return null;
  const now = toKg(target);
  const near = options.reduce((best, o) => {
    const d = Math.abs(toKg(o) - now);
    const bd = Math.abs(toKg(best) - now);
    return d < bd - SAME_KG || (Math.abs(d - bd) <= SAME_KG && toKg(o) < toKg(best)) ? o : best;
  });
  const kgs = options.map(toKg);
  const how = Math.abs(toKg(near) - now) <= SAME_KG ? "same" : now > Math.max(...kgs) ? "above" : now < Math.min(...kgs) ? "below" : "between";
  return { weight: near, how };
}

/** What the user owns, as far as weights go. */
export type GearWeights = { owned: readonly string[]; weights: Readonly<Record<string, Weight[]>>; ranges: Readonly<Record<string, AdjustableRange>> };

/** The weights an exercise tagged with this equipment can use: ticked weights of the item and any range of its adjustable twin, for items the user has switched on. Empty for gear with no weights. */
export function poolFor(equipment: string | null, gear: GearWeights): Weight[] {
  const items = equipment ? poolItems(equipment).filter((i) => gear.owned.includes(i)) : [];
  return weightPool(items.flatMap((i) => gear.weights[i] ?? []), items.flatMap((i) => (gear.ranges[i] ? [gear.ranges[i]] : [])));
}

/** "a" or "an" before a weight said aloud: an 8, an 11, an 18, an 85; a 20, a 110. */
export const aOrAn = (n: number) => {
  const whole = Math.floor(n);
  return whole === 8 || whole === 11 || whole === 18 || (whole >= 80 && whole <= 89) ? "an" : "a";
};
