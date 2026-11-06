"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CircleAlertIcon, MinusIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { cn } from "cn";
import { removeWeightGroup, updateWeightGroup } from "@/app/settings/actions";
import { equipmentSlug, WEIGHTED_EQUIPMENT, type WeightedEquipment, type WeightGroupType } from "@/db/vocab";
import {
  adjustRange,
  formatKg,
  groupTitle,
  groupWeights,
  parseWeight,
  pickedToRange,
  previewWeights,
  sharedWeights,
  type GroupState,
  type Range,
  type WeightGroup,
} from "@/lib/weights";
import { showUndo } from "./undo-toast";

const list = (ns: number[]) => (ns.length < 2 ? ns.map(formatKg).join("") : `${ns.slice(0, -1).map(formatKg).join(", ")} and ${formatKg(ns.at(-1)!)}`);
const RANGE_FIELDS = [
  ["start", "Start at"],
  ["step", "Go up by"],
  ["top", "Up to"],
] as const;

/** Edits one weight group. Every change saves straight away; a failed save reverts and says so. */
export function GroupEditor({ item, initial, others, id }: { item: WeightedEquipment; initial: GroupState; others: WeightGroup[]; id: number }) {
  const router = useRouter();
  const [g, setG] = useState<GroupState>(initial);
  const saved = useRef<GroupState>(initial);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [failed, setFailed] = useState<GroupState | null>(null);
  const [removing, startRemove] = useTransition();
  const [another, setAnother] = useState("");
  const [anotherError, setAnotherError] = useState(false);
  const [removeFailed, setRemoveFailed] = useState(false);
  const { presets, range: defaultRange } = WEIGHTED_EQUIPMENT[item];

  /** Shows the change now and saves it in order; on failure goes back to the last saved state. */
  function change(next: GroupState) {
    setG(next);
    setFailed(null);
    queue.current = queue.current.then(async () => {
      try {
        await updateWeightGroup(id, next);
        saved.current = next;
      } catch {
        setG(saved.current);
        setFailed(next);
      }
    });
  }

  const asRange = (): Range => ({ start: g.start!, step: g.step!, top: g.top! });
  const setType = (type: WeightGroupType) => {
    if (type === g.type) return;
    if (type === "picked") change({ ...g, type, start: null, step: null, top: null, weights: groupWeights({ id, ...g }) });
    else {
      const r = pickedToRange(g.weights) ?? defaultRange;
      change({ ...g, type, ...r, weights: [] });
    }
  };
  const toggleWeight = (w: number) =>
    change({ ...g, weights: g.weights.includes(w) ? g.weights.filter((x) => x !== w) : [...g.weights, w] });
  const addAnother = () => {
    const w = parseWeight(another);
    setAnotherError(w === null);
    if (w === null) return;
    setAnother("");
    if (!g.weights.includes(w)) change({ ...g, weights: [...g.weights, w] });
  };

  const weights = groupWeights({ id, ...g });
  const tiles = [...new Set([...presets, ...g.weights])].sort((a, b) => a - b);
  const shared = g.type === "picked" ? sharedWeights(g.weights, others) : { weights: [], groups: [] };

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

      <label className="flex flex-col gap-2">
        <span className="px-1 text-base leading-6 font-bold">
          Name <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <input
          defaultValue={g.name ?? ""}
          maxLength={40}
          onBlur={(e) => e.target.value.trim() !== (g.name ?? "") && change({ ...g, name: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="min-h-14 rounded-xl bg-card px-4 text-lg ring-[1.5px] ring-input outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <fieldset className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
        <legend className="sr-only">Kind of group</legend>
        {(["range", "picked"] as const).map((t) => (
          <label
            key={t}
            className={cn(
              "relative flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl text-base font-bold has-focus-visible:outline-2 has-focus-visible:outline-ring",
              g.type === t ? "bg-card text-foreground ring-1 ring-border" : "text-muted-foreground",
            )}
          >
            <input type="radio" name="type" checked={g.type === t} onChange={() => setType(t)} className="absolute inset-0 m-0 cursor-pointer opacity-0" />
            {g.type === t && <CheckIcon className="size-4" strokeWidth={3} aria-hidden />}
            {t === "range" ? "Range" : "Pick weights"}
          </label>
        ))}
      </fieldset>

      {g.type === "range" ? (
        <>
          <ul className="overflow-hidden rounded-[22px] bg-card ring-1 ring-border [&>li+li]:border-t">
            {RANGE_FIELDS.map(([field, label]) => {
              const r = asRange();
              const dec = adjustRange(r, field, -1)[field] === r[field];
              const inc = adjustRange(r, field, 1)[field] === r[field];
              return (
                <li key={field} className="flex min-h-20 items-center gap-3 py-3 pr-3 pl-4">
                  <span className="min-w-0 flex-1 text-[17px] leading-6 font-bold">{label}</span>
                  <span className="flex items-center gap-1.5">
                    <StepButton label={`Less ${label.toLowerCase()}`} disabled={dec} onClick={() => change({ ...g, ...adjustRange(r, field, -1) })}><MinusIcon className="size-6" aria-hidden /></StepButton>
                    <output aria-label={label} className="min-w-20 text-center font-heading text-[28px] leading-8 font-bold tracking-tight tabular-nums">
                      {formatKg(r[field])}<small className="ml-0.5 text-base tracking-normal"> kg</small>
                    </output>
                    <StepButton label={`More ${label.toLowerCase()}`} disabled={inc} onClick={() => change({ ...g, ...adjustRange(r, field, 1) })}><PlusIcon className="size-6" aria-hidden /></StepButton>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="rounded-[22px] bg-secondary p-4">
            <p className="text-[15px] leading-5 font-bold text-muted-foreground">In this group · {weights.length} {weights.length === 1 ? "weight" : "weights"}</p>
            <p className="mt-1 text-lg leading-7 font-bold tabular-nums">{previewWeights(weights)}</p>
          </div>
        </>
      ) : (
        <section className="flex flex-col gap-3" aria-labelledby="pick-h">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 id="pick-h" className="text-lg leading-6 font-bold">Tap the weights in this group</h2>
            <span className="text-[15px] leading-5 font-bold whitespace-nowrap text-muted-foreground">{g.weights.length} selected</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {tiles.map((w) => {
              const on = g.weights.includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleWeight(w)}
                  className={cn(
                    "flex min-h-14 items-center justify-center gap-1 rounded-xl bg-card px-1 text-base font-bold tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    on ? "bg-primary/10 text-primary ring-2 ring-primary" : "ring-[1.5px] ring-input",
                  )}
                >
                  {on && <CheckIcon className="size-4" strokeWidth={3} aria-hidden />}
                  {formatKg(w)} kg
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
                aria-label="Another weight in kg"
                aria-invalid={anotherError}
                aria-describedby={anotherError ? "another-err" : undefined}
                className="min-w-0 flex-1 bg-transparent text-lg font-normal text-foreground outline-none placeholder:text-muted-foreground"
              />
              kg
            </label>
            <button type="button" onClick={addAnother} className="flex min-h-14 items-center gap-2 rounded-xl bg-secondary px-5 text-base font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <PlusIcon className="size-5" aria-hidden />
              Add
            </button>
          </div>
          {anotherError && (
            <p id="another-err" role="alert" className="px-1 text-base leading-6 font-bold text-destructive">Enter a weight in whole or half kilos, like 32 or 2.5.</p>
          )}
          {shared.weights.length > 0 && (
            <p className="px-1 text-base leading-6 text-muted-foreground">
              {list(shared.weights)} kg {shared.weights.length > 1 ? "are" : "is"} already in {list2(shared.groups.map(groupTitle))}, so {shared.weights.length > 1 ? "they count" : "it counts"} once either way.
            </p>
          )}
        </section>
      )}

      <button
        type="button"
        disabled={removing}
        onClick={() =>
          startRemove(async () => {
            setRemoveFailed(false);
            try {
              showUndo(await removeWeightGroup(id));
            } catch {
              setRemoveFailed(true);
              return;
            }
            router.replace(`/settings/equipment/${equipmentSlug(item)}`);
          })
        }
        className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-card text-base font-bold text-destructive ring-[1.5px] ring-border outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        <Trash2Icon className="size-5" aria-hidden />
        Remove this group
      </button>
      {removeFailed && (
        <p role="alert" className="-mt-3 px-1 text-base leading-6 font-bold text-destructive">
          Couldn&apos;t remove the group. Check your connection and try again.
        </p>
      )}
    </div>
  );
}

const list2 = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

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
