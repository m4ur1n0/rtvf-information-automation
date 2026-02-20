"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GrantsDashboard } from "@/components/GrantsDashboard";
import { fetchCategoryCounts, fetchGrants, type ParsedEmailRow } from "@/lib/api";

const PAGE_SIZE = 25;

export default function GrantsPage() {
  const [emails, setEmails] = useState<ParsedEmailRow[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [totalGrants, setTotalGrants] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const inFlightOffsets = useRef<Set<number>>(new Set());

  const mergeUniqueById = useCallback((existing: ParsedEmailRow[], incoming: ParsedEmailRow[]) => {
    const byId = new Map<string, ParsedEmailRow>();
    for (const row of existing) byId.set(row.id, row);
    for (const row of incoming) byId.set(row.id, row);
    return Array.from(byId.values()).sort((a, b) => b.sent_at - a.sent_at);
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    if (inFlightOffsets.current.has(offset)) return;
    inFlightOffsets.current.add(offset);
    setLoading(true);
    setError(undefined);
    try {
      const rows = await fetchGrants({ limit: PAGE_SIZE, offset });
      setEmails((prev) => mergeUniqueById(prev, rows));
      setOffset((prev) => prev + rows.length);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      inFlightOffsets.current.delete(offset);
      setLoading(false);
    }
  }, [hasMore, loading, mergeUniqueById, offset]);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

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
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        void loadMore();
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

      <GrantsDashboard emails={emails} error={error} />

      <div ref={loadMoreRef} style={{ height: 1 }} />
      {loading && (
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-tertiary)", padding: "var(--space-md)" }}>
          Loading more grants...
        </div>
      )}
    </div>
  );
}
