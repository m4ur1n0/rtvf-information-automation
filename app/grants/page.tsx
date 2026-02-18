import { fetchEmails, type ParsedEmailRow } from "@/lib/api";
import { GrantsDashboard } from "@/components/GrantsDashboard";

async function fetchGrantsData(): Promise<{ emails: ParsedEmailRow[]; error?: string }> {
  try {
    const emails = await fetchEmails({ category: "GRANT", limit: 50 });
    return { emails };
  } catch (error) {
    return { emails: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export default async function GrantsPage() {
  const { emails, error } = await fetchGrantsData();

  const openCount = emails.filter(
    (e) => e.grant_status === "open" || e.tags.includes("GRANT_OPEN")
  ).length;

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">Grants & Funding</h1>
            <div className="header-stats">
              {openCount > 0 && (
                <div className="stat-pill stat-open">
                  <span className="stat-value">{openCount}</span>
                  <span className="stat-label">open now</span>
                </div>
              )}
              <div className="stat-pill stat-total">
                <span className="stat-value">{emails.length}</span>
                <span className="stat-label">total</span>
              </div>
            </div>
          </div>
          <p className="dashboard-subtitle">
            Funding for student filmmaking projects from the RTVF listserv
          </p>
        </div>
      </header>

      <GrantsDashboard emails={emails} error={error} />
    </div>
  );
}
