"use client";

import { useState, useCallback } from "react";
import type { ParsedEmailRow } from "@/lib/api";
import { formatSentDate } from "@/lib/format";

interface EmailDetailPanelProps {
  email: ParsedEmailRow | null;
  type: "grant" | "crew" | "casting" | "resource" | "event";
}

export function EmailDetailPanel({ email, type }: EmailDetailPanelProps) {
  const [bodyMode, setBodyMode] = useState<"html" | "text">("html");
  const [iframeHeight, setIframeHeight] = useState(400);

  const handleIframeLoad = useCallback((e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const doc = e.currentTarget.contentDocument;
      if (doc) {
        const h = doc.documentElement.scrollHeight || doc.body?.scrollHeight;
        if (h && h > 0) setIframeHeight(Math.min(h + 24, 1200));
      }
    } catch {
      // cross-origin; keep default height
    }
  }, []);

  if (!email) {
    return (
      <div className="detail-panel detail-panel-empty">
        <div className="detail-empty-icon">✉</div>
        <div className="detail-empty-message">Select an email to view details</div>
      </div>
    );
  }

  // ── Status badge ────────────────────────────────────────────────────────

  const getStatus = () => {
    if (type === "grant") {
      if (email.tags.includes("GRANT_CLOSED")) return { label: "Closed", color: "status-closed" };
      if (email.tags.includes("GRANT_OPEN")) return { label: "Open", color: "status-open" };
      if (email.tags.includes("GRANT_UPCOMING")) return { label: "Upcoming", color: "status-upcoming" };
      return { label: "Unclear", color: "status-unclear" };
    }
    if (type === "crew") {
      return { label: "Crew Call", color: "status-open" };
    }
    if (type === "casting") {
      return {
        label: email.tags.includes("CASTING_EXTRAS") ? "Extras" : "Roles",
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
      if (email.tags.includes("PROPS_COSTUMES")) return { label: "Props/Costumes", color: "status-resource" };
      if (email.tags.includes("EQUIPMENT")) return { label: "Equipment", color: "status-resource" };
      if (email.tags.includes("LOCATION")) return { label: "Location", color: "status-resource" };
      return { label: "Resource", color: "status-resource" };
    }
    return { label: "Active", color: "status-open" };
  };

  const status = getStatus();
  const hasHtml = Boolean(email.body_html);
  const hasText = Boolean(email.body_text);

  // ── Deadline display ────────────────────────────────────────────────────

  const deadlineDisplay = (() => {
    if (email.deadline_at) {
      return new Date(email.deadline_at * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return null;
  })();

  // ── Email body renderer ─────────────────────────────────────────────────

  const renderBody = () => {
    const showHtml = bodyMode === "html" && hasHtml;

    if (showHtml) {
      // cid: references are inline MIME attachments — browsers can't resolve them.
      // Replace each one with a grey SVG placeholder that preserves layout.
      const CID_PLACEHOLDER =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='80'%3E" +
        "%3Crect width='100%25' height='100%25' fill='%23f4f4f4' rx='4'/%3E" +
        "%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' " +
        "font-family='sans-serif' font-size='12' fill='%23999'%3E" +
        "📎 inline image (not stored)%3C/text%3E%3C/svg%3E";

      const processedHtml = (email.body_html ?? "")
        .replace(/src="cid:[^"]*"/gi, `src="${CID_PLACEHOLDER}"`)
        .replace(/src='cid:[^']*'/gi, `src="${CID_PLACEHOLDER}"`);

      // Wrap in a minimal HTML shell so styles render correctly inside the iframe
      const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base target="_blank">
<style>
  body { margin: 12px 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a; background: #fff; word-break: break-word; }
  a { color: #4f6ef7; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>${processedHtml}</body>
</html>`;

      return (
        <div className="detail-body-iframe-wrapper">
          <iframe
            srcDoc={wrappedHtml}
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
            title="Email body"
            className="detail-body-iframe"
            onLoad={handleIframeLoad}
            style={{
              width: "100%",
              height: `${iframeHeight}px`,
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: "#fff",
              display: "block",
            }}
          />
        </div>
      );
    }

    if (hasText) {
      // Strip any residual HTML tags from body_text for plain display
      const cleanedText = email.body_text
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      return <div className="detail-body-content">{cleanedText}</div>;
    }

    return <div className="detail-no-content">No body content available</div>;
  };

  // ── Category-specific metadata sections ────────────────────────────────

  const renderCrewMeta = () => {
    if (type !== "crew" && type !== "casting") return null;
    const hasAny =
      email.film_title || email.logline || email.production_type ||
      (type === "casting" && email.director_name) ||
      (email.roles_mentioned && email.roles_mentioned.length > 0) ||
      email.shoot_dates_text || email.petition_location || deadlineDisplay;
    if (!hasAny) return null;

    return (
      <div className="detail-section">
        <div className="detail-section-label">Production Info</div>
        <div className="detail-meta-grid">
          {email.film_title && (
            <div className="detail-meta-row">
              <span className="detail-meta-key">Film</span>
              <span className="detail-meta-val">{email.film_title}</span>
            </div>
          )}
          {email.production_type && (
            <div className="detail-meta-row">
              <span className="detail-meta-key">Program</span>
              <span className="detail-meta-val">{email.production_type}</span>
            </div>
          )}
          {type === "casting" && email.director_name && (
            <div className="detail-meta-row">
              <span className="detail-meta-key">Director</span>
              <span className="detail-meta-val">{email.director_name}</span>
            </div>
          )}
          {email.logline && (
            <div className="detail-meta-row detail-meta-row-full">
              <span className="detail-meta-key">Logline</span>
              <span className="detail-meta-val">{email.logline}</span>
            </div>
          )}
          {email.roles_mentioned && email.roles_mentioned.length > 0 && (
            <div className="detail-meta-row detail-meta-row-full">
              <span className="detail-meta-key">Roles</span>
              <span className="detail-meta-val">
                <div className="tag-list" style={{ marginTop: 2 }}>
                  {email.roles_mentioned.map((role, i) => (
                    <span key={i} className="tag">{role}</span>
                  ))}
                </div>
              </span>
            </div>
          )}
          {email.shoot_dates_text && (
            <div className="detail-meta-row">
              <span className="detail-meta-key">Filming</span>
              <span className="detail-meta-val">{email.shoot_dates_text}</span>
            </div>
          )}
          {email.petition_location && (
            <div className="detail-meta-row">
              <span className="detail-meta-key">Petition at</span>
              <span className="detail-meta-val">{email.petition_location}</span>
            </div>
          )}
          {deadlineDisplay && (
            <div className="detail-meta-row">
              <span className="detail-meta-key">Deadline</span>
              <span className="detail-meta-val">{deadlineDisplay}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderGrantMeta = () => {
    if (type !== "grant") return null;
    const hasAny =
      email.grant_amount || email.eligibility_text || email.grant_scope ||
      email.application_url || deadlineDisplay;
    if (!hasAny) return null;

    return (
      <div className="detail-section">
        <div className="detail-section-label">Grant Details</div>
        <div className="detail-meta-grid">
          {email.grant_amount && (
            <div className="detail-meta-row">
              <span className="detail-meta-key">Amount</span>
              <span className="detail-meta-val" style={{ fontWeight: 700, color: "var(--accent-grant)" }}>
                {email.grant_amount}
              </span>
            </div>
          )}
          {deadlineDisplay && (
            <div className="detail-meta-row">
              <span className="detail-meta-key">Deadline</span>
              <span className="detail-meta-val">{deadlineDisplay}</span>
            </div>
          )}
          {email.eligibility_text && (
            <div className="detail-meta-row detail-meta-row-full">
              <span className="detail-meta-key">Eligibility</span>
              <span className="detail-meta-val">{email.eligibility_text}</span>
            </div>
          )}
          {email.grant_scope && (
            <div className="detail-meta-row">
              <span className="detail-meta-key">Scope</span>
              <span className="detail-meta-val" style={{ textTransform: "capitalize" }}>
                {email.grant_scope}
              </span>
            </div>
          )}
          {email.application_url && (
            <div className="detail-meta-row detail-meta-row-full">
              <span className="detail-meta-key">Apply</span>
              <span className="detail-meta-val">
                <a
                  href={email.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent-grant)", wordBreak: "break-all" }}
                >
                  {email.application_url}
                </a>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEventMeta = () => {
    if (type !== "event") return null;
    const hasAny = email.event_date_text || email.event_location || email.rsvp_url;
    if (!hasAny) return null;

    return (
      <div className="detail-section">
        <div className="detail-section-label">Event Details</div>
        <div className="detail-meta-grid">
          {email.event_date_text && (
            <div className="detail-meta-row">
              <span className="detail-meta-key">When</span>
              <span className="detail-meta-val">{email.event_date_text}</span>
            </div>
          )}
          {email.event_location && (
            <div className="detail-meta-row">
              <span className="detail-meta-key">Where</span>
              <span className="detail-meta-val">{email.event_location}</span>
            </div>
          )}
          {email.rsvp_url && (
            <div className="detail-meta-row detail-meta-row-full">
              <span className="detail-meta-key">RSVP</span>
              <span className="detail-meta-val">
                <a
                  href={email.rsvp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent-event)", wordBreak: "break-all" }}
                >
                  {email.rsvp_url}
                </a>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="detail-panel">
      {/* ── Header ── */}
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
                <span key={idx} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Category-specific extracted metadata */}
        {renderCrewMeta()}
        {renderGrantMeta()}
        {renderEventMeta()}

        {/* Email Body */}
        <div className="detail-section detail-section-body">
          <div className="detail-section-label-row">
            <span className="detail-section-label">Email Body</span>
            {hasHtml && hasText && (
              <div className="body-toggle">
                <button
                  className={`body-toggle-btn ${bodyMode === "html" ? "active" : ""}`}
                  onClick={() => setBodyMode("html")}
                >
                  HTML
                </button>
                <button
                  className={`body-toggle-btn ${bodyMode === "text" ? "active" : ""}`}
                  onClick={() => setBodyMode("text")}
                >
                  Text
                </button>
              </div>
            )}
          </div>
          {renderBody()}
        </div>

      </div>
    </div>
  );
}
