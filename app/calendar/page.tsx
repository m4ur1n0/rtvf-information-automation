"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDashboard } from "@/components/CalendarDashboard";
import { fetchEvents, fetchGrants, fetchPetitions, type ParsedEmailRow } from "@/lib/api";

const PAGE_SIZE = 25;

export default function CalendarPage() {
  const [grantEmails, setGrantEmails] = useState<ParsedEmailRow[]>([]);
  const [eventEmails, setEventEmails] = useState<ParsedEmailRow[]>([]);
  const [crewEmails, setCrewEmails] = useState<ParsedEmailRow[]>([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState({ grants: true, events: true, crew: true });
  const [searchQuery, setSearchQuery] = useState("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const inFlightOffsets = useRef<Set<number>>(new Set());

  const mergeUniqueById = useCallback((existing: ParsedEmailRow[], incoming: ParsedEmailRow[]) => {
    const byId = new Map<string, ParsedEmailRow>();
    for (const row of existing) byId.set(row.id, row);
    for (const row of incoming) byId.set(row.id, row);
    return Array.from(byId.values()).sort((a, b) => b.sent_at - a.sent_at);
  }, []);

  const loadMore = useCallback(async () => {
    if (loading) return;
    if (!hasMore.grants && !hasMore.events && !hasMore.crew) return;
    if (inFlightOffsets.current.has(nextOffset)) return;
    inFlightOffsets.current.add(nextOffset);

    setLoading(true);
    setError(null);
    try {
      const [nextGrants, nextEvents, nextCrew] = await Promise.all([
        hasMore.grants ? fetchGrants({ limit: PAGE_SIZE, offset: nextOffset, q: searchQuery || undefined }) : Promise.resolve([]),
        hasMore.events ? fetchEvents({ limit: PAGE_SIZE, offset: nextOffset, q: searchQuery || undefined }) : Promise.resolve([]),
        hasMore.crew ? fetchPetitions({ limit: PAGE_SIZE, offset: nextOffset, q: searchQuery || undefined }) : Promise.resolve([]),
      ]);

      setGrantEmails((prev) => mergeUniqueById(prev, nextGrants));
      setEventEmails((prev) => mergeUniqueById(prev, nextEvents));
      setCrewEmails((prev) => mergeUniqueById(prev, nextCrew));

      setHasMore((prev) => ({
        grants: prev.grants && nextGrants.length === PAGE_SIZE,
        events: prev.events && nextEvents.length === PAGE_SIZE,
        crew: prev.crew && nextCrew.length === PAGE_SIZE,
      }));
      setNextOffset((prev) => prev + PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      inFlightOffsets.current.delete(nextOffset);
      setLoading(false);
    }
  }, [hasMore, loading, mergeUniqueById, nextOffset, searchQuery]);

  useEffect(() => {
    inFlightOffsets.current.clear();
    setGrantEmails([]);
    setEventEmails([]);
    setCrewEmails([]);
    setNextOffset(0);
    setHasMore({ grants: true, events: true, crew: true });
    setError(null);
  }, [searchQuery]);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

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

  return (
    <>
      {error && (
        <div className="dashboard-container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div style={{
            padding: "var(--space-md) var(--space-lg)",
            background: "color-mix(in srgb, var(--status-closed) 12%, transparent)",
            border: "1px solid var(--status-closed)",
            borderRadius: "var(--radius-md)",
            color: "var(--status-closed)",
            fontSize: "13px",
            marginBottom: "var(--space-md)",
          }}>
            Could not load deadlines data: {error}
          </div>
        </div>
      )}

      <CalendarDashboard
        grantEmails={grantEmails}
        eventEmails={eventEmails}
        crewEmails={crewEmails}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <div ref={loadMoreRef} style={{ height: 1 }} />
      {loading && (
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-tertiary)", paddingBottom: "var(--space-lg)" }}>
          Loading more deadlines...
        </div>
      )}
    </>
  );
}
