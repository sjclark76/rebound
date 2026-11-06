"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon, ChevronRightIcon, CircleAlertIcon, InfoIcon, RotateCcwIcon } from "lucide-react";
import { cn } from "cn";
import { EQUIPMENT_GROUPS, equipmentLabel, equipmentSlug, isWeighted, type Equipment } from "@/db/vocab";
import { setEquipment } from "@/app/settings/actions";
import { describeGroups, summariseGroups, type WeightGroup } from "@/lib/weights";
import { cardList } from "./shell";

type Failed = { to: boolean };

/** A copy of the set with the item added or removed. */
const with_ = (s: Set<string>, item: string, present: boolean) => {
  const next = new Set(s);
  if (present) next.add(item);
  else next.delete(item);
  return next;
};

/** Switch on what you own. Each switch saves straight away and reverts, with an error under its row, if the save fails. */
export function EquipmentList({ owned, groups }: { owned: string[]; groups: Record<string, WeightGroup[]> }) {
  const [on, setOn] = useState(() => new Set(owned));
  const [failed, setFailed] = useState<Partial<Record<Equipment, Failed>>>({});

  async function toggle(item: Equipment, to: boolean) {
    setFailed({}); // an error clears on the next toggle
    setOn((s) => with_(s, item, to));
    try {
      await setEquipment(item, to);
    } catch {
      setOn((s) => with_(s, item, !to));
      setFailed({ [item]: { to } });
    }
  }

  return (
    <>
      {on.size === 0 && (
        <p role="status" className="flex items-center gap-3 rounded-[22px] bg-card p-4 text-[17px] leading-[25px] font-bold ring-1 ring-border">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-primary">
            <InfoIcon className="size-5" aria-hidden />
          </span>
          Nothing selected: workouts will be bodyweight only.
        </p>
      )}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] lg:items-start">
        {EQUIPMENT_GROUPS.map((group) => (
          <section key={group.name} className="flex flex-col gap-3" aria-labelledby={`g-${group.name}`}>
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h3 id={`g-${group.name}`} className="font-heading text-lg leading-6 font-bold tracking-tight">{group.name}</h3>
              <span className="text-[15px] leading-5 font-bold text-muted-foreground tabular-nums">
                {group.items.filter((i) => on.has(i)).length} of {group.items.length} on
              </span>
            </div>
            <ul className={cardList}>
              {group.items.map((item) => (
                <Row
                  key={item}
                  item={item}
                  on={on.has(item)}
                  groups={groups[item] ?? []}
                  failed={failed[item]}
                  onToggle={(to) => toggle(item, to)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function Row({ item, on, groups, failed, onToggle }: { item: Equipment; on: boolean; groups: WeightGroup[]; failed?: Failed; onToggle: (to: boolean) => void }) {
  const label = equipmentLabel(item);
  const errId = `err-${equipmentSlug(item)}`;
  const summary = summariseGroups(groups);
  return (
    <li className={cn(failed && "bg-destructive/10")}>
      <label className="flex min-h-16 cursor-pointer items-center gap-3 px-4 py-2 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ring">
        <span className="min-w-0 flex-1 text-lg leading-6 font-bold">{label}</span>
        <span aria-hidden className={cn("text-[15px] leading-5 font-bold", on ? "text-primary" : "text-muted-foreground")}>{on ? "On" : "Off"}</span>
        <span className={cn("relative block h-8 w-[52px] shrink-0 rounded-full border-2", on ? "border-primary bg-primary" : "border-input")}>
          <input
            type="checkbox"
            role="switch"
            checked={on}
            onChange={(e) => onToggle(e.target.checked)}
            aria-label={label}
            aria-describedby={failed ? errId : undefined}
            className="absolute inset-0 m-0 cursor-pointer opacity-0"
          />
          <span
            className={cn(
              "pointer-events-none absolute grid place-items-center rounded-full",
              on ? "top-0.5 left-[22px] size-6 bg-primary-foreground text-primary" : "top-1 left-1 size-5 bg-input",
            )}
          >
            {on && <CheckIcon className="size-4" strokeWidth={3} aria-hidden />}
          </span>
        </span>
      </label>
      {on && isWeighted(item) && (
        <Link
          href={`/settings/equipment/${equipmentSlug(item)}`}
          aria-label={`${label} weights: ${describeGroups(groups) ?? "none yet"}`}
          className="mx-4 -mt-1 mb-3 flex min-h-12 items-center gap-2 rounded-xl bg-muted pr-2.5 pl-3.5 text-[15px] leading-5 font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {summary ? (
            <>
              <span className="text-muted-foreground">Weights</span>
              <span className="min-w-0 flex-1 tabular-nums">{summary}</span>
              <ChevronRightIcon className="size-5 text-muted-foreground" aria-hidden />
            </>
          ) : (
            <>
              <span className="flex-1 text-primary">Add weights</span>
              <ChevronRightIcon className="size-5 text-primary" aria-hidden />
            </>
          )}
        </Link>
      )}
      {failed && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          <p id={errId} role="alert" className="flex items-start gap-2.5 text-base leading-6">
            <CircleAlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
            <span>
              <b className="text-destructive">Couldn&apos;t save {label}.</b> It&apos;s still {failed.to ? "off" : "on"}. Check your connection and try again.
            </span>
          </p>
          <button
            type="button"
            onClick={() => onToggle(failed.to)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-card text-base font-bold ring-[1.5px] ring-input outline-none focus-visible:ring-ring"
          >
            <RotateCcwIcon className="size-5" aria-hidden />
            Try again
          </button>
        </div>
      )}
    </li>
  );
}
