import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = user ? displayName(user as Parameters<typeof displayName>[0]) : "there";
  const initial = name.charAt(0).toUpperCase();

  return (
    /* 5.html .shell */
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#fcfdfc" }}>

      {/* Sidebar — 220px, stone-100 */}
      <Sidebar userName={name} />

      {/* Main column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#ffffff" }}>

        {/* Topbar — 50px */}
        <Topbar pageName="Today" initial={initial} />

        {/* Scrollable content */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
