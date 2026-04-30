import { SimpleTaskView } from "@/components/SimpleTaskView";
export default function ScheduledPage() {
  return <SimpleTaskView title="Scheduled" emoji="🗓" filter="scheduled" emptyText="No tasks with future due dates" />;
}
