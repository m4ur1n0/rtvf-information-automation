"use client";

import { useState, useMemo, useEffect } from "react";
import { addDays, format, isPast, isWithinInterval } from "date-fns";
import type { ParsedEmailRow } from "@/lib/api";
import { EmailDetailPanel } from "./EmailDetailPanel";
import { GoogleCalendarLink } from "./GoogleCalendarLink";

type PetitionStatus = "active" | "deadline-soon" | "past" | "unclear";
type StatusFilter = "all" | "active" | "deadline-soon" | "past";

interface StatusConfig {
  label: string;
  color: string;
  badgeClass: string;
}

const STATUS_MAP: Record<PetitionStatus, StatusConfig> = {
  active: {
    label: "Active",
    color: "var(--status-open)",
    badgeClass: "status-open",
  },
  "deadline-soon": {
    label: "Deadline Soon",
    color: "var(--status-upcoming)",
    badgeClass: "status-upcoming",
  },
  past: {
    label: "Past Deadline",
    color: "var(--status-closed)",
    badgeClass: "status-closed",
  },
  unclear: {
    label: "No Deadline",
    color: "var(--status-unclear)",
    badgeClass: "status-unclear",
  },
};

const STATUS_SECTIONS: { key: PetitionStatus; heading: string }[] = [
  { key: "active", heading: "Active Petitions" },
  { key: "deadline-soon", heading: "Deadline Soon" },
  { key: "unclear", heading: "No Deadline Listed" },
  { key: "past", heading: "Past Deadline" },
];

// ── Utility functions ────────────────────────────────────────────────────────

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function inferRolesFromEmail(email: ParsedEmailRow): string[] {
  if (email.roles_mentioned && email.roles_mentioned.length > 0) {
    return uniqueStrings(email.roles_mentioned);
  }

  const text = `${email.subject}\n${email.body_text}`.toLowerCase();
  const inferred: string[] = [];
  const addIf = (role: string, re: RegExp) => {
    if (re.test(text)) inferred.push(role);
  };

  addIf("DP", /\bdp\b|director of photography|cinematograph/);
  addIf("Sound", /sound designer|sound mixer|\bboom\b|production sound/);
  addIf("Editor", /\beditor\b|editing/);
  addIf("Gaffer/Grip", /\bgaffer\b|\bgrip\b/);
  addIf("Producer", /\bproducer\b|production manager|line producer|\bupm\b/);
  addIf("AD", /assistant director|\b1st ad\b|\b2nd ad\b/);
  addIf("PA", /\bpa\b|production assistant/);

  if (email.tags.includes("CASTING_EXTRAS")) inferred.push("Extras");
  if (email.tags.includes("CASTING_ROLES")) inferred.push("Actor");

  return uniqueStrings(inferred);
}

function toHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractApplicationLink(email: ParsedEmailRow): string | null {
  return toHttpUrl(email.application_url) ?? toHttpUrl(email.petition_location);
}

function extractScriptLink(email: ParsedEmailRow): string | null {
  return toHttpUrl(email.script_url);
}

function parseMailbox(raw: string | null | undefined): {
  name: string | null;
  email: string | null;
} {
  if (!raw) return { name: null, email: null };
  const trimmed = raw.trim();
  if (!trimmed) return { name: null, email: null };
  const m = trimmed.match(/^\s*"?([^"<]*)"?\s*<\s*([^>]+)\s*>\s*$/);
  if (m) {
    const name = m[1].trim().replace(/^"|"$/g, "");
    const email = m[2].trim();
    return { name: name || null, email: email || null };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { name: null, email: trimmed };
  }
  return { name: trimmed, email: null };
}

function resolveContact(email: ParsedEmailRow): {
  name: string | null;
  email: string | null;
} {
  const fromEmailParsed = parseMailbox(email.from_email);
  const fromNameParsed = parseMailbox(email.from_name);
  const name =
    (email.from_name && !fromNameParsed.email
      ? email.from_name.trim()
      : null) ||
    fromEmailParsed.name ||
    fromNameParsed.name ||
    null;
  const address = fromEmailParsed.email || fromNameParsed.email || null;
  return { name, email: address };
}

function resolveStatus(email: ParsedEmailRow): PetitionStatus {
  if (!email.deadline_at) return "unclear";

  const deadline = new Date(email.deadline_at * 1000);
  const now = new Date();

  if (isPast(deadline)) return "past";

  const soon = addDays(now, 7);
  if (isWithinInterval(deadline, { start: now, end: soon }))
    return "deadline-soon";

  return "active";
}

