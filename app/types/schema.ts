export type Category =
  | "GRANT"
  | "CREW_CALL"
  | "EVENT"
  | "RESOURCE"
  | "ADMIN"
  | "OTHER"
  | "DO_NOT_CARE";

export type Tag =
  // Grant tags
  | "GRANT_OPEN"
  | "GRANT_UPCOMING"
  | "GRANT_CLOSED"
  | "GRANT_STATUS_UNCLEAR"
  | "ELIG_UNDERGRAD"
  | "ELIG_GRAD"
  | "ELIG_BOTH"
  | "SCOPE_PRODUCTION"
  | "SCOPE_POST"
  | "SCOPE_EQUIPMENT"
  | "SCOPE_TRAVEL"

  // Crew call tags
  | "PAID"
  | "UNPAID"
  | "PAY_UNCLEAR"
  | "CASTING_EXTRAS"
  | "CASTING_ROLES"
  | "CREW_DP"
  | "CREW_SOUND"
  | "CREW_EDITOR"
  | "CREW_GAFF_GRIP"
  | "CREW_PROD"
  | "SHOOT_DATES_PRESENT"

  // Event tags
  | "RSVP"
  | "SCREENING"
  | "WORKSHOP"
  | "MEETING"
  | "PANEL"

  // Resource tags
  | "EQUIPMENT"
  | "LOCATION"
  | "PROPS_COSTUMES"
  | "EDITING_SERVICES"

  // Meta tags
  | "BUMP"
  | "REPLY_CHAIN"
  | "HAS_DEADLINE"
  | "HAS_CONTACT_INFO";

export type ParsedEmail = {
  // IDs
  messageId: string;           // stable hash derived from row content or source id
  sourceRowId?: string;        // if CSV has a message id / URL
  threadKey?: string;          // normalized subject key, if you do thread grouping

  // Raw fields (as seen in CSV)
  raw: {
    subject: string;
    body: string;
    from?: string;
    dateAssumedUtc?: string;   // ISO string; set if parseable
    to?: string;
  };

  // Normalized convenience fields
  normalized: {
    subject: string;           // trimmed, whitespace-normalized
    body: string;              // trimmed
    subjectLower: string;
    bodyLower: string;
  };

  // Classification
  category: Category;          // exactly one primary
  tags: Tag[];                 // any number
  confidence: number;          // 0..1
  reasons: string[];           // short, user-auditable reason strings

  // Bump metadata (orthogonal)
  isBump: boolean;
  bumpOf?: string | null;      // messageId if determinable
  bumpInheritsCategory?: boolean;

  // Extracted structured info (optional but very useful)
  extracted: {
    deadlines?: { text: string; iso?: string }[]; // parsed from body/subject
    datesMentioned?: { text: string; iso?: string }[];
    contacts?: { type: "email" | "phone" | "url"; value: string }[];
    rolesMentioned?: string[];  // e.g., ["DP","Sound"]
    pay?: "paid" | "unpaid" | "unclear";
    grantStatus?: "open" | "upcoming" | "closed" | "unclear";
  };
};
