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
} from "lucide-react";

export function Navigation() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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
          {/* Opportunities Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              style={navItemStyle(isDropdownActive(["/petitions", "/grants"]))}
              onClick={() => toggleDropdown("opportunities")}
              onMouseEnter={(e) => {
                if (!isDropdownActive(["/petitions", "/grants"])) {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isDropdownActive(["/petitions", "/grants"])) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }
              }}
            >
              <Sparkles size={14} />
              Opportunities
              <ChevronDown size={14} />
            </button>
            {openDropdown === "opportunities" && (
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
                  href="/petitions"
                  onClick={closeDropdown}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "var(--space-sm) var(--space-md)",
                    fontSize: "13px",
                    color: isActive("/petitions")
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                    textDecoration: "none",
                    background: isActive("/petitions")
                      ? "var(--bg-tertiary)"
                      : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-tertiary)";
                    e.currentTarget.style.color = "var(--text-secondary)";
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
                  onClick={closeDropdown}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "var(--space-sm) var(--space-md)",
                    fontSize: "13px",
                    color: isActive("/grants")
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                    textDecoration: "none",
                    background: isActive("/grants")
                      ? "var(--bg-tertiary)"
                      : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-tertiary)";
                    e.currentTarget.style.color = "var(--text-secondary)";
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
              </div>
            )}
          </div>

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
            Calendar
          </Link>
        </div>

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
      </div>
    </nav>
  );
}
