import { describe, expect, it } from "vitest";
import { AREAS, type CatalogueExercise, type GeneratorInput, makeSplit, normalizeSplit, recoveryNote, restedPhrase, SPLITS, type Split, splitName, splitParts, suggestWorkout } from "./generator";

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
const catalogue: CatalogueExercise[] = [...new Set(Object.values(SPLITS).flat()), "abdominals"].flatMap(
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
    const presses = SPLITS["upper-push"].map((m) => ex(m, { secondaryMuscles: ["shoulders"] }));
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
      recent: [...SPLITS["upper-push"], ...SPLITS.legs].map((muscle) => ({ muscle, trainedAt: daysAgo(1) })),
    })!;
    expect(s.split).toBe("upper-pull");
    expect(ids(s)).toContain("Rows");
    expect(s.exercises.some((e) => e.exercise.primaryMuscles[0] === "biceps")).toBe(false);
    expect(s.resting).toEqual([]);
  });

  it("picks the least recently trained split and reports recovering muscles", () => {
    const s = suggestWorkout({
      ...base,
      recent: [
        ...SPLITS["upper-push"].map((muscle) => ({ muscle, trainedAt: daysAgo(1) })),
        ...SPLITS["upper-pull"].map((muscle) => ({ muscle, trainedAt: daysAgo(3) })),
        ...SPLITS.legs.map((muscle) => ({ muscle, trainedAt: daysAgo(5) })),
      ],
    })!;
    expect(s.split).toBe("legs");
    expect(s.lastTrainedDays).toBe(5);
    expect(s.recovering).toEqual([...SPLITS["upper-push"]].sort());
  });

  it("uses a chosen split even when it was trained recently", () => {
    const s = suggestWorkout({
      ...base,
      split: "upper-push",
      recent: SPLITS["upper-push"].map((muscle) => ({ muscle, trainedAt: daysAgo(3) })),
    })!;
    expect(s.split).toBe("upper-push");
    expect(s.lastTrainedDays).toBe(3);
  });

  it("reports no last-trained day without history", () => {
    expect(suggestWorkout(base)!.lastTrainedDays).toBeNull();
  });

  it("falls through to another split when one has too few safe exercises", () => {
    const s = suggestWorkout({
      ...base,
      exercises: catalogue.filter((e) => !SPLITS.legs.includes(e.primaryMuscles[0] as never)),
      recent: SPLITS["upper-push"].map((muscle) => ({ muscle, trainedAt: daysAgo(4) })),
    })!;
    expect(s.split).toBe("upper-pull");
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

  it("prescribes seconds, not reps, for static holds", () => {
    const hold = ex("abdominals", { id: "plank", force: "static", equipment: "body only", mechanic: null });
    const r = suggestWorkout({ ...base, exercises: [...catalogue.filter((e) => e.primaryMuscles[0] !== "abdominals"), hold] });
    expect(r?.exercises.at(-1)).toMatchObject({ exercise: { id: "plank" }, reps: "30–45" });
  });
});

describe("gear with no weights", () => {
  const kb = catalogue.map((e) => ({ ...e, id: `kb_${e.id}`, equipment: "kettlebells" }));
  const both = { ...base, exercises: [...catalogue, ...kb], equipment: ["dumbbell", "kettlebells"] };
  it("leaves out exercises for gear that has no weights yet", () => {
    const s = suggestWorkout({ ...both, withoutWeights: ["kettlebells"] });
    expect(s!.exercises.every((e) => e.exercise.equipment === "dumbbell")).toBe(true);
  });
  it("suggests them again once the gear has a weight", () => {
    const s = suggestWorkout(both);
    expect(s!.exercises.some((e) => e.exercise.equipment === "kettlebells")).toBe(true);
  });
  it("still suggests bodyweight work", () => {
    const body = catalogue.map((e) => ({ ...e, id: `body_${e.id}`, equipment: "body only" }));
    const s = suggestWorkout({ ...base, exercises: body, equipment: ["kettlebells"], withoutWeights: ["kettlebells"] });
    expect(s!.exercises.length).toBeGreaterThan(0);
  });
});

