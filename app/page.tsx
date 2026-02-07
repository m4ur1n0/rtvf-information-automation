import { fetchEmails, type ParsedEmailRow } from "@/lib/api";
import { DashboardGrid } from "@/components/DashboardGrid";

// Fetch data for each section with error handling
async function fetchGrantsData(): Promise<{ emails: ParsedEmailRow[]; error?: string }> {
  try {
    const emails = await fetchEmails({ category: "GRANT", limit: 25 });
    return { emails };
  } catch (error) {
    return { emails: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchCrewCallsData(): Promise<{ emails: ParsedEmailRow[]; error?: string }> {
  try {
    const emails = await fetchEmails({ category: "CREW_CALL", limit: 25 });
    // Filter OUT casting-related crew calls
    const crewOnly = emails.filter(
      (email) =>
        !email.tags.includes("CASTING_ROLES") && !email.tags.includes("CASTING_EXTRAS")
    );
    return { emails: crewOnly };
  } catch (error) {
    return { emails: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchResourcesData(): Promise<{ emails: ParsedEmailRow[]; error?: string }> {
  try {
    const emails = await fetchEmails({ category: "RESOURCE", limit: 25 });
    return { emails };
  } catch (error) {
    return { emails: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchCastingCallsData(): Promise<{ emails: ParsedEmailRow[]; error?: string }> {
  try {
    // Fetch CREW_CALL with CASTING_ROLES tag
    const emails = await fetchEmails({ category: "CREW_CALL", tag: "CASTING_ROLES", limit: 25 });
    return { emails };
  } catch (error) {
    return { emails: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export default async function Home() {
  // Fetch all sections in parallel
  const [grants, crewCalls, resources, castingCalls] = await Promise.all([
    fetchGrantsData(),
    fetchCrewCallsData(),
    fetchResourcesData(),
    fetchCastingCallsData(),
  ]);

  // Calculate stats
  const totalItems = grants.emails.length + crewCalls.emails.length + resources.emails.length + castingCalls.emails.length;
  const openGrants = grants.emails.filter(e => e.tags.includes("GRANT_OPEN")).length;

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">RTVF Opportunities</h1>
            <div className="header-stats">
              <div className="stat-pill stat-total">
                <span className="stat-value">{totalItems}</span>
                <span className="stat-label">total</span>
              </div>
              {openGrants > 0 && (
                <div className="stat-pill stat-open">
                  <span className="stat-value">{openGrants}</span>
                  <span className="stat-label">open grants</span>
                </div>
              )}
            </div>
          </div>
          <p className="dashboard-subtitle">
            Film & TV production opportunities from the RTVF listserv
          </p>
        </div>
      </header>

      <DashboardGrid
        grants={grants}
        crewCalls={crewCalls}
        resources={resources}
        castingCalls={castingCalls}
      />
    </div>
  );
}
