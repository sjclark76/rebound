import { Suspense } from "react";
import { ADJUSTABLE_EQUIPMENT, FIXED_EQUIPMENT, isFixed } from "@/db/vocab";
import { FixedWeights } from "@/components/settings/fixed-weights";
import { RangeEditor } from "@/components/settings/range-editor";
import { pageTitle, SettingsHeader, SettingsPage } from "@/components/settings/shell";
import { getOwnedWeights, getRanges } from "@/lib/equipment-data";
import { loadItem } from "../load-item";

export default function WeightsPage({ params }: PageProps<"/settings/equipment/[item]">) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-2xl bg-muted" />}>
      <Weights params={params} />
    </Suspense>
  );
}

async function Weights({ params }: Pick<PageProps<"/settings/equipment/[item]">, "params">) {
  const { item: slug } = await params;
  const { userId, item, label, section } = await loadItem(slug);
  const fixed = isFixed(item);
  const noun = fixed ? FIXED_EQUIPMENT[item].noun : "";
  const bowflex = item === "bowflex xtreme 2 se";
  return (
    <div className="flex flex-1 flex-col">
      <SettingsHeader href="/settings" label="Settings" />
      <SettingsPage>
        <div className="flex flex-col gap-1.5">
          <p className="text-base leading-5 font-bold text-muted-foreground">Equipment · {section}</p>
          <h1 className={pageTitle}>{fixed ? FIXED_EQUIPMENT[item].title : label}</h1>
          <p className="max-w-[560px] text-[17px] leading-[25px] text-muted-foreground">
            {bowflex
              ? "Tick each resistance you can set per side. Changes save as you go."
              : fixed
              ? `Tick each ${noun} you own, in the unit it's marked in. Changes save as you go.`
              : "Set the range they adjust through, in the unit they're marked in. Changes save as you go."}
          </p>
        </div>
        {fixed ? (
          <FixedWeights item={item} initial={await getOwnedWeights(userId, item)} note={bowflex ? "Ticked for the standard 210 lb of Power Rods. Add heavier weights if you have the 310 or 410 lb upgrade." : undefined} />
        ) : (
          <RangeEditor item={item} initial={(await getRanges(userId))[item] ?? { unit: "kg", ...ADJUSTABLE_EQUIPMENT[item].range.kg }} />
        )}
      </SettingsPage>
    </div>
  );
}
