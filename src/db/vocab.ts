// Shared vocabularies, aligned with free-exercise-db so seeded exercises map directly.

export const EQUIPMENT = [
  "body only",
  "dumbbell",
  "adjustable dumbbells",
  "kettlebells",
  "adjustable kettlebells",
  "barbell",
  "e-z curl bar",
  "bands",
  "cable",
  "machine",
  "medicine ball",
  "exercise ball",
  "foam roll",
  "other",
  "bowflex xtreme 2 se",
  "metolius wooden fingerboard",
  "trx straps",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const MUSCLES = [
  "abdominals",
  "abductors",
  "adductors",
  "biceps",
  "calves",
  "chest",
  "forearms",
  "glutes",
  "hamstrings",
  "lats",
  "lower back",
  "middle back",
  "neck",
  "quadriceps",
  "shoulders",
  "traps",
  "triceps",
] as const;
export type Muscle = (typeof MUSCLES)[number];

/** rest = avoid loading the area; rehab = include gentle work that targets it. */
export const INJURY_MODES = ["rest", "rehab"] as const;
export type InjuryMode = (typeof INJURY_MODES)[number];

/** How the equipment screen groups items. New items and groups are added here, nowhere else. "body only" is always allowed, so it isn't listed. Barbell, E-Z curl bar, machine and cable are left out for now (not owned). */
export const EQUIPMENT_GROUPS: readonly { name: string; items: readonly Equipment[] }[] = [
  { name: "Free weights", items: ["dumbbell", "adjustable dumbbells", "kettlebells", "adjustable kettlebells"] },
  { name: "Machines & cables", items: ["bowflex xtreme 2 se"] },
  { name: "Accessories", items: ["bands", "medicine ball", "exercise ball", "foam roll", "other", "metolius wooden fingerboard", "trx straps"] },
];

/** Only equipment the settings screen offers counts as owned. Anything else in the database (a seed script's barbell or cable, say) can't be seen or switched off, so it is ignored. */
export const selectableEquipment = (owned: readonly string[]): string[] => {
  const offered = new Set<string>(EQUIPMENT_GROUPS.flatMap((g) => g.items));
  return owned.filter((e) => offered.has(e));
};

const LABELS: Partial<Record<Equipment, string>> = {
  dumbbell: "Dumbbells",
  "e-z curl bar": "E-Z curl bar",
  "bowflex xtreme 2 se": "Bowflex Xtreme 2 SE",
  "metolius wooden fingerboard": "Metolius wooden fingerboard",
  "trx straps": "TRX straps",
};
/** The name shown for an equipment item. */
export const equipmentLabel = (e: Equipment) => LABELS[e] ?? e[0].toUpperCase() + e.slice(1);

export const UNITS = ["kg", "lb"] as const;
export type Unit = (typeof UNITS)[number];
export const isUnit = (u: unknown): u is Unit => (UNITS as readonly unknown[]).includes(u);

const every = (from: number, to: number, step: number) => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);

/** Fixed gear: you tick the weights you own, from tiles in either unit. `noun` and `plural` name one and several of them in sentences; `exercises` names their exercises. `defaults` are ticked when the item is first switched on. */
export const FIXED_EQUIPMENT = {
  dumbbell: {
    noun: "dumbbell",
    title: "Dumbbell weights",
    exercises: "Dumbbell",
    plural: "dumbbells",
    presets: { kg: [20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 45], lb: every(5, 60, 5) },
    defaults: [],
  },
  kettlebells: {
    noun: "kettlebell",
    title: "Kettlebell weights",
    exercises: "Kettlebell",
    plural: "kettlebells",
    presets: { kg: [4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48], lb: [10, 15, 20, 25, 30, 35, 45, 55, 65, 70, 90, 105] },
    defaults: [],
  },
  "medicine ball": {
    noun: "medicine ball",
    title: "Medicine ball weights",
    exercises: "Medicine ball",
    plural: "medicine balls",
    presets: { kg: [1, 2, 3, 4, 5, 6, 8, 10, 12], lb: [2, 4, 6, 8, 10, 12, 15, 20, 25] },
    defaults: [],
  },
  // The standard 210 lb of Power Rods is 5 to 105 lb per side in 5 lb steps (owner's manual); the 310 and 410 lb upgrades add heavier ones.
  "bowflex xtreme 2 se": {
    noun: "Bowflex weight",
    title: "Bowflex weights",
    exercises: "Bowflex",
    plural: "Bowflex weights",
    presets: { kg: every(2.5, 50, 2.5), lb: every(5, 105, 5) },
    defaults: every(5, 105, 5).map((value) => ({ value, unit: "lb" as Unit })),
  },
} as const satisfies Partial<
  Record<Equipment, { noun: string; title: string; exercises: string; plural: string; presets: Record<Unit, readonly number[]>; defaults: readonly { value: number; unit: Unit }[] }>
