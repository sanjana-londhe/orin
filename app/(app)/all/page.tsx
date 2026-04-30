import { SimpleTaskView } from "@/components/SimpleTaskView";
export default function AllPage() {
  return <SimpleTaskView title="All" emoji="📋" filter="all" emptyText="No tasks created yet" />;
}
