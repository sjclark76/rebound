import { notFound, redirect } from "next/navigation";
import { EQUIPMENT_GROUPS, equipmentLabel, weightsItemFromSlug } from "@/db/vocab";
import { getOwnedEquipment } from "@/lib/equipment-data";
import { requireSession } from "@/lib/session";

/** Resolves a weights page's equipment from its URL: 404 if it has no weights page, back to settings if it's switched off. */
export async function loadItem(slug: string) {
  const item = weightsItemFromSlug(slug);
  if (!item) notFound();
  const { user } = await requireSession();
  if (!(await getOwnedEquipment(user.id)).includes(item)) redirect("/settings");
  const section = EQUIPMENT_GROUPS.find((g) => (g.items as readonly string[]).includes(item))?.name ?? "";
  return { userId: user.id, item, label: equipmentLabel(item), section };
}
