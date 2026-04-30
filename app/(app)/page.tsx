import { createClient } from "@/lib/supabase/server";
import { displayName, PAGE_STYLE } from "@/lib/utils";
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
    <div style={PAGE_STYLE}>
      <WeeklyReviewCard />
      <TaskList userName={name} timeGreeting={timeGreeting()} />
    </div>
  );
}
