import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeftIcon, ClockIcon, PlayIcon } from "lucide-react";
import { cn } from "cn";
import { ExerciseDetail } from "@/components/exercise-detail";
import { Button } from "@/components/ui/button";
import { startWorkout } from "@/app/workout/actions";
import { recoveryNote, restedPhrase, splitName, SPLITS } from "@/lib/generator";
import { requireSession } from "@/lib/session";
import { loadSuggestion, optionsQuery, parseOptions } from "@/lib/suggestion";
import { formatWeight } from "@/lib/weights";
import { Chips, lastTrainedText, list, pathHref, ExerciseRow, ScreenHeader, TypePicker } from "./suggestion-ui";

type Mode = "today" | "choose";

/** The Today's workout screen (the recommendation) and the Choose a workout screen (the same, with the type picker). */
export function SuggestedWorkoutPage({ mode, searchParams }: { mode: Mode; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title={mode === "today" ? "Today's workout" : "Choose a workout"} />
      <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-2xl bg-muted" />}>
        <SuggestedWorkout mode={mode} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SuggestedWorkout({ mode, searchParams }: { mode: Mode; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireSession();
  const today = new Date();
  const params = await searchParams;
  // The recommendation screen never carries a chosen type.
  const options = mode === "today" ? { ...parseOptions(params), split: undefined } : parseOptions(params);
  const path = mode === "today" ? "/today" : "/choose";
  const { suggestion, injuries, weights } = await loadSuggestion(user.id, today, options);
  // With a type chosen, the picker's way back is the type Rebound recommends.
  const recommended = mode === "choose" && options.split ? (await loadSuggestion(user.id, today, { ...options, split: undefined })).suggestion?.split : suggestion?.split;

  if (!suggestion && mode === "today") redirect(pathHref("/", options));

  const date = (weekday: "short" | "long", month: "short" | "long") => today.toLocaleDateString("en-GB", { weekday, day: "numeric", month });
  const kicker = (
    <p className="text-[15px] leading-5 font-bold text-muted-foreground">
      <span className="lg:hidden">{date("short", "short")}</span>
      <span className="hidden lg:inline">{date("long", "long")}</span>
    </p>
  );
  const resting = injuries.filter((i) => i.mode === "rest").map((i) => i.muscle);
  const rehab = injuries.filter((i) => i.mode === "rehab").map((i) => i.muscle);

  // Nothing safe for the type chosen: say so, and keep the picker so another can be tried.
  if (!suggestion) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-2 pb-8 lg:max-w-[560px] lg:pt-8">
        {kicker}
        <TypePicker options={options} selected={options.split ?? "upper-push"} recommended={recommended} />
        <p role="status" className="text-lg leading-[26px] text-muted-foreground">
          Nothing safe to suggest for {splitName(options.split ?? "upper-push").toLowerCase()} with your equipment and injuries. Try another type.
        </p>
        <Chips resting={resting} rehab={rehab} recovering={[]} />
      </main>
    );
  }

  const split = suggestion.split;
  const name = splitName(split);
  const main = suggestion.exercises.filter((e) => e.exercise.primaryMuscles[0] !== "abdominals" || split === "core");
  const core = split === "core" ? undefined : suggestion.exercises.find((e) => e.exercise.primaryMuscles[0] === "abdominals");
  const days = suggestion.lastTrainedDays;
  const note = options.split ? recoveryNote(split, days) : null;
  // Muscles still recovering that this type doesn't work, so the chip doesn't repeat the note.
  const recoveringChip = suggestion.recovering.filter((m) => !(options.split && (SPLITS[split] as string[]).includes(m)));
  const why = [
    options.split
      ? `You chose ${name.toLowerCase()} today.${split === "core" ? " Abdominals and lower back only." : ""}`
      : `${restedPhrase(split)} are the most rested.`,
    resting.length > 0 && `Nothing here loads your ${list(resting)}.`,
    rehab.length > 0 && `Your ${list(rehab)} only ${rehab.length > 1 ? "help" : "helps"} out, never leads.`,
  ].filter(Boolean);

  // Phones show the selected exercise as its own screen; wide screens always show one beside the list.
  const requested = typeof params.exercise === "string" ? params.exercise : undefined;
  const selected = suggestion.exercises.find((e) => e.exercise.id === requested);
  const detail = selected ?? suggestion.exercises[0];
  const detailIndex = main.indexOf(detail);
  const onDetail = selected ? "max-lg:hidden" : "";
  const weightOf = (id: string) => weights[id];
  const detailWeight = weightOf(detail.exercise.id);

  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-2",
        selected ? "pb-6" : "pb-0",
        "lg:grid lg:max-w-[1200px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] lg:grid-rows-[auto_auto_auto_1fr] lg:items-start lg:gap-x-8 lg:gap-y-6 lg:px-8 lg:pt-6 lg:pb-12",
      )}
    >
      <section aria-label="Session" className={cn("flex flex-col gap-6 lg:col-start-1 lg:row-start-1", onDetail)}>
        <Link
          href="/"
          className="-ml-3 hidden min-h-12 items-center gap-1 self-start rounded-xl pr-3 pl-1 text-base font-bold text-primary outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 lg:inline-flex"
        >
          <ChevronLeftIcon className="size-6" aria-hidden />
          Home
        </Link>
        <div className="flex flex-col gap-1">
          {kicker}
          <h1 className="font-heading text-[44px] leading-12 font-bold tracking-tight lg:text-7xl lg:leading-[72px]">{name}</h1>
          <p className="text-base text-muted-foreground">{lastTrainedText(days)}</p>
        </div>
        <p className="text-lg leading-[26px]">{why.join(" ")}</p>
        <Chips resting={resting} rehab={rehab} recovering={recoveringChip} stack />
        {options.bodyweightOnly && (
          <p className="text-base text-muted-foreground">
            Bodyweight only today.{" "}
            <Link href={pathHref(path, { ...options, bodyweightOnly: false })} className="font-bold text-primary underline-offset-4 hover:underline">
              Use my equipment
            </Link>
          </p>
        )}
      </section>

      <section aria-label="Exercises" className={cn("flex flex-col gap-3 lg:col-start-2 lg:row-span-4 lg:row-start-1", onDetail)}>
        {mode === "choose" && (
          <div className="mb-3 flex flex-col gap-3">
            <TypePicker options={options} selected={split} recommended={recommended} />
            {note && (
              <p role="status" className="flex items-center gap-2.5 rounded-xl bg-secondary px-3.5 py-3 text-base leading-6 font-bold">
                <ClockIcon className="size-5 shrink-0" aria-hidden />
                {note}
              </p>
            )}
          </div>
        )}
        <h2 className="font-heading text-lg font-bold">
          {main.length} exercise{main.length === 1 ? "" : "s"}
        </h2>
        <ol className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border dark:shadow-none">
          {main.map((e, i) => (
            <li key={e.exercise.id} className="border-t first:border-t-0">
              <ExerciseRow href={pathHref(path, options, e.exercise.id)} number={i + 1} item={e} weight={weightOf(e.exercise.id)} current={e === detail} />
            </li>
          ))}
        </ol>
        {core && (
          <>
            <h2 className="mt-3 font-heading text-lg font-bold">Core finisher</h2>
            <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border dark:shadow-none">
              <ExerciseRow href={pathHref(path, options, core.exercise.id)} item={core} weight={weightOf(core.exercise.id)} current={core === detail} />
            </div>
          </>
        )}
      </section>

      <div
        className={cn(
          "sticky bottom-0 -mx-4 border-t bg-background px-4 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(22,33,29,0.08)] dark:shadow-none",
          "lg:static lg:col-start-1 lg:row-start-2 lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none",
          onDetail,
        )}
      >
        <form action={startWorkout.bind(null, Object.fromEntries(new URLSearchParams(optionsQuery(options))))}>
          <Button type="submit" className="h-16 w-full rounded-xl font-heading text-xl font-bold">
            <PlayIcon className="size-5.5 fill-current" aria-hidden />
            Start workout
          </Button>
        </form>
      </div>

      <div className={cn("lg:col-start-3 lg:row-span-4 lg:row-start-1", !selected && "max-lg:hidden")}>
        <ExerciseDetail
          exercise={detail.exercise}
          dose={`${detail.sets} × ${detail.reps}${detail.exercise.force === "static" ? " s" : ""}${detailWeight ? ` · ${formatWeight(detailWeight.value)} ${detailWeight.unit}` : ""}`}
          context={detailIndex >= 0 ? `Exercise ${detailIndex + 1} of ${main.length} · ${name}` : `Core finisher · ${name}`}
          backHref={pathHref(path, options)}
        />
      </div>
    </main>
  );
}

