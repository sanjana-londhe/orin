"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useUIStore, type CelebrationIntensity } from "@/store/ui";

const CELEBRATION_OPTIONS: { value: CelebrationIntensity; label: string; sub: string }[] = [
  { value: "calm",        label: "Calm",        sub: "Quiet — just a line when the day clears" },
  { value: "standard",    label: "Standard",    sub: "Soft tick per task · confetti on a clear day" },
  { value: "celebratory", label: "Celebratory", sub: "Brighter sound · a full burst on a clear day" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  name: string;
  email: string;
  initial: string;
  onNameUpdate?: (name: string) => void;
  onAvatarUpdate?: (url: string) => void;
}

export function ProfileModal({ open, onOpenChange, name, email, initial, onNameUpdate, onAvatarUpdate }: Props) {
  const [displayName, setDisplayName] = useState(name);
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const celebrationIntensity    = useUIStore(s => s.celebrationIntensity);
  const setCelebrationIntensity = useUIStore(s => s.setCelebrationIntensity);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAvatarUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { full_name: displayName.trim() },
      });
      onNameUpdate?.(displayName.trim());
      if (avatarUrl) onAvatarUpdate?.(avatarUrl);
      setSaved(true);
      setTimeout(() => { setSaved(false); onOpenChange(false); }, 1200);
    } catch { /* silent */ }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden rounded-[16px] border border-[#dde4de]"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>

        {/* Header */}
        <div style={{ padding: "20px 20px 0", textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: "0 0 20px" }}>Profile</p>

          {/* Avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ position: "relative", width: 72, height: 72 }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar"
                  style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid #dde4de" }} />
              ) : (
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "#059669", border: "2px solid #dde4de",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 700,
                }}>
                  {displayName.charAt(0).toUpperCase() || initial}
                </div>
              )}
              {/* Upload overlay */}
              <button onClick={() => fileRef.current?.click()} style={{
                position: "absolute", bottom: 0, right: 0,
                width: 24, height: 24, borderRadius: "50%",
                background: "#fff", border: "1.5px solid #dde4de",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 11, boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
              }}
                title="Change photo">
                📷
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            <p style={{ fontSize: 11, color: "#b9d3c4", margin: 0 }}>Click 📷 to change photo</p>
          </div>
        </div>

        {/* Fields */}
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Name */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#3d5a4a", margin: "0 0 6px" }}>Display name</p>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 8,
                border: "1px solid #dde4de", background: "#fafbf7",
                fontSize: 12, color: "#082d1d", fontFamily: "inherit",
                outline: "none", boxSizing: "border-box",
                transition: "border-color 0.14s",
              }}
              onFocus={e => (e.target as HTMLElement).style.borderColor = "#059669"}
              onBlur={e => (e.target as HTMLElement).style.borderColor = "#dde4de"}
            />
          </div>

          {/* Email — read only */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#3d5a4a", margin: "0 0 6px" }}>
              Gmail ID <span style={{ fontWeight: 400, color: "#b9d3c4" }}>· cannot be changed</span>
            </p>
            <div style={{
              padding: "9px 12px", borderRadius: 8,
              border: "1px solid #dde4de", background: "#f1f3ef",
              fontSize: 12, color: "#4a6d47", userSelect: "none",
            }}>
              {email || "—"}
            </div>
          </div>

          {/* Completion celebration */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#3d5a4a", margin: "0 0 6px" }}>
              Completion celebration
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {CELEBRATION_OPTIONS.map(opt => {
                const active = celebrationIntensity === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setCelebrationIntensity(opt.value)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                      width: "100%", padding: "9px 12px", borderRadius: 8,
                      border: `1px solid ${active ? "#059669" : "#dde4de"}`,
                      background: active ? "#f2fdec" : "#fafbf7",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                      transition: "border-color 0.14s, background 0.14s",
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: active ? "#059669" : "#082d1d" }}>
                        {opt.label}
                      </span>
                      <span style={{ display: "block", fontSize: 11, color: "#4a6d47", lineHeight: 1.35 }}>
                        {opt.sub}
                      </span>
                    </span>
                    <span style={{
                      width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                      border: `1.5px solid ${active ? "#059669" : "#c4cbc2"}`,
                      background: active ? "#059669" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {active && (
                        <svg width="9" height="6" viewBox="0 0 11 8" fill="none">
                          <path d="M1 4l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            style={{
              width: "100%", padding: "9px 0", borderRadius: 8,
              border: "none", marginTop: 4,
              background: saved ? "#22C55E" : displayName.trim() ? "#059669" : "#c4cbc2",
              color: "#fff", fontSize: 12, fontWeight: 600,
              cursor: displayName.trim() ? "pointer" : "default",
              fontFamily: "inherit", transition: "background 0.15s",
            }}
            onMouseEnter={e => { if (displayName.trim() && !saved) (e.currentTarget as HTMLElement).style.background = "#047857"; }}
            onMouseLeave={e => { if (!saved) (e.currentTarget as HTMLElement).style.background = displayName.trim() ? "#059669" : "#c4cbc2"; }}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
