import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { MobileHintProvider } from "@/hooks/useIsMobile";
import { seedOnboardingTasks } from "@/lib/onboarding";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const hdrs = await headers();
  const { data: { user } } = await supabase.auth.getUser();
  const isGuest = (user as { is_anonymous?: boolean } | null)?.is_anonymous ?? false;
  const name    = isGuest ? "Guest" : (user ? displayName(user as Parameters<typeof displayName>[0]) : "there");
  const email   = user?.email ?? "";
  const initial = name.charAt(0).toUpperCase();
  const onboardingCompleted = !!(user?.user_metadata as { onboarding_v2_completed_at?: string } | undefined)?.onboarding_v2_completed_at;

  // Seed isMobile from the User-Agent so SSR renders the right layout
  // and we don't briefly flash desktop UI on mweb refresh.
  const ua = hdrs.get("user-agent") ?? "";
  const initialIsMobile = /Mobile|Android|iPhone|iPad|iPod|Windows Phone|BlackBerry/i.test(ua);

  // Await the seed so the first task fetch on this page load sees the rows.
  // (after() ran post-response, racing the client's immediate /api/tasks fetch.)
  if (user) await seedOnboardingTasks(user.id).catch(() => {});

  return (
    <MobileHintProvider initial={initialIsMobile}>
      <AppShell
        userName={name}
        email={email}
        initial={initial}
        isGuest={isGuest}
        onboardingCompleted={onboardingCompleted}
      >
        {children}
      </AppShell>
    </MobileHintProvider>
  );
}
