import Link from "next/link";
import type { HandbookSection } from "./data";

export function HandbookSidebar({
  sections,
  currentSlug,
}: {
  sections: HandbookSection[];
  currentSlug?: string;
}) {
  return (
    <aside
      style={{
        position: "sticky",
        top: "72px",
        alignSelf: "start",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-md)",
        maxHeight: "calc(100vh - 90px)",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: "var(--space-sm)",
        }}
      >
        Handbook Sections
      </div>
      <div style={{ display: "grid", gap: "6px" }}>
        <Link
          href="/production-handbook"
          style={{
            display: "block",
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
            textDecoration: "none",
            color:
              currentSlug == null ? "var(--text-primary)" : "var(--text-secondary)",
            background:
              currentSlug == null ? "var(--bg-tertiary)" : "transparent",
            border:
              currentSlug == null
                ? "1px solid var(--border-emphasis)"
                : "1px solid transparent",
          }}
        >
          Overview
        </Link>
        {sections.map((section) => {
          const active = currentSlug === section.slug;
          return (
            <Link
              key={section.slug}
              href={`/production-handbook/${section.slug}`}
              style={{
                display: "block",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                textDecoration: "none",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                background: active ? "var(--bg-tertiary)" : "transparent",
                border: active
                  ? "1px solid var(--border-emphasis)"
                  : "1px solid transparent",
              }}
            >
              {section.shortLabel}
              <span style={{ color: "var(--text-tertiary)" }}> · </span>
              <span>{section.title.replace(/^Section \d+:\s*/, "")}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

export function SectionDetailCard({ section }: { section: HandbookSection }) {
  return (
    <article
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-lg)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "30px",
          lineHeight: 1.15,
          marginBottom: "var(--space-sm)",
        }}
      >
        {section.title}
      </h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-md)" }}>
        {section.summary}
      </p>

      <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap", marginBottom: "var(--space-md)" }}>
        {section.tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "999px",
              border: "1px solid var(--border-default)",
              color: "var(--text-tertiary)",
              textTransform: "lowercase",
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-md)",
          marginBottom: "var(--space-md)",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            marginBottom: "var(--space-xs)",
          }}
        >
          Key Points
        </div>
        <ul style={{ paddingLeft: "18px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
          {section.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      <div style={{ display: "grid", gap: "var(--space-md)" }}>
        {section.details.map((detail) => (
          <section
            key={detail.heading}
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-md)",
            }}
          >
            <h3 style={{ fontSize: "16px", marginBottom: "var(--space-xs)" }}>
              {detail.heading}
            </h3>
            <ul style={{ paddingLeft: "18px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {detail.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {section.links && section.links.length > 0 && (
        <div style={{ marginTop: "var(--space-md)", display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
          {section.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "var(--accent-crew)",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
