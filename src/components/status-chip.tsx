import { ClockIcon, PauseIcon, WavesIcon } from "lucide-react";
import { cn } from "cn";

const STYLES = {
  rest: { box: "bg-rest-muted text-rest-foreground", icon: "text-rest", Icon: PauseIcon },
  rehab: { box: "bg-rehab-muted text-rehab-foreground", icon: "text-rehab", Icon: WavesIcon },
  recovering: { box: "bg-secondary text-secondary-foreground", icon: "", Icon: ClockIcon },
};

/** A pill naming a training state. Always icon plus words, never colour alone. */
export function StatusChip({
  kind,
  children,
  className,
}: {
  kind: keyof typeof STYLES;
  children: React.ReactNode;
  className?: string;
}) {
  const { box, icon, Icon } = STYLES[kind];
  return (
    <span
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-[15px] leading-5 font-bold",
        box,
        className,
      )}
    >
      <Icon className={cn("size-5", icon)} aria-hidden />
      {children}
    </span>
  );
}
