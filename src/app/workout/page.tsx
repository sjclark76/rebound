import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WorkoutClient } from "@/components/workout/workout-client";
import { splitName } from "@/lib/generator";
import { requireSession } from "@/lib/session";
import { getActiveWorkout, getInjuryChips } from "@/lib/workout-data";

export default function WorkoutPage() {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-2xl bg-muted" />}>
      <Workout />
    </Suspense>
  );
}

async function Workout() {
  const { user } = await requireSession();
  const [w, chips, jar] = await Promise.all([getActiveWorkout(user.id), getInjuryChips(user.id), cookies()]);
  if (!w) redirect("/");
  const now = new Date();
  return (
    <WorkoutClient
      workoutId={w.id}
      split={splitName(w.split).toLowerCase()}
      dateLabel={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
      startedLabel={w.startedAt.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}
      minutes={Math.max(0, Math.round((now.getTime() - w.startedAt.getTime()) / 60_000))}
      plan={w.plan}
      sets={w.sets}
      chips={chips}
      initialView={jar.get("rebound-view")?.value === "list" ? "list" : "focused"}
    />
  );
}
