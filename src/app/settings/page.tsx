import { Suspense } from "react";
import { EquipmentList } from "@/components/settings/equipment-list";
import { pageTitle, SettingsHeader, SettingsPage } from "@/components/settings/shell";
import { getGear } from "@/lib/equipment-data";
import { requireSession } from "@/lib/session";

export default function Settings() {
  return (
    <div className="flex flex-1 flex-col">
      <SettingsHeader href="/" label="Today" />
      <SettingsPage>
        <h1 className={pageTitle}>Settings</h1>
        <section className="flex flex-col gap-6" aria-labelledby="equipment-h">
          <div className="flex flex-col gap-1.5">
            <h2 id="equipment-h" className="font-heading text-[22px] leading-7 font-bold tracking-tight">Equipment</h2>
            <p className="max-w-[560px] text-[17px] leading-[25px] text-muted-foreground">
              Switch on what you own. Changes save as you go and apply from your next suggested workout.
            </p>
          </div>
          <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
            <Equipment />
          </Suspense>
        </section>
      </SettingsPage>
    </div>
  );
}

async function Equipment() {
  const { user } = await requireSession();
  const { owned, weights, ranges } = await getGear(user.id);
  return <EquipmentList owned={owned} weights={weights} ranges={ranges} />;
}
