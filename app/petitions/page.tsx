"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPetitions, type ParsedEmailRow } from "@/lib/api";
import { PetitionsDashboard } from "@/components/PetitionsDashboard";
import { isPast, addDays, isWithinInterval } from "date-fns";

export default function PetitionsPage() {
  const [emails, setEmails] = useState<ParsedEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function loadAllPetitions() {
      setLoading(true);
      setError(undefined);
      try {
        const pageSize = 200;
        let offset = 0;
        const combined: ParsedEmailRow[] = [];

        while (true) {
          const page = await fetchPetitions({
            limit: pageSize,
            offset,
            summary: false,
          });
          combined.push(...page);
          if (page.length < pageSize || combined.length >= 2000) break;
          offset += page.length;
        }

        const byId = new Map<string, ParsedEmailRow>();
        for (const row of combined) byId.set(row.id, row);

        if (!cancelled) setEmails(Array.from(byId.values()));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load petitions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAllPetitions();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCount = useMemo(() => {
    return emails.filter((e) => {
      if (!e.deadline_at || e.is_bump === 1) return false;
      const deadline = new Date(e.deadline_at * 1000);
      return !isPast(deadline);
    }).length;
  }, [emails]);

  const deadlineSoonCount = useMemo(() => {
    const now = new Date();
    return emails.filter((e) => {
      if (!e.deadline_at || e.is_bump === 1) return false;
      const deadline = new Date(e.deadline_at * 1000);
      const soon = addDays(now, 7);
      return isWithinInterval(deadline, { start: now, end: soon });
    }).length;
  }, [emails]);

  if (loading) {
    return (
      <div className="dashboard-container" style={{ paddingTop: 0 }}>
        <div className="section-empty">
          <div className="empty-icon">⟳</div>
          <div className="empty-message">Loading petitions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">Petitions</h1>
            <div className="header-stats">
              {activeCount > 0 && (
                <div className="stat-pill stat-open">
                  <span className="stat-value">{activeCount}</span>
                  <span className="stat-label">active</span>
                </div>
              )}
              {deadlineSoonCount > 0 && (
                <div className="stat-pill stat-deadline-soon">
                  <span className="stat-value">{deadlineSoonCount}</span>
                  <span className="stat-label">deadline soon</span>
                </div>
              )}
              <div className="stat-pill stat-total">
                <span className="stat-value">{emails.length}</span>
                <span className="stat-label">total</span>
              </div>
            </div>
          </div>
          <p className="dashboard-subtitle">Film production crew calls from the RTVF listserv</p>
        </div>
      </header>

      <PetitionsDashboard emails={emails} error={error} />
    </div>
  );
}
