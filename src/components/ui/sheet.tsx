"use client";

import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { cn } from "cn";

/** A bottom sheet on phones, a centred dialog on wide screens. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  closeButton = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  closeButton?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed z-50 flex flex-col gap-3 bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-card-foreground shadow-xl outline-none transition-transform",
            "inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-3xl data-ending-style:translate-y-full data-starting-style:translate-y-full",
            "lg:inset-auto lg:top-1/2 lg:left-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl lg:data-ending-style:translate-y-[-40%] lg:data-starting-style:translate-y-[-40%]",
          )}
        >
          <span className="mx-auto h-1 w-10 rounded-full bg-border lg:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="font-heading text-2xl font-bold">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="text-base leading-6 text-muted-foreground">{description}</Dialog.Description>
              )}
            </div>
            {closeButton && (
              <Dialog.Close aria-label="Close" className="grid size-12 shrink-0 place-items-center rounded-full">
                <XIcon className="size-6" aria-hidden />
              </Dialog.Close>
            )}
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
