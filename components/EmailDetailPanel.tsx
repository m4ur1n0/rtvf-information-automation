"use client";

import type { ParsedEmailRow } from "@/lib/api";
import { formatSentDate } from "@/lib/format";

interface EmailDetailPanelProps {
  email: ParsedEmailRow | null;
  type: "grant" | "crew" | "casting" | "resource";
}

export function EmailDetailPanel({ email, type }: EmailDetailPanelProps) {
  if (!email) {
    return (
      <div className="detail-panel detail-panel-empty">
        <div className="detail-empty-icon">✉</div>
        <div className="detail-empty-message">Select an email to view details</div>
      </div>
    );
  }

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

  // Clean HTML from body text or render it
  const renderBody = () => {
    if (!email.body_text) {
      return <div className="detail-no-content">No body content available</div>;
    }

    // Check if the body contains HTML tags
    const hasHtmlTags = /<[^>]+>/.test(email.body_text);

    if (hasHtmlTags) {
      // Strip HTML tags but preserve structure
      const cleanedText = email.body_text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      return <div className="detail-body-content">{cleanedText}</div>;
    }

    return <div className="detail-body-content">{email.body_text}</div>;
  };

  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <div className="detail-panel-status">
          <span className={`status-dot ${status.color}`} />
          <span className={`status-badge ${status.color}`}>{status.label}</span>
          {email.is_bump === 1 && <span className="bump-badge">BUMP</span>}
        </div>
        <div className="detail-panel-date">{formatSentDate(email.sent_at)}</div>
      </div>

      <div className="detail-panel-content">
        {/* Subject */}
        <div className="detail-section">
          <div className="detail-section-label">Subject</div>
          <div className="detail-section-value detail-subject">{email.subject || "(No subject)"}</div>
        </div>

        {/* From */}
        {(email.from_name || email.from_email) && (
          <div className="detail-section">
            <div className="detail-section-label">From</div>
            <div className="detail-section-value">
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
          <div className="detail-section">
            <div className="detail-section-label">Tags</div>
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
        <div className="detail-section">
          <div className="detail-section-label">Confidence</div>
          <div className="confidence-bar">
            <div
              className="confidence-fill"
              style={{ width: `${email.confidence * 100}%` }}
            />
            <span className="confidence-text">{(email.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Body */}
        <div className="detail-section detail-section-body">
          <div className="detail-section-label">Email Body</div>
          {renderBody()}
        </div>

        {/* Reasons */}
        {email.reasons.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-label">Classification Reasons</div>
            <ul className="reason-list">
              {email.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
