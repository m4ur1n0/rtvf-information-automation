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
  fetchThread,
  fetchTotalMessages,
  type CategoryCounts,
  type ParsedEmailRow,
} from "@/lib/api";
import { EmailDetailPanel } from "./EmailDetailPanel";
import { formatSentDate } from "@/lib/format";
import { SearchBar, highlightMatches } from "./SearchBar";

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

async function fetchBucket(filter: CategoryFilter, offset: number, q?: string): Promise<ParsedEmailRow[]> {
  switch (filter) {
    case "ALL":
      return fetchEmails({ limit: PAGE_SIZE, offset, summary: true, q });
    case "GRANT":
      return fetchGrants({ limit: PAGE_SIZE, offset, summary: true, q });
    case "CREW_CALL":
      return fetchPetitions({ limit: PAGE_SIZE, offset, casting: false, summary: true, q });
    case "CASTING":
      return fetchPetitions({ limit: PAGE_SIZE, offset, casting: true, summary: true, q });
    case "EVENT":
      return fetchEvents({ limit: PAGE_SIZE, offset, summary: true, q });
    case "RESOURCE":
      return fetchResources({ limit: PAGE_SIZE, offset, summary: true, q });
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
  const [expandedThreadByKey, setExpandedThreadByKey] = useState<Record<string, boolean>>({});
  const [threadRowsByKey, setThreadRowsByKey] = useState<Record<string, ParsedEmailRow[]>>({});
  const [threadLoadingByKey, setThreadLoadingByKey] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const searchQueryRef = useRef("");
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
      const q = searchQueryRef.current || undefined;
      const rows = await fetchBucket(filter, requestOffset, q);
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

  // Reset & re-fetch when search query changes
  const handleSearch = useCallback((q: string) => {
    searchQueryRef.current = q;
    setSearchQuery(q);
    setExpandedThreadByKey({});
    setThreadRowsByKey({});
    setThreadLoadingByKey({});
    // Reset all buckets so they re-load with the new query
    setBuckets(initialBuckets());
    bucketsRef.current = initialBuckets();
  }, []);

  // Re-fetch active bucket after resetting due to search
  useEffect(() => {
    const bucket = bucketsRef.current[activeFilter];
    if (!bucket.loaded && !bucket.loading) {
      void ensureBucketLoaded(activeFilter);
    }
  }, [searchQuery, activeFilter, ensureBucketLoaded]);

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

  const toggleThread = useCallback(async (email: ParsedEmailRow) => {
    const threadKey = email.thread_key;
    if (!threadKey || email.bump_count <= 0) return;

    const isExpanded = Boolean(expandedThreadByKey[threadKey]);
    if (isExpanded) {
      setExpandedThreadByKey((prev) => ({ ...prev, [threadKey]: false }));
      return;
    }

    setExpandedThreadByKey((prev) => ({ ...prev, [threadKey]: true }));
    if (threadRowsByKey[threadKey] || threadLoadingByKey[threadKey]) return;

    setThreadLoadingByKey((prev) => ({ ...prev, [threadKey]: true }));
    try {
      const rows = await fetchThread(threadKey);
      setThreadRowsByKey((prev) => ({ ...prev, [threadKey]: rows }));
    } catch (error) {
      console.error("[inbox] failed to fetch thread", error);
    } finally {
      setThreadLoadingByKey((prev) => ({ ...prev, [threadKey]: false }));
    }
  }, [expandedThreadByKey, threadRowsByKey, threadLoadingByKey]);

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
      <div className="dashboard-search-row">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search emails..."
        />
      </div>

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

      <div className="grants-layout">
        <div className="grants-list-main">
          <div className="list-panel" style={{ flex: '1 1 auto' }}>
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
                    const threadKey = email.thread_key ?? "";
                    const hasBumps = Boolean(email.thread_key) && email.bump_count > 0;
                    const isThreadExpanded = hasBumps ? Boolean(expandedThreadByKey[threadKey]) : false;
                    const threadRows = hasBumps ? (threadRowsByKey[threadKey] ?? []) : [];
                    const bumpChildren = threadRows
                      .filter((row) => row.id !== email.id && row.is_bump === 1)
                      .sort((a, b) => a.sent_at - b.sent_at);

                    return (
                      <div key={email.id}>
                        <div
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
                            {searchQuery
                              ? highlightMatches(email.subject || "(No subject)", searchQuery)
                              : (email.subject || "(No subject)")}
                          </div>
                          <div className="inbox-item-meta">
                            {email.from_name && (
                              <span className="inbox-item-from">
                                {searchQuery
                                  ? highlightMatches(email.from_name, searchQuery)
                                  : email.from_name}
                              </span>
                            )}
                              <span className="inbox-item-date">{formatSentDate(email.sent_at)}</span>
                              {email.is_bump === 1 && <span className="bump-badge">BUMP</span>}
                            </div>
                            {searchQuery && email.search_snippets && (
                              <div
                                style={{
                                  marginTop: "2px",
                                  fontSize: "12px",
                                  color: "var(--text-tertiary)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {highlightMatches(email.search_snippets, searchQuery)}
                              </div>
                            )}
                          </div>

                          {mediaPresent && (
                            <div className="inbox-media-icon" title="Contains media">
                              &#9654;
                            </div>
                          )}
                        </div>

                        {hasBumps && (
                          <div style={{ paddingLeft: "40px", marginTop: "4px", marginBottom: "6px" }}>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                void toggleThread(email);
                              }}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "var(--text-tertiary)",
                                fontSize: "12px",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              {isThreadExpanded ? "▾" : "▸"} {email.bump_count} {email.bump_count === 1 ? "bump" : "bumps"}
                            </button>
                          </div>
                        )}

                        {hasBumps && isThreadExpanded && (
                          <div
                            style={{
                              marginLeft: "40px",
                              marginBottom: "8px",
                              borderLeft: "1px solid var(--border-subtle)",
                              paddingLeft: "12px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                            }}
                          >
                            {threadLoadingByKey[threadKey] && (
                              <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                                Loading thread...
                              </div>
                            )}
                            {!threadLoadingByKey[threadKey] && bumpChildren.map((bump) => {
                              const bumpConfig = getCategoryConfig(bump);
                              const bumpSelected = selectedEmailId === bump.id;
                              return (
                                <div
                                  key={bump.id}
                                  className={`inbox-item ${bumpSelected ? "inbox-item-selected" : ""}`}
                                  style={{ minHeight: "unset", padding: "8px 10px" }}
                                  onClick={() => void handleSelectEmail(bump, bumpConfig)}
                                >
                                  <div className="inbox-item-content">
                                    <div className="inbox-item-subject" style={{ fontSize: "13px" }}>
                                      {searchQuery
                                        ? highlightMatches(bump.subject || "(No subject)", searchQuery)
                                        : (bump.subject || "(No subject)")}
                                    </div>
                                    <div className="inbox-item-meta">
                                      <span className="inbox-item-date">{formatSentDate(bump.sent_at)}</span>
                                      <span className="bump-badge">BUMP</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
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
        </div>

        <div className="grants-sidebar-desktop">
          <div className="grants-detail-panel">
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
