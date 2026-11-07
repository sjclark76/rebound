import { describe, expect, it } from "vitest";
import { bandOf, computeFatigue, currentValue, epley, scoreOf, valueOf, SLOW_TAU, type FatigueSet } from "./fatigue";

const T0 = new Date("2026-11-02T10:00:00Z");
const hours = (h: number) => new Date(T0.getTime() + h * 3600_000);
const quad = (o: Partial<FatigueSet> = {}): FatigueSet => ({
  exerciseId: "squat",
  at: T0,
  reps: 8,
  weightKg: 100,
  durationSec: null,
  finePrimary: ["quadriceps"],
  fineSecondary: ["glutes"],
  lengthened: false,
  compound: true,
  ...o,
});
const sets = (n: number, o: Partial<FatigueSet> = {}) => Array.from({ length: n }, () => quad(o));
const value = (s: FatigueSet[], muscle: Parameters<typeof currentValue>[1], at = T0) => currentValue(computeFatigue(s, at), muscle);
const total = (s: FatigueSet[]) => { const q = computeFatigue(s, T0).muscles.quadriceps; return q.fast + q.slow; };

describe("epley", () => it("estimates a one-rep max from weight and reps", () => expect(epley(100, 10)).toBeCloseTo(133.3, 1)));

describe("scoreOf and bands", () => {
  it("is a saturating curve of the fatigue total, roughly 15 / 47 / 86 for 1 / 4 / 10 hard sets", () => {
    expect(scoreOf(1)).toBeGreaterThan(12);
    expect(scoreOf(1)).toBeLessThan(20);
    expect(scoreOf(4)).toBeGreaterThan(42);
    expect(scoreOf(4)).toBeLessThan(56);
    expect(scoreOf(10)).toBeGreaterThan(78);
    expect(scoreOf(10)).toBeLessThan(90);
    expect(scoreOf(1000)).toBeLessThanOrEqual(100);
    expect(scoreOf(0)).toBe(0);
  });
  it("names the four bands", () => {
    expect([0, 24, 25, 49, 50, 74, 75, 100].map(bandOf)).toEqual(["Rested", "Rested", "Slightly tired", "Slightly tired", "Tired", "Tired", "Very tired", "Very tired"]);
  });
});

describe("computeFatigue", () => {
  it("raises primary muscles fully and secondary muscles by half", () => {
    const f = computeFatigue(sets(4), T0);
    const q = f.muscles.quadriceps.fast + f.muscles.quadriceps.slow;
    const g = f.muscles.glutes.fast + f.muscles.glutes.slow;
    expect(g).toBeCloseTo(q / 2, 5);
    expect(f.muscles.biceps.fast + f.muscles.biceps.slow).toBe(0);
  });
  it("counts more reps more, but less than in proportion", () => {
    const ten = value(sets(1, { reps: 10 }), "quadriceps");
    const five = value(sets(1, { reps: 5 }), "quadriceps");
    expect(ten).toBeGreaterThan(five);
    expect(ten / five).toBeLessThan(2);
  });
  it("counts an exercise not done in 28 days 1.3x, and lengthened work 1.2x", () => {
    const old = quad({ at: hours(-24 * 25) }); // inside 28 days, so the exercise is familiar, but outside the 21-day window
    expect(total([quad()]) / total([old, quad()])).toBeCloseTo(1.3, 5);
    expect(total([old, quad({ lengthened: true })]) / total([old, quad()])).toBeCloseTo(1.2, 5);
  });
  it("falls with time: the fast part quickly, the slow part by the group's time constant", () => {
    const s = sets(4);
    const now = value(s, "quadriceps");
    const after8 = value(s, "quadriceps", hours(8));
    const after48 = value(s, "quadriceps", hours(48));
    const after200 = value(s, "quadriceps", hours(200));
    expect(after8).toBeLessThan(now);
    expect(after48).toBeLessThan(after8);
    expect(after200).toBeLessThan(5);
  });
  it("recovers a big bout disproportionately slowly", () => {
    const small = value(sets(2), "quadriceps", hours(48)) / value(sets(2), "quadriceps");
    const big = value(sets(12), "quadriceps", hours(48)) / value(sets(12), "quadriceps");
    expect(big).toBeGreaterThan(small);
  });
  it("stacks sessions additively", () => {
    const two = [...sets(4, { at: hours(-24) }), ...sets(4)];
    const one = sets(4);
    expect(value(two, "quadriceps")).toBeGreaterThan(value(one, "quadriceps"));
  });
  it("heavy lower-body compound lifts add to the whole-body pool, arm work does not", () => {
    expect(computeFatigue(sets(5), T0).whole.fast).toBeGreaterThan(0);
    const curls = sets(5, { finePrimary: ["biceps"], fineSecondary: [], compound: false });
    expect(computeFatigue(curls, T0).whole.fast).toBe(0);
  });
  it("tracks when each muscle was last trained", () => {
    const f = computeFatigue([quad({ at: hours(-30) }), quad({ at: hours(-5) })], T0);
    expect(f.muscles.quadriceps.lastTrained).toEqual(hours(-5));
    expect(f.muscles.biceps.lastTrained).toBeNull();
  });
  it("ignores bodyweight and timed sets' weight and still counts them", () => {
    const pushups = sets(3, { weightKg: null, finePrimary: ["upper chest", "lower chest"], fineSecondary: [], compound: true });
    expect(value(pushups, "upper chest")).toBeGreaterThan(0);
    const hang = sets(3, { weightKg: null, reps: null, durationSec: 30, finePrimary: ["forearms"], fineSecondary: [], compound: false });
    expect(value(hang, "forearms")).toBeGreaterThan(0);
  });
  it("counts a set well below the best recent effort for less", () => {
    const heavy = quad({ weightKg: 140, reps: 5, at: hours(-1) });
    const light = quad({ weightKg: 40, reps: 8 });
    expect(total([heavy, light]) - total([heavy])).toBeLessThan(total([light]));
  });
  it("ages a saved value without replaying sets", () => {
    const f = computeFatigue(sets(4), T0).muscles.quadriceps;
    expect(valueOf(f, SLOW_TAU.quadriceps, T0, hours(48))).toBeLessThan(valueOf(f, SLOW_TAU.quadriceps, T0, T0));
  });
});
