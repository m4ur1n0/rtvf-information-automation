"use client";

import { useState } from "react";
import type { ParsedEmailRow } from "@/lib/api";
import { formatSentDate } from "@/lib/format";

interface EmailCardProps {
  email: ParsedEmailRow;
  type: string; // "Grant", "Crew Call", "Resource", "Casting"
}

export function EmailCard({ email, type }: EmailCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine status badge based on type
  const getStatusBadge = () => {
    if (type === "Grant") {
      if (email.tags.includes("GRANT_CLOSED")) {
        return { text: "Closed", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" };
      } else if (email.tags.includes("GRANT_OPEN")) {
        return { text: "Open", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" };
      } else if (email.tags.includes("GRANT_UPCOMING")) {
        return { text: "Upcoming", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" };
      } else {
        return { text: "Status Unclear", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" };
      }
    }

    if (type === "Crew Call") {
      if (email.tags.includes("PAID")) {
        return { text: "Paid", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" };
      } else if (email.tags.includes("UNPAID")) {
        return { text: "Unpaid", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" };
      } else {
        return { text: "Pay Unclear", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" };
      }
    }

    if (type === "Casting") {
      const isExtras = email.tags.includes("CASTING_EXTRAS");
      return {
        text: isExtras ? "Extras" : "Roles",
        color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
      };
    }

    if (type === "Resource") {
      if (email.tags.includes("PROPS_COSTUMES")) {
        return { text: "Props/Costumes", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" };
      } else if (email.tags.includes("EQUIPMENT")) {
        return { text: "Equipment", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" };
      } else if (email.tags.includes("LOCATION")) {
        return { text: "Location", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" };
      } else {
        return { text: "Resource", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" };
      }
    }

    return { text: "Active", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 mb-3 bg-white dark:bg-zinc-900">
      {/* Collapsed view - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {type}
              </span>
              {email.thread_key && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">
                  {email.thread_key}
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatSentDate(email.sent_at)}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`px-2 py-1 text-xs rounded ${statusBadge.color}`}>
              {statusBadge.text}
            </span>
            {email.is_bump === 1 && (
              <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                BUMP
              </span>
            )}
            <span className="text-zinc-400 dark:text-zinc-500">
              {isExpanded ? "▼" : "▶"}
            </span>
          </div>
        </div>
      </button>

      {/* Expanded view */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
          {/* Subject - always shown prominently */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Subject
            </h3>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {email.subject || "(No subject)"}
            </p>
          </div>

          {/* From */}
          {(email.from_name || email.from_email) && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                From
              </h3>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {email.from_name && <span>{email.from_name}</span>}
                {email.from_name && email.from_email && <span> </span>}
                {email.from_email && (
                  <span className="text-zinc-500 dark:text-zinc-400">
                    &lt;{email.from_email}&gt;
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Tags */}
          {email.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1">
                {email.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Confidence */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Confidence
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {(email.confidence * 100).toFixed(1)}%
            </p>
          </div>

          {/* Body */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Body
            </h3>
            {email.body_text ? (
              <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap max-h-96 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded p-3 bg-zinc-50 dark:bg-zinc-800">
                {email.body_text}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                Email body not available
              </p>
            )}
          </div>

          {/* Reasons */}
          {email.reasons.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Classification Reasons
              </h3>
              <ul className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300 space-y-0.5">
                {email.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
