import Link from "next/link";
import { ChartNoAxesColumnIcon, ChevronRightIcon, Grid2x2Icon, PlusIcon } from "lucide-react";
import { equipmentSlug } from "@/db/vocab";
import { pageTitle, SettingsHeader, SettingsPage } from "@/components/settings/shell";
import { getWeightGroups } from "@/lib/equipment-data";
import { describeGroups, groupTitle, groupWeights, unionWeights } from "@/lib/weights";
import { loadItem } from "../load-item";

export default async function WeightGroups({ params }: PageProps<"/settings/equipment/[item]">) {
  const { item: slug } = await params;
  const { userId, item, label, section } = await loadItem(slug);
  const groups = await getWeightGroups(userId, item);
  const total = unionWeights(groups).length;
  const base = `/settings/equipment/${equipmentSlug(item)}`;
  return (
    <div className="flex flex-1 flex-col">
      <SettingsHeader href="/settings" label="Settings" />
      <SettingsPage>
        <div className="flex flex-col gap-1.5">
          <p className="text-base leading-5 font-bold text-muted-foreground">Equipment · {section}</p>
          <h1 className={pageTitle}>{label} weights</h1>
          <p className="max-w-[560px] text-[17px] leading-[25px] text-muted-foreground">
            Add a weight group for each kind you own. Suggestions use every weight across your groups. Changes save as you go.
          </p>
        </div>
        <div className="flex flex-col gap-6 lg:max-w-[560px]">
          <div className="rounded-[22px] bg-secondary p-4">
            <p className="text-[15px] leading-5 font-bold text-muted-foreground">
              All your {label.toLowerCase()} weights · {total}
            </p>
            <p className="mt-1 font-heading text-[22px] leading-7 font-bold tracking-tight tabular-nums">{describeGroups(groups) ?? "None yet"}</p>
          </div>
          <section className="flex flex-col gap-3" aria-labelledby="groups-h">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 id="groups-h" className="font-heading text-lg leading-6 font-bold tracking-tight">Weight groups</h2>
              <span className="text-[15px] leading-5 font-bold text-muted-foreground">
                {groups.length} {groups.length === 1 ? "group" : "groups"}
              </span>
            </div>
            {groups.length > 0 && (
              <ul className="flex flex-col gap-3">
                {groups.map((g) => {
                  const Icon = g.type === "range" ? ChartNoAxesColumnIcon : Grid2x2Icon;
                  return (
                    <li key={g.id}>
                      <Link
                        href={`${base}/${g.id}`}
                        className="flex min-h-16 items-center gap-3 rounded-[22px] bg-card py-3 pr-3 pl-4 ring-1 ring-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-lg leading-6 font-bold">{groupTitle(g)}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-base leading-6 text-muted-foreground tabular-nums">
                            <Icon className="size-4 shrink-0" aria-hidden />
                            {g.type === "range"
                              ? `Range · ${describeGroups([g])}`
                              : `Picked · ${groupWeights(g).length > 0 ? describeGroups([g]) : "no weights yet"}`}
                          </span>
                        </span>
                        <ChevronRightIcon className="size-6 shrink-0 text-muted-foreground" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              href={`${base}/new`}
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-secondary text-base font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <PlusIcon className="size-5" aria-hidden />
              Add a weight group
            </Link>
            <p className="px-1 text-base leading-6 text-muted-foreground">A weight in more than one group counts once.</p>
          </section>
        </div>
      </SettingsPage>
    </div>
  );
}
