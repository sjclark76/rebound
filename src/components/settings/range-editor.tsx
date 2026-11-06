"use client";

import { useRef, useState } from "react";
import { CircleAlertIcon, MinusIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import { saveRange } from "@/app/settings/actions";
import type { AdjustableEquipment } from "@/db/vocab";
import { adjustRange, expandRange, formatWeight, previewWeights, relabelRange, type AdjustableRange, type Range } from "@/lib/weights";
import { UnitControl } from "./unit-control";

const RANGE_FIELDS = [
  ["start", "Start at"],
  ["top", "Up to"],
  ["step", "Step"],
] as const;

/** The one range an adjustable item adjusts through. Every change saves straight away; a failed save reverts and says so. */
export function RangeEditor({ item, initial }: { item: AdjustableEquipment; initial: AdjustableRange }) {
  const [g, setG] = useState(initial);
  const saved = useRef(initial);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [failed, setFailed] = useState<AdjustableRange | null>(null);
  const { unit } = g;

  /** Shows the change now and saves it in order; on failure goes back to the last saved state. */
  function change(next: AdjustableRange) {
    setG(next);
    setFailed(null);
    queue.current = queue.current.then(async () => {
      try {
        await saveRange(item, next);
        saved.current = next;
      } catch {
        setG(saved.current);
        setFailed(next);
      }
    });
  }

  const r: Range = { start: g.start, step: g.step, top: g.top };
  const weights = expandRange(g.start, g.step, g.top);

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

      <UnitControl
        unit={unit}
        onChange={(to) => change(relabelRange(g, to))}
        name="range-unit"
        legend="Unit"
        label="Unit"
        className="flex-col items-start gap-2 [&>span:first-of-type]:px-1 [&>span:first-of-type]:text-base [&>span:first-of-type]:text-foreground"
      />

      <ul className="overflow-hidden rounded-[22px] bg-card ring-1 ring-border [&>li+li]:border-t">
        {RANGE_FIELDS.map(([field, label]) => {
          const dec = adjustRange(r, field, -1, unit)[field] === r[field];
          const inc = adjustRange(r, field, 1, unit)[field] === r[field];
          return (
            <li key={field} className="flex min-h-20 items-center gap-3 py-3 pr-3 pl-4">
              <span className="min-w-0 flex-1 text-[17px] leading-6 font-bold">{label}</span>
              <span className="flex items-center gap-1.5">
                <StepButton label={`Less ${label.toLowerCase()}`} disabled={dec} onClick={() => change({ ...g, ...adjustRange(r, field, -1, unit) })}><MinusIcon className="size-6" aria-hidden /></StepButton>
                <output aria-label={label} className="min-w-20 text-center font-heading text-[28px] leading-8 font-bold tracking-tight tabular-nums">
                  {formatWeight(r[field])}<small className="ml-0.5 text-base tracking-normal"> {unit}</small>
                </output>
                <StepButton label={`More ${label.toLowerCase()}`} disabled={inc} onClick={() => change({ ...g, ...adjustRange(r, field, 1, unit) })}><PlusIcon className="size-6" aria-hidden /></StepButton>
              </span>
            </li>
          );
        })}
      </ul>
      {unit === "lb" && <p className="-mt-3 px-1 text-base leading-6 text-muted-foreground">Steps are whole pounds or 2.5 lb.</p>}

      <div role="status" className="rounded-[22px] bg-secondary p-4">
        <p className="text-[15px] leading-5 font-bold text-muted-foreground">This range makes {weights.length} {weights.length === 1 ? "weight" : "weights"}</p>
        <p className="mt-1 text-lg leading-7 font-bold tabular-nums">{previewWeights(weights, unit)}</p>
      </div>
    </div>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-14 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-45"
    >
      {children}
    </button>
  );
}
