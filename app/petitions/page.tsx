"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPetitions, type ParsedEmailRow } from "@/lib/api";
import { PetitionsDashboard } from "@/components/PetitionsDashboard";
import { CreatePetitionModal } from "@/components/CreatePetitionModal";
import { isPast, addDays, isWithinInterval } from "date-fns";
import { useSearchableData } from "@/hooks/useSearchableData";

export default function PetitionsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPetitionsFn = useCallback(
    (params: { limit: number; offset: number; q?: string; groupBumps?: boolean }) =>
      fetchPetitions({ ...params, summary: false }),
    [],
  );

  const { items: emails, loading, initialLoading, error } = useSearchableData(
    fetchPetitionsFn,
    searchQuery,
    { loadAll: true },
  );

  // Handle hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setSelectedId(hash);
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

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleCreateSuccess = (opportunityId: string) => {
    setShowCreateModal(false);
    window.location.hash = opportunityId;
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

  // Only show full-page spinner on very first load, not on search re-fetches
  if (initialLoading) {
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

      <PetitionsDashboard
        emails={emails}
        error={error}
        selectedId={selectedId}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      {showCreateModal && (
        <CreatePetitionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}
