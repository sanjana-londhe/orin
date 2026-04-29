import { TaskList } from "@/components/TaskList";

export default function Home() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <div className="mx-auto max-w-[660px] px-6 py-10">
        <TaskList />
      </div>
    </main>
  );
}
