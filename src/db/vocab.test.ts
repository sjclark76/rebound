import { describe, expect, it } from "vitest";
import { EQUIPMENT, EQUIPMENT_GROUPS, countsAs, hasUnit, hasWeightsPage, isAdjustable, isFixed, poolItems, suggestionEquipment } from "./vocab";

describe("hasUnit", () => {
  it("is true only for the Bowflex", () => {
    expect(hasUnit("bowflex xtreme 2 se")).toBe(true);
    for (const i of EQUIPMENT.filter((e) => e !== "bowflex xtreme 2 se")) expect(hasUnit(i)).toBe(false);
  });
});

describe("equipment screen", () => {
  const shown = EQUIPMENT_GROUPS.flatMap((g) => g.items);
  it("lists the adjustable items under Free weights", () =>
    expect(EQUIPMENT_GROUPS[0].items).toEqual(["dumbbell", "adjustable dumbbells", "kettlebells", "adjustable kettlebells"]));
  it("only lists known equipment", () => shown.forEach((i) => expect(EQUIPMENT).toContain(i)));
  it("gives a weights page to fixed and adjustable gear only", () => {
    expect(shown.filter(hasWeightsPage).sort()).toEqual(["adjustable dumbbells", "adjustable kettlebells", "dumbbell", "kettlebells", "medicine ball"]);
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
    expect(poolItems("bowflex xtreme 2 se")).toEqual([]);
  });
});

describe("suggestionEquipment", () => {
  it("adds the fixed item an adjustable one stands in for, once", () => {
    expect(suggestionEquipment(["adjustable dumbbells", "bands"]).sort()).toEqual(["adjustable dumbbells", "bands", "dumbbell"]);
    expect(suggestionEquipment(["dumbbell", "adjustable dumbbells"]).sort()).toEqual(["adjustable dumbbells", "dumbbell"]);
    expect(suggestionEquipment([])).toEqual([]);
  });
});
