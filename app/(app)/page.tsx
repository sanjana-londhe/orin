import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils";
import { TaskList } from "@/components/TaskList";
import { WeeklyReviewCard } from "@/components/WeeklyReviewCard";

function timeGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
}

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = user ? displayName(user as Parameters<typeof displayName>[0]) : "there";
  const greeting = timeGreeting();

  return (
    <div style={{ padding: "24px 28px 64px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Greeting card */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #e9ede9",
          padding: "16px 24px", marginBottom: 8,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <div>
            <h1 style={{
              fontSize: 22, fontWeight: 800, color: "#082d1d",
              margin: "0 0 4px", letterSpacing: "-0.03em",
            }}>
              Good {greeting}, {name}! 👋
            </h1>
            <p style={{ fontSize: 13.5, color: "#4a6d47", margin: 0 }}>
              What would you like to move forward today?
            </p>
          </div>
        </div>

        <WeeklyReviewCard />
        <TaskList userName={name} timeGreeting={greeting.toLowerCase()} />
      </div>
    </div>
  );
}
