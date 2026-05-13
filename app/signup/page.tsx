"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signInWithGoogle } from "@/app/actions/auth";

export default function SignUpPage() {
  const [googlePending, setGooglePending] = useState(false);

  // Lock body scroll so mobile browsers can't rubber-band the auth screen.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { html: html.style.overflow, body: body.style.overflow };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => { html.style.overflow = prev.html; body.style.overflow = prev.body; };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f8f9f5", fontFamily: "inherit",
    }}>
      <div style={{ width: "100%", maxWidth: 360, padding: "0 24px" }}>

        {/* Logo + heading */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <svg width="52" height="52" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="22" fill="#02382a"/>
              <circle cx="50" cy="41" r="18" fill="#059669"/>
              <circle cx="50" cy="59" r="18" fill="#59d10b"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.03em", color: "#082d1d", margin: "0 0 6px" }}>
            Create your account
          </h1>
          <p style={{ fontSize: 12, color: "#4a6d47", margin: 0 }}>
            Start tracking tasks and energy with orin
          </p>
        </div>

        {/* Google sign-up */}
        <form action={signInWithGoogle} onSubmit={() => setGooglePending(true)}>
          <button
            type="submit"
            disabled={googlePending}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "13px 20px", borderRadius: 10,
              border: "0.5px solid rgba(0,0,0,0.12)", background: "#fff",
              fontSize: 12, fontWeight: 500, color: "#082d1d",
              cursor: "pointer", fontFamily: "inherit",
              transition: "border-color 0.14s",
              opacity: googlePending ? 0.6 : 1,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.25)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.12)"; }}
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
            {googlePending ? "Redirecting…" : "Sign up with Google"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 11, color: "#4a6d47", marginTop: 28 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#059669", fontWeight: 500, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