describe("workout types", () => {
  const primary = (s: ReturnType<typeof suggestWorkout>) => s!.exercises.map((e) => e.exercise.primaryMuscles[0]);
  const choose = (split: Split, extra: Partial<GeneratorInput> = {}) => suggestWorkout({ ...base, split, ...extra });
  const inOnly = (s: ReturnType<typeof suggestWorkout>, muscles: string[]) => primary(s).filter((m) => m !== "abdominals").every((m) => muscles.includes(m));

  it("offers four areas, and push or pull as a focus on three of them", () => {
    expect(AREAS).toEqual(["full", "upper", "legs", "core"]);
    expect(makeSplit("upper", "push")).toBe("upper-push");
    expect(makeSplit("legs", "pull")).toBe("legs-pull");
    expect(makeSplit("core", "push")).toBe("core"); // core has no push or pull
    expect(splitParts("full-pull")).toEqual({ area: "full", movement: "pull" });
    expect(splitParts("legs")).toEqual({ area: "legs", movement: undefined });
  });

  it("reads the old push and pull as upper body push and pull", () => {
    expect(normalizeSplit("push")).toBe("upper-push");
    expect(normalizeSplit("pull")).toBe("upper-pull");
    expect(normalizeSplit("legs")).toBe("legs");
    expect(normalizeSplit("nonsense")).toBeNull();
  });

  it("names each type", () => {
    expect(splitName("upper-push")).toBe("Upper body push");
    expect(splitName("legs-pull")).toBe("Legs pull");
    expect(splitName("full")).toBe("Full body");
    expect(splitName("push")).toBe("Upper body push"); // saved before push and pull became a focus
    expect(splitName("unknown")).toBe("Workout");
  });

  it("splits each area's muscles into push and pull", () => {
    expect(SPLITS["upper-push"]).toEqual(["chest", "shoulders", "triceps"]);
    expect(SPLITS["upper-pull"]).toEqual(["lats", "middle back", "biceps", "traps"]);
    expect(SPLITS["legs-push"]).toEqual(["quadriceps", "calves"]);
    expect(SPLITS["legs-pull"]).toEqual(["hamstrings", "glutes"]);
    expect(SPLITS["full-push"]).toEqual(["quadriceps", "chest", "shoulders"]);
    expect(SPLITS["full-pull"]).toEqual(["lats", "hamstrings", "glutes"]);
  });

  it("upper body works the push and pull muscles together", () => {
    const s = choose("upper");
    expect(s!.split).toBe("upper");
    const muscles = new Set(primary(s).filter((m) => m !== "abdominals"));
    expect(inOnly(s, SPLITS.upper)).toBe(true);
    expect(muscles.size).toBeGreaterThan(3);
    expect(s!.exercises.at(-1)!.exercise.primaryMuscles[0]).toBe("abdominals"); // core finisher
  });

  it("a focus narrows an area to its push or pull muscles", () => {
    expect(inOnly(choose("upper-push"), SPLITS["upper-push"])).toBe(true);
    expect(inOnly(choose("legs-pull"), SPLITS["legs-pull"])).toBe(true);
    expect(inOnly(choose("legs-push"), SPLITS["legs-push"])).toBe(true);
    expect(inOnly(choose("full-pull"), SPLITS["full-pull"])).toBe(true);
    expect(choose("legs-pull")!.exercises.length).toBeGreaterThanOrEqual(4);
  });

  it("full body covers chest, back, shoulders and legs, with a core finisher", () => {
    const s = choose("full");
    const muscles = new Set(primary(s));
    for (const m of ["chest", "lats", "shoulders", "quadriceps"]) expect(muscles.has(m)).toBe(true);
    expect(muscles.has("abdominals")).toBe(true);
    expect(s!.exercises.length).toBeLessThanOrEqual(7);
  });

  it("core is abdominals and lower back only, with no separate finisher", () => {
    const s = choose("core");
    expect(s!.exercises.length).toBe(5);
    expect(primary(s).every((m) => m === "abdominals" || m === "lower back")).toBe(true);
  });

  it("honours a chosen type even when its muscles are still recovering", () => {
    const recent = [{ muscle: "quadriceps", trainedAt: daysAgo(1) }, { muscle: "hamstrings", trainedAt: daysAgo(1) }];
    const s = choose("legs", { recent });
    expect(primary(s).some((m) => ["quadriceps", "hamstrings", "glutes", "calves"].includes(m))).toBe(true);
    expect(s!.lastTrainedDays).toBe(1);
  });

  it("still avoids injured muscles in a chosen type", () => {
    const s = choose("core", { injuries: [{ muscle: "lower back", mode: "rest" }] });
    expect(primary(s).every((m) => m === "abdominals")).toBe(true);
  });

  it("only ever recommends upper body push, upper body pull or legs", () => {
    for (let d = 0; d < 6; d++) expect(["upper-push", "upper-pull", "legs"]).toContain(suggestWorkout({ ...base, today: daysAgo(-d) })!.split);
  });

  it("says why a recommendation was picked", () => {
    expect(restedPhrase("upper-push")).toBe("Push muscles");
    expect(restedPhrase("upper-pull")).toBe("Pull muscles");
    expect(restedPhrase("legs")).toBe("Leg muscles");
  });
});

describe("recoveryNote", () => {
  it("says when a chosen type was trained within the recovery window", () => {
    expect(recoveryNote("legs", 1)).toBe("Legs were trained yesterday.");
    expect(recoveryNote("upper-push", 0)).toBe("Upper body push muscles were trained today.");
    expect(recoveryNote("legs-pull", 1)).toBe("Leg pull muscles were trained yesterday.");
    expect(recoveryNote("core", 1)).toBe("Core was trained yesterday.");
    expect(recoveryNote("upper", 1)).toBe("Upper body was trained yesterday.");
    expect(recoveryNote("full", 0)).toBe("Full body was trained today.");
  });
  it("is null once rested, or when never trained", () => {
    expect(recoveryNote("legs", 2)).toBeNull();
    expect(recoveryNote("legs", null)).toBeNull();
  });
});
