"use client";

import { useState } from "react";
import type { ParsedEmailRow } from "@/lib/api";
import { EmailDetailPanel } from "./EmailDetailPanel";
import { formatSentDate } from "@/lib/format";

interface TabbedDashboardProps {
  grants: { emails: ParsedEmailRow[]; error?: string };
  crewCalls: { emails: ParsedEmailRow[]; error?: string };
  resources: { emails: ParsedEmailRow[]; error?: string };
  castingCalls: { emails: ParsedEmailRow[]; error?: string };
  events: { emails: ParsedEmailRow[]; error?: string };
}

type Topic = "grants" | "crewCalls" | "castingCalls" | "resources" | "events";

interface TopicConfig {
  key: Topic;
  title: string;
  icon: string;
  accentColor: string;
}

type DetailType = "grant" | "crew" | "casting" | "resource" | "event";

const topics: TopicConfig[] = [
  { key: "crewCalls", title: "Crew Calls", icon: "◎", accentColor: "var(--accent-crew)" },
  { key: "grants", title: "Grants", icon: "$", accentColor: "var(--accent-grant)" },
  { key: "castingCalls", title: "Casting Calls", icon: "★", accentColor: "var(--accent-casting)" },
  { key: "events", title: "Events", icon: "◈", accentColor: "var(--accent-event)" },
  { key: "resources", title: "Equipment & Resources", icon: "⚙", accentColor: "var(--accent-resource)" },
];

export function TabbedDashboard({ grants, crewCalls, resources, castingCalls, events }: TabbedDashboardProps) {
  const [selectedTopic, setSelectedTopic] = useState<Topic>("crewCalls");
  const [selectedEmail, setSelectedEmail] = useState<ParsedEmailRow | null>(null);

  const topicData = {
    grants,
    crewCalls,
    resources,
    castingCalls,
    events,
  };

  const currentData = topicData[selectedTopic];
  const currentConfig = topics.find(t => t.key === selectedTopic)!;

  const getType = (topic: Topic): DetailType => {
    switch (topic) {
      case "grants": return "grant";
      case "crewCalls": return "crew";
      case "castingCalls": return "casting";
      case "resources": return "resource";
      case "events": return "event";
    }
  };

  const currentType = getType(selectedTopic);

  const getStatusCount = () => {
    if (selectedTopic === "grants") {
      return currentData.emails.filter(e => e.tags.includes("GRANT_OPEN")).length;
    }
    return 0;
  };

  const statusCount = getStatusCount();

  const getStatus = (type: DetailType, email: ParsedEmailRow) => {
    if (type === "grant") {
      if (email.tags.includes("GRANT_CLOSED")) {
        return { label: "Closed", color: "status-closed" };
      } else if (email.tags.includes("GRANT_OPEN")) {
        return { label: "Open", color: "status-open" };
      } else if (email.tags.includes("GRANT_UPCOMING")) {
        return { label: "Upcoming", color: "status-upcoming" };
      } else {
        return { label: "Unclear", color: "status-unclear" };
      }
    }

    if (type === "crew") {
      return { label: "Crew Call", color: "status-open" };
    }

    if (type === "casting") {
      const isExtras = email.tags.includes("CASTING_EXTRAS");
      return {
        label: isExtras ? "Extras" : "Roles",
        color: "status-casting",
      };
    }

    if (type === "event") {
      if (email.tags.includes("SCREENING")) return { label: "Screening", color: "status-event" };
      if (email.tags.includes("WORKSHOP")) return { label: "Workshop", color: "status-event" };
      if (email.tags.includes("PANEL")) return { label: "Panel", color: "status-event" };
      if (email.tags.includes("MEETING")) return { label: "Meeting", color: "status-event" };
      return { label: "Event", color: "status-event" };
    }

    if (type === "resource") {
      if (email.tags.includes("PROPS_COSTUMES")) {
        return { label: "Props/Costumes", color: "status-resource" };
      } else if (email.tags.includes("EQUIPMENT")) {
        return { label: "Equipment", color: "status-resource" };
      } else if (email.tags.includes("LOCATION")) {
        return { label: "Location", color: "status-resource" };
      } else {
        return { label: "Resource", color: "status-resource" };
      }
    }

    return { label: "Active", color: "status-open" };
  };

  return (
    <div className="tabbed-dashboard">
      {/* Topic Selection Buttons */}
      <div className="topic-tabs">
        {topics.map((topic) => {
          const data = topicData[topic.key];
          const isSelected = selectedTopic === topic.key;
          return (
            <button
              key={topic.key}
              className={`topic-tab ${isSelected ? "topic-tab-active" : ""}`}
              onClick={() => {
                setSelectedTopic(topic.key);
                setSelectedEmail(null);
              }}
              style={{ "--accent": topic.accentColor } as React.CSSProperties}
            >
              <span className="topic-tab-icon">{topic.icon}</span>
              <span className="topic-tab-title">{topic.title}</span>
              <span className="topic-tab-count">{data.emails.length}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="tabbed-content">
        {/* Left Side: List Card (60%) */}
        <div
          className="list-panel"
          style={{ "--accent": currentConfig.accentColor } as React.CSSProperties}
        >
          <div className="list-panel-header">
            <div className="list-panel-title-row">
              <div className="list-panel-icon">{currentConfig.icon}</div>
              <h2 className="list-panel-title">{currentConfig.title}</h2>
              <div className="list-panel-count">{currentData.emails.length}</div>
            </div>
            {selectedTopic === "grants" && statusCount > 0 && (
              <div className="list-panel-metric">
                <span className="metric-value">{statusCount}</span>
                <span className="metric-label">open</span>
              </div>
            )}
          </div>

          <div className="list-panel-content">
            {currentData.error ? (
              <div className="section-error">
                <div className="error-icon">&#9888;</div>
                <div className="error-message">Failed to load {currentConfig.title.toLowerCase()}</div>
              </div>
            ) : currentData.emails.length === 0 ? (
              <div className="section-empty">
                <div className="empty-icon">&#8709;</div>
                <div className="empty-message">No {currentConfig.title.toLowerCase()} found</div>
              </div>
            ) : (
              <div className="row-list">
                {currentData.emails.map((email) => {
                    const status = getStatus(currentType, email);

                    return (
                        <div
                            key={email.id}
                            className={`list-item-wrapper flex justify-between items-center ${selectedEmail?.id === email.id ? "list-item-selected" : ""}`}
                            onClick={() => setSelectedEmail(email)}
                        >
                            <div className="list-item-header">
                                <div className="list-item-main">
                                    <div className="list-item-subject">{email.subject || "(No subject)"}</div>
                                    <div className="list-item-meta">
                                        <span className="list-item-date">{formatSentDate(email.sent_at)}</span>
                                        {email.is_bump === 1 && <span className="bump-badge">BUMP</span>}
                                    </div>
                                </div>
                            </div>

                            <span className={`status-badge ${status.color}`}>
                                {status.label}
                            </span>
                        </div>
                    );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detail Panel (40%) */}
        <EmailDetailPanel email={selectedEmail} type={currentType} />
      </div>
    </div>
  );
}
