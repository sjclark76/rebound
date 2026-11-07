import { describe, expect, it } from "vitest";
import { FINE_MUSCLES, GROUP_OF } from "../../src/db/vocab";
import { tagMuscles } from "./muscle-tags";

const tag = (name: string, primary: string[], secondary: string[] = []) =>
  tagMuscles({ name, primaryMuscles: primary, secondaryMuscles: secondary });

describe("tagMuscles", () => {
  it("splits chest by incline and decline, and uses both for a flat press", () => {
    expect(tag("Incline Dumbbell Press", ["chest"]).primary).toEqual(["upper chest"]);
    expect(tag("Decline Bench Press", ["chest"]).primary).toEqual(["lower chest"]);
    expect(tag("Barbell Bench Press", ["chest"]).primary).toEqual(["upper chest", "lower chest"]);
  });
  it("picks the delt head from the name", () => {
    expect(tag("Side Lateral Raise", ["shoulders"]).primary).toEqual(["side delts"]);
    expect(tag("Face Pull", ["shoulders"]).primary).toEqual(["rear delts"]);
    expect(tag("Dumbbell Front Raise", ["shoulders"]).primary).toEqual(["front delts"]);
    expect(tag("Front Dumbbell Raise", ["shoulders"]).primary).toEqual(["front delts"]);
    expect(tag("Reverse Machine Flyes", ["shoulders"]).primary).toEqual(["rear delts"]);
    expect(tag("Overhead Press", ["shoulders"]).primary).toEqual(["front delts", "side delts"]);
  });
  it("splits traps and sends obliques and hip flexors from core work", () => {
    expect(tag("Barbell Shrug", ["traps"]).primary).toEqual(["upper traps"]);
    expect(tag("Russian Twist", ["abdominals"]).primary).toEqual(["obliques"]);
    expect(tag("Hanging Leg Raise", ["abdominals"]).secondary).toContain("hip flexors");
  });
  it("renames middle back to rhomboids", () => expect(tag("Seated Cable Row", ["middle back"], ["lats"]).primary).toEqual(["rhomboids"]));
  it("flags lengthened or lowering-phase work", () => {
    expect(tag("Romanian Deadlift", ["hamstrings"]).lengthened).toBe(true);
    expect(tag("Dumbbell Flyes", ["chest"]).lengthened).toBe(true);
    expect(tag("Barbell Curl", ["biceps"]).lengthened).toBe(false);
  });
  it("lists exercises it had to guess for review", () => {
    expect(tag("Mystery Shoulder Move", ["shoulders"]).review).toBeTruthy();
    expect(tag("Barbell Curl", ["biceps"]).review).toBeNull();
  });
  it("never puts a muscle in both lists and keeps tags consistent with the groups", () => {
    const t = tag("Incline Press", ["chest"], ["shoulders", "triceps"]);
    expect(t.primary.filter((m) => t.secondary.includes(m))).toEqual([]);
    for (const m of [...t.primary, ...t.secondary]) expect(FINE_MUSCLES).toContain(m);
    for (const m of t.primary) expect(["chest"]).toContain(GROUP_OF[m]);
    for (const m of t.secondary) expect(["chest", "shoulders", "triceps"]).toContain(GROUP_OF[m]);
  });
});
