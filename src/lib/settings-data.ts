import { eq } from "drizzle-orm";
import { db } from "@/db";
import { equipmentUnit } from "@/db/schema";
import { isUnit, type Unit } from "@/db/vocab";

/** The unit of the Bowflex, if the user has changed it. Everything else is kg. */
export async function getUnits(userId: string): Promise<Record<string, Unit>> {
  const rows = await db.select().from(equipmentUnit).where(eq(equipmentUnit.userId, userId));
  return Object.fromEntries(rows.map((r) => [r.equipment, r.unit]));
}

/** The unit for the Bowflex; kg when it has no setting, and for every other exercise (their weights carry their own unit). */
export const unitOf = (units: Record<string, Unit>, equipment: string | null): Unit => {
  const u = equipment ? units[equipment] : undefined;
  return isUnit(u) ? u : "kg";
};
