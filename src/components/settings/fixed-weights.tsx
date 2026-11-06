"use client";

import { useRef, useState } from "react";
import { CheckIcon, CircleAlertIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import { cn } from "cn";
import { setWeightOwned } from "@/app/settings/actions";
import { FIXED_EQUIPMENT, type FixedEquipment, type Unit } from "@/db/vocab";
import { formatWeight, parseWeight, summariseOwned, tileWeights, type Weight } from "@/lib/weights";
import { UnitControl } from "./unit-control";

type Change = { weight: Weight; owned: boolean };

/** Tick the weights you own on a fixed item. The kg | lb switch only picks which unit's tiles show and which unit Add uses; ticked weights stay selected across both. Every change saves straight away; a failed save reverts and says so. */
export function FixedWeights({ item, initial, note }: { item: FixedEquipment; initial: Weight[]; note?: string }) {
  const [owned, setOwned] = useState(initial);
  // Open on the unit most of the weights are in (kg when it is a tie), so the ticked tiles are in view.
  const [view, setView] = useState<Unit>(() => (initial.filter((o) => o.unit === "lb").length > initial.filter((o) => o.unit === "kg").length ? "lb" : "kg"));
  const [failed, setFailed] = useState<Change | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [another, setAnother] = useState("");
  const [anotherError, setAnotherError] = useState(false);
  const presets = FIXED_EQUIPMENT[item].presets[view];

  const has = (w: Weight) => owned.some((o) => o.value === w.value && o.unit === w.unit);
  const without = (list: Weight[], w: Weight) => list.filter((o) => !(o.value === w.value && o.unit === w.unit));

  /** Shows the change now and saves it in order; if the save fails, undoes that one change. */
  function change({ weight, owned: on }: Change) {
    setFailed(null);
    setOwned((list) => (on ? [...without(list, weight), weight] : without(list, weight)));
    queue.current = queue.current.then(async () => {
      try {
        await setWeightOwned(item, weight.value, weight.unit, on);
      } catch {
        setOwned((list) => (on ? without(list, weight) : [...without(list, weight), weight]));
        setFailed({ weight, owned: on });
      }
    });
  }

  const addAnother = () => {
    const value = parseWeight(another, view);
    setAnotherError(value === null);
    if (value === null) return;
    setAnother("");
    const weight = { value, unit: view };
    if (!has(weight)) change({ weight, owned: true });
  };

  const tiles = tileWeights(presets, owned, view);
  const inView = owned.filter((o) => o.unit === view).length;

  return (
    <div className="flex flex-col gap-6 lg:max-w-[560px]">
      {failed && (
        <div className="flex flex-col gap-3 rounded-[22px] bg-destructive/10 p-4">
          <p role="alert" className="flex items-start gap-2.5 text-base leading-6">
            <CircleAlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
            <span><b className="text-destructive">Couldn&apos;t save that change.</b> It&apos;s been undone. Check your connection and try again.</span>
          </p>
          <button type="button" onClick={() => change(failed)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-card text-base font-bold ring-[1.5px] ring-input outline-none focus-visible:ring-ring">
            <RotateCcwIcon className="size-5" aria-hidden />
            Try again
          </button>
        </div>
      )}

      <div role="status" aria-live="polite" className="rounded-[22px] bg-secondary p-4">
        <p className="text-[15px] leading-5 font-bold text-muted-foreground">
          Selected · {owned.length} {owned.length === 1 ? "weight" : "weights"}
        </p>
        <p className="mt-1 font-heading text-[22px] leading-7 font-bold tracking-tight tabular-nums">{summariseOwned(owned) ?? "None yet"}</p>
      </div>

      <div className="flex flex-col gap-2">
        <UnitControl
          unit={view}
          onChange={setView}
          name="tile-unit"
          legend="Show tiles in"
          label="Show tiles in"
          describedBy="tile-unit-note"
          className="flex-col items-start gap-2 [&>span:first-of-type]:px-1 [&>span:first-of-type]:text-base [&>span:first-of-type]:text-foreground"
        />
        <p id="tile-unit-note" className="px-1 text-base leading-6 text-muted-foreground">Ticked weights stay selected when you switch.</p>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="pick-h">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 id="pick-h" className="text-lg leading-6 font-bold">Tap the weights you own</h2>
          <span className="text-[15px] leading-5 font-bold whitespace-nowrap text-muted-foreground">{inView} in {view}</span>
        </div>
        {note && <p className="px-1 text-base leading-6 text-muted-foreground">{note}</p>}
        <div className="grid grid-cols-4 gap-2">
          {tiles.map((value) => {
            const weight = { value, unit: view };
            const on = has(weight);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => change({ weight, owned: !on })}
                className={cn(
                  "flex min-h-14 items-center justify-center gap-1 rounded-xl bg-card px-1 text-base font-bold tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  on ? "bg-primary/10 text-primary ring-2 ring-primary" : "ring-[1.5px] ring-input",
                )}
              >
                {on && <CheckIcon className="size-4" strokeWidth={3} aria-hidden />}
                {formatWeight(value)} {view}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <label className="flex min-h-14 min-w-0 flex-1 items-center gap-1.5 rounded-xl bg-card px-3.5 font-bold text-muted-foreground ring-[1.5px] ring-input focus-within:ring-2 focus-within:ring-ring">
            <input
              value={another}
              onChange={(e) => setAnother(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAnother())}
              inputMode="decimal"
              placeholder="Another weight"
              aria-label={`Add a weight in ${view === "kg" ? "kilograms" : "pounds"}`}
              aria-invalid={anotherError}
              aria-describedby={anotherError ? "another-err" : undefined}
              className="min-w-0 flex-1 bg-transparent text-lg font-normal text-foreground outline-none placeholder:text-muted-foreground"
            />
            {view}
          </label>
          <button type="button" onClick={addAnother} className="flex min-h-14 items-center gap-2 rounded-xl bg-secondary px-5 text-base font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <PlusIcon className="size-5" aria-hidden />
            Add
          </button>
        </div>
        {anotherError && (
          <p id="another-err" role="alert" className="px-1 text-base leading-6 font-bold text-destructive">Enter a weight in whole or half {view === "kg" ? "kilos" : "pounds"}, like {view === "kg" ? "32" : "70"} or 2.5.</p>
        )}
      </section>
    </div>
  );
}
