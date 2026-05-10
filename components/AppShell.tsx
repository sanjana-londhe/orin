"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { AIPanel } from "@/components/AIPanel";
import { ProfileModal } from "@/components/ProfileModal";
import {
  EnergyCheckInModal, loadEnergyStore, saveEnergyStore,
  todayKey, type CheckIn,
} from "@/components/EnergyCheckInModal";
import { Sparkles, Zap, User } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { signOut, signInWithGoogle } from "@/app/actions/auth";

interface Props {
  userName: string;
  email: string;
  initial: string;
  isGuest?: boolean;
  children: React.ReactNode;
}

export function AppShell({ userName, email, initial, isGuest = false, children }: Props) {
  const [aiOpen, setAiOpen]   = useState(false);
  const isMobile              = useIsMobile();
  const pathname              = usePathname();

  // Mobile user state (profile + energy — desktop handled by Sidebar)
  const [showMenu, setShowMenu]           = useState(false);
  const [profileOpen, setProfileOpen]     = useState(false);
  const [energyOpen, setEnergyOpen]       = useState(false);
  const [currentName, setCurrentName]     = useState(userName);
  const [avatarSrc, setAvatarSrc]         = useState<string | null>(null);

  const avatarContent = avatarSrc
    ? <img src={avatarSrc} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    : (currentName.charAt(0) || initial).toUpperCase();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#fcfdfc" }}>
      <Sidebar userName={userName} email={email} initial={initial} isGuest={isGuest} />

      {/* ── Mobile top bar ── */}
      {isMobile && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          height: 52,
          background: "#f8f9f5",
          borderBottom: "1.5px solid #dde4de",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px",
        }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <svg width="26" height="26" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="22" fill="#02382a"/>
              <circle cx="50" cy="41" r="18" fill="#059669"/>
              <circle cx="50" cy="59" r="18" fill="#59d10b"/>
            </svg>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em", color: "#082d1d" }}>orin</span>
          </Link>

          {/* Right side: Orin Insight + profile avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setAiOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 4,
                background: "#082d1d", color: "#fff",
                border: "none", cursor: "pointer",
                fontSize: 12.5, fontWeight: 600,
                boxShadow: "0 4px 16px rgba(5,150,105,0.25)",
                letterSpacing: "-0.01em", whiteSpace: "nowrap",
              }}
            >
              <Sparkles size={12} color="#59d10b" />
              Orin Insight
            </button>

            <button
              onClick={() => setShowMenu(o => !o)}
              style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "#059669", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "#fff",
                cursor: "pointer", overflow: "hidden", flexShrink: 0,
              }}
            >
              {avatarContent}
            </button>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        minWidth: 0, position: "relative",
        paddingTop: isMobile ? 52 : 0,
        paddingBottom: isMobile ? 68 : 0,
      }}>
        {!aiOpen && !isMobile && (
          <button
            onClick={() => setAiOpen(true)}
            style={{
              position: "fixed", top: 14, right: 20, zIndex: 10,
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 14px", borderRadius: 4,
              background: "#082d1d", color: "#fff",
              border: "none", cursor: "pointer",
              fontSize: 12.5, fontWeight: 600,
              boxShadow: "0 4px 16px rgba(5,150,105,0.25)",
              letterSpacing: "-0.01em",
            }}
          >
            <Sparkles size={13} color="#59d10b" />
            Orin Insight
          </button>
        )}
        {children}
      </main>

      {/* ── Mobile user menu — compact dropdown anchored below avatar ── */}
      {isMobile && showMenu && (
        <>
          <div
            onClick={() => setShowMenu(false)}
            style={{ position: "fixed", inset: 0, zIndex: 60 }}
          />
          <div style={{
            position: "fixed", top: 60, right: 12, zIndex: 70,
            background: "#fff",
            borderRadius: 4,
            border: "1.5px solid #dde4de",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            minWidth: 210,
            overflow: "hidden",
          }}>
            {/* User identity */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px",
              borderBottom: "1px solid #e9ede9",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: "#059669",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12.5, fontWeight: 700, color: "#fff", overflow: "hidden", flexShrink: 0,
              }}>
                {avatarContent}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#082d1d", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentName}</p>
                <p style={{ fontSize: 11, color: "#4a6d47", margin: 0 }}>Free plan</p>
              </div>
            </div>

            {/* Actions */}
            {isGuest ? (
              <form action={signInWithGoogle} style={{ padding: "10px 14px" }}>
                <button type="submit" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%", padding: "10px 14px", borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.12)", background: "#fff",
                  cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#082d1d",
                  fontFamily: "inherit",
                }}>
                  <svg width="16" height="16" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01a4.8 4.8 0 0 1-7.18-2.53H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
                  </svg>
                  Login with Google
                </button>
                <p style={{ fontSize: 11, color: "#4a6d47", textAlign: "center", margin: "8px 0 0", lineHeight: 1.4 }}>
                  Your guest data will be saved to your account
                </p>
              </form>
            ) : (
              <>
                {([
                  { icon: <Zap size={15} color="#059669" />,  label: "Track your energy", action: () => { setShowMenu(false); setEnergyOpen(true); } },
                  { icon: <User size={15} color="#4a6d47" />, label: "Profile settings",  action: () => { setShowMenu(false); setProfileOpen(true); } },
                ] as { icon: React.ReactNode; label: string; action: () => void }[]).map(item => (
                  <button key={item.label} onClick={item.action} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "12px 14px", background: "none", border: "none",
                    cursor: "pointer", fontSize: 13, color: "#082d1d", fontFamily: "inherit", textAlign: "left",
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8f9f5"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}

                <div style={{ height: 1, background: "#e9ede9" }} />
                <form action={signOut}>
                  <button type="submit" style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "12px 14px", background: "none", border: "none",
                    cursor: "pointer", fontSize: 13, color: "#D14626", fontFamily: "inherit",
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fff0ec"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                  >
                    <span>→</span> Log out
                  </button>
                </form>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Mobile modals ── */}
      {isMobile && energyOpen && (
        <EnergyCheckInModal
          onClose={() => setEnergyOpen(false)}
          onSave={(entry: CheckIn) => {
            const store = loadEnergyStore();
            const key = todayKey();
            store[key] = [...(store[key] ?? []), entry];
            saveEnergyStore(store);
            setEnergyOpen(false);
          }}
        />
      )}
      {isMobile && (
        <ProfileModal
          open={profileOpen}
          onOpenChange={setProfileOpen}
          name={currentName}
          email={email}
          initial={(currentName.charAt(0) || initial).toUpperCase()}
          onNameUpdate={n => setCurrentName(n)}
          onAvatarUpdate={url => setAvatarSrc(url)}
        />
      )}

      {aiOpen && <AIPanel onClose={() => setAiOpen(false)} />}
    </div>
  );
}