function formatDeadline(deadlineAt: number | null): string | null {
  if (!deadlineAt) return null;
  return new Date(deadlineAt * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildCalUrl(
  email: ParsedEmailRow,
  contactEmail: string | null,
): string | null {
  if (!email.deadline_at) return null;
  const deadlineDate = new Date(email.deadline_at * 1000);
  const startDate = format(deadlineDate, "yyyyMMdd");
  const endDate = format(addDays(deadlineDate, 1), "yyyyMMdd");
  const title = encodeURIComponent(
    email.film_title || email.subject || "Petition Deadline",
  );
  const details = encodeURIComponent(
    [
      email.logline ?? "",
      email.petition_location ? `Location: ${email.petition_location}` : "",
      contactEmail ? `Contact: ${contactEmail}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface PetitionCardProps {
  email: ParsedEmailRow;
  roles: string[];
  applicationUrl: string | null;
  scriptUrl: string | null;
  calendarUrl: string | null;
  isSelected: boolean;
  onSelect: () => void;
}

function PetitionCard({
  email,
  roles,
  applicationUrl,
  scriptUrl,
  calendarUrl,
  isSelected,
  onSelect,
}: PetitionCardProps) {
  const status = resolveStatus(email);
  const config = STATUS_MAP[status];
  const deadline = formatDeadline(email.deadline_at);
  const contact = resolveContact(email);
  const petitionLocationUrl = toHttpUrl(email.petition_location);

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
          e.currentTarget.style.background = "var(--bg-elevated)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = "var(--border-subtle)";
          e.currentTarget.style.background = "var(--bg-tertiary)";
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
        {/* Header row: status dot + title + chevron */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
          }}
        >
          <span
            className={`status-dot ${config.badgeClass}`}
            style={{ flexShrink: 0 }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {email.film_title || email.subject || "(No title)"}
            </div>
          </div>

          <span
            style={{
              color: "var(--text-tertiary)",
              fontSize: "14px",
              flexShrink: 0,
            }}
          >
            {isSelected ? "‹" : "›"}
          </span>
        </div>

        {/* Logline */}
        {email.logline && (
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {email.logline}
          </p>
        )}

        {/* Production type, shoot dates, location */}
        {(email.production_type ||
          email.shoot_dates_text ||
          email.petition_location) && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            {email.production_type && (
              <div>
                <span style={{ fontWeight: 600 }}>Program:</span>{" "}
                {email.production_type}
              </div>
            )}
            {email.shoot_dates_text && (
              <div>
                <span style={{ fontWeight: 600 }}>Shoot:</span>{" "}
                {email.shoot_dates_text}
              </div>
            )}
            {email.petition_location && (
              <div>
                <span style={{ fontWeight: 600 }}>Apply:</span>{" "}
                {petitionLocationUrl ? (
                  <a
                    href={petitionLocationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: "var(--accent-casting)", textDecoration: "underline" }}
                  >
                    {email.petition_location}
                  </a>
                ) : (
                  email.petition_location
                )}
              </div>
            )}
          </div>
        )}

        {/* Roles badges */}
        {roles.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "4px",
              flexWrap: "wrap",
              marginTop: "2px",
            }}
          >
            {roles.slice(0, 4).map((role) => (
              <span
                key={role}
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  background:
                    "color-mix(in oklab, var(--accent-casting) 20%, var(--bg-secondary))",
                  color: "var(--accent-casting)",
                  border:
                    "1px solid color-mix(in oklab, var(--accent-casting) 30%, transparent)",
                }}
              >
                {role}
              </span>
            ))}
            {roles.length > 4 && (
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  padding: "2px 6px",
                  color: "var(--text-muted)",
                }}
              >
                +{roles.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Bottom row: director + deadline + action buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--space-md)",
            marginTop: "4px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--space-md)",
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {email.director_name
                ? `Director: ${email.director_name}`
                : contact.name || contact.email || ""}
            </div>

            {deadline && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: config.color,
                  flexShrink: 0,
                }}
              >
                {deadline}
              </div>
            )}
          </div>

          {/* CTA buttons - compact, side-aligned */}
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            {applicationUrl && (
              <a
                href={applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: "4px 12px",
                  background: "var(--accent-casting)",
                  border: "1px solid var(--accent-casting)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--bg-primary)",
                  textDecoration: "none",
                  fontSize: "11px",
                  fontWeight: 600,
                  transition: "opacity 0.15s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                Apply
              </a>
            )}
            {scriptUrl && (
              <a
                href={scriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: "4px 10px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--accent-casting)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--accent-casting)",
                  textDecoration: "none",
                  fontSize: "11px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Script
              </a>
            )}
            {calendarUrl && <GoogleCalendarLink url={calendarUrl} />}
          </div>
        </div>
      </button>
    </div>
  );
}

function ResourcesSidebar() {
  return (
    <aside
      className="grants-detail-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-md)",
      }}
    >
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-lg)",
        }}
      >
        <h3
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "var(--space-md)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          How Petitions Work
        </h3>
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          <p style={{ marginBottom: "var(--space-sm)" }}>
            Click any petition to see full details, application links, and
            contact information.
          </p>
          <p>
            Petitions are crew calls for student film projects. Apply early for
            the best opportunities.
          </p>
        </div>
      </div>

      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-lg)",
        }}
      >
        <h3
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "var(--space-md)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Role Glossary
        </h3>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-sm)",
            fontSize: "12px",
          }}
        >
          {[
            { role: "DP", desc: "Director of Photography" },
            { role: "AD", desc: "Assistant Director" },
            { role: "PA", desc: "Production Assistant" },
            { role: "Sound", desc: "Sound Designer/Mixer" },
          ].map((item) => (
            <div key={item.role}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {item.role}
              </span>
              <span style={{ color: "var(--text-muted)" }}> — {item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ── Main dashboard component ──────────────────────────────────────────────────

export function PetitionsDashboard({
  emails,
  error,
  selectedId: externalSelectedId,
}: {
  emails: ParsedEmailRow[];
  error?: string;
  selectedId?: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(externalSelectedId || null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Update internal state when external selectedId changes
  useEffect(() => {
    if (externalSelectedId !== undefined) {
      setSelectedId(externalSelectedId);
    }
  }, [externalSelectedId]);

  const petitionsWithMeta = useMemo(() => {
    return emails
      .filter((email) => email.is_bump !== 1)
      .map((email) => {
        const sender = resolveContact(email);
        return {
          email,
          roles: inferRolesFromEmail(email),
          applicationUrl: extractApplicationLink(email),
          scriptUrl: extractScriptLink(email),
          sender,
          calendarUrl: buildCalUrl(email, sender.email),
          status: resolveStatus(email),
        };
      });
  }, [emails]);

  const selectedPetition = useMemo(
    () => petitionsWithMeta.find((p) => p.email.id === selectedId) ?? null,
    [petitionsWithMeta, selectedId],
  );

  const allRoles = useMemo(() => {
    const roles = new Set<string>();
    for (const p of petitionsWithMeta) {
      for (const role of p.roles) roles.add(role);
    }
    return Array.from(roles).sort((a, b) => a.localeCompare(b));
  }, [petitionsWithMeta]);

  const filteredPetitions = useMemo(() => {
    let result = petitionsWithMeta;

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (roleFilter !== "all") {
      const normalized = roleFilter.toLowerCase();
      result = result.filter((p) =>
        p.roles.some((r) => r.toLowerCase() === normalized),
      );
    }

    return result.sort((a, b) => b.email.sent_at - a.email.sent_at);
  }, [petitionsWithMeta, statusFilter, roleFilter]);

  const grouped = useMemo(() => {
    const map: Record<PetitionStatus, typeof petitionsWithMeta> = {
      active: [],
      "deadline-soon": [],
      past: [],
      unclear: [],
    };
    filteredPetitions.forEach((p) => map[p.status].push(p));
    return map;
  }, [filteredPetitions]);

  const counts: Record<StatusFilter, number> = {
    all: petitionsWithMeta.length,
    active: petitionsWithMeta.filter((p) => p.status === "active").length,
    "deadline-soon": petitionsWithMeta.filter(
      (p) => p.status === "deadline-soon",
    ).length,
    past: petitionsWithMeta.filter((p) => p.status === "past").length,
  };

  const handleSelect = (id: string) => {
    setSelectedId((prev) => {
      const newId = prev === id ? null : id;
      // Update URL hash
      if (newId) {
        window.location.hash = newId;
      } else {
        // Clear hash without scrolling
        history.pushState("", document.title, window.location.pathname + window.location.search);
      }
      return newId;
    });
  };

  return (
    <>
      {error && (
        <div
          style={{
            padding: "var(--space-md) var(--space-lg)",
            background:
              "color-mix(in srgb, var(--status-closed) 12%, transparent)",
            border: "1px solid var(--status-closed)",
            borderRadius: "var(--radius-md)",
            color: "var(--status-closed)",
            fontSize: "13px",
            marginBottom: "var(--space-lg)",
          }}
        >
          Could not load petition data: {error}
        </div>
      )}

      {/* Filter bars */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-md)",
          marginBottom: "var(--space-lg)",
        }}
      >
        {/* Status filter */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-sm)",
            alignItems: "center",
            padding: "var(--space-md)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              fontSize: "12px",
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginRight: "var(--space-xs)",
            }}
          >
            Status:
          </label>
          {(["all", "active", "deadline-soon", "past"] as StatusFilter[]).map(
            (f) => {
              const active = statusFilter === f;
              const color =
                f === "all"
                  ? "var(--accent-casting)"
                  : STATUS_MAP[f as PetitionStatus].color;
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
                    color: active
                      ? "var(--bg-primary)"
                      : "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  {f === "all" ? "All" : STATUS_MAP[f as PetitionStatus].label}{" "}
                  <span style={{ opacity: 0.7 }}>({counts[f]})</span>
                </button>
              );
            },
          )}
        </div>

        {/* Role filter */}
        {allRoles.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "var(--space-sm)",
              alignItems: "center",
              padding: "var(--space-md)",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                fontSize: "12px",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginRight: "var(--space-xs)",
              }}
            >
              Role:
            </label>
            <button
              onClick={() => setRoleFilter("all")}
              style={{
                padding: "4px 12px",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                borderRadius: "9999px",
                border: `1px solid ${roleFilter === "all" ? "var(--accent-casting)" : "var(--border-default)"}`,
                background:
                  roleFilter === "all"
                    ? "var(--accent-casting)"
                    : "var(--bg-tertiary)",
                color:
                  roleFilter === "all"
                    ? "var(--bg-primary)"
                    : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              All Roles
            </button>
            {allRoles.map((role) => {
              const active = roleFilter === role;
              return (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  style={{
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    borderRadius: "9999px",
                    border: `1px solid ${active ? "var(--accent-casting)" : "var(--border-default)"}`,
                    background: active
                      ? "var(--accent-casting)"
                      : "var(--bg-tertiary)",
                    color: active
                      ? "var(--bg-primary)"
                      : "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {role}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main layout */}
      <div className="grants-layout">
        {/* Left: grouped petition list */}
        <div
          className="grants-list-main"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-xl)",
          }}
        >
          {STATUS_SECTIONS.map(({ key, heading }) => {
            const group = grouped[key];
            if (group.length === 0) return null;
            const config = STATUS_MAP[key];

            return (
              <section key={key}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "var(--space-md)",
                    marginBottom: "var(--space-md)",
                    paddingBottom: "var(--space-sm)",
                    borderBottom: `2px solid ${config.color}`,
                  }}
                >
                  <h2
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {heading}
                  </h2>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {group.length}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-sm)",
                  }}
                >
                  {group.map((petition) => (
                    <PetitionCard
                      key={petition.email.id}
                      email={petition.email}
                      roles={petition.roles}
                      applicationUrl={petition.applicationUrl}
                      scriptUrl={petition.scriptUrl}
                      calendarUrl={petition.calendarUrl}
                      isSelected={selectedId === petition.email.id}
                      onSelect={() => handleSelect(petition.email.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {filteredPetitions.length === 0 && (
            <div
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-xl)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "48px",
                  opacity: 0.3,
                  marginBottom: "var(--space-md)",
                }}
              >
                ∅
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                No petitions match this filter
              </div>
            </div>
          )}
        </div>

        {/* Right: detail panel or resources sidebar (desktop only) */}
        <div className="grants-sidebar-desktop">
          {selectedPetition ? (
            <div className="grants-detail-panel">
              <EmailDetailPanel
                email={selectedPetition.email}
                type="petition"
              />
            </div>
          ) : (
            <ResourcesSidebar />
          )}
        </div>
      </div>

      {/* Mobile bottom-sheet drawer */}
      {selectedPetition && (
        <div
          className="grants-modal-overlay"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="grants-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "40px",
                height: "4px",
                background: "var(--border-emphasis)",
                borderRadius: "9999px",
                margin: "10px auto 0",
              }}
            />
            <EmailDetailPanel email={selectedPetition.email} type="petition" />
          </div>
        </div>
      )}
    </>
  );
}
