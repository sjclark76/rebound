"use client";

import { useEffect, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreWeightGroup, type RemovedGroup } from "@/app/settings/actions";
import { groupTitle } from "@/lib/weights";

// A tiny store so a removal on the edit screen can show its undo toast on the list screen it returns to.
let current: RemovedGroup | null = null;
const listeners = new Set<() => void>();
const set = (next: RemovedGroup | null) => {
  current = next;
  listeners.forEach((l) => l());
};
export const showUndo = (removed: RemovedGroup) => set(removed);

const TOAST_MS = 8000;

export function UndoToast() {
  const removed = useSyncExternalStore(
    (l) => (listeners.add(l), () => void listeners.delete(l)),
    () => current,
    () => null,
  );
  const router = useRouter();
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!removed) return;
    const t = setTimeout(() => set(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [removed]);

  if (!removed) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-foreground py-2 pr-2 pl-4 text-background shadow-lg"
    >
      <p className="min-w-0 flex-1 text-base leading-6 font-bold">Removed {groupTitle(removed.group)}.</p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await restoreWeightGroup(removed);
            set(null);
            router.refresh();
          })
        }
        className="min-h-12 rounded-xl px-4 text-base font-bold underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-background/60 disabled:opacity-50"
      >
        Undo
      </button>
    </div>
  );
}
