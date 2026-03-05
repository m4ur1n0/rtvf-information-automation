"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDashboard } from "@/components/CalendarDashboard";
import { fetchEvents, fetchGrants, fetchPetitions } from "@/lib/api";
import { useSearchableData } from "@/hooks/useSearchableData";

export default function CalendarPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const grants = useSearchableData(fetchGrants, searchQuery);
  const events = useSearchableData(fetchEvents, searchQuery);
  const crew = useSearchableData(fetchPetitions, searchQuery);

  const loading = grants.loading || events.loading || crew.loading;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          grants.loadMore();
          events.loadMore();
          crew.loadMore();
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [grants.loadMore, events.loadMore, crew.loadMore]);

  const error = grants.error || events.error || crew.error;

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
        grantEmails={grants.items}
        eventEmails={events.items}
        crewEmails={crew.items}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <div ref={loadMoreRef} style={{ height: 1 }} />
      {loading && !grants.initialLoading && (
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-tertiary)", paddingBottom: "var(--space-lg)" }}>
          Loading more deadlines...
        </div>
      )}
    </>
  );
}
