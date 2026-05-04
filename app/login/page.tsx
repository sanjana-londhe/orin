"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, signInWithGoogle } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null);
  const [googlePending, setGooglePending] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
      <div className="w-full max-w-sm px-4 space-y-5">
        <div className="space-y-2 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="22" fill="#02382a"/>
              <circle cx="50" cy="41" r="18" fill="#059669"/>
              <circle cx="50" cy="59" r="18" fill="#59d10b"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Welcome back
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Sign in to Orin
          </p>
        </div>

        {/* Google sign-in */}
        <form action={signInWithGoogle} onSubmit={() => setGooglePending(true)}>
          <button
            type="submit"
            disabled={googlePending}
            className="w-full flex items-center justify-center gap-3 rounded-[8px] border-[1.5px] border-[var(--stone-400)] bg-white px-4 py-3 text-[13.5px] font-semibold text-[var(--lime-ink)] transition-all hover:border-[var(--ink)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googlePending ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01a4.8 4.8 0 0 1-7.18-2.53H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
              </svg>
            )}
            {googlePending ? "Redirecting…" : "Continue with Google"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--stone-300)]" />
          <span className="text-[11px] text-[var(--stone-500)]">or</span>
          <div className="flex-1 h-px bg-[var(--stone-300)]" />
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
