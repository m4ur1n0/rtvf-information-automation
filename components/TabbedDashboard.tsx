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
}

type Topic = "grants" | "crewCalls" | "castingCalls" | "resources";

interface TopicConfig {
  key: Topic;
  title: string;
  icon: string;
  accentColor: string;
}

interface EmailDetailPanelParams {
  email: ParsedEmailRow | null;
  type: "grant" | "crew" | "casting" | "resource";
}

const topics: TopicConfig[] = [
  { key: "grants", title: "Grants", icon: "$", accentColor: "var(--accent-grant)" },
  { key: "crewCalls", title: "Crew Calls", icon: "◎", accentColor: "var(--accent-crew)" },
  { key: "castingCalls", title: "Casting Calls", icon: "★", accentColor: "var(--accent-casting)" },
  { key: "resources", title: "Resources", icon: "⚙", accentColor: "var(--accent-resource)" },
];

export function TabbedDashboard({ grants, crewCalls, resources, castingCalls }: TabbedDashboardProps) {
  const [selectedTopic, setSelectedTopic] = useState<Topic>("grants");
  const [selectedEmail, setSelectedEmail] = useState<ParsedEmailRow | null>(null);

  const topicData = {
    grants,
    crewCalls,
    resources,
    castingCalls,
  };

  const currentData = topicData[selectedTopic];
  const currentConfig = topics.find(t => t.key === selectedTopic)!;

  // Determine type for CompactRow
  const getType = (topic: Topic): "grant" | "crew" | "casting" | "resource" => {
    switch (topic) {
      case "grants": return "grant";
      case "crewCalls": return "crew";
      case "castingCalls": return "casting";
      case "resources": return "resource";
    }
  };

  const currentType = getType(selectedTopic);

  // Calculate status count for the selected topic
  const getStatusCount = () => {
    if (selectedTopic === "grants") {
      return currentData.emails.filter(e => e.tags.includes("GRANT_OPEN")).length;
    } else if (selectedTopic === "crewCalls") {
      return currentData.emails.filter(e => e.tags.includes("PAID")).length;
    }
    return 0;
  };

  const statusCount = getStatusCount();

  // Determine status with color coding
  const getStatus = (type: EmailDetailPanelParams["type"], email: ParsedEmailRow) => {
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
      if (email.tags.includes("PAID")) {
        return { label: "Paid", color: "status-open" };
      } else if (email.tags.includes("UNPAID")) {
        return { label: "Unpaid", color: "status-unclear" };
      } else {
        return { label: "Pay Unclear", color: "status-upcoming" };
      }
    }

    if (type === "casting") {
      const isExtras = email.tags.includes("CASTING_EXTRAS");
      return {
        label: isExtras ? "Extras" : "Roles",
        color: "status-casting",
      };
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
            {selectedTopic === "crewCalls" && statusCount > 0 && (
              <div className="list-panel-metric">
                <span className="metric-value">{statusCount}</span>
                <span className="metric-label">paid</span>
              </div>
            )}
          </div>

          <div className="list-panel-content">
            {currentData.error ? (
              <div className="section-error">
                <div className="error-icon">⚠</div>
                <div className="error-message">Failed to load {currentConfig.title.toLowerCase()}</div>
              </div>
            ) : currentData.emails.length === 0 ? (
              <div className="section-empty">
                <div className="empty-icon">∅</div>
                <div className="empty-message">No {currentConfig.title.toLowerCase()} found</div>
              </div>
            ) : (
              <div className="row-list">
                {currentData.emails.map((email) => {

                    if (currentConfig.title === "Grants") {

                        const status = getStatus("grant", email);
                    
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


                                <span className={`px-2 py-1 text-xs rounded ${status.color}`}>
                                    {status.label}
                                </span>
                            </div>
                        )
                    } else {
                        return (
                            <div
                                key={email.id}
                                className={`list-item-wrapper ${selectedEmail?.id === email.id ? "list-item-selected" : ""}`}
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
                            </div>
                        )
                    }
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
