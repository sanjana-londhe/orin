import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";

function displayName(user: { email?: string; user_metadata?: { full_name?: string } }): string {
  const meta = user.user_metadata?.full_name;
  if (meta?.trim()) return meta.trim().split(" ")[0];
  const email = user.email ?? "";
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = user ? displayName(user as Parameters<typeof displayName>[0]) : "there";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#F3F1EC" }}>
      {/* Persistent sidebar */}
      <Sidebar userName={name} />

      {/* Right column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Sticky toolbar */}
        <div style={{
          height: 46, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 36px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          background: "rgba(243,241,236,0.88)",
          backdropFilter: "blur(16px)",
        }}>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 27, height: 27, borderRadius: "50%",
              background: "#DDD8D0", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: "#6C6860",
            }}>
              {initial}
            </div>
          </div>
        </div>

        {/* Page content — each page scrolls independently */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
