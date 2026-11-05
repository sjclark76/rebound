import { describe, expect, it } from "vitest";
import {
  exerciseKind,
  isStale,
  nowSlot,
  prefill,
  prefillFor,
  summarise,
  upperBound,
  type LoggedSet,
} from "./workout";

const set = (setNumber: number, o: Partial<LoggedSet> = {}): LoggedSet => ({
  id: setNumber,
  exerciseId: "bench",
  setNumber,
  reps: 8,
  weightKg: 22.5,
  durationSec: null,
  ...o,
});

describe("exerciseKind", () => {
  it("separates weighted, bodyweight and timed", () => {
    expect(exerciseKind({ equipment: "dumbbell", force: "push" })).toBe("weighted");
    expect(exerciseKind({ equipment: "body only", force: "push" })).toBe("bodyweight");
    expect(exerciseKind({ equipment: null, force: "pull" })).toBe("bodyweight");
    expect(exerciseKind({ equipment: "body only", force: "static" })).toBe("timed");
  });
});

describe("upperBound", () => {
  it("takes the top of a range", () => {
    expect(upperBound("8–10")).toBe(10);
    expect(upperBound("30–45")).toBe(45);
    expect(upperBound("12")).toBe(12);
  });
});

describe("prefill", () => {
  const base = { kind: "weighted" as const, plannedReps: "8–10", startingKg: null, thisWorkout: [], lastTime: [] };

  it("uses the same set number from last time", () => {
    const r = prefill({ ...base, setNumber: 3, lastTime: [set(1), set(2), set(3, { reps: 8 })] });
    expect(r).toMatchObject({ weightKg: 22.5, reps: 8, source: { rule: "last-time", setNumber: 3 } });
  });

  it("copies the previous set in this workout when last time had no such set", () => {
    const r = prefill({
      ...base,
      setNumber: 4,
      lastTime: [set(1), set(2), set(3)],
      thisWorkout: [set(3, { weightKg: 25, reps: 7 })],
    });
    expect(r).toMatchObject({ weightKg: 25, reps: 7, source: { rule: "previous-set", setNumber: 3, lastTimeSets: 3 } });
  });

  it("starts a weighted exercise with no history from the starting weight and planned reps", () => {
    const r = prefill({ ...base, setNumber: 1, startingKg: 20 });
    expect(r).toMatchObject({ weightKg: 20, reps: 10, source: { rule: "starting-weight" } });
  });

  it("copies set 1 for set 2 when there is no history", () => {
    const r = prefill({ ...base, setNumber: 2, startingKg: 20, thisWorkout: [set(1, { weightKg: 20, reps: 10 })] });
    expect(r.source).toMatchObject({ rule: "previous-set", setNumber: 1 });
    expect(r.weightKg).toBe(20);
  });

  it("uses the plan for bodyweight reps and timed seconds with no history", () => {
    expect(prefill({ ...base, kind: "bodyweight", plannedReps: "10–12", setNumber: 1 })).toMatchObject({
      reps: 12,
      weightKg: null,
      source: { rule: "plan" },
    });
    expect(prefill({ ...base, kind: "timed", plannedReps: "30–45", setNumber: 1 })).toMatchObject({
      durationSec: 45,
      source: { rule: "plan" },
    });
  });

  it("never leaves a weighted exercise without a weight", () => {
    const r = prefill({ ...base, setNumber: 1, startingKg: null });
    expect(r.weightKg).toBe(0);
  });
});

describe("prefillFor", () => {
  const base = { kind: "weighted" as const, plannedReps: "10–12", startingKg: 20, lastTime: [], logged: [] };

  it("chains unlogged sets from the first, as the design shows", () => {
    expect(prefillFor({ ...base, setNumber: 1 }).source).toEqual({ rule: "starting-weight" });
    expect(prefillFor({ ...base, setNumber: 3 })).toMatchObject({ weightKg: 20, reps: 12, source: { rule: "previous-set", setNumber: 1 } });
  });

  it("copies from the previous slot when last time had fewer sets", () => {
    const lastTime = [set(1, { weightKg: 10 }), set(2, { weightKg: 12.5 })];
    expect(prefillFor({ ...base, lastTime, setNumber: 3 })).toMatchObject({
      weightKg: 12.5,
      source: { rule: "previous-set", setNumber: 2, lastTimeSets: 2 },
    });
  });

  it("uses what was actually logged for earlier sets", () => {
    expect(prefillFor({ ...base, setNumber: 2, logged: [set(1, { weightKg: 25, reps: 9 })] })).toMatchObject({
      weightKg: 25,
      reps: 9,
      source: { rule: "previous-set", setNumber: 1 },
    });
  });
});

describe("nowSlot", () => {
  const ex = (id: string, n: number, skipped = false) => ({ exerciseId: id, plannedSets: n, skipped });
  const plan = [ex("a", 2), ex("b", 2)];
  const log = (exerciseId: string, setNumber: number, id: number): LoggedSet =>
    set(setNumber, { id, exerciseId });

  it("starts at the first set", () => {
    expect(nowSlot(plan, [])).toEqual({ exerciseId: "a", setNumber: 1 });
  });
  it("is the next unlogged set after the last logged one", () => {
    expect(nowSlot(plan, [log("a", 1, 1)])).toEqual({ exerciseId: "a", setNumber: 2 });
  });
  it("does not move when another exercise's set is merely opened, only when logged", () => {
    expect(nowSlot(plan, [log("a", 1, 1), log("b", 1, 2)])).toEqual({ exerciseId: "b", setNumber: 2 });
  });
  it("skips skipped exercises and wraps to the first gap", () => {
    expect(nowSlot([ex("a", 1), ex("b", 1, true)], [log("a", 1, 1)])).toBeNull();
    expect(nowSlot(plan, [log("b", 2, 5)])).toEqual({ exerciseId: "a", setNumber: 1 });
  });
  it("includes extra sets beyond the plan", () => {
    expect(nowSlot([ex("a", 1)], [log("a", 1, 1), log("a", 2, 2)])).toBeNull();
  });
});

describe("summarise", () => {
  it("counts exercises, sets and weighted volume only", () => {
    const s = summarise(
      [
        { exerciseId: "bench", skipped: false, kind: "weighted" },
        { exerciseId: "push", skipped: false, kind: "bodyweight" },
        { exerciseId: "fly", skipped: true, kind: "weighted" },
      ],
      [set(1, { reps: 10 }), set(2, { reps: 8 }), set(1, { exerciseId: "push", weightKg: null, reps: 12 })],
      new Date("2026-11-05T18:42:00Z"),
      new Date("2026-11-05T19:30:00Z"),
    );
    expect(s).toMatchObject({ exercisesDone: 2, exercisesTotal: 3, skipped: 1, sets: 3, volumeKg: 22.5 * 18, minutes: 48 });
  });
});

describe("isStale", () => {
  it("is true after 24 hours", () => {
    const start = new Date("2026-11-05T10:00:00Z");
    expect(isStale(start, new Date("2026-11-06T09:59:00Z"))).toBe(false);
    expect(isStale(start, new Date("2026-11-06T10:01:00Z"))).toBe(true);
  });
});
