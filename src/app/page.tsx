import { Suspense } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rebound</h1>
        <SignOutButton />
      </header>
      <Suspense fallback={<Card className="h-32 animate-pulse" />}>
        <Greeting />
      </Suspense>
    </main>
  );
}

async function Greeting() {
  const { user } = await requireSession();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hi {user.name.split(" ")[0]}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        Your next workout will appear here once equipment and injuries are set up.
      </CardContent>
    </Card>
  );
}
