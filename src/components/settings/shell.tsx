import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { cn } from "cn";

/** The settings screens' top bar: a back link and nothing else. */
export function SettingsHeader({ href, label }: { href: string; label: string }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-md items-center pt-[env(safe-area-inset-top)] pr-2 pl-2 lg:h-18 lg:max-w-[1200px] lg:px-6">
        <Link
          href={href}
          className="inline-flex min-h-12 items-center gap-1 rounded-xl pr-3 pl-1 text-base font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronLeftIcon className="size-6" aria-hidden />
          {label}
        </Link>
      </div>
    </header>
  );
}

export function SettingsPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={cn("mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-10 lg:max-w-[1200px] lg:px-8 lg:pt-6 lg:pb-16", className)}>
      {children}
    </main>
  );
}

export const pageTitle = "font-heading text-[30px] leading-9 font-bold tracking-tight lg:text-[40px] lg:leading-11";
/** The card that holds a list of rows. */
export const cardList = "overflow-hidden rounded-[22px] bg-card ring-1 ring-border [&>li+li]:border-t";
