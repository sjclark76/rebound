import { equipmentSlug } from "@/db/vocab";
import { NewGroupForm } from "@/components/settings/new-group-form";
import { pageTitle, SettingsHeader, SettingsPage } from "@/components/settings/shell";
import { loadItem } from "../../load-item";

export default async function NewWeightGroup({ params }: PageProps<"/settings/equipment/[item]/new">) {
  const { item: slug } = await params;
  const { item, label } = await loadItem(slug);
  return (
    <div className="flex flex-1 flex-col">
      <SettingsHeader href={`/settings/equipment/${equipmentSlug(item)}`} label={`${label} weights`} />
      <SettingsPage>
        <div className="flex flex-col gap-1.5">
          <p className="text-base leading-5 font-bold text-muted-foreground">{label} weights</p>
          <h1 className={pageTitle}>Add a weight group</h1>
        </div>
        <NewGroupForm item={item} label={label} />
      </SettingsPage>
    </div>
  );
}
