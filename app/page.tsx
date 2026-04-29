import { createClient } from "@/lib/supabase/server";
import { TaskList } from "@/components/TaskList";
import { WeeklyReviewCard } from "@/components/WeeklyReviewCard";
import { Sidebar } from "@/components/Sidebar";

function displayName(user: { email?: string; user_metadata?: { full_name?: string } }): string {
  const meta = user.user_metadata?.full_name;
  if (meta?.trim()) return meta.trim().split(" ")[0];
  const email = user.email ?? "";
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = user ? displayName(user as Parameters<typeof displayName>[0]) : "there";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-[#F3F1EC]">
      {/* Sidebar */}
      <Sidebar userName={name} />

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Sticky toolbar */}
        <div className="flex-shrink-0 h-[46px] flex items-center gap-2 px-9 border-b border-black/[0.06] bg-[rgba(243,241,236,0.88)] backdrop-blur-[16px] sticky top-0 z-20">
          <span className="font-mono text-[11px] text-[#B0A89E] mr-1">sort</span>
          {/* Sort buttons rendered client-side inside TaskList via the toolbar slot */}
          <div id="toolbar-sort-slot" className="contents" />
          <div className="ml-auto flex items-center gap-2">
            <div className="w-[27px] h-[27px] rounded-full bg-[#DDD8D0] flex items-center justify-center text-[10.5px] font-bold text-[#6C6860]">
              {initial}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[660px] mx-auto px-9 pt-10 pb-24">
            <WeeklyReviewCard />
            <TaskList userName={name} />
          </div>
        </main>
      </div>
    </div>
  );
}
