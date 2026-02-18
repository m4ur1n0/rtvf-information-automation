import { fetchEmails, type ParsedEmailRow } from "@/lib/api";
import { CalendarDashboard } from "@/components/CalendarDashboard";

async function fetchDeadlineEmails(): Promise<{
  grantEmails:  ParsedEmailRow[];
  eventEmails:  ParsedEmailRow[];
  crewEmails:   ParsedEmailRow[];
}> {
  const [grantEmails, eventEmails, crewEmails] = await Promise.all([
    fetchEmails({ category: "GRANT",     limit: 50 }).catch(() => []),
    fetchEmails({ category: "EVENT",     limit: 50 }).catch(() => []),
    fetchEmails({ category: "CREW_CALL", limit: 50 }).catch(() => []),
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
