import { TaskList } from "@/components/TaskList";
import { WeeklyReviewCard } from "@/components/WeeklyReviewCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <div className="mx-auto max-w-[860px] px-4 py-6 sm:px-6 sm:py-10">
        <WeeklyReviewCard />
        <TaskList />
      </div>
    </main>
  );
}
