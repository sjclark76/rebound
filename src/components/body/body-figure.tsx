"use client";

import { PauseIcon, WavesIcon } from "lucide-react";
import type { FineMuscle } from "@/db/vocab";
import figure from "@/lib/body-figure.json";
import { fatigueColor, muscleLabel, type Reading } from "@/lib/body";

// Outline and muscle shapes: react-muscle-highlighter (MIT, Copyright (c) 2024 My Muscle Contributors), regrouped
// into Rebound's muscles. Its licence is shipped at /licenses/react-muscle-highlighter.txt.
type Side = "front" | "back";
type Shapes = { muscles: Record<string, string>; neutral: string; ends: string; hair: string };
const DATA = figure as unknown as Record<Side, Shapes>;

/** Which data shape each muscle uses on each side, and the clip that splits shapes shared by two muscles (chest, delts, traps). */
const PARTS: Record<Side, Partial<Record<FineMuscle, [string, string?]>>> = {
  front: {
    neck: ["neck"], "upper traps": ["upperTraps"], "side delts": ["deltoids", "rbf-side"], "front delts": ["deltoids", "rbf-front"],
    "upper chest": ["chest", "rbf-up"], "lower chest": ["chest", "rbf-low"], biceps: ["biceps"], triceps: ["triceps"], forearms: ["forearms"],
    abdominals: ["abdominals"], obliques: ["obliques"], "hip flexors": ["hipFlexors"], adductors: ["adductors"], quadriceps: ["quads"], calves: ["calves"],
  },
  back: {
    neck: ["neck"], "upper traps": ["traps", "rbb-up"], "lower traps": ["traps", "rbb-low"], "side delts": ["deltoids", "rbb-side"], "rear delts": ["deltoids", "rbb-rear"],
    rhomboids: ["rhomboids"], lats: ["lats"], triceps: ["triceps"], forearms: ["forearms"], "lower back": ["lowerBack"], abductors: ["abductors"],
    glutes: ["glutes"], adductors: ["adductors"], hamstrings: ["hamstrings"], calves: ["calves"],
  },
};
/** Where a muscle's injury marker sits, in the figure's own units. */
const MARK: Record<Side, Partial<Record<FineMuscle, [number, number]>>> = {
  front: {
    neck: [350, 280], "upper traps": [304, 296], "side delts": [212, 345], "front delts": [252, 345], "upper chest": [307, 345], "lower chest": [307, 408], biceps: [202, 450],
    triceps: [228, 455], forearms: [170, 600], abdominals: [335, 520], obliques: [283, 500], "hip flexors": [312, 712], adductors: [318, 820], quadriceps: [272, 820], calves: [266, 1100],
  },
  back: {
    neck: [1050, 256], "upper traps": [1045, 340], "lower traps": [1062, 435], "side delts": [924, 350], "rear delts": [962, 350], rhomboids: [995, 370], lats: [1012, 500],
    triceps: [935, 460], forearms: [880, 610], "lower back": [1045, 590], abductors: [1014, 644], glutes: [1028, 710], adductors: [1055, 822], hamstrings: [1005, 870], calves: [990, 1060],
  },
};
/** The clip that splits the shared shapes (chest, deltoids, traps) between two muscles, and the line drawn along the cut. */
const CLIPS: Record<Side, { id: string; d: string }[]> = {
  front: [
    { id: "rbf-side", d: "M0,280 L245,280 C240,330 228,370 210,410 L0,410 Z M724,280 L479,280 C484,330 496,370 514,410 L724,410 Z" },
    { id: "rbf-front", d: "M245,280 C240,330 228,370 210,410 L362,410 L362,280 Z M479,280 C484,330 496,370 514,410 L362,410 L362,280 Z" },
    { id: "rbf-up", d: "M0,0 L362,0 L362,380 C330,372 290,360 255,340 L0,340 Z M724,0 L362,0 L362,380 C394,372 434,360 469,340 L724,340 Z" },
    { id: "rbf-low", d: "M0,340 L255,340 C290,360 330,372 362,380 L362,1448 L0,1448 Z M724,340 L469,340 C434,360 394,372 362,380 L362,1448 L724,1448 Z" },
  ],
  back: [
    { id: "rbb-up", d: "M724,0 L1448,0 L1448,370 L1172,370 C1132,385 1102,392 1086,395 C1070,392 1040,385 1000,370 L724,370 Z" },
    { id: "rbb-low", d: "M724,370 L1000,370 C1040,385 1070,392 1086,395 C1102,392 1132,385 1172,370 L1448,370 L1448,1448 L724,1448 Z" },
    { id: "rbb-side", d: "M724,280 L950,280 C946,330 940,370 928,410 L724,410 Z M1448,280 L1222,280 C1226,330 1232,370 1244,410 L1448,410 Z" },
    { id: "rbb-rear", d: "M950,280 C946,330 940,370 928,410 L1086,410 L1086,280 Z M1222,280 C1226,330 1232,370 1244,410 L1086,410 L1086,280 Z" },
  ],
};
const CUTS: Record<Side, string> = {
  front: "M245,280 C240,330 228,370 210,410 M479,280 C484,330 496,370 514,410 M362,380 C330,372 290,360 255,340 M362,380 C394,372 434,360 469,340",
  back: "M950,280 C946,330 940,370 928,410 M1222,280 C1226,330 1232,370 1244,410 M1000,370 C1040,385 1070,392 1086,395 C1102,392 1132,385 1172,370",
};

