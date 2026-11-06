import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { equipmentRange, equipmentWeight, userEquipment } from "@/db/schema";
import type { AdjustableRange, Weight } from "./weights";

/** The equipment items the user has switched on. */
export async function getOwnedEquipment(userId: string): Promise<string[]> {
  const rows = await db.select({ equipment: userEquipment.equipment }).from(userEquipment).where(eq(userEquipment.userId, userId));
  return rows.map((r) => r.equipment);
}

/** The weights the user has ticked on their fixed items, keyed by item. Pass an item to get just its weights. */
export async function getOwnedWeights(userId: string): Promise<Record<string, Weight[]>>;
export async function getOwnedWeights(userId: string, equipment: string): Promise<Weight[]>;
export async function getOwnedWeights(userId: string, equipment?: string) {
  const rows = await db
    .select()
    .from(equipmentWeight)
    .where(and(eq(equipmentWeight.userId, userId), equipment ? eq(equipmentWeight.equipment, equipment) : undefined));
  const byItem: Record<string, Weight[]> = {};
  for (const r of rows) (byItem[r.equipment] ??= []).push({ value: r.weight, unit: r.unit });
  return equipment ? (byItem[equipment] ?? []) : byItem;
}

/** The range of each adjustable item the user has set, keyed by item. */
export async function getRanges(userId: string): Promise<Record<string, AdjustableRange>> {
  const rows = await db.select().from(equipmentRange).where(eq(equipmentRange.userId, userId));
  return Object.fromEntries(rows.map((r) => [r.equipment, { unit: r.unit, start: r.start, step: r.step, top: r.top }]));
}
