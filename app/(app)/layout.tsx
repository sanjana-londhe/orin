import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { seedOnboardingTasks } from "@/lib/onboarding";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isGuest = (user as { is_anonymous?: boolean } | null)?.is_anonymous ?? false;
  const name    = isGuest ? "Guest" : (user ? displayName(user as Parameters<typeof displayName>[0]) : "there");
  const email   = user?.email ?? "";
  const initial = name.charAt(0).toUpperCase();

  if (user) await seedOnboardingTasks(user.id);

  return (
    <AppShell userName={name} email={email} initial={initial} isGuest={isGuest}>
      {children}
    </AppShell>
  );
}
