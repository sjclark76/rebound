import { describe, expect, it } from "vitest";
import { EQUIPMENT, EQUIPMENT_GROUPS, FIXED_EQUIPMENT, countsAs, gearWithoutWeights, hasWeightsPage, isAdjustable, isFixed, poolItems, suggestionEquipment } from "./vocab";

describe("the Bowflex", () => {
  it("has a weights page like the other fixed gear", () => {
    expect(hasWeightsPage("bowflex xtreme 2 se")).toBe(true);
    expect(FIXED_EQUIPMENT["bowflex xtreme 2 se"].presets.lb).toHaveLength(21);
  });
  it("starts with 5 to 105 lb every 5 ticked", () => {
    const d = FIXED_EQUIPMENT["bowflex xtreme 2 se"].defaults;
    expect(d[0]).toEqual({ value: 5, unit: "lb" });
    expect(d.at(-1)).toEqual({ value: 105, unit: "lb" });
    expect(d).toHaveLength(21);
  });
});

describe("equipment screen", () => {
  const shown = EQUIPMENT_GROUPS.flatMap((g) => g.items);
  it("lists the adjustable items under Free weights", () =>
    expect(EQUIPMENT_GROUPS[0].items).toEqual(["dumbbell", "adjustable dumbbells", "kettlebells", "adjustable kettlebells"]));
  it("only lists known equipment", () => shown.forEach((i) => expect(EQUIPMENT).toContain(i)));
  it("gives a weights page to fixed and adjustable gear only", () => {
    expect(shown.filter(hasWeightsPage).sort()).toEqual(["adjustable dumbbells", "adjustable kettlebells", "bowflex xtreme 2 se", "dumbbell", "kettlebells", "medicine ball"]);
    expect(isFixed("dumbbell") && isAdjustable("adjustable dumbbells") && !isFixed("bands")).toBe(true);
  });
});

describe("adjustable gear stands in for fixed gear", () => {
  it("counts adjustable dumbbells as dumbbells, and likewise kettlebells", () => {
    expect(countsAs("adjustable dumbbells")).toBe("dumbbell");
    expect(countsAs("adjustable kettlebells")).toBe("kettlebells");
    expect(countsAs("bands")).toBeNull();
  });
  it("pools an exercise's weights from the fixed item and its adjustable twin", () => {
    expect(poolItems("dumbbell")).toEqual(["dumbbell", "adjustable dumbbells"]);
    expect(poolItems("kettlebells")).toEqual(["kettlebells", "adjustable kettlebells"]);
    expect(poolItems("medicine ball")).toEqual(["medicine ball"]);
    expect(poolItems("bowflex xtreme 2 se")).toEqual(["bowflex xtreme 2 se"]);
    expect(poolItems("bands")).toEqual([]);
  });
});

describe("suggestionEquipment", () => {
  it("adds the fixed item an adjustable one stands in for, once", () => {
    expect(suggestionEquipment(["adjustable dumbbells", "bands"]).sort()).toEqual(["adjustable dumbbells", "bands", "dumbbell"]);
    expect(suggestionEquipment(["dumbbell", "adjustable dumbbells"]).sort()).toEqual(["adjustable dumbbells", "dumbbell"]);
    expect(suggestionEquipment([])).toEqual([]);
  });
});

describe("gearWithoutWeights", () => {
  it("lists switched-on fixed gear with no weights", () =>
    expect(gearWithoutWeights(["kettlebells", "dumbbell", "bands"], { dumbbell: 1 }).sort()).toEqual(["kettlebells"]));
  it("doesn't count gear whose adjustable twin is on, since the range gives it weights", () =>
    expect(gearWithoutWeights(["dumbbell", "adjustable dumbbells"], {})).toEqual([]));
  it("ignores gear that is off, and gear with no weights at all", () => expect(gearWithoutWeights(["bands", "foam roll"], {})).toEqual([]));
});
