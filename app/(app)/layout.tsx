import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
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
    <div style={{ minHeight: "100vh", background: "#F3F1EC" }}>
      {/* Fixed top nav */}
      <TopNav initial={initial} />

      {/* Shell: sidebar + content, offset by nav height */}
      <div style={{ paddingTop: 54, display: "flex", height: "calc(100vh - 0px)" }}>
        {/* Sidebar */}
        <div style={{ height: "calc(100vh - 54px)", position: "sticky", top: 54, flexShrink: 0 }}>
          <Sidebar />
        </div>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: "auto", height: "calc(100vh - 54px)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
