"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar as CalendarIcon,
  FileText,
  DollarSign,
  Inbox,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) => pathname === path;

  const navItemStyle = (active: boolean) => ({
    padding: "var(--space-sm) var(--space-md)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 500 as const,
    textDecoration: "none" as const,
    color: active ? "var(--text-primary)" : "var(--text-tertiary)",
    background: active ? "var(--bg-elevated)" : "transparent",
    border: `1px solid ${active ? "var(--border-emphasis)" : "transparent"}`,
    transition: "all 0.2s ease",
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "6px",
    cursor: "pointer" as const,
  });

  const mobileNavItemStyle = (active: boolean) => ({
    padding: "var(--space-md) var(--space-lg)",
    fontSize: "15px",
    fontWeight: 500 as const,
    textDecoration: "none" as const,
    color: active ? "var(--text-primary)" : "var(--text-secondary)",
    background: active ? "var(--bg-elevated)" : "transparent",
    borderBottom: "1px solid var(--border-subtle)",
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "var(--space-sm)",
    cursor: "pointer" as const,
    width: "100%" as const,
    border: "none" as const,
    borderRadius: 0,
  });

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-subtle)",
        marginBottom: "var(--space-lg)",
      }}
    >
      <div
        style={{
          maxWidth: "1600px",
          margin: "0 auto",
          padding: "0 var(--space-lg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "56px",
        }}
      >
        <Link
          href="/"
          prefetch={false}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--text-primary)",
            textDecoration: "none",
            letterSpacing: "-0.02em",
            flexShrink: 0,
          }}
        >
          ListService
        </Link>

        {/* Desktop Nav */}
        <div className="nav-desktop-links">
          <Link
            href="/"
            prefetch={false}
            style={navItemStyle(isActive("/"))}
            onMouseEnter={(e) => {
              if (!isActive("/")) {
                e.currentTarget.style.background = "var(--bg-tertiary)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/")) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-tertiary)";
              }
            }}
          >
            <Inbox size={14} />
            Inbox
          </Link>

          <Link
            href="/petitions"
            prefetch={false}
            style={navItemStyle(isActive("/petitions"))}
            onMouseEnter={(e) => {
              if (!isActive("/petitions")) {
                e.currentTarget.style.background = "var(--bg-tertiary)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/petitions")) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-tertiary)";
              }
            }}
          >
            <FileText size={14} />
            Petitions
          </Link>

          <Link
            href="/grants"
            prefetch={false}
            style={navItemStyle(isActive("/grants"))}
            onMouseEnter={(e) => {
              if (!isActive("/grants")) {
                e.currentTarget.style.background = "var(--bg-tertiary)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/grants")) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-tertiary)";
              }
            }}
          >
            <DollarSign size={14} />
            Grants
          </Link>

          <Link
            href="/production-handbook"
            prefetch={false}
            style={navItemStyle(isActive("/production-handbook"))}
            onMouseEnter={(e) => {
              if (!isActive("/production-handbook")) {
                e.currentTarget.style.background = "var(--bg-tertiary)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/production-handbook")) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-tertiary)";
              }
            }}
          >
            <BookOpen size={14} />
            Handbook Wiki
          </Link>

          <Link
            href="/calendar"
            prefetch={false}
            style={navItemStyle(isActive("/calendar"))}
            onMouseEnter={(e) => {
              if (!isActive("/calendar")) {
                e.currentTarget.style.background = "var(--bg-tertiary)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/calendar")) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-tertiary)";
              }
            }}
          >
            <CalendarIcon size={14} />
            Deadlines
          </Link>
        </div>

        {/* Right side: theme toggle + mobile hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <span className="nav-desktop-label"
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            HCI Prototypes
          </span>
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-emphasis)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Mobile hamburger */}
          <button
            className="nav-mobile-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            style={{
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {mobileMenuOpen && (
        <div
          className="nav-mobile-menu"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
          }}
        >
          <Link href="/" prefetch={false} style={mobileNavItemStyle(isActive("/"))} onClick={() => setMobileMenuOpen(false)}>
            <Inbox size={16} />
            Inbox
          </Link>
          <Link href="/petitions" prefetch={false} style={mobileNavItemStyle(isActive("/petitions"))} onClick={() => setMobileMenuOpen(false)}>
            <FileText size={16} />
            Petitions
          </Link>
          <Link href="/grants" prefetch={false} style={mobileNavItemStyle(isActive("/grants"))} onClick={() => setMobileMenuOpen(false)}>
            <DollarSign size={16} />
            Grants
          </Link>
          <Link href="/production-handbook" prefetch={false} style={mobileNavItemStyle(isActive("/production-handbook") || pathname.startsWith("/production-handbook/"))} onClick={() => setMobileMenuOpen(false)}>
            <BookOpen size={16} />
            Handbook Wiki
          </Link>
          <Link href="/calendar" prefetch={false} style={mobileNavItemStyle(isActive("/calendar"))} onClick={() => setMobileMenuOpen(false)}>
            <CalendarIcon size={16} />
            Deadlines
          </Link>
        </div>
      )}
    </nav>
  );
}
