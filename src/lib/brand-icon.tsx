import { ImageResponse } from "next/og";

/** Renders the Rebound app icon as a PNG at the given size. */
export function brandIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#a3e635",
          fontSize: size * 0.6,
          fontWeight: 800,
        }}
      >
        R
      </div>
    ),
    { width: size, height: size },
  );
}
