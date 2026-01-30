import type { ParsedEmailRow } from "@/lib/api";
import { EmailCard } from "./EmailCard";

interface EmailSectionProps {
  title: string;
  type: string;
  emails: ParsedEmailRow[];
  error?: string;
  description?: string;
}

export function EmailSection({ title, type, emails, error, description }: EmailSectionProps) {
  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {description}
          </p>
        )}
        {emails.length > 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
            Showing {emails.length} item{emails.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {error ? (
        <div className="p-4 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">
            Error loading {title.toLowerCase()}: {error}
          </p>
        </div>
      ) : emails.length === 0 ? (
        <div className="p-4 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No {title.toLowerCase()} found.
          </p>
        </div>
      ) : (
        <div>
          {emails.map((email) => (
            <EmailCard key={email.id} email={email} type={type} />
          ))}
        </div>
      )}
    </section>
  );
}
