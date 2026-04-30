import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";

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
      <TopNav initial={initial} />
      {/* 54px offset for fixed nav */}
      <div style={{ paddingTop: 54 }}>
        {children}
      </div>
    </div>
  );
}
