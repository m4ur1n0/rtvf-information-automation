"use client";

import { useState, useMemo } from "react";
import type { ParsedEmailRow } from "@/lib/api";
import { EmailDetailPanel } from "./EmailDetailPanel";
import { formatSentDate } from "@/lib/format";

interface InboxDashboardProps {
  grants: { emails: ParsedEmailRow[]; error?: string };
  crewCalls: { emails: ParsedEmailRow[]; error?: string };
  resources: { emails: ParsedEmailRow[]; error?: string };
  castingCalls: { emails: ParsedEmailRow[]; error?: string };
  events: { emails: ParsedEmailRow[]; error?: string };
}

type CategoryFilter = "ALL" | "GRANT" | "CREW_CALL" | "CASTING" | "EVENT" | "RESOURCE";

interface CategoryConfig {
  key: CategoryFilter;
  label: string;
  shortLabel: string;
  color: string;
  detailType: "grant" | "crew" | "casting" | "resource" | "event";
}

const categories: CategoryConfig[] = [
  { key: "ALL", label: "All", shortLabel: "All", color: "var(--text-secondary)", detailType: "grant" },
  { key: "CREW_CALL", label: "Crew", shortLabel: "C", color: "var(--accent-crew)", detailType: "crew" },
  { key: "GRANT", label: "Grants", shortLabel: "$", color: "var(--accent-grant)", detailType: "grant" },
  { key: "CASTING", label: "Casting", shortLabel: "A", color: "var(--accent-casting)", detailType: "casting" },
  { key: "EVENT", label: "Events", shortLabel: "E", color: "var(--accent-event)", detailType: "event" },
  { key: "RESOURCE", label: "Equipment", shortLabel: "R", color: "var(--accent-resource)", detailType: "resource" },
];

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

export function InboxDashboard({ grants, crewCalls, resources, castingCalls, events }: InboxDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("ALL");
  const [selectedEmail, setSelectedEmail] = useState<ParsedEmailRow | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryConfig | null>(null);

  const allEmails = useMemo(() => {
    const merged: { email: ParsedEmailRow; categoryConfig: CategoryConfig }[] = [];

    grants.emails.forEach((e) => merged.push({ email: e, categoryConfig: getCategoryConfig(e) }));
    crewCalls.emails.forEach((e) => merged.push({ email: e, categoryConfig: getCategoryConfig(e) }));
    castingCalls.emails.forEach((e) => merged.push({ email: e, categoryConfig: getCategoryConfig(e) }));
    events.emails.forEach((e) => merged.push({ email: e, categoryConfig: getCategoryConfig(e) }));
    resources.emails.forEach((e) => merged.push({ email: e, categoryConfig: getCategoryConfig(e) }));

    merged.sort((a, b) => b.email.sent_at - a.email.sent_at);
    return merged;
  }, [grants, crewCalls, resources, castingCalls, events]);

  const filteredEmails = useMemo(() => {
    if (activeFilter === "ALL") return allEmails;
    return allEmails.filter((item) => item.categoryConfig.key === activeFilter);
  }, [allEmails, activeFilter]);

  const handleSelectEmail = (email: ParsedEmailRow, config: CategoryConfig) => {
    setSelectedEmail(email);
    setSelectedCategory(config);
  };

  return (
    <div className="tabbed-dashboard">
      {/* Compact filter chips */}
      <div className="inbox-filter-tabs">
        {categories.map((cat) => {
          const isActive = activeFilter === cat.key;
          const count =
            cat.key === "ALL"
              ? allEmails.length
              : allEmails.filter((item) => item.categoryConfig.key === cat.key).length;

          return (
            <button
              key={cat.key}
              className={`inbox-filter-tab ${isActive ? "inbox-filter-tab-active" : ""}`}
              onClick={() => {
                setActiveFilter(cat.key);
                setSelectedEmail(null);
                setSelectedCategory(null);
              }}
              style={{ "--filter-color": cat.color } as React.CSSProperties}
            >
              {cat.key !== "ALL" && (
                <span className="inbox-filter-badge" style={{ background: cat.color }}>
                  {cat.shortLabel}
                </span>
              )}
              <span className="inbox-filter-label">{cat.label}</span>
              <span className="inbox-filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="tabbed-content">
        {/* Left Side: Inbox List */}
        <div className="list-panel">
          <div className="list-panel-header">
            <div className="list-panel-title-row">
              <h2 className="list-panel-title" style={{ fontSize: 20 }}>
                {activeFilter === "ALL"
                  ? "All Messages"
                  : categories.find((c) => c.key === activeFilter)?.label}
              </h2>
              <div className="list-panel-count">{filteredEmails.length}</div>
            </div>
          </div>

          <div className="list-panel-content">
            {filteredEmails.length === 0 ? (
              <div className="section-empty">
                <div className="empty-icon">&#8709;</div>
                <div className="empty-message">No messages found</div>
              </div>
            ) : (
              <div>
                {filteredEmails.map(({ email, categoryConfig }) => {
                  const isSelected = selectedEmail?.id === email.id;
                  const mediaPresent = hasMedia(email);

                  return (
                    <div
                      key={email.id}
                      className={`inbox-item ${isSelected ? "inbox-item-selected" : ""}`}
                      onClick={() => handleSelectEmail(email, categoryConfig)}
                    >
                      <div
                        className="inbox-category-badge"
                        style={{ background: categoryConfig.color }}
                        title={categoryConfig.label}
                      >
                        {categoryConfig.shortLabel}
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
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detail Panel */}
        <EmailDetailPanel
          email={selectedEmail}
          type={selectedCategory?.detailType ?? "grant"}
        />
      </div>
    </div>
  );
}
