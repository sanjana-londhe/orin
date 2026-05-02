import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name    = user ? displayName(user as Parameters<typeof displayName>[0]) : "there";
  const email   = user?.email ?? "";
  const initial = name.charAt(0).toUpperCase();

  return (
    <AppShell userName={name} email={email} initial={initial}>
      {children}
    </AppShell>
  );
}
