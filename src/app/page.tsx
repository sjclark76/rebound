import { Suspense } from "react";
import { PauseIcon } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { loadSuggestion } from "@/lib/suggestion";

const SPLIT_NAMES = { push: "Push", pull: "Pull", legs: "Legs" };

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <span className="font-heading text-lg font-bold">Rebound</span>
        <SignOutButton />
      </header>
      <Suspense fallback={<Card className="h-96 animate-pulse" />}>
        <TodaysWorkout />
      </Suspense>
    </main>
  );
}

const capitalise = (s: string) => s[0].toUpperCase() + s.slice(1);

async function TodaysWorkout() {
  const { user } = await requireSession();
  const today = new Date();
  const { suggestion, injuries, hasEquipment } = await loadSuggestion(user.id, today);

  if (!suggestion) {
    return (
      <Card>
        <CardContent className="text-base text-muted-foreground">
          {hasEquipment
            ? "No safe workout fits today. Check your injuries or add equipment."
            : "Add the equipment you own to get your first workout."}
        </CardContent>
      </Card>
    );
  }

  const date = today.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const resting = injuries.filter((i) => i.mode === "rest");

  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className="text-sm text-muted-foreground">
          {date} · {SPLIT_NAMES[suggestion.split]}
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Today&apos;s workout</h1>
      </div>

      {resting.map((i) => (
        <div key={i.muscle} className="rounded-2xl border-[1.5px] border-rest bg-card p-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <strong className="text-base">{capitalise(i.muscle)}</strong>
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-rest-muted px-2.5 text-sm font-bold text-rest-foreground">
              <PauseIcon className="size-3.5" aria-hidden />
              Resting
            </span>
          </div>
          <p className="text-base">
            Nothing that loads your {i.muscle} today{i.notes ? ` (${i.notes})` : ""}.
          </p>
        </div>
      ))}

      {suggestion.recovering.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Recovering from recent training: {suggestion.recovering.join(", ")}.
        </p>
      )}

      <ol className="overflow-hidden rounded-2xl border bg-card">
        {suggestion.exercises.map(({ exercise, sets, reps }, i) => (
          <li key={exercise.id} className="border-b last:border-b-0">
            <details className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted font-heading text-sm font-bold">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-lg leading-6 font-semibold">{exercise.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {sets} × {reps} · {exercise.equipment ?? "body only"}
                  </span>
                </span>
              </summary>
              <ol className="list-decimal space-y-2 px-4 pb-4 pl-14 text-base text-muted-foreground">
                {exercise.instructions.map((step, j) => (
                  <li key={j}>{step}</li>
                ))}
              </ol>
            </details>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted-foreground">Tap an exercise for instructions.</p>
    </section>
  );
}
