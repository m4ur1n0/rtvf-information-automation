"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ParsedEmailRow } from "@/lib/api";

interface SearchFetchParams {
  limit: number;
  offset: number;
  q?: string;
  groupBumps?: boolean;
}

type FetchFn = (params: SearchFetchParams) => Promise<ParsedEmailRow[]>;

function mergeUniqueById(
  existing: ParsedEmailRow[],
  incoming: ParsedEmailRow[],
): ParsedEmailRow[] {
  const byId = new Map<string, ParsedEmailRow>();
  for (const row of existing) byId.set(row.id, row);
  for (const row of incoming) byId.set(row.id, row);
  return Array.from(byId.values()).sort((a, b) => b.sent_at - a.sent_at);
}

/**
 * Centralized hook for search + paginated data loading.
 *
 * - Uses a generation counter to discard stale responses from previous searches.
 * - Keeps old results visible until new ones arrive (no flash of empty state).
 * - Supports `loadAll` mode for pages that need the full dataset upfront.
 */
export function useSearchableData(
  fetchFn: FetchFn,
  searchQuery: string,
  options: {
    pageSize?: number;
    loadAll?: boolean;
    groupBumps?: boolean;
  } = {},
) {
  const { pageSize = 25, loadAll = false, groupBumps = true } = options;

  const [items, setItems] = useState<ParsedEmailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [hasMore, setHasMore] = useState(true);

  const genRef = useRef(0);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  // Keep refs for values used inside the stable `load` callback
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;
  const searchRef = useRef(searchQuery);
  searchRef.current = searchQuery;

  const load = useCallback(
    async (reset: boolean) => {
      if (loadingRef.current && !reset) return;
      if (!reset && !hasMoreRef.current) return;

      const gen = reset ? ++genRef.current : genRef.current;
      const offset = reset ? 0 : offsetRef.current;

      if (reset) {
        offsetRef.current = 0;
        hasMoreRef.current = true;
        setHasMore(true);
      }

      loadingRef.current = true;
      setLoading(true);
      setError(undefined);

      try {
        if (loadAll && reset) {
          // Fetch all pages in sequence
          const all: ParsedEmailRow[] = [];
          let currentOffset = 0;
          const batchSize = 200;
          while (true) {
            if (gen !== genRef.current) return;
            const rows = await fetchFnRef.current({
              limit: batchSize,
              offset: currentOffset,
              q: searchRef.current || undefined,
              groupBumps,
            });
            all.push(...rows);
            if (rows.length < batchSize || all.length >= 2000) break;
            currentOffset += rows.length;
          }
          if (gen !== genRef.current) return;
          const byId = new Map<string, ParsedEmailRow>();
          for (const r of all) byId.set(r.id, r);
          setItems(Array.from(byId.values()));
          hasMoreRef.current = false;
          setHasMore(false);
        } else {
          const rows = await fetchFnRef.current({
            limit: pageSize,
            offset,
            q: searchRef.current || undefined,
            groupBumps,
          });
          if (gen !== genRef.current) return;

          if (reset) {
            setItems(rows);
          } else {
            setItems((prev) => mergeUniqueById(prev, rows));
          }
          offsetRef.current = offset + rows.length;
          const more = rows.length >= pageSize;
          hasMoreRef.current = more;
          setHasMore(more);
        }
      } catch (err) {
        if (gen !== genRef.current) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (gen === genRef.current) {
          loadingRef.current = false;
          setLoading(false);
          setInitialLoading(false);
        }
      }
    },
    [pageSize, loadAll, groupBumps],
  );

  // Fetch on mount and whenever searchQuery changes
  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const loadMore = useCallback(() => {
    void load(false);
  }, [load]);

  return { items, loading, initialLoading, error, hasMore, loadMore };
}
