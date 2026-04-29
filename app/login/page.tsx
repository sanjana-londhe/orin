"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
      <div className="w-full max-w-sm px-4 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Welcome back
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Sign in to your Orin account
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" name="email" type="email" autoComplete="email"
              required placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <Input id="password" name="password" type="password"
              autoComplete="current-password" required placeholder="••••••••" />
          </div>

          {state?.error && (
            <p className="text-sm text-[hsl(var(--destructive))]">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
          No account?{" "}
          <Link href="/signup" className="font-medium text-[hsl(var(--primary))] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
