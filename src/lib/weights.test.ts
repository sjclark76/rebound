import { describe, expect, it } from "vitest";
import {
  adjustRange,
  cleanGroupState,
  describeGroups,
  expandRange,
  formatKg,
  groupWeights,
  parseWeight,
  pickedToRange,
  sharedWeights,
  previewWeights,
  summariseGroups,
  unionWeights,
  type WeightGroup,
} from "./weights";

const range = (start: number, step: number, top: number, name: string | null = null): WeightGroup => ({
  id: 1, name, type: "range", start, step, top, weights: [],
});
const picked = (weights: number[], name: string | null = null): WeightGroup => ({
  id: 2, name, type: "picked", start: null, step: null, top: null, weights,
});

describe("expandRange", () => {
  it("lists every weight from start to top", () => expect(expandRange(2, 1, 5)).toEqual([2, 3, 4, 5]));
  it("handles half-kilo steps without float noise", () => expect(expandRange(1, 0.5, 2.5)).toEqual([1, 1.5, 2, 2.5]));
  it("stops at the last whole step below top", () => expect(expandRange(2, 4, 11)).toEqual([2, 6, 10]));
  it("returns nothing for a backwards range or a zero step", () => {
    expect(expandRange(10, 1, 5)).toEqual([]);
    expect(expandRange(2, 0, 5)).toEqual([]);
  });
});

describe("unionWeights", () => {
  it("counts a weight shared by two groups once, in order", () =>
    expect(unionWeights([range(20, 2, 24), picked([24, 26, 22])])).toEqual([20, 22, 24, 26]));
  it("is empty with no groups", () => expect(unionWeights([])).toEqual([]));
});

describe("groupWeights", () => {
  it("expands a range group and sorts a picked group", () => {
    expect(groupWeights(range(2, 1, 4))).toEqual([2, 3, 4]);
    expect(groupWeights(picked([30, 26, 26]))).toEqual([26, 30]);
  });
});

describe("summariseGroups", () => {
  it("joins ranges and picked weights for the list row", () =>
    expect(summariseGroups([range(2, 1, 24), picked([26, 28, 30])])).toBe("2–24 kg + 26, 28, 30 kg"));
  it("handles one group", () => expect(summariseGroups([picked([8, 12, 16, 24])])).toBe("8, 12, 16, 24 kg"));
  it("is null when there are no weights", () => expect(summariseGroups([])).toBeNull());
});

describe("previewWeights", () => {
  it("shows all of a short list", () => expect(previewWeights([2, 4, 6])).toBe("2, 4, 6 kg"));
  it("elides the middle of a long list", () =>
    expect(previewWeights(expandRange(2, 1, 24))).toBe("2, 3, 4, 5 … 22, 23, 24 kg"));
});

describe("formatKg", () => {
  it("drops a trailing .0", () => {
    expect(formatKg(24)).toBe("24");
    expect(formatKg(2.5)).toBe("2.5");
  });
});

describe("adjustRange", () => {
  it("never lets top fall below start", () =>
    expect(adjustRange({ start: 2, step: 1, top: 4 }, "top", -5)).toEqual({ start: 2, step: 1, top: 2 }));
  it("never lets start rise above top", () =>
    expect(adjustRange({ start: 2, step: 1, top: 4 }, "start", 10)).toEqual({ start: 4, step: 1, top: 4 }));
  it("never lets start go below 0.5", () =>
    expect(adjustRange({ start: 1, step: 1, top: 4 }, "start", -5).start).toBe(0.5));
  it("moves step through the allowed sizes", () => {
    expect(adjustRange({ start: 2, step: 1, top: 24 }, "step", 1).step).toBe(2);
    expect(adjustRange({ start: 2, step: 5, top: 24 }, "step", 1).step).toBe(5);
    expect(adjustRange({ start: 2, step: 0.5, top: 24 }, "step", -1).step).toBe(0.5);
  });
  it("moves start and top by 0.5 kg whatever the step", () => {
    expect(adjustRange({ start: 2, step: 2, top: 24 }, "start", 1).start).toBe(2.5);
    expect(adjustRange({ start: 2, step: 1, top: 24 }, "top", -1).top).toBe(23.5);
    expect(adjustRange({ start: 2.5, step: 1, top: 24 }, "start", -1).start).toBe(2);
  });
});

describe("pickedToRange", () => {
  it("recovers an evenly spaced range", () => expect(pickedToRange([4, 8, 12])).toEqual({ start: 4, step: 4, top: 12 }));
  it("falls back to 1 kg steps when uneven", () => expect(pickedToRange([26, 28, 31])).toEqual({ start: 26, step: 1, top: 31 }));
  it("returns null for nothing", () => expect(pickedToRange([])).toBeNull());
});

describe("parseWeight", () => {
  it("accepts whole and half kilos", () => {
    expect(parseWeight("32")).toBe(32);
    expect(parseWeight("2.5")).toBe(2.5);
  });
  it("rejects zero, negatives, other fractions, junk and silly sizes", () => {
    for (const bad of ["", "0", "-4", "2.3", "abc", "1000"]) expect(parseWeight(bad)).toBeNull();
  });
});

describe("describeGroups", () => {
  it("spells out ranges and picked weights", () =>
    expect(describeGroups([range(2, 1, 24), picked([26, 28, 30])])).toBe("2–24 kg, every 1 kg, plus 26, 28, 30 kg"));
  it("is null with nothing", () => expect(describeGroups([])).toBeNull());
});

describe("cleanGroupState", () => {
  const base = { name: "  Rack  ", type: "picked" as const, start: null, step: null, top: null, weights: [30, 26, 26] };
  it("trims the name, sorts and dedupes picked weights", () =>
    expect(cleanGroupState(base)).toEqual({ name: "Rack", type: "picked", start: null, step: null, top: null, weights: [26, 30] }));
  it("turns a blank name into null", () => expect(cleanGroupState({ ...base, name: "   " })?.name).toBeNull());
  it("keeps a valid range and drops stray weights", () =>
    expect(cleanGroupState({ name: null, type: "range", start: 2, step: 1, top: 24, weights: [9] })).toEqual({
      name: null, type: "range", start: 2, step: 1, top: 24, weights: [],
    }));
  it("rejects a range that is backwards, has an odd step, or an odd weight", () => {
    expect(cleanGroupState({ ...base, type: "range", start: 10, step: 1, top: 5 })).toBeNull();
    expect(cleanGroupState({ ...base, type: "range", start: 2, step: 3, top: 24 })).toBeNull();
    expect(cleanGroupState({ ...base, weights: [2.3] })).toBeNull();
  });
});

describe("sharedWeights", () => {
  it("finds weights also held by other groups, and which groups", () => {
    const other = range(20, 2, 24);
    expect(sharedWeights([20, 22, 24, 26], [other])).toEqual({ weights: [20, 22, 24], groups: [other] });
  });
  it("is empty when nothing overlaps", () => expect(sharedWeights([26], [range(2, 1, 24)])).toEqual({ weights: [], groups: [] }));
});
