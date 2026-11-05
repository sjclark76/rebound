"use client";

import { useState, useTransition } from "react";
import { HistoryIcon, Trash2Icon, XIcon } from "lucide-react";
import { discardWorkout, dismissNotice } from "@/app/workout/actions";
import { ConfirmSheet } from "./parts";

/** One-time notice that an old workout was closed for the user. */
export function AutoClosedNotice({ workoutId, text }: { workoutId: number; text: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-3 lg:max-w-[1200px] lg:px-8">
      <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border lg:max-w-[560px]">
        <p className="flex items-center gap-3 text-base leading-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary">
            <HistoryIcon className="size-5 text-primary" aria-hidden />
          </span>
          {text}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => dismissNotice(workoutId))}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-secondary font-bold"
        >
          <XIcon className="size-5" aria-hidden />
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function DiscardButton({ workoutId, sets }: { workoutId: number; sets: number }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-destructive font-bold text-destructive"
      >
        <Trash2Icon className="size-5" aria-hidden />
        Discard workout
      </button>
      <ConfirmSheet
        open={open}
        onOpenChange={setOpen}
        title="Discard this workout?"
        body={`The ${sets} sets you logged are deleted and today goes back to not started. This can't be undone.`}
        confirmLabel="Discard workout"
        confirmIcon={<Trash2Icon className="size-5" aria-hidden />}
        destructive
        cancelLabel="Keep it"
        pending={pending}
        onConfirm={() => start(() => discardWorkout(workoutId))}
      />
    </>
  );
}
