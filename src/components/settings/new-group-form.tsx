"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChartNoAxesColumnIcon, CheckIcon, Grid2x2Icon } from "lucide-react";
import { cn } from "cn";
import { createWeightGroup } from "@/app/settings/actions";
import { equipmentSlug, WEIGHTED_EQUIPMENT, type WeightedEquipment, type WeightGroupType } from "@/db/vocab";
import { describeGroups } from "@/lib/weights";

const hintFor = (item: WeightedEquipment, label: string) => {
  const r = WEIGHTED_EQUIPMENT[item].range;
  const range = describeGroups([{ id: 0, name: null, type: "range", ...r, weights: [] }]);
  return {
    range: `Evenly spaced, like an adjustable ${label.toLowerCase().replace(/s$/, "")}: ${range}`,
    picked: `Individual weights, like a rack of fixed ${label.toLowerCase()}`,
  };
};

/** Choose the kind of weight group and an optional name, then carry on to edit it. */
export function NewGroupForm({ item, label }: { item: WeightedEquipment; label: string }) {
  const router = useRouter();
  const [type, setType] = useState<WeightGroupType>("range");
  const [name, setName] = useState("");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const hints = hintFor(item, label);
  const options = [
    { value: "range", title: "Range", Icon: ChartNoAxesColumnIcon },
    { value: "picked", title: "Pick weights", Icon: Grid2x2Icon },
  ] as const;

  const next = () =>
    start(async () => {
      setError(false);
      try {
        const id = await createWeightGroup(item, type, name);
        router.push(`/settings/equipment/${equipmentSlug(item)}/${id}`);
      } catch {
        setError(true);
      }
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      className="flex flex-1 flex-col"
    >
      <div className="flex flex-col gap-6 lg:max-w-[560px]">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 px-1 text-lg leading-6 font-bold">What kind of group?</legend>
          {options.map(({ value, title, Icon }) => (
            <label
              key={value}
              className={cn(
                "relative flex cursor-pointer items-center gap-4 rounded-[22px] bg-card p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                type === value ? "ring-2 ring-primary" : "ring-[1.5px] ring-input",
              )}
            >
              <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} className="absolute inset-0 m-0 cursor-pointer opacity-0" />
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg leading-6 font-bold">{title}</span>
                <span className="mt-0.5 block text-base leading-6 text-muted-foreground">{hints[value]}</span>
              </span>
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", type === value ? "bg-primary text-primary-foreground" : "ring-2 ring-input")}>
                {type === value && <CheckIcon className="size-4" strokeWidth={3} aria-hidden />}
              </span>
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-2">
          <span className="px-1 text-base leading-6 font-bold">
            Name <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder={`e.g. ${type === "range" ? "Adjustable" : "Fixed"} ${label.toLowerCase()}`}
            className="min-h-14 rounded-xl bg-card px-4 text-lg ring-[1.5px] ring-input outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {error && (
          <p role="alert" className="text-base leading-6 font-bold text-destructive">
            Couldn&apos;t add the group. Check your connection and try again.
          </p>
        )}
      </div>
      <div className="sticky bottom-0 mt-auto -mx-4 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:pb-0">
        <button
          type="submit"
          disabled={pending}
          className="min-h-16 w-full rounded-xl bg-primary px-4 font-heading text-xl font-bold text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 lg:w-auto lg:min-w-56"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
