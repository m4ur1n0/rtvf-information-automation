"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  onSearch: (q: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchBar({
  onSearch,
  placeholder = "Search emails...",
  debounceMs = 160,
}: SearchBarProps) {
  const [input, setInput] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSearch = useCallback(
    (q: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSearch(q.trim()), debounceMs);
    },
    [onSearch, debounceMs],
  );

  const flushSearch = useCallback(
    (q: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      onSearch(q.trim());
    },
    [onSearch],
  );

  // Cleanup on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    scheduleSearch(val);
  };

  const handleClear = () => {
    setInput("");
    flushSearch("");
  };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Search
        size={14}
        style={{
          position: "absolute",
          left: "12px",
          color: "var(--text-muted)",
          pointerEvents: "none",
        }}
      />
      <input
        type="text"
        value={input}
        onChange={handleChange}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") flushSearch(input);
        }}
        style={{
          width: "100%",
          padding: "8px 36px 8px 34px",
          fontSize: "13px",
          fontFamily: "var(--font-sans)",
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-primary)",
          outline: "none",
          transition: "border-color 0.15s ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--border-emphasis)";
        }}
        onBlur={(e) => {
          flushSearch(input);
          e.currentTarget.style.borderColor = "var(--border-default)";
        }}
      />
      {input && (
        <button
          onClick={handleClear}
          aria-label="Clear search"
          style={{
            position: "absolute",
            right: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            border: "none",
            background: "var(--bg-elevated)",
            color: "var(--text-muted)",
            cursor: "pointer",
            transition: "color 0.15s ease",
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

// ── Highlight utility ─────────────────────────────────────────────────────────

/**
 * Wraps matched query terms in <mark> so they highlight in the UI.
 * Splits the query into words and highlights each independently.
 */
export function highlightMatches(
  text: string,
  query: string,
): React.ReactNode[] {
  if (!query.trim() || !text) return [text];

  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length === 0) return [text];

  const pattern = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        style={{
          background: "color-mix(in srgb, var(--accent-event) 35%, transparent)",
          color: "inherit",
          padding: "0 1px",
          borderRadius: "2px",
        }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
