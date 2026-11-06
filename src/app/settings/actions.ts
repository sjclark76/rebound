"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { equipmentRange, equipmentUnit, equipmentWeight, userEquipment } from "@/db/schema";
import { ADJUSTABLE_EQUIPMENT, EQUIPMENT, equipmentSlug, hasUnit, isAdjustable, isFixed, isUnit, WEIGHT_BOUNDS, type Unit } from "@/db/vocab";
import { requireSession } from "@/lib/session";
import { cleanRange, type AdjustableRange } from "@/lib/weights";

const refresh = (equipment?: string) => {
  revalidatePath("/settings");
  revalidatePath("/");
  if (equipment) revalidatePath(`/settings/equipment/${equipmentSlug(equipment)}`, "layout");
};

/** Switches an equipment item on or off. Off keeps its weights. Switching an adjustable item on gives it its default range if it has none. "body only" is always allowed, so it isn't stored. */
export async function setEquipment(equipment: string, on: boolean) {
  const { user } = await requireSession();
  if (!(EQUIPMENT as readonly string[]).includes(equipment) || equipment === "body only") throw new Error("Unknown equipment");
  if (on) {
    await db.insert(userEquipment).values({ userId: user.id, equipment }).onConflictDoNothing();
    if (isAdjustable(equipment)) await db.insert(equipmentRange).values({ userId: user.id, equipment, unit: "kg", ...ADJUSTABLE_EQUIPMENT[equipment].range.kg }).onConflictDoNothing();
  } else await db.delete(userEquipment).where(and(eq(userEquipment.userId, user.id), eq(userEquipment.equipment, equipment)));
  refresh(equipment);
}

/** Ticks or unticks one weight on a fixed item, in the unit it is marked in. */
export async function setWeightOwned(equipment: string, weight: number, unit: Unit, owned: boolean) {
  const { user } = await requireSession();
  const { min, max } = isUnit(unit) ? WEIGHT_BOUNDS[unit] : { min: 1, max: 0 };
  if (!isFixed(equipment) || !(weight >= min && weight <= max && (weight * 2) % 1 === 0)) throw new Error("Can't add that weight");
  if (owned) await db.insert(equipmentWeight).values({ userId: user.id, equipment, weight, unit }).onConflictDoNothing();
  else
    await db
      .delete(equipmentWeight)
      .where(and(eq(equipmentWeight.userId, user.id), eq(equipmentWeight.equipment, equipment), eq(equipmentWeight.weight, weight), eq(equipmentWeight.unit, unit)));
  refresh(equipment);
}

/** Saves the range of an adjustable item. */
export async function saveRange(equipment: string, input: AdjustableRange) {
  const { user } = await requireSession();
  const range = cleanRange(input);
  if (!isAdjustable(equipment) || !range) throw new Error("Invalid range");
  await db
    .insert(equipmentRange)
    .values({ userId: user.id, equipment, ...range })
    .onConflictDoUpdate({ target: [equipmentRange.userId, equipmentRange.equipment], set: range });
  refresh(equipment);
}

/** Sets the Bowflex's unit. Converts nothing, because every saved weight carries its own unit. */
export async function setEquipmentUnit(equipment: string, unit: Unit) {
  const { user } = await requireSession();
  if (!isUnit(unit) || !hasUnit(equipment)) throw new Error("Can't set a unit for that");
  await db
    .insert(equipmentUnit)
    .values({ userId: user.id, equipment, unit })
    .onConflictDoUpdate({ target: [equipmentUnit.userId, equipmentUnit.equipment], set: { unit } });
  refresh(equipment);
}
