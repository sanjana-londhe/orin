import { createClient } from "@/lib/supabase/server";
import { TaskList } from "@/components/TaskList";
import { WeeklyReviewCard } from "@/components/WeeklyReviewCard";

function displayName(user: { email?: string; user_metadata?: { full_name?: string } }): string {
  const meta = user.user_metadata?.full_name;
  if (meta?.trim()) return meta.trim().split(" ")[0];
  const email = user.email ?? "";
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function timeGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = user ? displayName(user as Parameters<typeof displayName>[0]) : "there";

  return (
    <div>
      {/* Scrollable content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 28px 80px" }}>
        <WeeklyReviewCard />
        <TaskList userName={name} timeGreeting={timeGreeting()} />
      </div>
    </div>
  );
}
