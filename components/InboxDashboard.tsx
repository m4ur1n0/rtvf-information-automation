"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Users, DollarSign, Star, CalendarDays, Package } from "lucide-react";
import {
  fetchCategoryCounts,
  fetchEmailById,
  fetchEmails,
  fetchEvents,
  fetchGrants,
  fetchPetitions,
  fetchResources,
  fetchTotalMessages,
  type CategoryCounts,
  type ParsedEmailRow,
} from "@/lib/api";
import { EmailDetailPanel } from "./EmailDetailPanel";
import { formatSentDate } from "@/lib/format";

const PAGE_SIZE = 25;

type CategoryFilter = "ALL" | "GRANT" | "CREW_CALL" | "CASTING" | "EVENT" | "RESOURCE";

interface CategoryConfig {
  key: CategoryFilter;
  label: string;
  icon: React.ReactNode;
  color: string;
  detailType: "grant" | "crew" | "casting" | "resource" | "event";
}

interface BucketState {
  emails: ParsedEmailRow[];
  error?: string;
  loading: boolean;
  loaded: boolean;
  offset: number;
  hasMore: boolean;
}

const categories: CategoryConfig[] = [
  { key: "ALL", label: "All", icon: null, color: "var(--text-secondary)", detailType: "grant" },
  { key: "CREW_CALL", label: "Crew", icon: <Users size={11} />, color: "var(--accent-crew)", detailType: "crew" },
  { key: "GRANT", label: "Grants", icon: <DollarSign size={11} />, color: "var(--accent-grant)", detailType: "grant" },
  { key: "CASTING", label: "Casting", icon: <Star size={11} />, color: "var(--accent-casting)", detailType: "casting" },
  { key: "EVENT", label: "Events", icon: <CalendarDays size={11} />, color: "var(--accent-event)", detailType: "event" },
  { key: "RESOURCE", label: "Equipment", icon: <Package size={11} />, color: "var(--accent-resource)", detailType: "resource" },
];

function emptyBucket(): BucketState {
  return { emails: [], loading: false, loaded: false, offset: 0, hasMore: true };
}

function initialBuckets(): Record<CategoryFilter, BucketState> {
  return {
    ALL: emptyBucket(),
    GRANT: emptyBucket(),
    CREW_CALL: emptyBucket(),
    CASTING: emptyBucket(),
    EVENT: emptyBucket(),
    RESOURCE: emptyBucket(),
  };
}

function getCategoryConfig(email: ParsedEmailRow): CategoryConfig {
  if (
    email.category === "CREW_CALL" &&
    (email.tags.includes("CASTING_ROLES") || email.tags.includes("CASTING_EXTRAS"))
  ) {
    return categories.find((c) => c.key === "CASTING")!;
  }
  if (email.category === "CREW_CALL") return categories.find((c) => c.key === "CREW_CALL")!;
  if (email.category === "GRANT") return categories.find((c) => c.key === "GRANT")!;
  if (email.category === "EVENT") return categories.find((c) => c.key === "EVENT")!;
  if (email.category === "RESOURCE") return categories.find((c) => c.key === "RESOURCE")!;
  return categories.find((c) => c.key === "CREW_CALL")!;
}

function hasMedia(email: ParsedEmailRow): boolean {
  if (!email.body_text) return false;
  return /\.(jpg|jpeg|png|gif|mp4|mov|webm)|youtube|vimeo|drive\.google/i.test(email.body_text);
}

async function fetchBucket(filter: CategoryFilter, offset: number): Promise<ParsedEmailRow[]> {
  switch (filter) {
    case "ALL":
      return fetchEmails({ limit: PAGE_SIZE, offset, summary: true });
    case "GRANT":
      return fetchGrants({ limit: PAGE_SIZE, offset, summary: true });
    case "CREW_CALL":
      return fetchPetitions({ limit: PAGE_SIZE, offset, casting: false, summary: true });
    case "CASTING":
      return fetchPetitions({ limit: PAGE_SIZE, offset, casting: true, summary: true });
    case "EVENT":
      return fetchEvents({ limit: PAGE_SIZE, offset, summary: true });
    case "RESOURCE":
      return fetchResources({ limit: PAGE_SIZE, offset, summary: true });
  }
}

function mergeUniqueById(existing: ParsedEmailRow[], incoming: ParsedEmailRow[]): ParsedEmailRow[] {
  const byId = new Map<string, ParsedEmailRow>();
  for (const row of existing) byId.set(row.id, row);
  for (const row of incoming) byId.set(row.id, row);
  return Array.from(byId.values()).sort((a, b) => b.sent_at - a.sent_at);
}

