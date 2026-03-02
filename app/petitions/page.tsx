"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPetitions, type ParsedEmailRow } from "@/lib/api";
import { PetitionsDashboard } from "@/components/PetitionsDashboard";
import { CreatePetitionModal } from "@/components/CreatePetitionModal";
import { isPast, addDays, isWithinInterval } from "date-fns";

export default function PetitionsPage() {
  const [emails, setEmails] = useState<ParsedEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  // Handle hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove #
      if (hash) {
        setSelectedId(hash);
        // Scroll to petition after a short delay to allow rendering
        setTimeout(() => {
          const element = document.getElementById(`petition-${hash}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } else {
        setSelectedId(null);
      }
    };

    // Handle initial hash on load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleCreateSuccess = (opportunityId: string) => {
    setShowCreateModal(false);
    // Navigate to the new petition
    window.location.hash = opportunityId;
    // Refresh petition list to show the new one
    window.location.reload();
  };

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
              <button
                className="create-petition-button"
                onClick={() => setShowCreateModal(true)}
              >
                + New Petition
              </button>
            </div>
          </div>
          <p className="dashboard-subtitle">Film production crew calls from the RTVF listserv</p>
        </div>
      </header>

      <PetitionsDashboard emails={emails} error={error} selectedId={selectedId} />

      {showCreateModal && (
        <CreatePetitionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}
