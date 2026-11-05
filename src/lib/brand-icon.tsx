import { ImageResponse } from "next/og";
import { MARK_BALL, MARK_CURVE } from "@/components/logo-mark";

/**
 * Renders the Rebound app icon as a PNG at the given size. The tile is full-bleed so the
 * OS can apply its own mask; the mark stays inside the maskable safe zone.
 */
export function brandIcon(size: number) {
  const mark = size * 0.8;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1d6b56",
        }}
      >
        <svg width={mark} height={mark} viewBox="0 0 64 64">
          <path d={MARK_CURVE} fill="none" stroke="#f5f3ee" strokeWidth="6" strokeLinecap="round" />
          <circle {...MARK_BALL} fill="#e8894f" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
