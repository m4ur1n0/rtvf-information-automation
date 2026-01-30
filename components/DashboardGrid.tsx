import type { ParsedEmailRow } from "@/lib/api";
import { CompactSection } from "./CompactSection";

interface DashboardGridProps {
  grants: { emails: ParsedEmailRow[]; error?: string };
  crewCalls: { emails: ParsedEmailRow[]; error?: string };
  resources: { emails: ParsedEmailRow[]; error?: string };
  castingCalls: { emails: ParsedEmailRow[]; error?: string };
}

export function DashboardGrid({ grants, crewCalls, resources, castingCalls }: DashboardGridProps) {
  return (
    <div className="dashboard-grid">
      <CompactSection
        title="Grants"
        icon="$"
        type="grant"
        emails={grants.emails}
        error={grants.error}
        accentColor="var(--accent-grant)"
      />
      <CompactSection
        title="Crew Calls"
        icon="◎"
        type="crew"
        emails={crewCalls.emails}
        error={crewCalls.error}
        accentColor="var(--accent-crew)"
      />
      <CompactSection
        title="Casting Calls"
        icon="★"
        type="casting"
        emails={castingCalls.emails}
        error={castingCalls.error}
        accentColor="var(--accent-casting)"
      />
      <CompactSection
        title="Resources"
        icon="⚙"
        type="resource"
        emails={resources.emails}
        error={resources.error}
        accentColor="var(--accent-resource)"
      />
    </div>
  );
}
