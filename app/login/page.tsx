"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithGoogle, signInAsGuest } from "@/app/actions/auth";


function LoginPageInner() {
  const [googlePending, setGooglePending] = useState(false);
  const [guestPending, setGuestPending]   = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const pending = googlePending || guestPending;

  // Lock body scroll so mobile browsers can't rubber-band the auth screen.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { html: html.style.overflow, body: body.style.overflow };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => { html.style.overflow = prev.html; body.style.overflow = prev.body; };
  }, []);

  const buttonClasses =
    "w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-[10px] " +
    "border-[0.5px] border-black/10 bg-white text-xs font-medium text-foreground " +
    "cursor-pointer transition-colors duration-150 hover:border-black/25 " +
    "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-black/10";

  return (
    <div className="fixed inset-0 overflow-hidden flex items-center justify-center">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />

      <div className="relative z-10 w-full max-w-[360px] px-6">
        <div className="bg-white/[0.82] backdrop-blur-md border-[0.5px] border-white/90 rounded-xs shadow-[0_8px_32px_rgba(0,0,0,0.12)] px-7 pt-9 pb-7">

          <div className="text-center mb-7">
            <div className="flex justify-center mb-3.5">
              <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" rx="22" fill="#02382a" />
                <circle cx="50" cy="41" r="18" fill="#059669" />
                <circle cx="50" cy="59" r="18" fill="#59d10b" />
              </svg>
            </div>
            <h1 className="text-[22px] font-medium tracking-[-0.03em] text-foreground mt-0 mb-2">
              Welcome to orin
            </h1>
            <p className="text-xs text-[#3d5a4a] leading-relaxed m-0">
              Your personal space to manage tasks,<br />track energy, and understand yourself better.
            </p>
          </div>

          {error && (
            <div className="px-3.5 py-2.5 rounded-lg bg-[#FFF0EC] border-[0.5px] border-[#d14626]/20 mb-4">
              <p className="m-0 text-[11px] text-[#D14626]">{decodeURIComponent(error)}</p>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <form action={signInWithGoogle} onSubmit={() => setGooglePending(true)}>
              <button type="submit" disabled={pending} className={buttonClasses}>
                {googlePending ? (
                  <svg
                    width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="#059669" strokeWidth="2.5" strokeLinecap="round"
                    className="animate-spin"
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01a4.8 4.8 0 0 1-7.18-2.53H1.83v2.07A8 8 0 0 0 8.98 17z" />
                    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
                    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z" />
                  </svg>
                )}
                {googlePending ? "Redirecting…" : "Continue with Google"}
              </button>
            </form>

            <form action={signInAsGuest} onSubmit={() => setGuestPending(true)}>
              <button type="submit" disabled={pending} className={buttonClasses}>
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#4a6d47" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                {guestPending ? "Starting…" : "Continue as guest"}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-muted-foreground leading-snug mt-5">
            Guest sessions are temporary.<br />Login with Google to save your data.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginPageInner /></Suspense>;
}
