import { TaskList } from "@/components/TaskList";
import { WeeklyReviewCard } from "@/components/WeeklyReviewCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <div className="mx-auto max-w-[860px] px-6 py-10">
        <WeeklyReviewCard />
        <TaskList />
      </div>
    </main>
  );
}
