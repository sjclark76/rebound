import { describe, expect, it } from "vitest";
import { type CatalogueExercise, type GeneratorInput, SPLITS, suggestWorkout } from "./generator";

let n = 0;
function ex(
  primary: string,
  opts: Partial<Omit<CatalogueExercise, "primaryMuscles">> = {},
): CatalogueExercise {
  n += 1;
  return {
    id: opts.id ?? `${primary}_${n}`,
    name: opts.name ?? `${primary} ${n}`,
    equipment: "dumbbell",
    category: "strength",
    level: "beginner",
    mechanic: "compound",
    secondaryMuscles: [],
    ...opts,
    primaryMuscles: [primary],
  };
}

// Two compounds and an isolation for every split muscle, plus core.
const catalogue: CatalogueExercise[] = [...Object.values(SPLITS).flat(), "abdominals"].flatMap(
  (m) => [ex(m), ex(m), ex(m, { mechanic: "isolation" })],
);

const today = new Date("2026-11-05T08:00:00Z");
const base: GeneratorInput = {
  exercises: catalogue,
  equipment: ["dumbbell"],
  injuries: [],
  recent: [],
  today,
};
const daysAgo = (d: number) => new Date(today.getTime() - d * 86_400_000);
const ids = (s: ReturnType<typeof suggestWorkout>) => s!.exercises.map((e) => e.exercise.id);

describe("suggestWorkout", () => {
  it("is deterministic for the same input", () => {
    expect(suggestWorkout(base)).toEqual(suggestWorkout(base));
  });

  it("suggests five exercises plus a core finisher", () => {
    const s = suggestWorkout(base)!;
    expect(s.exercises).toHaveLength(6);
    expect(s.exercises.at(-1)!.exercise.primaryMuscles).toEqual(["abdominals"]);
  });

  it("only uses owned equipment or bodyweight", () => {
    const exercises = [
      ...catalogue.map((e) => ({ ...e, equipment: "barbell" })),
      ...catalogue.map((e) => ({ ...e, id: `bw_${e.id}`, equipment: "body only" })),
    ];
    const s = suggestWorkout({ ...base, exercises })!;
    expect(s.exercises.every((e) => e.exercise.equipment === "body only")).toBe(true);
  });

  it("skips anything loading a resting muscle, even as a secondary", () => {
    const presses = SPLITS.push.map((m) => ex(m, { secondaryMuscles: ["shoulders"] }));
    const s = suggestWorkout({
      ...base,
      exercises: [...catalogue, ...presses],
      injuries: [{ muscle: "shoulders", mode: "rest" }],
    })!;
    expect(s.resting).toEqual(["shoulders"]);
    for (const { exercise } of s.exercises) {
      expect([...exercise.primaryMuscles, ...exercise.secondaryMuscles]).not.toContain("shoulders");
    }
  });

  it("allows a rehab muscle as a secondary but not as the primary mover", () => {
    const rows = ex("lats", { secondaryMuscles: ["biceps"], id: "Rows" });
    const s = suggestWorkout({
      ...base,
      exercises: [rows, ...catalogue.filter((e) => e.primaryMuscles[0] !== "lats")],
      injuries: [{ muscle: "biceps", mode: "rehab" }],
      recent: [...SPLITS.push, ...SPLITS.legs].map((muscle) => ({ muscle, trainedAt: daysAgo(1) })),
    })!;
    expect(s.split).toBe("pull");
    expect(ids(s)).toContain("Rows");
    expect(s.exercises.some((e) => e.exercise.primaryMuscles[0] === "biceps")).toBe(false);
    expect(s.resting).toEqual([]);
  });

  it("picks the least recently trained split and reports recovering muscles", () => {
    const s = suggestWorkout({
      ...base,
      recent: [
        ...SPLITS.push.map((muscle) => ({ muscle, trainedAt: daysAgo(1) })),
        ...SPLITS.pull.map((muscle) => ({ muscle, trainedAt: daysAgo(3) })),
        ...SPLITS.legs.map((muscle) => ({ muscle, trainedAt: daysAgo(5) })),
      ],
    })!;
    expect(s.split).toBe("legs");
    expect(s.recovering).toEqual([...SPLITS.push].sort());
  });

  it("falls through to another split when one has too few safe exercises", () => {
    const s = suggestWorkout({
      ...base,
      exercises: catalogue.filter((e) => !SPLITS.legs.includes(e.primaryMuscles[0] as never)),
      recent: SPLITS.push.map((muscle) => ({ muscle, trainedAt: daysAgo(4) })),
    })!;
    expect(s.split).toBe("pull");
  });

  it("returns null when nothing is safe", () => {
    expect(suggestWorkout({ ...base, equipment: [], exercises: catalogue })).toBeNull();
  });

  it("prefers compounds and excludes expert and non-strength exercises", () => {
    const exercises = catalogue.map((e) =>
      e.mechanic === "compound" ? e : { ...e, category: "stretching" },
    );
    exercises.push(ex("chest", { level: "expert", id: "Expert" }));
    const s = suggestWorkout({ ...base, exercises })!;
    expect(ids(s)).not.toContain("Expert");
    expect(s.exercises.every((e) => e.exercise.category === "strength")).toBe(true);
  });
});
