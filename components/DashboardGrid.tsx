import type { ParsedEmailRow } from "@/lib/api";
import { InboxDashboard } from "./InboxDashboard";

interface DashboardGridProps {
  grants: { emails: ParsedEmailRow[]; error?: string };
  crewCalls: { emails: ParsedEmailRow[]; error?: string };
  resources: { emails: ParsedEmailRow[]; error?: string };
  castingCalls: { emails: ParsedEmailRow[]; error?: string };
  events: { emails: ParsedEmailRow[]; error?: string };
}

export function DashboardGrid({ grants, crewCalls, resources, castingCalls, events }: DashboardGridProps) {
  return (
    <InboxDashboard
      grants={grants}
      crewCalls={crewCalls}
      resources={resources}
      castingCalls={castingCalls}
      events={events}
    />
  );
}
