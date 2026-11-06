"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { equipmentWeightGroup, userEquipment } from "@/db/schema";
import { EQUIPMENT, equipmentSlug, isWeighted, WEIGHT_GROUP_TYPES, WEIGHTED_EQUIPMENT, type WeightGroupType } from "@/db/vocab";
import { requireSession } from "@/lib/session";
import { cleanGroupState, type GroupState, type WeightGroup } from "@/lib/weights";

const refresh = (equipment?: string) => {
  revalidatePath("/settings");
  revalidatePath("/");
  if (equipment) revalidatePath(`/settings/equipment/${equipmentSlug(equipment)}`, "layout");
};

/** Switches an equipment item on or off. Off keeps its weight groups. "body only" is always allowed, so it isn't stored. */
export async function setEquipment(equipment: string, on: boolean) {
  const { user } = await requireSession();
  if (!(EQUIPMENT as readonly string[]).includes(equipment) || equipment === "body only") throw new Error("Unknown equipment");
  if (on) await db.insert(userEquipment).values({ userId: user.id, equipment }).onConflictDoNothing();
  else await db.delete(userEquipment).where(and(eq(userEquipment.userId, user.id), eq(userEquipment.equipment, equipment)));
  refresh(equipment);
}

/** Adds a weight group to a weighted item, starting from that item's default range, and returns its id. */
export async function createWeightGroup(equipment: string, type: WeightGroupType, name: string): Promise<number> {
  const { user } = await requireSession();
  if (!isWeighted(equipment) || !WEIGHT_GROUP_TYPES.includes(type)) throw new Error("Can't add weights to that");
  const r = WEIGHTED_EQUIPMENT[equipment].range;
  const state = cleanGroupState(
    type === "range"
      ? { name, type, start: r.start, step: r.step, top: r.top, weights: [] }
      : { name, type, start: null, step: null, top: null, weights: [] },
  );
  if (!state) throw new Error("Invalid weight group");
  const [row] = await db.insert(equipmentWeightGroup).values({ userId: user.id, equipment, ...state }).returning({ id: equipmentWeightGroup.id });
  refresh(equipment);
  return row.id;
}

/** Saves a weight group's full state. */
export async function updateWeightGroup(id: number, input: GroupState) {
  const { user } = await requireSession();
  const state = cleanGroupState(input);
  if (!state) throw new Error("Invalid weight group");
  const [row] = await db
    .update(equipmentWeightGroup)
    .set(state)
    .where(and(eq(equipmentWeightGroup.id, id), eq(equipmentWeightGroup.userId, user.id)))
    .returning({ equipment: equipmentWeightGroup.equipment });
  if (!row) throw new Error("Weight group not found");
  refresh(row.equipment);
}

export type RemovedGroup = { equipment: string; group: WeightGroup };

/** Removes a weight group and returns it so the removal can be undone. */
export async function removeWeightGroup(id: number): Promise<RemovedGroup> {
  const { user } = await requireSession();
  const [r] = await db
    .delete(equipmentWeightGroup)
    .where(and(eq(equipmentWeightGroup.id, id), eq(equipmentWeightGroup.userId, user.id)))
    .returning();
  if (!r) throw new Error("Weight group not found");
  refresh(r.equipment);
  return { equipment: r.equipment, group: { id: r.id, name: r.name, type: r.type, start: r.start, step: r.step, top: r.top, weights: r.weights } };
}

/** Puts a removed weight group back, in its old position. */
export async function restoreWeightGroup({ equipment, group }: RemovedGroup) {
  const { user } = await requireSession();
  const state = cleanGroupState(group);
  if (!isWeighted(equipment) || !state) throw new Error("Invalid weight group");
  await db.insert(equipmentWeightGroup).values({ id: group.id, userId: user.id, equipment, ...state }).onConflictDoNothing();
  refresh(equipment);
}
