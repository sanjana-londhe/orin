import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils";
import { TaskList } from "@/components/TaskList";
import { WeeklyReviewCard } from "@/components/WeeklyReviewCard";

function timeGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = user ? displayName(user as Parameters<typeof displayName>[0]) : "there";

  return (
    <div style={{ minHeight: "calc(100vh - 54px)", background: "#F3F1EC" }}>
      {/* Full-width content — no sidebar */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 28px 80px" }}>
        <WeeklyReviewCard />
        <TaskList userName={name} timeGreeting={timeGreeting()} />
      </div>
    </div>
  );
}
