import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name    = user ? displayName(user as Parameters<typeof displayName>[0]) : "there";
  const email   = user?.email ?? "";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#fcfdfc" }}>
      <Sidebar userName={name} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#ffffff" }}>
        <Topbar pageName="Today" initial={initial} name={name} email={email} />
        <main style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
