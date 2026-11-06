import { describe, expect, it } from "vitest";
import { convert, formatWeight, snapHalf } from "./units";

describe("convert", () => {
  it("converts kg to lb at two decimals", () => expect(convert(22.5, "kg", "lb")).toBe(49.6));
  it("converts lb to kg at two decimals", () => expect(convert(50, "lb", "kg")).toBe(22.68));
  it("leaves the value alone when the unit is unchanged", () => expect(convert(22.5, "kg", "kg")).toBe(22.5));
  it("returns a kg value to itself after kg -> lb -> kg", () => {
    for (let kg = 0; kg <= 300; kg += 0.25) expect(convert(convert(kg, "kg", "lb"), "lb", "kg")).toBe(kg);
  });
});

describe("formatWeight", () => {
  it("rounds to the nearest 0.5", () => {
    expect(formatWeight(49.6)).toBe("49.5");
    expect(formatWeight(49.8)).toBe("50");
    expect(formatWeight(26)).toBe("26");
  });
});

describe("snapHalf", () => it("rounds to the nearest 0.5", () => expect(snapHalf(4.41)).toBe(4.5)));
