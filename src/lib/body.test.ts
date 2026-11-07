import { describe, expect, it } from "vitest";
import { AREAS, lastTrainedLabel, muscleLabel, summaryLine, type Reading } from "./body";
import { FINE_MUSCLES } from "../db/vocab";

const NOW = new Date(2026, 10, 7, 12); // a Saturday, local time
const r = (muscle: Reading["muscle"], value: number | null, daysAgo: number | null = 2, injury: Reading["injury"] = null): Reading => ({
  muscle,
  value,
  lastTrained: daysAgo == null ? null : new Date(NOW.getTime() - daysAgo * 86400_000),
  injury,
});

describe("AREAS", () => it("lists each of the 23 muscles exactly once", () => {
  expect(AREAS.flatMap((a) => a.muscles).sort()).toEqual([...FINE_MUSCLES].sort());
}));

describe("muscleLabel", () => it("capitalises and explains abductors", () => {
  expect(muscleLabel("front delts")).toBe("Front delts");
  expect(muscleLabel("abductors")).toBe("Abductors (outer hip)");
}));

describe("lastTrainedLabel", () => {
  it("says how long ago, or that it wasn't trained this week", () => {
    expect(lastTrainedLabel(new Date(NOW.getTime() - 2 * 86400_000), NOW)).toBe("Last trained 2 days ago");
    expect(lastTrainedLabel(new Date(NOW.getTime() - 3600_000), NOW)).toBe("Last trained today");
    expect(lastTrainedLabel(new Date(NOW.getTime() - 86400_000), NOW)).toBe("Last trained yesterday");
    expect(lastTrainedLabel(new Date(NOW.getTime() - 9 * 86400_000), NOW)).toBe("Not trained this week");
    expect(lastTrainedLabel(null, NOW)).toBe("Not trained this week");
  });
});

describe("summaryLine", () => {
  it("names the area with the highest average fatigue and the weekday of its last session", () => {
    const rs = [r("quadriceps", 62, 2), r("glutes", 78, 2), r("hamstrings", 56, 2), r("biceps", 30, 1)];
    expect(summaryLine(rs, NOW)).toBe("Legs and hips carry most of it, from Thursday's session.");
  });
  it("says today or yesterday", () => {
    expect(summaryLine([r("lats", 60, 0)], NOW)).toBe("Back carry most of it, from today's session.");
    expect(summaryLine([r("neck", 60, 1)], NOW)).toBe("Neck carry most of it, from yesterday's session.");
  });
  it("ignores injured muscles, and hides when everything is rested", () => {
    expect(summaryLine([r("lats", null, 1, "rest"), r("biceps", 30, 1)], NOW)).toBe("Arms carry most of it, from yesterday's session.");
    expect(summaryLine([r("lats", 10), r("biceps", 24)], NOW)).toBeNull();
  });
});
