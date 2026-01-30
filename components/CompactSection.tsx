import type { ParsedEmailRow } from "@/lib/api";
import { CompactRow } from "./CompactRow";

interface CompactSectionProps {
  title: string;
  icon: string;
  type: "grant" | "crew" | "casting" | "resource";
  emails: ParsedEmailRow[];
  error?: string;
  accentColor: string;
}

export function CompactSection({
  title,
  icon,
  type,
  emails,
  error,
  accentColor,
}: CompactSectionProps) {
  const count = emails.length;

  // Calculate key metrics
  let statusCount = 0;
  if (type === "grant") {
    statusCount = emails.filter((e) => e.tags.includes("GRANT_OPEN")).length;
  } else if (type === "crew") {
    statusCount = emails.filter((e) => e.tags.includes("PAID")).length;
  }

  return (
    <section className="compact-section" style={{ "--accent": accentColor } as React.CSSProperties}>
      <div className="section-header">
        <div className="section-title-row">
          <div className="section-icon">{icon}</div>
          <h2 className="section-title">{title}</h2>
          <div className="section-count">{count}</div>
        </div>
        {type === "grant" && statusCount > 0 && (
          <div className="section-metric">
            <span className="metric-value">{statusCount}</span>
            <span className="metric-label">open</span>
          </div>
        )}
        {type === "crew" && statusCount > 0 && (
          <div className="section-metric">
            <span className="metric-value">{statusCount}</span>
            <span className="metric-label">paid</span>
          </div>
        )}
      </div>

      <div className="section-content">
        {error ? (
          <div className="section-error">
            <div className="error-icon">⚠</div>
            <div className="error-message">Failed to load {title.toLowerCase()}</div>
          </div>
        ) : emails.length === 0 ? (
          <div className="section-empty">
            <div className="empty-icon">∅</div>
            <div className="empty-message">No {title.toLowerCase()} found</div>
          </div>
        ) : (
          <div className="row-list">
            {emails.map((email) => (
              <CompactRow key={email.id} email={email} type={type} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
