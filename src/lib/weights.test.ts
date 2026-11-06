import { describe, expect, it } from "vitest";
import {
  adjustRange,
  cleanRange,
  describeOwned,
  expandRange,
  formatWeight,
  parseWeight,
  previewWeights,
  relabelRange,
  stepWeight,
  summariseOwned,
  summariseRange,
  tileWeights,
  toggleOwned,
  weightPool,
  type AdjustableRange,
  type Weight,
} from "./weights";

const w = (value: number, unit: "kg" | "lb" = "kg"): Weight => ({ value, unit });
const r = (start: number, step: number, top: number, unit: "kg" | "lb" = "kg"): AdjustableRange => ({ unit, start, step, top });

describe("expandRange", () => {
  it("lists every weight from start to top", () => expect(expandRange(2, 1, 5)).toEqual([2, 3, 4, 5]));
  it("handles half steps without float noise", () => expect(expandRange(1, 0.5, 2.5)).toEqual([1, 1.5, 2, 2.5]));
  it("stops at the last whole step below top", () => expect(expandRange(2, 4, 11)).toEqual([2, 6, 10]));
  it("returns nothing for a backwards range or a zero step", () => {
    expect(expandRange(10, 1, 5)).toEqual([]);
    expect(expandRange(2, 0, 5)).toEqual([]);
  });
});

describe("weightPool", () => {
  it("joins fixed weights and adjustable ranges, lightest to heaviest by true weight, each in its own unit", () => {
    const pool = weightPool([w(20), w(24), w(45, "lb")], [r(40, 5, 50, "lb")]);
    expect(pool.map((o) => `${o.value} ${o.unit}`)).toEqual(["40 lb", "20 kg", "45 lb", "50 lb", "24 kg"]);
  });
  it("counts the same number in the same unit once, and in another unit as different", () => {
    expect(weightPool([w(20), w(20)], [r(20, 2, 24)])).toHaveLength(3);
    expect(weightPool([w(20), w(20, "lb")], [])).toHaveLength(2);
  });
  it("is empty with nothing", () => expect(weightPool([], [])).toEqual([]));
});

describe("stepWeight", () => {
  const opts = weightPool([w(20), w(24), w(40, "lb"), w(45, "lb"), w(50, "lb")], []); // 40 lb, 20 kg, 45 lb, 50 lb, 24 kg
  it("steps up to the next heavier weight, whatever its unit (20 kg goes to 45 lb)", () =>
    expect(stepWeight(opts, w(20), 1)).toEqual(w(45, "lb")));
  it("steps down to the next lighter weight", () => expect(stepWeight(opts, w(20), -1)).toEqual(w(40, "lb")));
  it("jumps from a typed weight that isn't in the list to the nearest above or below", () => {
    expect(stepWeight(opts, w(23), 1)).toEqual(w(24));
    expect(stepWeight(opts, w(23), -1)).toEqual(w(50, "lb"));
  });
  it("returns null past either end", () => {
    expect(stepWeight(opts, w(24), 1)).toBeNull();
    expect(stepWeight(opts, w(30, "lb"), -1)).toBeNull();
  });
});

describe("summaries", () => {
  it("lists kg weights then lb weights, each run ascending with its unit once", () => {
    expect(summariseOwned([w(45, "lb"), w(24), w(50, "lb"), w(20)])).toBe("20, 24 kg + 45, 50 lb");
    expect(summariseOwned([w(55, "lb"), w(60, "lb")])).toBe("55, 60 lb");
    expect(summariseOwned([w(8), w(12)])).toBe("8, 12 kg");
  });
  it("is null with no weights", () => expect(summariseOwned([])).toBeNull());
  it("spells out for screen readers", () => expect(describeOwned([w(20), w(24), w(45, "lb"), w(50, "lb")])).toBe("20 and 24 kg, 45 and 50 lb"));
  it("summarises a range", () => expect(summariseRange(r(5, 2.5, 50, "lb"))).toBe("5–50 lb"));
});

describe("previewWeights", () => {
  it("shows all of a short list", () => expect(previewWeights([2, 4, 6], "kg")).toBe("2, 4, 6 kg"));
  it("shortens a long list to the first four and last three", () =>
    expect(previewWeights(expandRange(5, 2.5, 50), "lb")).toBe("5, 7.5, 10, 12.5 … 45, 47.5, 50 lb"));
});

