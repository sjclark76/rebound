import Link from "next/link";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, SettingsIcon } from "lucide-react";
import { cn } from "cn";
import { LogoMark } from "@/components/logo-mark";
import { SignOutButton } from "@/components/sign-out-button";
import { StatusChip } from "@/components/status-chip";
import { EQUIPMENT, equipmentLabel, type Equipment } from "@/db/vocab";
import { SPLIT_NAMES, TYPE_ORDER, type Split } from "@/lib/generator";
import { optionsQuery, type SuggestionOptions } from "@/lib/suggestion";
import { formatWeight, type Weight } from "@/lib/weights";

export const capitalise = (s: string) => s[0].toUpperCase() + s.slice(1);
export const list = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
export const isEquipment = (e: string): e is Equipment => (EQUIPMENT as readonly string[]).includes(e);

/** A link to one of the suggestion screens (home, today, choose) that keeps the options and, optionally, selects an exercise. */
export function pathHref(path: string, options: SuggestionOptions, exercise?: string) {
  const q = new URLSearchParams(optionsQuery(options));
  if (exercise) q.set("exercise", exercise);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

export const lastTrainedText = (days: number | null) =>
  days === null ? "Not trained this week" : days === 0 ? "Last trained today" : days === 1 ? "Last trained yesterday" : `Last trained ${days} days ago`;

/** "5 exercises and a core finisher". */
export const sizeText = (exercises: number, finisher: boolean) =>
  `${exercises} exercise${exercises === 1 ? "" : "s"}${finisher ? " and a core finisher" : ""}`;

/** The logo bar: settings and sign out. */
export function AppHeader({ className }: { className?: string }) {
  return (
    <header className={cn("lg:border-b", className)}>
      <div className="mx-auto flex h-16 max-w-md items-center justify-between pt-[env(safe-area-inset-top)] pr-2 pl-4 lg:h-18 lg:max-w-[1200px] lg:px-8">
        <span className="flex items-center gap-2 lg:gap-2.5">
          <LogoMark className="size-7 lg:size-8" />
          <span className="font-heading text-[22px] font-bold tracking-tight lg:text-2xl">rebound</span>
        </span>
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            aria-label="Settings"
            className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl px-3 text-[15px] font-bold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <SettingsIcon className="size-6" aria-hidden />
            <span className="hidden lg:inline">Settings</span>
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

/** The phone top bar of the Today's workout and Choose a workout screens: back to home, and the screen's name. Wide screens show the logo bar instead. */
export function ScreenHeader({ title, href = "/" }: { title: string; href?: string }) {
  return (
    <>
      <header className="lg:hidden">
        <div className="mx-auto flex h-16 max-w-md items-center gap-1 pt-[env(safe-area-inset-top)] pr-4 pl-2">
          <Link
            href={href}
            aria-label="Back to home"
            className="grid size-12 place-items-center rounded-xl outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronLeftIcon className="size-6" aria-hidden />
          </Link>
          <span className="font-heading text-xl font-bold">{title}</span>
        </div>
      </header>
      <AppHeader className="max-lg:hidden" />
    </>
  );
}

export function Chips({
  resting,
  rehab,
  recovering,
  stack = false,
}: {
  resting: string[];
  rehab: string[];
  recovering: string[];
  stack?: boolean;
}) {
  if (!resting.length && !rehab.length && !recovering.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", stack && "lg:flex-col lg:items-start")}>
      {resting.map((m) => (
        <StatusChip key={m} kind="rest">{capitalise(m)} · resting</StatusChip>
      ))}
      {rehab.map((m) => (
        <StatusChip key={m} kind="rehab">{capitalise(m)} · rehab</StatusChip>
      ))}
      {recovering.length > 0 && <StatusChip kind="recovering">Recovering: {recovering.join(", ")}</StatusChip>}
    </div>
  );
}

export function EmptyState({
  kicker,
  icon,
  iconClass = "bg-secondary",
  title,
  body,
  chips,
  actions,
}: {
  kicker: React.ReactNode;
  icon: React.ReactNode;
  iconClass?: string;
  title: string;
  body: string;
  chips?: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-2 pb-[max(1.75rem,env(safe-area-inset-bottom))] lg:max-w-[1200px] lg:items-center lg:px-8 lg:py-16">
      <div className="flex flex-1 flex-col lg:w-full lg:max-w-[560px] lg:flex-none lg:gap-4 lg:rounded-3xl lg:bg-card lg:p-10 lg:shadow-sm lg:ring-1 lg:ring-border lg:dark:shadow-none">
        {kicker}
        <div className="flex flex-1 flex-col justify-center gap-4 py-8 lg:py-0">
          <span className={cn("grid size-16 place-items-center rounded-full", iconClass)}>{icon}</span>
          <h1 className="font-heading text-3xl font-bold tracking-tight lg:text-[40px] lg:leading-11">{title}</h1>
          <p className="text-lg leading-[26px] text-muted-foreground">{body}</p>
          {chips}
        </div>
        <div className="lg:mt-2 lg:flex lg:gap-3">{actions}</div>
      </div>
    </main>
  );
}

export function BigLink({ href, children, secondary = false }: { href: string; children: React.ReactNode; secondary?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-16 items-center justify-center gap-2 rounded-xl px-4 font-heading text-xl font-bold lg:flex-1 lg:whitespace-nowrap lg:px-3 lg:text-lg",
        secondary ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground",
      )}
    >
      {children}
    </Link>
  );
}

type Item = { exercise: { name: string; equipment: string | null; force: string | null }; sets: number; reps: string };

export function ExerciseRow({ href, number, item, weight, current }: { href: string; number?: number; item: Item; weight?: Weight; current: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "true" : undefined}
      className="group flex min-h-18 items-center gap-3 py-3 pr-3 pl-4 hover:bg-muted/50 lg:aria-[current]:bg-accent"
    >
      {number !== undefined && (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary font-heading text-base font-bold tabular-nums lg:group-aria-[current]:bg-accent-foreground lg:group-aria-[current]:text-accent">
          {number}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-lg leading-6 font-bold">{item.exercise.name}</span>
        <span className="text-[15px] leading-5 text-muted-foreground tabular-nums">
          {item.sets} × {item.reps}{item.exercise.force === "static" ? " s" : ""} ·{" "}
          {weight && <><b className="font-bold text-foreground">{formatWeight(weight.value)} {weight.unit}</b> · </>}
          {item.exercise.equipment && isEquipment(item.exercise.equipment) ? equipmentLabel(item.exercise.equipment) : capitalise(item.exercise.equipment ?? "body only")}
        </span>
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

/** The six workout types as a 3 × 2 grid of links. The selected one is filled with a check, so it is not colour alone. Once another type than the recommended one is chosen, "Back to" returns to it. */
export function TypePicker({ options, selected, recommended }: { options: SuggestionOptions; selected: Split; recommended: Split | undefined }) {
  return (
    <section aria-labelledby="type-h" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="type-h" className="font-heading text-lg font-bold">Workout type</h2>
        {options.split && recommended && options.split !== recommended && (
          <Link href={pathHref("/choose", { ...options, split: undefined })} className="text-base font-bold text-primary underline-offset-4 hover:underline">
            Back to {SPLIT_NAMES[recommended]}
          </Link>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TYPE_ORDER.map((t) => {
          const on = t === selected;
          return (
            <Link
              key={t}
              href={pathHref("/choose", { ...options, split: t })}
              aria-current={on ? "true" : undefined}
              className={cn(
                "flex min-h-12 items-center justify-center gap-1 rounded-xl px-1 text-center font-bold outline-none lg:whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                on ? "bg-primary text-primary-foreground" : "border-[1.5px] border-input bg-card",
              )}
            >
              {on && <CheckIcon className="size-4 shrink-0" strokeWidth={3} aria-hidden />}
              {SPLIT_NAMES[t]}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
