import { cn } from "cn";

/** The rebound curve and ball, drawn in a 64-unit box. Shared with the PNG app icons. */
export const MARK_CURVE = "M13 20c5 22 13 30 20 30s11-8 13-17";
export const MARK_BALL = { cx: 48, cy: 17, r: 6.5 };

/** Rebound mark: a dip and rise with the ball on its way back up, on a primary tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-16", className)}>
      <rect width="64" height="64" rx="16" className="fill-primary" />
      <path
        d={MARK_CURVE}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
      <circle {...MARK_BALL} className="fill-brand-apricot dark:fill-primary-foreground" />
    </svg>
  );
}
