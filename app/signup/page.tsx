"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignUpPage() {
  const [state, action, pending] = useActionState(signUp, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
      <div className="w-full max-w-sm px-4 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Create an account
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Start managing your tasks with Orin
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Your name
            </label>
            <Input id="name" name="name" type="text" autoComplete="name"
              placeholder="Sanjana" />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" name="email" type="email" autoComplete="email"
              required placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <Input id="password" name="password" type="password"
              autoComplete="new-password" required placeholder="••••••••" minLength={6} />
          </div>

          {state?.error && (
            <p className="text-sm text-[hsl(var(--destructive))]">{state.error}</p>
          )}
          {!state?.error && pending === false && state !== null && (
            <p className="text-sm text-[hsl(var(--primary))]">
              Check your email to confirm your account.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[hsl(var(--primary))] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
