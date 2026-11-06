import { RANGE_STEPS, type WeightGroupType } from "../db/vocab";

export type Range = { start: number; step: number; top: number };

/** A saved batch of weights for one equipment item: evenly spaced (range) or individually picked. */
export type WeightGroup = {
  id: number;
  name: string | null;
  type: WeightGroupType;
  start: number | null;
  step: number | null;
  top: number | null;
  weights: number[];
};

const MIN_KG = 0.5;
const MAX_KG = 500;
const round = (n: number) => Math.round(n * 100) / 100;

/** Every weight from start to top in steps of step. */
export function expandRange(start: number, step: number, top: number): number[] {
  if (step <= 0 || start > top) return [];
  const out: number[] = [];
  for (let i = 0; round(start + i * step) <= top; i++) out.push(round(start + i * step));
  return out;
}

const sortedUnique = (ws: number[]) => [...new Set(ws.map(round))].sort((a, b) => a - b);

/** The weights a single group contributes. */
export function groupWeights(g: WeightGroup): number[] {
  return g.type === "range" && g.start != null && g.step != null && g.top != null
    ? expandRange(g.start, g.step, g.top)
    : sortedUnique(g.weights);
}

/** All the weights an item has: every group's weights, each counted once. */
export function unionWeights(groups: WeightGroup[]): number[] {
  return sortedUnique(groups.flatMap(groupWeights));
}

/** "26" or "2.5": no trailing .0. */
export const formatKg = (n: number) => String(round(n));

/** A compact summary for the equipment list row, e.g. "2–24 kg + 26, 28, 30 kg". Null with no weights. */
export function summariseGroups(groups: WeightGroup[]): string | null {
  const ranges = groups.filter((g) => g.type === "range" && groupWeights(g).length > 0);
  const pickedWeights = sortedUnique(groups.filter((g) => g.type === "picked").flatMap((g) => g.weights));
  const parts = [
    ...ranges.map((g) => `${formatKg(g.start!)}–${formatKg(g.top!)} kg`),
    ...(pickedWeights.length > 0 ? [`${pickedWeights.map(formatKg).join(", ")} kg`] : []),
  ];
  return parts.length > 0 ? parts.join(" + ") : null;
}

/** A short look at a weight list: all of it when short, otherwise the first four and last three. */
export function previewWeights(weights: number[]): string {
  const shown = weights.length > 8 ? [...weights.slice(0, 4).map(formatKg), "…", ...weights.slice(-3).map(formatKg)] : weights.map(formatKg);
  return `${shown.join(", ").replace(", …,", " …")} kg`;
}

/** Moves one field of a range, keeping start ≤ top and start ≥ 0.5. Start and top move 0.5 kg at a time; "step" moves through the allowed sizes. */
export function adjustRange(r: Range, field: keyof Range, direction: number): Range {
  if (field === "step") {
    const i = RANGE_STEPS.findIndex((s) => s >= r.step);
    const next = RANGE_STEPS[Math.min(RANGE_STEPS.length - 1, Math.max(0, (i === -1 ? RANGE_STEPS.length - 1 : i) + Math.sign(direction)))];
    return { ...r, step: next };
  }
  const moved = round(r[field] + direction * MIN_KG);
  if (field === "start") return { ...r, start: Math.min(r.top, Math.max(MIN_KG, moved)) };
  return { ...r, top: Math.min(MAX_KG, Math.max(r.start, moved)) };
}

/** The range that best describes picked weights: an even spacing if there is one, otherwise 1 kg steps. */
export function pickedToRange(weights: number[]): Range | null {
  const ws = sortedUnique(weights);
  if (ws.length === 0) return null;
  const gaps = new Set(ws.slice(1).map((w, i) => round(w - ws[i])));
  const step = gaps.size === 1 ? [...gaps][0] : 1;
  return { start: ws[0], step, top: ws[ws.length - 1] };
}

/** A typed weight in kg: positive, whole or half kilos, up to 500. Null if it isn't one. */
export function parseWeight(input: string): number | null {
  const n = Number(input.trim());
  if (!input.trim() || !Number.isFinite(n) || n < MIN_KG || n > MAX_KG || (n * 2) % 1 !== 0) return null;
  return n;
}

/** A fuller description for the weights page, e.g. "2–24 kg, every 1 kg, plus 26, 28, 30 kg". Null with no weights. */
export function describeGroups(groups: WeightGroup[]): string | null {
  const ranges = groups.filter((g) => g.type === "range" && groupWeights(g).length > 0);
  const pickedWeights = sortedUnique(groups.filter((g) => g.type === "picked").flatMap((g) => g.weights));
  const parts = [
    ...ranges.map((g) => `${formatKg(g.start!)}–${formatKg(g.top!)} kg, every ${formatKg(g.step!)} kg`),
    ...(pickedWeights.length > 0 ? [`${pickedWeights.map(formatKg).join(", ")} kg`] : []),
  ];
  return parts.length > 0 ? parts.join(", plus ") : null;
}

export type GroupState = Omit<WeightGroup, "id">;
const MAX_NAME = 40;
const MAX_PICKED = 60;

/** Checks a group before saving and tidies it: trimmed name, picked weights sorted and unique, unused fields cleared. Null if invalid. */
export function cleanGroupState(g: GroupState): GroupState | null {
  const name = g.name?.trim().slice(0, MAX_NAME) || null;
  if (g.type === "range") {
    const { start, step, top } = g;
    if (start == null || step == null || top == null) return null;
    const ok = (RANGE_STEPS as readonly number[]).includes(step) && start >= MIN_KG && start <= top && top <= MAX_KG && (start * 2) % 1 === 0 && (top * 2) % 1 === 0;
    return ok ? { name, type: "range", start, step, top, weights: [] } : null;
  }
  if (g.weights.some((w) => !Number.isFinite(w) || w < MIN_KG || w > MAX_KG || (w * 2) % 1 !== 0)) return null;
  const weights = sortedUnique(g.weights);
  return weights.length > MAX_PICKED ? null : { name, type: "picked", start: null, step: null, top: null, weights };
}

/** Which of these weights other groups already hold, and which groups hold them. */
export function sharedWeights(weights: number[], others: WeightGroup[]): { weights: number[]; groups: WeightGroup[] } {
  const held = others.map((g) => ({ g, ws: new Set(groupWeights(g)) }));
  const shared = sortedUnique(weights).filter((w) => held.some((h) => h.ws.has(w)));
  return { weights: shared, groups: held.filter((h) => shared.some((w) => h.ws.has(w))).map((h) => h.g) };
}

/** What to call a group on screen: its name, or its kind if it has none. */
export const groupTitle = (g: Pick<WeightGroup, "name" | "type">) => g.name ?? (g.type === "range" ? "Range" : "Picked weights");
