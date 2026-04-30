import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils";
import { TopNav } from "@/components/TopNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = user ? displayName(user as Parameters<typeof displayName>[0]) : "there";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "#F3F1EC" }}>
      <TopNav initial={initial} />
      <main style={{ paddingTop: 54 }}>
        {children}
      </main>
    </div>
  );
}
