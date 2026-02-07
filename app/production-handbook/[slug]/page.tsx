import Link from "next/link";
import { notFound } from "next/navigation";
import { HandbookGlobalSearch } from "../GlobalSearch";
import { getSectionBySlug, handbookSections } from "../data";
import { HandbookSidebar, SectionDetailCard } from "../ui";

export function generateStaticParams() {
  return handbookSections.map((section) => ({ slug: section.slug }));
}

export default async function HandbookSectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const section = getSectionBySlug(slug);
  if (!section) notFound();

  const currentIndex = handbookSections.findIndex((s) => s.slug === slug);
  const prev = currentIndex > 0 ? handbookSections[currentIndex - 1] : null;
  const next =
    currentIndex < handbookSections.length - 1
      ? handbookSections[currentIndex + 1]
      : null;

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">Production Handbook Wiki</h1>
            <div className="header-stats">
              <div className="stat-pill stat-total">
                <span className="stat-value">{section.shortLabel}</span>
                <span className="stat-label">current section</span>
              </div>
              <div className="stat-pill stat-open">
                <span className="stat-value">{currentIndex + 1}/13</span>
                <span className="stat-label">position</span>
              </div>
            </div>
          </div>
          <p className="dashboard-subtitle">Section detail view</p>
        </div>
      </header>

      <div style={{ marginBottom: "var(--space-md)" }}>
        <HandbookGlobalSearch compact />
      </div>

      <div
        className="wiki-shell"
        style={{
          display: "grid",
          gridTemplateColumns: "320px minmax(0, 1fr)",
          gap: "var(--space-lg)",
          alignItems: "start",
        }}
      >
        <HandbookSidebar sections={handbookSections} currentSlug={slug} />

        <main style={{ minWidth: 0 }}>
          <SectionDetailCard section={section} />

          <div
            style={{
              marginTop: "var(--space-md)",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-md)",
              display: "flex",
              justifyContent: "space-between",
              gap: "var(--space-sm)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
              <Link
                href="/production-handbook"
                style={{
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                  fontSize: "13px",
                }}
              >
                Back to Overview
              </Link>
              {prev && (
                <Link
                  href={`/production-handbook/${prev.slug}`}
                  style={{
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 12px",
                    fontSize: "13px",
                  }}
                >
                  Previous: {prev.shortLabel}
                </Link>
              )}
              {next && (
                <Link
                  href={`/production-handbook/${next.slug}`}
                  style={{
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 12px",
                    fontSize: "13px",
                  }}
                >
                  Next: {next.shortLabel}
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
