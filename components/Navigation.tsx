"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  MapPin,
  BookOpen,
  Clock,
  Calendar as CalendarIcon,
  Users,
  ChevronDown,
  FileText,
  DollarSign,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function Navigation() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) => pathname === path;
  const isDropdownActive = (paths: string[]) => paths.includes(pathname);

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  const navItemStyle = (active: boolean) => ({
    padding: "var(--space-sm) var(--space-md)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 500,
    textDecoration: "none",
    color: active ? "var(--text-primary)" : "var(--text-tertiary)",
    background: active ? "var(--bg-elevated)" : "transparent",
    border: `1px solid ${active ? "var(--border-emphasis)" : "transparent"}`,
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
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
          padding: "0 var(--space-xl)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-lg)",
          height: "56px",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--text-primary)",
            textDecoration: "none",
            letterSpacing: "-0.02em",
            marginRight: "var(--space-md)",
          }}
        >
          ListService
        </Link>

        <div
          style={{
            display: "flex",
            gap: "var(--space-sm)",
            flex: 1,
            alignItems: "center",
          }}
        >
          {/* Petitions */}
          <Link
            href="/petitions"
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

          {/* Grants - primary nav item per user feedback */}
          <Link
            href="/grants"
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

          {/* Information Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              style={navItemStyle(isDropdownActive(["/production-handbook"]))}
              onClick={() => toggleDropdown("information")}
              onMouseEnter={(e) => {
                if (!isDropdownActive(["/production-handbook"])) {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isDropdownActive(["/production-handbook"])) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }
              }}
            >
              <BookOpen size={14} />
              Information
              <ChevronDown size={14} />
            </button>
            {openDropdown === "information" && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-emphasis)",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  minWidth: "160px",
                  zIndex: 100,
                }}
              >
                <Link
                  href="/production-handbook"
                  onClick={closeDropdown}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "var(--space-sm) var(--space-md)",
                    fontSize: "13px",
                    color: isActive("/production-handbook")
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                    textDecoration: "none",
                    background: isActive("/production-handbook")
                      ? "var(--bg-tertiary)"
                      : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-tertiary)";
                    e.currentTarget.style.color = "var(--text-secondary)";
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
              </div>
            )}
          </div>

          {/* Calendar */}
          <Link
            href="/calendar"
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
            Timeline
          </Link>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            HCI Prototypes
          </div>
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
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
        </div>
      </div>
    </nav>
  );
}
