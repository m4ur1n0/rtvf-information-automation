"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GrantsDashboard } from "@/components/GrantsDashboard";
import { fetchCategoryCounts, fetchGrants } from "@/lib/api";
import { useSearchableData } from "@/hooks/useSearchableData";

export default function GrantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [totalGrants, setTotalGrants] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { items: emails, loading, initialLoading, error, hasMore, loadMore } =
    useSearchableData(fetchGrants, searchQuery);

  useEffect(() => {
    let cancelled = false;
    fetchCategoryCounts()
      .then((counts) => { if (!cancelled) setTotalGrants(counts.grants); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const openCount = useMemo(
    () => emails.filter((e) => e.grant_status === "open" || e.tags.includes("GRANT_OPEN")).length,
    [emails]
  );

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
                <span className="stat-value">{totalGrants ?? emails.length}</span>
                <span className="stat-label">total</span>
              </div>
            </div>
          </div>
          <p className="dashboard-subtitle">
            Funding for student filmmaking projects from the RTVF listserv
          </p>
        </div>
      </header>

      <GrantsDashboard
        emails={emails}
        error={error}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <div ref={loadMoreRef} style={{ height: 1 }} />
      {loading && !initialLoading && (
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-tertiary)", padding: "var(--space-md)" }}>
          Loading more grants...
        </div>
      )}
    </div>
  );
}
