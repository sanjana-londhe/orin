"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithGoogle, signInAsGuest } from "@/app/actions/auth";


function LoginPageInner() {
  const [googlePending, setGooglePending] = useState(false);
  const [guestPending, setGuestPending]   = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div style={{ height:"100vh", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit", position:"relative" }}>
      <div style={{ position:"fixed", inset:0, zIndex:0, backgroundImage:"url('/login-bg.jpg')", backgroundSize:"cover", backgroundPosition:"center" }} />
      <div style={{ width:"100%", maxWidth:360, padding:"0 24px", position:"relative", zIndex:1 }}>
        <div style={{ background:"rgba(255,255,255,0.82)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", borderRadius:16, border:"0.5px solid rgba(255,255,255,0.9)", boxShadow:"0 8px 32px rgba(0,0,0,0.12)", padding:"36px 28px 28px" }}>

          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
              <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" rx="22" fill="#02382a"/>
                <circle cx="50" cy="41" r="18" fill="#059669"/>
                <circle cx="50" cy="59" r="18" fill="#59d10b"/>
              </svg>
            </div>
            <h1 style={{ fontSize:24, fontWeight:500, letterSpacing:"-0.03em", color:"#082d1d", margin:"0 0 8px" }}>Welcome to orin</h1>
            <p style={{ fontSize:13, color:"#3d5a4a", margin:0, lineHeight:1.6 }}>
              Your personal space to manage tasks,<br/>track energy, and understand yourself better.
            </p>
          </div>

          {error && (
            <div style={{ padding:"10px 14px", borderRadius:8, background:"#FFF0EC", border:"0.5px solid rgba(209,70,38,0.2)", marginBottom:16 }}>
              <p style={{ margin:0, fontSize:12.5, color:"#D14626" }}>{decodeURIComponent(error)}</p>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <form action={signInWithGoogle} onSubmit={() => setGooglePending(true)}>
              <button type="submit" disabled={googlePending||guestPending} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:"12px 20px", borderRadius:10, border:"0.5px solid rgba(0,0,0,0.12)", background:"#fff", fontSize:14, fontWeight:500, color:"#082d1d", cursor:"pointer", fontFamily:"inherit", transition:"border-color 0.14s", opacity:googlePending||guestPending?0.6:1 }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(0,0,0,0.25)"}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(0,0,0,0.12)"}}>
                {googlePending ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" style={{animation:"spin 0.8s linear infinite"}}>
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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

            <form action={signInAsGuest} onSubmit={() => setGuestPending(true)}>
              <button type="submit" disabled={googlePending||guestPending} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:"12px 20px", borderRadius:10, border:"0.5px solid rgba(0,0,0,0.12)", background:"#fff", fontSize:14, fontWeight:500, color:"#082d1d", cursor:"pointer", fontFamily:"inherit", transition:"border-color 0.14s", opacity:googlePending||guestPending?0.6:1 }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(0,0,0,0.25)"}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(0,0,0,0.12)"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6d47" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
                {guestPending ? "Starting…" : "Continue as guest"}
              </button>
            </form>
          </div>

          <p style={{ textAlign:"center", fontSize: 11, color:"#4a6d47", marginTop:20, lineHeight:1.5 }}>
            Guest sessions are temporary.<br/>Login with Google to save your data.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginPageInner /></Suspense>;
}