>;
export type FixedEquipment = keyof typeof FIXED_EQUIPMENT;
export const isFixed = (e: string): e is FixedEquipment => e in FIXED_EQUIPMENT;

/** Adjustable gear: one range it adjusts through, in the unit it is marked in. `counts` is the fixed item it stands in for. */
export const ADJUSTABLE_EQUIPMENT = {
  "adjustable dumbbells": { counts: "dumbbell", range: { kg: { start: 2, step: 1, top: 24 }, lb: { start: 5, step: 2.5, top: 50 } } },
  "adjustable kettlebells": { counts: "kettlebells", range: { kg: { start: 4, step: 4, top: 32 }, lb: { start: 10, step: 5, top: 70 } } },
} as const satisfies Partial<Record<Equipment, { counts: FixedEquipment; range: Record<Unit, { start: number; step: number; top: number }> }>>;
export type AdjustableEquipment = keyof typeof ADJUSTABLE_EQUIPMENT;
export const isAdjustable = (e: string): e is AdjustableEquipment => e in ADJUSTABLE_EQUIPMENT;
export const hasWeightsPage = (e: string) => isFixed(e) || isAdjustable(e);

/** Owning an adjustable item counts as owning the fixed item it stands in for (for suggestions). Null for anything else. */
export const countsAs = (e: string): FixedEquipment | null => (isAdjustable(e) ? ADJUSTABLE_EQUIPMENT[e].counts : null);

/** The items whose weights an exercise tagged with this equipment logs against: the fixed item and its adjustable twin. */
export const poolItems = (e: string): Equipment[] =>
  isFixed(e) ? [e, ...(Object.keys(ADJUSTABLE_EQUIPMENT) as AdjustableEquipment[]).filter((a) => ADJUSTABLE_EQUIPMENT[a].counts === e)] : [];

/** Step sizes offered for a range: kg in halves and a few whole steps, lb in whole pounds or 2.5. */
export const RANGE_STEPS: Record<Unit, readonly number[]> = { kg: [0.5, 1, 2, 2.5, 4, 5], lb: [1, 2, 2.5, 3, 4, 5] };
/** Smallest and largest weight allowed, per unit. */
export const WEIGHT_BOUNDS: Record<Unit, { min: number; max: number }> = { kg: { min: 0.5, max: 500 }, lb: { min: 1, max: 1105 } };

/** URL form of an equipment name ("medicine ball" -> "medicine-ball") and back, for items with a weights page. */
export const equipmentSlug = (e: string) => e.replaceAll(" ", "-");
export const weightsItemFromSlug = (slug: string): FixedEquipment | AdjustableEquipment | null =>
  ([...Object.keys(FIXED_EQUIPMENT), ...Object.keys(ADJUSTABLE_EQUIPMENT)] as (FixedEquipment | AdjustableEquipment)[]).find((e) => equipmentSlug(e) === slug) ?? null;

/** Fixed items switched on that have no weight yet, so their exercises can't be suggested. An adjustable twin that is on counts, since its range gives the item weights. `counts` is how many weights each fixed item has. */
export function gearWithoutWeights(owned: readonly string[], counts: Readonly<Record<string, number>>): string[] {
  return owned.filter((e) => isFixed(e) && !(counts[e] > 0) && !poolItems(e).some((t) => t !== e && owned.includes(t)));
}

/** What the generator treats as owned: every switched-on item, plus the fixed item each adjustable one stands in for. */
export const suggestionEquipment = (owned: readonly string[]): string[] => [...new Set([...owned, ...owned.flatMap((e) => countsAs(e) ?? [])])];
