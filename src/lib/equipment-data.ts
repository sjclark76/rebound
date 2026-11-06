import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { equipmentWeightGroup, userEquipment } from "@/db/schema";
import type { WeightGroup } from "./weights";

type Row = typeof equipmentWeightGroup.$inferSelect;
const toGroup = (r: Row): WeightGroup => ({ id: r.id, name: r.name, type: r.type, start: r.start, step: r.step, top: r.top, weights: r.weights });

/** The equipment items the user has switched on. */
export async function getOwnedEquipment(userId: string): Promise<string[]> {
  const rows = await db.select({ equipment: userEquipment.equipment }).from(userEquipment).where(eq(userEquipment.userId, userId));
  return rows.map((r) => r.equipment);
}

/** The user's weight groups, oldest first, keyed by equipment item. Pass an item to get just its groups. */
export async function getWeightGroups(userId: string): Promise<Record<string, WeightGroup[]>>;
export async function getWeightGroups(userId: string, equipment: string): Promise<WeightGroup[]>;
export async function getWeightGroups(userId: string, equipment?: string) {
  const rows = await db
    .select()
    .from(equipmentWeightGroup)
    .where(and(eq(equipmentWeightGroup.userId, userId), equipment ? eq(equipmentWeightGroup.equipment, equipment) : undefined))
    .orderBy(asc(equipmentWeightGroup.id));
  if (equipment) return rows.map(toGroup);
  const byItem: Record<string, WeightGroup[]> = {};
  for (const r of rows) (byItem[r.equipment] ??= []).push(toGroup(r));
  return byItem;
}

/** One of the user's weight groups with its equipment item, or null if it isn't theirs. */
export async function getWeightGroup(userId: string, id: number) {
  const [r] = await db
    .select()
    .from(equipmentWeightGroup)
    .where(and(eq(equipmentWeightGroup.id, id), eq(equipmentWeightGroup.userId, userId)));
  return r ? { equipment: r.equipment, group: toGroup(r) } : null;
}
