// Shared vocabularies, aligned with free-exercise-db so seeded exercises map directly.

export const EQUIPMENT = [
  "body only",
  "dumbbell",
  "kettlebells",
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
  { name: "Free weights", items: ["dumbbell", "kettlebells"] },
  { name: "Machines & cables", items: ["bowflex xtreme 2 se"] },
  { name: "Accessories", items: ["bands", "medicine ball", "exercise ball", "foam roll", "other", "metolius wooden fingerboard", "trx straps"] },
];

const LABELS: Partial<Record<Equipment, string>> = {
  "e-z curl bar": "E-Z curl bar",
  "bowflex xtreme 2 se": "Bowflex Xtreme 2 SE",
  "metolius wooden fingerboard": "Metolius wooden fingerboard",
  "trx straps": "TRX straps",
};
/** The name shown for an equipment item. */
export const equipmentLabel = (e: Equipment) => LABELS[e] ?? e[0].toUpperCase() + e.slice(1);

/** Equipment that has weights worth recording, with the tiles offered when picking weights and a starting range. */
export const WEIGHTED_EQUIPMENT = {
  dumbbell: { presets: [20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 45], range: { start: 2, step: 1, top: 24 } },
  kettlebells: { presets: [4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48], range: { start: 4, step: 4, top: 32 } },
  "medicine ball": { presets: [1, 2, 3, 4, 5, 6, 8, 10, 12], range: { start: 1, step: 1, top: 10 } },
} as const satisfies Partial<Record<Equipment, { presets: readonly number[]; range: { start: number; step: number; top: number } }>>;
export type WeightedEquipment = keyof typeof WEIGHTED_EQUIPMENT;
export const isWeighted = (e: string): e is WeightedEquipment => e in WEIGHTED_EQUIPMENT;

export const WEIGHT_GROUP_TYPES = ["range", "picked"] as const;
export type WeightGroupType = (typeof WEIGHT_GROUP_TYPES)[number];
/** Step sizes offered for a range, in kg. */
export const RANGE_STEPS = [0.5, 1, 2, 2.5, 4, 5] as const;

/** URL form of an equipment name ("medicine ball" -> "medicine-ball") and back, for weighted items only. */
export const equipmentSlug = (e: string) => e.replaceAll(" ", "-");
export const weightedFromSlug = (slug: string): WeightedEquipment | null =>
  (Object.keys(WEIGHTED_EQUIPMENT) as WeightedEquipment[]).find((e) => equipmentSlug(e) === slug) ?? null;
