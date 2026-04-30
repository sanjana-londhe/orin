import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils";
import { TopNav } from "@/components/TopNav";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = user ? displayName(user as Parameters<typeof displayName>[0]) : "there";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "#F3F1EC" }}>
      <TopNav initial={initial} />
      <div style={{ paddingTop: 54, display: "flex", height: "calc(100vh - 0px)" }}>
        <div style={{ height: "calc(100vh - 54px)", position: "sticky", top: 54, flexShrink: 0 }}>
          <Sidebar />
        </div>
        <main style={{ flex: 1, overflowY: "auto", height: "calc(100vh - 54px)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
