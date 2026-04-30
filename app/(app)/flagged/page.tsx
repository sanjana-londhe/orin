import { SimpleTaskView } from "@/components/SimpleTaskView";
export default function FlaggedPage() {
  return <SimpleTaskView title="Flagged" emoji="🚩" filter="flagged" emptyText="No deferred tasks — you're on top of it" />;
}
