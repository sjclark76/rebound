import type { Unit } from "../db/vocab";

export const LB_PER_KG = 2.2046226218;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Converts at two decimals. Used to total volume in kg; stored weights stay in the unit they were marked in. */
export function convert(n: number, from: Unit, to: Unit): number {
  if (from === to) return n;
  return round2(from === "kg" ? n * LB_PER_KG : n / LB_PER_KG);
}

/** Nearest 0.5: the precision screens show and steppers move by. */
export const snapHalf = (n: number) => Math.round(n * 2) / 2;

/** "26" or "26.5": a weight as shown on screen. */
export const formatWeight = (n: number) => String(snapHalf(n));
