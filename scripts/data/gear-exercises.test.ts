import { describe, expect, it } from "vitest";
import { EQUIPMENT, MUSCLES } from "../../src/db/vocab";
import { suggestWorkout } from "../../src/lib/generator";
import { exerciseKind } from "../../src/lib/workout";
import { GEAR_EXERCISES } from "./gear-exercises";

const by = (equipment: string) => GEAR_EXERCISES.filter((e) => e.equipment === equipment);

describe("gear exercises", () => {
  it("has the agreed numbers for each piece of gear", () => {
    expect(by("bowflex xtreme 2 se").length).toBeGreaterThanOrEqual(70);
    expect(by("metolius wooden fingerboard").length).toBeGreaterThanOrEqual(8);
    expect(by("trx straps").length).toBeGreaterThanOrEqual(8);
  });
  it("has unique ids, known equipment and known muscles", () => {
    expect(new Set(GEAR_EXERCISES.map((e) => e.id)).size).toBe(GEAR_EXERCISES.length);
    for (const e of GEAR_EXERCISES) {
      expect(EQUIPMENT).toContain(e.equipment);
      for (const m of [...e.primaryMuscles, ...e.secondaryMuscles]) expect(MUSCLES).toContain(m);
    }
  });
  it("logs fingerboard hangs as timed and TRX as reps with no weight", () => {
    for (const e of by("metolius wooden fingerboard")) expect(exerciseKind(e)).toBe("timed");
    for (const e of by("trx straps")) expect(exerciseKind(e)).toBe("bodyweight");
  });
});

describe("suggestions", () => {
  const input = { injuries: [], recent: [], today: new Date("2026-01-05"), exercises: GEAR_EXERCISES };
  it("only offers gear exercises when that gear is on", () => {
    expect(suggestWorkout({ ...input, equipment: [] })).toBeNull();
    for (const gear of ["bowflex xtreme 2 se", "trx straps"]) {
      const s = suggestWorkout({ ...input, equipment: [gear] });
      expect(s?.exercises.length).toBeGreaterThan(0);
      expect(s!.exercises.every((e) => e.exercise.equipment === gear)).toBe(true);
    }
  });
  it("prescribes fingerboard hangs in seconds", () => {
    const s = suggestWorkout({ ...input, equipment: ["metolius wooden fingerboard"], split: "pull" });
    expect(s?.exercises[0].reps).toBe("30–45");
  });
});
