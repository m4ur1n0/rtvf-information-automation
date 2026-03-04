"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { addDays, format } from "date-fns";
import type { ParsedEmailRow } from "@/lib/api";
import { EmailDetailPanel } from "./EmailDetailPanel";
import { GoogleCalendarLink } from "./GoogleCalendarLink";
import { SearchBar, highlightMatches } from "./SearchBar";

type GrantStatus = "open" | "upcoming" | "closed" | "unclear";
type StatusFilter = "all" | "open" | "upcoming" | "closed";

interface StatusConfig {
  label: string;
  color: string;
  badgeClass: string;
}

const STATUS_MAP: Record<GrantStatus, StatusConfig> = {
  open:    { label: "Open",           color: "var(--accent-grant)",    badgeClass: "status-open" },
  upcoming:{ label: "Upcoming",       color: "var(--accent-resource)", badgeClass: "status-upcoming" },
  closed:  { label: "Closed",         color: "var(--text-muted)",      badgeClass: "status-closed" },
  unclear: { label: "Status Unknown", color: "var(--text-tertiary)",   badgeClass: "status-unclear" },
};

const STATUS_SECTIONS: { key: GrantStatus; heading: string }[] = [
  { key: "open",    heading: "Open Now" },
  { key: "upcoming",heading: "Coming Soon" },
  { key: "unclear", heading: "Status Unknown" },
  { key: "closed",  heading: "Closed" },
];

function resolveStatus(email: ParsedEmailRow): GrantStatus {
  if (email.grant_status === "open"     || email.tags.includes("GRANT_OPEN"))     return "open";
  if (email.grant_status === "upcoming" || email.tags.includes("GRANT_UPCOMING")) return "upcoming";
  if (email.grant_status === "closed"   || email.tags.includes("GRANT_CLOSED"))   return "closed";
  return "unclear";
}

