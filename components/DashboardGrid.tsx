"use client";

import { useState } from "react";
import type { ParsedEmailRow } from "@/lib/api";
import { TabbedDashboard } from "./TabbedDashboard";
import { InboxDashboard } from "./InboxDashboard";

interface DashboardGridProps {
  grants: { emails: ParsedEmailRow[]; error?: string };
  crewCalls: { emails: ParsedEmailRow[]; error?: string };
  resources: { emails: ParsedEmailRow[]; error?: string };
  castingCalls: { emails: ParsedEmailRow[]; error?: string };
  events: { emails: ParsedEmailRow[]; error?: string };
}

export function DashboardGrid({ grants, crewCalls, resources, castingCalls, events }: DashboardGridProps) {
  const [viewMode, setViewMode] = useState<"tabbed" | "inbox">("tabbed");

  return (
    <div>
      {/* View Toggle */}
      <div className="view-toggle-bar">
        <span className="view-toggle-hint">View:</span>
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${viewMode === "tabbed" ? "view-toggle-active" : ""}`}
            onClick={() => setViewMode("tabbed")}
          >
            By Category
          </button>
          <button
            className={`view-toggle-btn ${viewMode === "inbox" ? "view-toggle-active" : ""}`}
            onClick={() => setViewMode("inbox")}
          >
            Inbox Feed
          </button>
        </div>
      </div>

      {viewMode === "tabbed" ? (
        <TabbedDashboard
          grants={grants}
          crewCalls={crewCalls}
          resources={resources}
          castingCalls={castingCalls}
          events={events}
        />
      ) : (
        <InboxDashboard
          grants={grants}
          crewCalls={crewCalls}
          resources={resources}
          castingCalls={castingCalls}
          events={events}
        />
      )}
    </div>
  );
}
