import { bandOf, type Band } from "./fatigue";
import type { FineMuscle } from "../db/vocab";

export type Reading = { muscle: FineMuscle; value: number | null; lastTrained: Date | null; injury: "rest" | "rehab" | null };

/** How the Body screen's list groups the 23 muscles. */
export const AREAS: { name: string; muscles: FineMuscle[] }[] = [
  { name: "Chest", muscles: ["upper chest", "lower chest"] },
  { name: "Shoulders", muscles: ["front delts", "side delts", "rear delts"] },
  { name: "Arms", muscles: ["biceps", "triceps", "forearms"] },
  { name: "Core", muscles: ["abdominals", "obliques"] },
  { name: "Back", muscles: ["upper traps", "lower traps", "rhomboids", "lats", "lower back"] },
  { name: "Legs and hips", muscles: ["hip flexors", "glutes", "abductors", "adductors", "quadriceps", "hamstrings", "calves"] },
  { name: "Neck", muscles: ["neck"] },
];

export const muscleLabel = (m: FineMuscle) => (m === "abductors" ? "Abductors (outer hip)" : m[0].toUpperCase() + m.slice(1));

const DAY = 24 * 3600_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to) - startOfDay(from)) / DAY);

export function lastTrainedLabel(at: Date | null, now: Date): string {
  if (!at) return "Not trained this week";
  const d = daysBetween(at, now);
  if (d > 7) return "Not trained this week";
  return d <= 0 ? "Last trained today" : d === 1 ? "Last trained yesterday" : `Last trained ${d} days ago`;
}

/** "Legs and hips carry most of it, from Thursday's session." Hidden (null) when every muscle is rested. */
export function summaryLine(readings: Reading[], now: Date): string | null {
  const live = readings.filter((r) => r.value != null && !r.injury);
  if (live.every((r) => (r.value ?? 0) < 25)) return null;
  let best: { name: string; avg: number; last: Date | null } | null = null;
  for (const a of AREAS) {
    const rs = live.filter((r) => a.muscles.includes(r.muscle));
    if (!rs.length) continue;
    const avg = rs.reduce((s, r) => s + (r.value ?? 0), 0) / rs.length;
    if (!best || avg > best.avg) {
      const times = rs.map((r) => r.lastTrained?.getTime() ?? 0);
      best = { name: a.name, avg, last: Math.max(...times) ? new Date(Math.max(...times)) : null };
    }
  }
  if (!best) return null;
  const d = best.last ? daysBetween(best.last, now) : null;
  const day = d == null ? "the last" : d <= 0 ? "today's" : d === 1 ? "yesterday's" : `${best.last!.toLocaleDateString("en-GB", { weekday: "long" })}'s`;
  return `${best.name} carry most of it, from ${day} session.`;
}

export const bandOfReading = (r: Reading): Band | null => (r.value == null ? null : bandOf(r.value));

/** The plum colour for a 0-100 value, blended between the four ramp stops (which are theme variables). */
export function fatigueColor(value: number): string {
  const v = Math.min(100, Math.max(0, value));
  const i = Math.min(3, Math.floor(v / 25));
  const pct = Math.round(((v - i * 25) / 25) * 100);
  return pct === 0 ? `var(--fatigue-${i})` : `color-mix(in srgb, var(--fatigue-${i + 1}) ${pct}%, var(--fatigue-${i}))`;
}
export const FATIGUE_GRADIENT = "linear-gradient(to right, var(--fatigue-0), var(--fatigue-1), var(--fatigue-2), var(--fatigue-3), var(--fatigue-4))";
