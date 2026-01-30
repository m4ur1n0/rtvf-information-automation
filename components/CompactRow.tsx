"use client";

import { useState } from "react";
import type { ParsedEmailRow } from "@/lib/api";
import { formatSentDate } from "@/lib/format";

interface CompactRowProps {
  email: ParsedEmailRow;
  type: "grant" | "crew" | "casting" | "resource";
}

export function CompactRow({ email, type }: CompactRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine status with color coding
  const getStatus = () => {
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

  const status = getStatus();
  const threadDisplay = email.thread_key?.substring(0, 24) || email.id.substring(0, 8);

  return (
    <div className="compact-row">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="compact-row-header"
        aria-expanded={isExpanded}
      >
        <div className="compact-row-main">
          <div className="compact-row-id">
            <span className={`status-dot ${status.color}`} />
            <span className="thread-key">{threadDisplay}</span>
          </div>
          <div className="compact-row-meta">
            <span className="date-display">{formatSentDate(email.sent_at)}</span>
            {email.is_bump === 1 && <span className="bump-badge">BUMP</span>}
            <span className={`status-badge ${status.color}`}>{status.label}</span>
          </div>
        </div>
        <div className="expand-icon">{isExpanded ? "−" : "+"}</div>
      </button>

      {isExpanded && (
        <div className="compact-row-expanded">
          {/* Subject */}
          <div className="detail-block">
            <div className="detail-label">Subject</div>
            <div className="detail-value subject-line">{email.subject || "(No subject)"}</div>
          </div>

          {/* From */}
          {(email.from_name || email.from_email) && (
            <div className="detail-block">
              <div className="detail-label">From</div>
              <div className="detail-value">
                {email.from_name && <span className="from-name">{email.from_name}</span>}
                {email.from_email && (
                  <span className="from-email">
                    {email.from_name && " "}
                    &lt;{email.from_email}&gt;
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {email.tags.length > 0 && (
            <div className="detail-block">
              <div className="detail-label">Tags</div>
              <div className="tag-list">
                {email.tags.map((tag, idx) => (
                  <span key={idx} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Confidence */}
          <div className="detail-block detail-inline">
            <div className="detail-label">Confidence</div>
            <div className="detail-value confidence-bar">
              <div
                className="confidence-fill"
                style={{ width: `${email.confidence * 100}%` }}
              />
              <span className="confidence-text">{(email.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Body */}
          {email.body_text && (
            <div className="detail-block">
              <div className="detail-label">Body</div>
              <div className="body-preview">{email.body_text}</div>
            </div>
          )}

          {/* Reasons */}
          {email.reasons.length > 0 && (
            <div className="detail-block">
              <div className="detail-label">Classification</div>
              <ul className="reason-list">
                {email.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
