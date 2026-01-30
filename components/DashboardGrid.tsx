import type { ParsedEmailRow } from "@/lib/api";
import { TabbedDashboard } from "./TabbedDashboard";

interface DashboardGridProps {
  grants: { emails: ParsedEmailRow[]; error?: string };
  crewCalls: { emails: ParsedEmailRow[]; error?: string };
  resources: { emails: ParsedEmailRow[]; error?: string };
  castingCalls: { emails: ParsedEmailRow[]; error?: string };
}

export function DashboardGrid({ grants, crewCalls, resources, castingCalls }: DashboardGridProps) {
  return (
    <TabbedDashboard
      grants={grants}
      crewCalls={crewCalls}
      resources={resources}
      castingCalls={castingCalls}
    />
  );
}
