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

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = user ? displayName(user as Parameters<typeof displayName>[0]) : "there";

  return (
    <div style={{ maxWidth: 660, margin: "0 auto", padding: "40px 36px 100px" }}>
      <WeeklyReviewCard />
      <TaskList userName={name} />
    </div>
  );
}
