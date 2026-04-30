import { SimpleTaskView } from "@/components/SimpleTaskView";
export default function CompletedPage() {
  return <SimpleTaskView title="Completed" emoji="✅" filter="completed" emptyText="No completed tasks yet" />;
}
