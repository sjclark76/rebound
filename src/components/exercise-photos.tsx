"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "cn";

const PHOTO_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const LABELS = ["Start", "Finish"];

function Photo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-muted lg:rounded-xl", className)}>
      <Image src={PHOTO_BASE + src} alt={alt} fill sizes="(max-width: 448px) 100vw, 416px" className="object-contain" />
    </div>
  );
}

/**
 * The catalogue's start and finish photos: one at a time with a toggle on phones,
 * side by side on wide screens.
 */
export function ExercisePhotos({ images, name }: { images: string[]; name: string }) {
  const [shown, setShown] = useState(0);
  const photos = images.slice(0, LABELS.length);
  const alt = (i: number) => `${name}: ${LABELS[i].toLowerCase()} position`;

  if (!photos.length) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-1.5 rounded-2xl bg-muted text-[15px] text-muted-foreground lg:h-50">
        <ImageIcon className="size-7" aria-hidden />
        No photo for this exercise
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2 lg:hidden">
        <Photo src={photos[shown]} alt={alt(shown)} className="h-56" />
        {photos.length > 1 && (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={shown === i}
                onClick={() => setShown(i)}
                className={cn(
                  "min-h-12 rounded-xl border bg-card text-[15px] font-bold",
                  shown === i ? "border-2 border-primary" : "border-input",
                )}
              >
                {LABELS[i]}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="hidden grid-cols-2 gap-3 lg:grid">
        {photos.map((src, i) => (
          <Photo key={i} src={src} alt={alt(i)} className="h-50" />
        ))}
      </div>
    </>
  );
}
