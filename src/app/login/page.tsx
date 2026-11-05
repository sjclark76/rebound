"use client";

import { useState } from "react";
import { LogoMark } from "@/components/logo-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const isDev = process.env.NODE_ENV !== "production";

/** Dev-only: signs in, creating the account on first use. */
function DevLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const signIn = await authClient.signIn.email({ email, password });
    if (!signIn.error) {
      window.location.href = "/";
      return;
    }
    const signUp = await authClient.signUp.email({ email, password, name: email.split("@")[0] });
    if (signUp.error) setError(signUp.error.message ?? "Sign-in failed");
    else window.location.href = "/";
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-2.5">
      <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        Dev sign-in
        <span className="h-px flex-1 bg-border" />
      </div>
      <Input
        className="h-12 px-4 text-base md:text-base"
        type="email"
        placeholder="Email"
        aria-label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        className="h-12 px-4 text-base md:text-base"
        type="password"
        placeholder="Password (min 8 chars)"
        aria-label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="h-12 w-full text-base" variant="secondary" type="submit">
        Sign in
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-4 pt-[env(safe-area-inset-top)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
        <LogoMark className="size-22" />
        <h1 className="font-heading text-[2.5rem] leading-11 font-bold tracking-tight">Rebound</h1>
        <p className="max-w-70 text-lg text-muted-foreground">
          Train around it. Come back stronger.
        </p>
      </div>
      <Button
        className="h-16 w-full rounded-2xl text-lg font-bold"
        onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
      >
        Continue with Google
      </Button>
      {isDev && <DevLogin />}
    </main>
  );
}
