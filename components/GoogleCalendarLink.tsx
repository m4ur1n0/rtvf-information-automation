import Image from "next/image";

export function GoogleCalendarLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Add to Google Calendar"
      style={{
        padding: "4px 8px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-sm)",
        textDecoration: "none",
        transition: "all 0.15s ease",
        display: "inline-flex",
        alignItems: "center",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-secondary)";
        e.currentTarget.style.borderColor = "var(--border-emphasis)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-elevated)";
        e.currentTarget.style.borderColor = "var(--border-default)";
      }}
    >
      <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginRight: "4px" }}>+</span>
      <Image
        src="/google-calendar-svgrepo-com.svg"
        alt="Add to Google Calendar"
        width={14}
        height={14}
      />
    </a>
  );
}
