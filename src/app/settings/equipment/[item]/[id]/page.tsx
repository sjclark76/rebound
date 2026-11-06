import { notFound } from "next/navigation";
import { equipmentSlug } from "@/db/vocab";
import { GroupEditor } from "@/components/settings/group-editor";
import { pageTitle, SettingsHeader, SettingsPage } from "@/components/settings/shell";
import { getWeightGroup, getWeightGroups } from "@/lib/equipment-data";
import { groupTitle } from "@/lib/weights";
import { loadItem } from "../../load-item";

export default async function EditWeightGroup({ params }: PageProps<"/settings/equipment/[item]/[id]">) {
  const { item: slug, id: rawId } = await params;
  const { userId, item, label } = await loadItem(slug);
  const id = Number(rawId);
  const found = Number.isInteger(id) ? await getWeightGroup(userId, id) : null;
  if (!found || found.equipment !== item) notFound();
  const all = await getWeightGroups(userId, item);
  const { group } = found;
  const initial = { name: group.name, type: group.type, start: group.start, step: group.step, top: group.top, weights: group.weights };
  return (
    <div className="flex flex-1 flex-col">
      <SettingsHeader href={`/settings/equipment/${equipmentSlug(item)}`} label={`${label} weights`} />
      <SettingsPage>
        <div className="flex flex-col gap-1.5">
          <p className="text-base leading-5 font-bold text-muted-foreground">
            {label} weights · Group {all.findIndex((g) => g.id === id) + 1} of {all.length}
          </p>
          <h1 className={pageTitle}>{groupTitle(group)}</h1>
        </div>
        <GroupEditor key={id} item={item} id={id} initial={initial} others={all.filter((g) => g.id !== id)} />
      </SettingsPage>
    </div>
  );
}