function formatDeadline(deadlineAt: number | null): string | null {
  if (!deadlineAt) return null;
  return new Date(deadlineAt * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildCalUrl(email: ParsedEmailRow): string | null {
  if (!email.deadline_at) return null;
  const d = new Date(email.deadline_at * 1000);
  const start = format(d, "yyyyMMdd");
  const end   = format(addDays(d, 1), "yyyyMMdd");
  const title   = encodeURIComponent(email.subject || "Grant Deadline");
  const details = encodeURIComponent(
    [
      email.grant_amount     ? `Amount: ${email.grant_amount}`         : "",
      email.eligibility_text ? `Eligibility: ${email.eligibility_text}`: "",
      email.application_url  ? `Apply: ${email.application_url}`       : "",
    ]
      .filter(Boolean)
      .join("\n")
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
}

function extractApplicationLink(email: ParsedEmailRow): string | null {
  return email.application_url || email.rsvp_url || null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GrantCard({
  email,
  applicationUrl,
  calendarUrl,
  searchQuery,
  isSelected,
  onSelect,
}: {
  email: ParsedEmailRow;
  applicationUrl: string | null;
  calendarUrl: string | null;
  searchQuery: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const status   = resolveStatus(email);
  const config   = STATUS_MAP[status];
  const deadline = formatDeadline(email.deadline_at);

  return (
    <div
      style={{
        width: "100%",
        background: isSelected ? "var(--bg-elevated)" : "var(--bg-tertiary)",
        border: `1px solid ${isSelected ? "var(--border-emphasis)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-md)",
        transition: "all 0.15s ease",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = "var(--border-default)";
          e.currentTarget.style.background  = "var(--bg-elevated)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = "var(--border-subtle)";
          e.currentTarget.style.background  = "var(--bg-tertiary)";
        }
      }}
    >
      <button
        onClick={onSelect}
        style={{
          width: "100%",
          padding: "var(--space-md) var(--space-lg)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          color: "inherit",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-sm)",
        }}
      >
        {/* Main row: status dot + title + org + amount + deadline + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          {/* Status dot */}
          <span className={`status-dot ${config.badgeClass}`} style={{ flexShrink: 0 }} />

          {/* Title + org */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginBottom: "2px",
            }}>
              {searchQuery
                ? highlightMatches(email.subject || "(No subject)", searchQuery)
                : (email.subject || "(No subject)")}
            </div>
            <div style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {searchQuery
                ? highlightMatches(email.from_name || email.from_email || "", searchQuery)
                : (email.from_name || email.from_email || "")}
            </div>
          </div>

          {/* Amount + deadline */}
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            {email.grant_amount && (
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--accent-grant)",
                marginBottom: "2px",
              }}>
                {email.grant_amount}
              </div>
            )}
            {deadline && (
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}>
                {deadline}
              </div>
            )}
          </div>

          <span style={{ color: "var(--text-tertiary)", fontSize: "14px", flexShrink: 0 }}>
            {isSelected ? "‹" : "›"}
          </span>
        </div>

        {/* CTA buttons row */}
        {(applicationUrl || calendarUrl) && (
          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
            {applicationUrl && (
              <a
                href={applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: "4px 12px",
                  background: "var(--accent-grant)",
                  border: "1px solid var(--accent-grant)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--bg-primary)",
                  textDecoration: "none",
                  fontSize: "11px",
                  fontWeight: 600,
                  transition: "opacity 0.15s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                Apply
              </a>
            )}
            {calendarUrl && <GoogleCalendarLink url={calendarUrl} />}
          </div>
        )}
      </button>
    </div>
  );
}

function ResourcesSidebar() {
  return (
    <aside className="grants-detail-panel" style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      {/* Faculty Contacts */}
      <div style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-lg)",
      }}>
        <h3 style={{
          fontSize: "12px", fontWeight: 700, color: "var(--text-primary)",
          marginBottom: "var(--space-md)", textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          Faculty Contacts
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {[
            { name: "Prof. Sarah Chen",  role: "MAG Advisor",         email: "sarah.chen@northwestern.edu" },
            { name: "Prof. David Kim",   role: "Production Faculty",  email: "david.kim@northwestern.edu" },
            { name: "RTF Main Office",   role: "General Inquiries",   email: "rtf@northwestern.edu" },
          ].map((c) => (
            <div key={c.email}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{c.name}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>{c.role}</div>
              <a href={`mailto:${c.email}`} style={{ fontSize: "12px", color: "var(--accent-grant)", textDecoration: "none", fontFamily: "var(--font-mono)" }}>
                {c.email}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Grant Writing Resources */}
      <div style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-lg)",
      }}>
        <h3 style={{
          fontSize: "12px", fontWeight: 700, color: "var(--text-primary)",
          marginBottom: "var(--space-md)", textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          Grant Writing Resources
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {[
            { label: "How to Write a Strong Pitch", href: "#" },
            { label: "Budget Template (Excel)",     href: "#" },
            { label: "Sample Application",          href: "#" },
            { label: "MAG FAQ",                     href: "#" },
          ].map((link) => (
            <a key={link.label} href={link.href} style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "var(--space-xs) 0",
              borderBottom: "1px solid var(--border-subtle)",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-grant)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <Link href="/calendar" style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "var(--space-sm)", padding: "var(--space-md) var(--space-lg)",
        background: "var(--accent-grant)", color: "var(--bg-primary)",
        borderRadius: "var(--radius-md)", textDecoration: "none",
        fontSize: "13px", fontWeight: 600, transition: "opacity 0.15s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
      >
        View Full Deadlines
      </Link>

      <div style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-lg)",
      }}>
        <h3 style={{
          fontSize: "12px", fontWeight: 700, color: "var(--text-primary)",
          marginBottom: "var(--space-md)", textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          Tips
        </h3>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <p style={{ marginBottom: "var(--space-sm)" }}>
            Click any grant to see the full email, extracted details, and application link.
          </p>
          <p>Start applications early — faculty recommendations and pitch videos take time to prepare.</p>
        </div>
      </div>
    </aside>
  );
}

// ── Main dashboard component ──────────────────────────────────────────────────

export function GrantsDashboard({
  emails,
  error,
  searchQuery,
  onSearchQueryChange,
}: {
  emails: ParsedEmailRow[];
  error?: string;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
}) {
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>("all");

  const selectedEmail = useMemo(
    () => emails.find((e) => e.id === selectedId) ?? null,
    [emails, selectedId]
  );

  const filteredEmails = useMemo(() => {
    let result = emails;

    if (statusFilter !== "all") {
      result = result.filter((e) => resolveStatus(e) === statusFilter);
    }

    return result;
  }, [emails, statusFilter]);

  const grouped = useMemo(() => {
    const map: Record<GrantStatus, ParsedEmailRow[]> = {
      open: [], upcoming: [], closed: [], unclear: [],
    };
    filteredEmails.forEach((e) => map[resolveStatus(e)].push(e));
    return map;
  }, [filteredEmails]);

  const counts: Record<StatusFilter, number> = {
    all:      emails.length,
    open:     emails.filter((e) => resolveStatus(e) === "open").length,
    upcoming: emails.filter((e) => resolveStatus(e) === "upcoming").length,
    closed:   emails.filter((e) => resolveStatus(e) === "closed").length,
  };

  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      {error && (
        <div style={{
          padding: "var(--space-md) var(--space-lg)",
          background: "color-mix(in srgb, var(--status-closed) 12%, transparent)",
          border: "1px solid var(--status-closed)",
          borderRadius: "var(--radius-md)",
          color: "var(--status-closed)",
          fontSize: "13px",
          marginBottom: "var(--space-lg)",
        }}>
          Could not load grant data: {error}
        </div>
      )}

      {/* Search */}
      <div className="dashboard-search-row">
        <SearchBar
          onSearch={onSearchQueryChange}
          placeholder="Search grants..."
        />
      </div>

      {/* Status Filter Bar */}
      <div style={{
        display: "flex",
        gap: "var(--space-sm)",
        alignItems: "center",
        padding: "var(--space-md)",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        marginBottom: "var(--space-lg)",
        flexWrap: "wrap",
      }}>
        <label style={{
          fontSize: "12px", color: "var(--text-tertiary)",
          textTransform: "uppercase", letterSpacing: "0.05em",
          marginRight: "var(--space-xs)",
        }}>
          Filter:
        </label>
        {(["all", "open", "upcoming", "closed"] as StatusFilter[]).map((f) => {
          const active = statusFilter === f;
          const color  = f === "all" ? "var(--accent-grant)" : STATUS_MAP[f as GrantStatus].color;
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: "4px 12px",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                borderRadius: "9999px",
                border: `1px solid ${active ? color : "var(--border-default)"}`,
                background: active ? color : "var(--bg-tertiary)",
                color: active ? "var(--bg-primary)" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              {f === "all" ? "All" : STATUS_MAP[f as GrantStatus].label}
              {" "}
              <span style={{ opacity: 0.7 }}>({counts[f]})</span>
            </button>
          );
        })}
      </div>

      {/* Main layout */}
      <div className="grants-layout">
        {/* Left: grouped grant list */}
        <div className="grants-list-main" style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {STATUS_SECTIONS.map(({ key, heading }) => {
            const group = grouped[key];
            if (group.length === 0) return null;
            const config = STATUS_MAP[key];

            return (
              <section key={key}>
                <div style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "var(--space-md)",
                  marginBottom: "var(--space-md)",
                  paddingBottom: "var(--space-sm)",
                  borderBottom: `2px solid ${config.color}`,
                }}>
                  <h2 style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}>
                    {heading}
                  </h2>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {group.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                  {group.map((email) => (
                    <GrantCard
                      key={email.id}
                      email={email}
                      applicationUrl={extractApplicationLink(email)}
                      calendarUrl={buildCalUrl(email)}
                      searchQuery={searchQuery}
                      isSelected={selectedId === email.id}
                      onSelect={() => handleSelect(email.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {filteredEmails.length === 0 && (
            <div style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-xl)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "48px", opacity: 0.3, marginBottom: "var(--space-md)" }}>∅</div>
              <div style={{ fontSize: "13px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                No grants match this filter
              </div>
            </div>
          )}
        </div>

        {/* Right: detail panel or resources sidebar (desktop only) */}
        <div className="grants-sidebar-desktop">
          {selectedEmail ? (
            <div className="grants-detail-panel">
              <EmailDetailPanel email={selectedEmail} type="grant" />
            </div>
          ) : (
            <ResourcesSidebar />
          )}
        </div>
      </div>

      {/* Mobile bottom-sheet drawer */}
      {selectedEmail && (
        <div
          className="grants-modal-overlay"
          onClick={() => setSelectedId(null)}
        >
          <div className="grants-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: "40px", height: "4px",
              background: "var(--border-emphasis)",
              borderRadius: "9999px",
              margin: "10px auto 0",
            }} />
            <EmailDetailPanel email={selectedEmail} type="grant" />
          </div>
        </div>
      )}
    </>
  );
}
