"use client";

import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, isToday, isBefore, addDays } from "date-fns";
import { DollarSign, ClipboardList, CalendarDays, Package } from "lucide-react";
import type { ParsedEmailRow } from "@/lib/api";

type Category = "grant" | "petition" | "event" | "equipment";

interface TimelineItem {
  id: string;
  title: string;
  category: Category;
  date: Date;
  detail: string;
  description: string;
  applicationUrl?: string;
  calendarUrl?: string;
}

const CATEGORY_CONFIG: Record<Category, { label: string; color: string; icon: React.ReactNode }> = {
  grant:     { label: "Grant Deadlines",    color: "#d4a574", icon: <DollarSign size={11} /> },
  petition:  { label: "Crew Call Deadlines",color: "#c27d9e", icon: <ClipboardList size={11} /> },
  event:     { label: "Events",             color: "#b8a9d4", icon: <CalendarDays size={11} /> },
  equipment: { label: "Equipment / Cage",   color: "#7daf8f", icon: <Package size={11} /> },
};

// Truly static institutional items that won't come from the email system
const STATIC_ITEMS: TimelineItem[] = [
  {
    id: "eq1",
    title: "Cage Checkout Window Opens",
    category: "equipment",
    date: new Date("2026-02-17"),
    detail: "Spring quarter reservations",
    description:
      "Equipment cage opens spring quarter reservation window. Reserve cameras, lenses, lighting kits, and audio gear. First-come, first-served for high-demand items.",
  },
  {
    id: "eq2",
    title: "Equipment Return Deadline",
    category: "equipment",
    date: new Date("2026-03-14"),
    detail: "All winter checkouts due",
    description:
      "All equipment checked out for winter quarter productions must be returned by 5pm. Late returns incur holds on future checkout privileges.",
  },
  {
    id: "eq3",
    title: "Cage Maintenance — Closed",
    category: "equipment",
    date: new Date("2026-03-20"),
    detail: "No checkouts available",
    description:
      "Equipment cage closed for annual maintenance and inventory. No checkouts or returns. Checkout resumes March 23.",
  },
];

function buildCalUrl(item: TimelineItem): string {
  if (item.calendarUrl) return item.calendarUrl;
  const start   = format(item.date, "yyyyMMdd");
  const end     = format(addDays(item.date, 1), "yyyyMMdd");
  const title   = encodeURIComponent(item.title);
  const details = encodeURIComponent(`${item.detail}\n\n${item.description}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
}

function emailsToTimelineItems(
  grantEmails:   ParsedEmailRow[],
  eventEmails:   ParsedEmailRow[],
  crewEmails:    ParsedEmailRow[],
): TimelineItem[] {
  const items: TimelineItem[] = [];

  grantEmails.forEach((e) => {
    if (!e.deadline_at) return;
    const calDetails = encodeURIComponent(
      [
        e.grant_amount     ? `Amount: ${e.grant_amount}`         : "",
        e.eligibility_text ? `Eligibility: ${e.eligibility_text}`: "",
        e.application_url  ? `Apply: ${e.application_url}`       : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
    const title = encodeURIComponent(e.subject || "Grant Deadline");
    const start = format(new Date(e.deadline_at * 1000), "yyyyMMdd");
    const end   = format(addDays(new Date(e.deadline_at * 1000), 1), "yyyyMMdd");

    items.push({
      id:          `grant-${e.id}`,
      title:       e.subject || "(No subject)",
      category:    "grant",
      date:        new Date(e.deadline_at * 1000),
      detail:      e.grant_amount ?? (e.from_name || "Grant deadline"),
      description: [
        e.eligibility_text && `Eligibility: ${e.eligibility_text}`,
        e.grant_scope      && `Scope: ${e.grant_scope}`,
        e.application_url  && `Apply: ${e.application_url}`,
      ].filter(Boolean).join("\n") || "",
      applicationUrl: e.application_url ?? undefined,
      calendarUrl: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${calDetails}`,
    });
  });

  eventEmails.forEach((e) => {
    if (!e.deadline_at) return;
    const title = encodeURIComponent(e.subject || "Event");
    const start = format(new Date(e.deadline_at * 1000), "yyyyMMdd");
    const end   = format(addDays(new Date(e.deadline_at * 1000), 1), "yyyyMMdd");
    const details = encodeURIComponent(
      [e.event_date_text, e.event_location].filter(Boolean).join(" · ")
    );

    items.push({
      id:          `event-${e.id}`,
      title:       e.subject || "(No subject)",
      category:    "event",
      date:        new Date(e.deadline_at * 1000),
      detail:      [e.event_location, e.event_date_text].filter(Boolean).join(" · ") || (e.from_name ?? "Event"),
      description: e.logline || "",
      calendarUrl: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`,
    });
  });

  crewEmails.forEach((e) => {
    if (!e.deadline_at) return;
    const title   = encodeURIComponent(e.subject || "Crew Call Deadline");
    const start   = format(new Date(e.deadline_at * 1000), "yyyyMMdd");
    const end     = format(addDays(new Date(e.deadline_at * 1000), 1), "yyyyMMdd");
    const details = encodeURIComponent(
      [
        e.film_title        && `Film: ${e.film_title}`,
        e.petition_location && `Where to petition: ${e.petition_location}`,
        e.shoot_dates_text  && `Shoot dates: ${e.shoot_dates_text}`,
      ].filter(Boolean).join("\n") || ""
    );

    items.push({
      id:       `crew-${e.id}`,
      title:    e.subject || "(No subject)",
      category: "petition",
      date:     new Date(e.deadline_at * 1000),
      detail:   e.petition_location || e.shoot_dates_text || (e.from_name ?? "Crew call"),
      description: [
        e.film_title       && `Film: ${e.film_title}`,
        e.production_type  && `Format: ${e.production_type}`,
        e.roles_mentioned?.length && `Roles: ${e.roles_mentioned.join(", ")}`,
      ].filter(Boolean).join("\n") || "",
      calendarUrl: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`,
    });
  });

  return items;
}