describe("formatWeight", () => {
  it("drops a trailing .0 and rounds to 0.5", () => {
    expect(formatWeight(24)).toBe("24");
    expect(formatWeight(2.5)).toBe("2.5");
    expect(formatWeight(49.6)).toBe("49.5");
  });
});

describe("adjustRange", () => {
  it("never lets top fall below start", () =>
    expect(adjustRange({ start: 2, step: 1, top: 4 }, "top", -5, "kg")).toEqual({ start: 2, step: 1, top: 2 }));
  it("never lets start rise above top", () =>
    expect(adjustRange({ start: 2, step: 1, top: 4 }, "start", 10, "kg")).toEqual({ start: 4, step: 1, top: 4 }));
  it("never lets start fall below the unit's minimum", () => {
    expect(adjustRange({ start: 1, step: 1, top: 4 }, "start", -5, "kg").start).toBe(0.5);
    expect(adjustRange({ start: 1.5, step: 1, top: 4 }, "start", -5, "lb").start).toBe(1);
  });
  it("moves the step through the allowed sizes and stops at the ends", () => {
    expect(adjustRange({ start: 2, step: 1, top: 24 }, "step", 1, "kg").step).toBe(2);
    expect(adjustRange({ start: 2, step: 5, top: 24 }, "step", 1, "kg").step).toBe(5);
    expect(adjustRange({ start: 2, step: 0.5, top: 24 }, "step", -1, "kg").step).toBe(0.5);
  });
  it("steps pounds through whole pounds and 2.5", () => {
    expect(adjustRange({ start: 5, step: 2, top: 50 }, "step", 1, "lb").step).toBe(2.5);
    expect(adjustRange({ start: 5, step: 1, top: 50 }, "step", -1, "lb").step).toBe(1);
  });
});

describe("parseWeight", () => {
  it("accepts whole and half units", () => {
    expect(parseWeight("32", "kg")).toBe(32);
    expect(parseWeight("2.5", "kg")).toBe(2.5);
    expect(parseWeight("70", "lb")).toBe(70);
  });
  it("rejects zero, negatives, other fractions, junk and silly sizes", () => {
    for (const bad of ["", "0", "-4", "2.3", "abc", "1000"]) expect(parseWeight(bad, "kg")).toBeNull();
  });
});

describe("cleanRange", () => {
  it("keeps a valid range", () => expect(cleanRange(r(5, 2.5, 50, "lb"))).toEqual(r(5, 2.5, 50, "lb")));
  it("rejects backwards ranges, steps the unit doesn't allow, and out-of-bounds weights", () => {
    expect(cleanRange(r(10, 1, 5))).toBeNull();
    expect(cleanRange(r(2, 3, 24))).toBeNull();
    expect(cleanRange(r(5, 0.5, 50, "lb"))).toBeNull();
    expect(cleanRange(r(2, 1, 600))).toBeNull();
    expect(cleanRange({ ...r(2, 1, 24), unit: "st" as never })).toBeNull();
  });
});

describe("relabelRange", () => {
  it("keeps the numbers and changes only the unit", () => expect(relabelRange(r(5, 2.5, 50, "lb"), "kg")).toEqual(r(5, 2.5, 50, "kg")));
  it("snaps a step the new unit doesn't allow to the nearest allowed one", () =>
    expect(relabelRange(r(2, 0.5, 24, "kg"), "lb")).toEqual(r(2, 1, 24, "lb")));
  it("lifts a start below the new unit's minimum", () => expect(relabelRange(r(0.5, 1, 10, "kg"), "lb").start).toBe(1));
});

describe("tileWeights", () => {
  it("shows the presets plus any owned weight in that unit, sorted", () =>
    expect(tileWeights([20, 22, 24], [w(23), w(45, "lb"), w(20)], "kg")).toEqual([20, 22, 23, 24]));
  it("ignores owned weights in the other unit", () => expect(tileWeights([5, 10], [w(20)], "lb")).toEqual([5, 10]));
});

describe("toggleOwned", () => {
  it("adds a weight that isn't owned and removes one that is, matching on number and unit", () => {
    expect(toggleOwned([w(20)], w(24))).toEqual([w(20), w(24)]);
    expect(toggleOwned([w(20), w(24)], w(20))).toEqual([w(24)]);
    expect(toggleOwned([w(20)], w(20, "lb"))).toEqual([w(20), w(20, "lb")]);
  });
});