/** The side(s) a muscle can be tapped on. */
export const sidesOf = (m: FineMuscle): Side[] => (["front", "back"] as Side[]).filter((s) => PARTS[s][m]);

const fillOf = (r: Reading | undefined, skeleton: boolean) =>
  skeleton ? "var(--body-skeleton)" : !r ? "var(--fatigue-0)" : r.injury ? "var(--body-injured)" : fatigueColor(r.value ?? 0);

export function BodyFigure({
  side,
  readings,
  selected,
  onPick,
  skeleton = false,
  className,
}: {
  side: Side;
  readings: Reading[];
  selected: FineMuscle | null;
  onPick?: (m: FineMuscle) => void;
  skeleton?: boolean;
  className?: string;
}) {
  const data = DATA[side];
  const by = new Map(readings.map((r) => [r.muscle, r]));
  const x0 = side === "back" ? 724 : 0;
  const parts = PARTS[side];
  const sel = selected ? parts[selected] : undefined;
  const muscles = Object.keys(parts) as FineMuscle[];
  return (
    <div className={className} style={{ position: "relative", aspectRatio: "1 / 2" }}>
      <svg
        viewBox={`${x0} 0 724 1448`}
        role="img"
        aria-label={`Body map, ${side}. Every muscle is also in the list below.`}
        className={`block h-full w-full ${skeleton ? "animate-pulse" : ""}`}
      >
        <defs>
          {CLIPS[side].map((c) => (
            <clipPath key={c.id} id={c.id}>
              <path d={c.d} />
            </clipPath>
          ))}
        </defs>
        <path d={data.neutral} fill={skeleton ? "var(--body-skeleton)" : "var(--body-skin)"} />
        <path d={data.ends} fill={skeleton ? "var(--body-skeleton)" : "var(--body-skin)"} />
        <path d={data.hair} fill={skeleton ? "var(--body-skeleton)" : "var(--body-hair)"} />
        <g strokeLinejoin="round" style={{ cursor: onPick ? "pointer" : undefined }}>
          {muscles.map((m) => {
            const [shape, clip] = parts[m]!;
            return <path key={m} d={data.muscles[shape]} fill={fillOf(by.get(m), skeleton)} clipPath={clip ? `url(#${clip})` : undefined} onClick={() => onPick?.(m)}><title>{muscleLabel(m)}</title></path>;
          })}
        </g>
        <path d={CUTS[side]} stroke="var(--body-halo)" strokeWidth={7} strokeLinecap="round" fill="none" pointerEvents="none" />
        {sel && !skeleton && (
          <g fill="none" strokeLinejoin="round" pointerEvents="none" clipPath={sel[1] ? `url(#${sel[1]})` : undefined}>
            <path d={data.muscles[sel[0]]} stroke="var(--body-halo)" strokeWidth={7} />
            <path d={data.muscles[sel[0]]} stroke="var(--body-select)" strokeWidth={3.5} />
          </g>
        )}
      </svg>
      {!skeleton &&
        muscles.map((m) => {
          const r = by.get(m);
          const at = MARK[side][m];
          if (!r?.injury || !at) return null;
          const rest = r.injury === "rest";
          return (
            <span
              key={m}
              aria-hidden
              className={`pointer-events-none absolute grid size-6 place-items-center rounded-full border-2 bg-[var(--body-card)] ${rest ? "border-rest text-rest" : "border-rehab text-rehab"}`}
              style={{ left: `${((at[0] - x0) / 724) * 100}%`, top: `${(at[1] / 1448) * 100}%`, transform: "translate(-50%, -50%)" }}
            >
              {rest ? <PauseIcon className="size-3.5" strokeWidth={3} /> : <WavesIcon className="size-3.5" strokeWidth={2.6} />}
            </span>
          );
        })}
    </div>
  );
}