// ── Main component ────────────────────────────────────────────────────────────

export function CalendarDashboard({
  grantEmails,
  eventEmails,
  crewEmails,
}: {
  grantEmails: ParsedEmailRow[];
  eventEmails: ParsedEmailRow[];
  crewEmails:  ParsedEmailRow[];
}) {
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    new Set(["grant", "petition", "event", "equipment"])
  );
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const allItems = useMemo(() => {
    const emailItems = emailsToTimelineItems(grantEmails, eventEmails, crewEmails);
    return [...STATIC_ITEMS, ...emailItems];
  }, [grantEmails, eventEmails, crewEmails]);

  const toggleCategory = (cat: Category) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const filteredItems = useMemo(
    () =>
      allItems
        .filter((item) => activeCategories.has(item.category))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [allItems, activeCategories]
  );

  const weekGroups = useMemo(() => {
    const weekMap = new Map<string, { weekStart: Date; weekEnd: Date; items: TimelineItem[] }>();
    filteredItems.forEach((item) => {
      const ws  = startOfWeek(item.date, { weekStartsOn: 1 });
      const key = format(ws, "yyyy-MM-dd");
      if (!weekMap.has(key)) {
        weekMap.set(key, { weekStart: ws, weekEnd: endOfWeek(item.date, { weekStartsOn: 1 }), items: [] });
      }
      weekMap.get(key)!.items.push(item);
    });
    const groups = Array.from(weekMap.values());
    groups.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
    return groups;
  }, [filteredItems]);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayWeekKey = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const upcomingCount = filteredItems.filter((i) => !isBefore(i.date, now)).length;

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">Timeline</h1>
            <div className="header-stats">
              <div className="stat-pill stat-open">
                <span className="stat-value">{upcomingCount}</span>
                <span className="stat-label">upcoming</span>
              </div>
              <div className="stat-pill stat-total">
                <span className="stat-value">{filteredItems.length}</span>
                <span className="stat-label">total</span>
              </div>
            </div>
          </div>
          <p className="dashboard-subtitle">
            Deadlines and events from the RTVF listserv, organized by date
          </p>
        </div>
      </header>

      {/* Category Filters */}
      <div style={{
        display: "flex", gap: "6px", alignItems: "center",
        padding: "var(--space-md)",
        background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)", marginBottom: "var(--space-lg)", flexWrap: "wrap",
      }}>
        <label style={{
          fontSize: "12px", color: "var(--text-tertiary)",
          textTransform: "uppercase", letterSpacing: "0.05em",
          marginRight: "var(--space-xs)",
        }}>
          Show:
        </label>
        {(Object.keys(CATEGORY_CONFIG) as Category[]).map((cat) => {
          const config = CATEGORY_CONFIG[cat];
          const active = activeCategories.has(cat);
          const count  = allItems.filter((i) => i.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "5px 12px", fontSize: "13px",
                fontFamily: "var(--font-display)",
                borderRadius: "999px",
                border: `1px solid ${active ? config.color : "var(--border-subtle)"}`,
                background: active ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer", transition: "all 0.15s ease", fontWeight: 500,
                boxShadow: active ? `0 0 0 1px ${config.color}` : "none",
              }}
            >
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: "20px", height: "20px", borderRadius: "var(--radius-sm)",
                color: "var(--bg-primary)",
                background: config.color, opacity: active ? 1 : 0.4,
                flexShrink: 0,
              }}>
                {config.icon}
              </span>
              <span>{config.label}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
        {weekGroups.length === 0 && (
          <div style={{
            background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)", padding: "var(--space-xl)", textAlign: "center",
          }}>
            <div style={{ fontSize: "48px", opacity: 0.3, marginBottom: "var(--space-sm)" }}>∅</div>
            <div style={{ fontSize: "13px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              No items match the selected filters
            </div>
          </div>
        )}

        {weekGroups.map((group) => {
          const weekKey      = format(group.weekStart, "yyyy-MM-dd");
          const isCurrentWeek = weekKey === todayWeekKey;
          const isPastWeek   = isBefore(group.weekEnd, now);

          return (
            <section key={weekKey} style={{ opacity: isPastWeek ? 0.5 : 1 }}>
              {/* Week Header */}
              <div style={{
                display: "flex", alignItems: "center", gap: "var(--space-md)",
                marginBottom: "var(--space-md)", paddingBottom: "var(--space-sm)",
                borderBottom: `2px solid ${isCurrentWeek ? "var(--accent-crew)" : "var(--border-subtle)"}`,
              }}>
                <h2 style={{
                  fontSize: "14px", fontWeight: 700,
                  color: isCurrentWeek ? "var(--accent-crew)" : "var(--text-primary)",
                  textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-mono)",
                }}>
                  {format(group.weekStart, "MMM d")} – {format(group.weekEnd, "MMM d, yyyy")}
                </h2>
                {isCurrentWeek && (
                  <span style={{
                    fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: "var(--bg-primary)",
                    background: "var(--accent-crew)", padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                  }}>
                    This Week
                  </span>
                )}
                {isPastWeek && (
                  <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                    Past
                  </span>
                )}
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginLeft: "auto" }}>
                  {group.items.length} {group.items.length === 1 ? "item" : "items"}
                </span>
              </div>

              {/* Week Items */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                {group.items.map((item) => {
                  const config       = CATEGORY_CONFIG[item.category];
                  const isPast       = isBefore(item.date, now);
                  const isItemToday  = isToday(item.date);
                  const isExpanded   = expandedItem === item.id;

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: "var(--bg-tertiary)",
                        border: `1px solid ${isItemToday ? "var(--accent-crew)" : "var(--border-subtle)"}`,
                        borderRadius: "var(--radius-md)",
                        overflow: "hidden",
                        transition: "all 0.2s ease",
                        opacity: isPast ? 0.6 : 1,
                        boxShadow: isItemToday ? "0 0 0 1px var(--accent-crew)" : "none",
                      }}
                    >
                      <button
                        onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                        style={{
                          width: "100%", padding: "var(--space-md) var(--space-lg)",
                          background: "transparent", border: "none", cursor: "pointer",
                          textAlign: "left", color: "inherit",
                          display: "flex", alignItems: "center", gap: "var(--space-md)",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        {/* Date column */}
                        <div className="calendar-item-date" style={{ flexShrink: 0, width: "52px", textAlign: "center" }}>
                          <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: isItemToday ? "var(--accent-crew)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {format(item.date, "EEE")}
                          </div>
                          <div style={{ fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-mono)", color: isItemToday ? "var(--accent-crew)" : "var(--text-primary)", lineHeight: 1.2 }}>
                            {format(item.date, "d")}
                          </div>
                          <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                            {format(item.date, "MMM")}
                          </div>
                        </div>

                        {/* Category badge */}
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: "28px", height: "28px", borderRadius: "var(--radius-sm)",
                          color: "var(--bg-primary)",
                          background: config.color, flexShrink: 0,
                        }}>
                          {config.icon}
                        </div>

                        {/* Title & detail */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: "14px", fontWeight: 600, color: "var(--text-primary)",
                            marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {item.title}
                          </div>
                          <div style={{
                            fontSize: "12px", color: "var(--text-tertiary)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {item.detail}
                          </div>
                        </div>

                        {isItemToday && (
                          <span style={{
                            fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: "0.05em", color: "var(--accent-crew)",
                            background: "rgba(124, 160, 196, 0.15)", padding: "2px 8px",
                            borderRadius: "var(--radius-sm)", border: "1px solid var(--accent-crew)",
                            flexShrink: 0,
                          }}>
                            Today
                          </span>
                        )}

                        <span style={{
                          fontSize: "16px", color: "var(--text-tertiary)",
                          flexShrink: 0, fontFamily: "var(--font-mono)",
                          width: "20px", textAlign: "center",
                        }}>
                          {isExpanded ? "−" : "+"}
                        </span>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div style={{
                          padding: "var(--space-md) var(--space-lg)",
                          paddingTop: 0,
                          background: "var(--bg-secondary)",
                          borderTop: "1px solid var(--border-subtle)",
                          animation: "slideDown 0.2s ease",
                        }}>
                          <div style={{
                            display: "flex", gap: "var(--space-lg)",
                            alignItems: "flex-start", paddingTop: "var(--space-md)",
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: "10px", textTransform: "uppercase",
                                letterSpacing: "0.08em", color: "var(--text-muted)",
                                marginBottom: "var(--space-xs)", fontWeight: 600,
                              }}>
                                Details
                              </div>
                              {item.description ? (
                                <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                                  {item.description}
                                </div>
                              ) : (
                                <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                                  No additional details
                                </div>
                              )}

                              <div style={{
                                display: "flex", gap: "var(--space-md)",
                                marginTop: "var(--space-lg)", alignItems: "center", flexWrap: "wrap",
                              }}>
                                <span style={{
                                  fontSize: "11px", padding: "4px 8px",
                                  borderRadius: "var(--radius-sm)",
                                  background: `color-mix(in srgb, ${config.color} 15%, transparent)`,
                                  color: config.color, border: `1px solid ${config.color}`,
                                  fontFamily: "var(--font-mono)", textTransform: "uppercase",
                                }}>
                                  {config.label}
                                </span>
                                <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                                  {format(item.date, "EEEE, MMMM d, yyyy")}
                                </span>
                                {item.applicationUrl && (
                                  <a
                                    href={item.applicationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      fontSize: "12px", color: "var(--accent-grant)",
                                      textDecoration: "none", fontWeight: 600,
                                    }}
                                  >
                                    Apply →
                                  </a>
                                )}
                              </div>
                            </div>

                            <a
                              href={buildCalUrl(item)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Add to Google Calendar"
                              style={{
                                flexShrink: 0,
                                display: "inline-flex", alignItems: "center",
                                padding: "var(--space-sm) var(--space-md)",
                                background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                                borderRadius: "var(--radius-sm)", color: "var(--text-secondary)",
                                fontSize: "12px", fontFamily: "var(--font-mono)", fontWeight: 500,
                                textDecoration: "none", transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background   = config.color;
                                e.currentTarget.style.color        = "var(--bg-primary)";
                                e.currentTarget.style.borderColor  = config.color;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background   = "var(--bg-elevated)";
                                e.currentTarget.style.color        = "var(--text-secondary)";
                                e.currentTarget.style.borderColor  = "var(--border-default)";
                              }}
                            >
                              +Cal
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
