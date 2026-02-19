import {
  fetchEvents,
  fetchGrants,
  fetchPetitions,
  type ParsedEmailRow,
} from "@/lib/api";
import { CalendarDashboard } from "@/components/CalendarDashboard";

async function fetchDeadlineEmails(): Promise<{
  grantEmails:  ParsedEmailRow[];
  eventEmails:  ParsedEmailRow[];
  crewEmails:   ParsedEmailRow[];
}> {
  const [grantEmails, eventEmails, crewEmails] = await Promise.all([
    fetchGrants({ limit: 50 }).catch(() => []),
    fetchEvents({ limit: 50 }).catch(() => []),
    fetchPetitions({ limit: 50 }).catch(() => []),
  ]);
  return { grantEmails, eventEmails, crewEmails };
}

export default async function CalendarPage() {
  const { grantEmails, eventEmails, crewEmails } = await fetchDeadlineEmails();

  return (
    <CalendarDashboard
      grantEmails={grantEmails}
      eventEmails={eventEmails}
      crewEmails={crewEmails}
    />
  );
}
