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