export function InboxDashboard() {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("ALL");
  const [buckets, setBuckets] = useState<Record<CategoryFilter, BucketState>>(() => initialBuckets());
  const [counts, setCounts] = useState<CategoryCounts | null>(null);
  const [totalMessages, setTotalMessages] = useState<number | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryConfig | null>(null);
  const [detailById, setDetailById] = useState<Record<string, ParsedEmailRow>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const bucketsRef = useRef<Record<CategoryFilter, BucketState>>(initialBuckets());
  const inFlightRef = useRef<Record<CategoryFilter, Set<number>>>({
    ALL: new Set(),
    GRANT: new Set(),
    CREW_CALL: new Set(),
    CASTING: new Set(),
    EVENT: new Set(),
    RESOURCE: new Set(),
  });

  useEffect(() => {
    bucketsRef.current = buckets;
  }, [buckets]);

  const ensureBucketLoaded = useCallback(async (filter: CategoryFilter, loadMore = false) => {
    const bucket = bucketsRef.current[filter];
    if (bucket.loading) return;
    if (!loadMore && bucket.loaded) return;
    if (loadMore && !bucket.hasMore) return;
    const requestOffset = loadMore ? bucket.offset : 0;
    if (inFlightRef.current[filter].has(requestOffset)) return;
    inFlightRef.current[filter].add(requestOffset);

    setBuckets((prev) => ({
      ...prev,
      [filter]: { ...prev[filter], loading: true, error: undefined },
    }));

    try {
      const rows = await fetchBucket(filter, requestOffset);
      setBuckets((prev) => {
        const bucket = prev[filter];
        const nextEmails = requestOffset === 0
          ? rows
          : mergeUniqueById(bucket.emails, rows);

        return {
          ...prev,
          [filter]: {
            ...bucket,
            emails: nextEmails,
            loading: false,
            loaded: true,
            offset: Math.max(bucket.offset, requestOffset + rows.length),
            hasMore: rows.length === PAGE_SIZE,
          },
        };
      });
    } catch (error) {
      setBuckets((prev) => ({
        ...prev,
        [filter]: {
          ...prev[filter],
          loading: false,
          loaded: true,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    } finally {
      inFlightRef.current[filter].delete(requestOffset);
    }
  }, []);

  useEffect(() => {
    void ensureBucketLoaded(activeFilter);
  }, [activeFilter, ensureBucketLoaded]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchCategoryCounts().catch(() => null),
      fetchTotalMessages().catch(() => null),
    ]).then(([countsData, totalData]) => {
      if (cancelled) return;
      if (countsData) setCounts(countsData);
      if (typeof totalData === "number") setTotalMessages(totalData);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        const bucket = buckets[activeFilter];
        if (!bucket.loaded || bucket.loading || !bucket.hasMore) return;
        void ensureBucketLoaded(activeFilter, true);
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeFilter, buckets, ensureBucketLoaded]);

  const activeBucket = buckets[activeFilter];

  const filteredEmails = useMemo(() => {
    const source = activeBucket.emails;
    const merged = source.map((email) => ({
      email,
      categoryConfig: getCategoryConfig(email),
    }));
    merged.sort((a, b) => b.email.sent_at - a.email.sent_at);
    return merged;
  }, [activeBucket.emails]);

  const summaryById = useMemo(() => {
    const map = new Map<string, ParsedEmailRow>();
    for (const bucket of Object.values(buckets)) {
      for (const email of bucket.emails) map.set(email.id, email);
    }
    return map;
  }, [buckets]);

  const selectedEmail = selectedEmailId
    ? (detailById[selectedEmailId] ?? summaryById.get(selectedEmailId) ?? null)
    : null;

  const handleSelectEmail = useCallback(async (email: ParsedEmailRow, config: CategoryConfig) => {
    setSelectedEmailId(email.id);
    setSelectedCategory(config);

    if (detailById[email.id]) return;
    setDetailLoadingId(email.id);

    try {
      const fullEmail = await fetchEmailById(email.id);
      setDetailById((prev) => ({ ...prev, [email.id]: fullEmail }));
    } catch (error) {
      console.error("[inbox] failed to fetch full email", error);
    } finally {
      setDetailLoadingId((prev) => (prev === email.id ? null : prev));
    }
  }, [detailById]);

  const getCategoryCount = (key: CategoryFilter): string | number => {
    if (key === "ALL" && totalMessages != null) return totalMessages;
    if (counts) {
      if (key === "ALL") return counts.all_messages ?? counts.all;
      if (key === "GRANT") return counts.grants;
      if (key === "CREW_CALL") return counts.crew_calls;
      if (key === "CASTING") return counts.casting;
      if (key === "EVENT") return counts.events;
      return counts.resources;
    }
    const bucket = buckets[key];
    if (!bucket.loaded && !bucket.loading) return "…";
    if (bucket.loading && bucket.emails.length === 0) return "…";
    return bucket.emails.length;
  };

  return (
    <div className="tabbed-dashboard">
      <div className="inbox-filter-tabs">
        {categories.map((cat) => {
          const isActive = activeFilter === cat.key;
          const count = getCategoryCount(cat.key);

          return (
            <button
              key={cat.key}
              className={`inbox-filter-tab ${isActive ? "inbox-filter-tab-active" : ""}`}
              onClick={() => {
                setActiveFilter(cat.key);
                setSelectedEmailId(null);
                setSelectedCategory(null);
                void ensureBucketLoaded(cat.key);
              }}
              style={{ "--filter-color": cat.color } as React.CSSProperties}
            >
              {cat.key !== "ALL" && (
                <span className="inbox-filter-badge" style={{ background: cat.color }}>
                  {cat.icon}
                </span>
              )}
              <span className="inbox-filter-label">{cat.label}</span>
              <span className="inbox-filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="tabbed-content">
        <div className="list-panel">
          <div className="list-panel-header">
            <div className="list-panel-title-row">
              <h2 className="list-panel-title" style={{ fontSize: 20 }}>
                {activeFilter === "ALL"
                  ? "All Messages"
                  : categories.find((c) => c.key === activeFilter)?.label}
              </h2>
              <div className="list-panel-count">{getCategoryCount(activeFilter)}</div>
            </div>
          </div>

          <div className="list-panel-content">
            {activeBucket.loading && filteredEmails.length === 0 ? (
              <div className="section-empty">
                <div className="empty-icon">&#8635;</div>
                <div className="empty-message">Loading messages...</div>
              </div>
            ) : activeBucket.error ? (
              <div className="section-empty">
                <div className="empty-icon">&#9888;</div>
                <div className="empty-message">{activeBucket.error}</div>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="section-empty">
                <div className="empty-icon">&#8709;</div>
                <div className="empty-message">No messages found</div>
              </div>
            ) : (
              <div>
                {filteredEmails.map(({ email, categoryConfig }) => {
                  const isSelected = selectedEmailId === email.id;
                  const mediaPresent = hasMedia(email);

                  return (
                    <div
                      key={email.id}
                      className={`inbox-item ${isSelected ? "inbox-item-selected" : ""}`}
                      onClick={() => void handleSelectEmail(email, categoryConfig)}
                    >
                      <div
                        className="inbox-category-badge"
                        style={{ background: categoryConfig.color }}
                        title={categoryConfig.label}
                      >
                        {categoryConfig.icon}
                      </div>

                      <div className="inbox-item-content">
                        <div className="inbox-item-subject">
                          {email.subject || "(No subject)"}
                        </div>
                        <div className="inbox-item-meta">
                          {email.from_name && (
                            <span className="inbox-item-from">{email.from_name}</span>
                          )}
                          <span className="inbox-item-date">{formatSentDate(email.sent_at)}</span>
                          {email.is_bump === 1 && <span className="bump-badge">BUMP</span>}
                        </div>
                      </div>

                      {mediaPresent && (
                        <div className="inbox-media-icon" title="Contains media">
                          &#9654;
                        </div>
                      )}
                    </div>
                  );
                })}

                <div ref={loadMoreRef} style={{ height: 1 }} />

                {activeBucket.loading && activeBucket.loaded && (
                  <div style={{ padding: "10px 0", fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" }}>
                    Loading more...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="inbox-detail-desktop">
          {detailLoadingId && selectedEmailId === detailLoadingId && (
            <div style={{ padding: "var(--space-sm)", fontSize: 12, color: "var(--text-tertiary)" }}>
              Loading full email...
            </div>
          )}
          <EmailDetailPanel
            email={selectedEmail}
            type={selectedCategory?.detailType ?? "grant"}
          />
        </div>
      </div>

      {selectedEmail && (
        <div
          className="inbox-modal-overlay"
          onClick={() => { setSelectedEmailId(null); setSelectedCategory(null); }}
        >
          <div
            className="inbox-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inbox-modal-handle" />
            <EmailDetailPanel
              email={selectedEmail}
              type={selectedCategory?.detailType ?? "grant"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
