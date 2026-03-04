/**
 * Role department grouping for petition filtering.
 *
 * Maps raw role strings (from LLM extraction or manual inference) into
 * production departments.  The mapping lives entirely on the client —
 * the raw `roles_mentioned` data is never mutated.
 */

// ── Department definitions ────────────────────────────────────────────────────

export interface RoleDepartment {
  id: string;
  label: string;
  /** Lowercase keywords used to match free-form role strings into this group */
  keywords: string[];
}

export const ROLE_DEPARTMENTS: RoleDepartment[] = [
  {
    id: "camera",
    label: "Camera",
    keywords: [
      "dp", "director of photography", "cinematograph", "camera operator",
      "camera op", "ac", "1st ac", "2nd ac", "steadicam", "focus puller",
    ],
  },
  {
    id: "sound",
    label: "Sound",
    keywords: [
      "sound", "boom", "mixer", "audio", "sound designer", "sound mixer",
      "production sound", "boom op",
    ],
  },
  {
    id: "grip-electric",
    label: "G&E",
    keywords: [
      "gaffer", "grip", "best boy", "key grip", "electric", "g&e",
      "gaffer/grip",
    ],
  },
  {
    id: "editorial",
    label: "Editorial",
    keywords: [
      "editor", "editing", "colorist", "color", "vfx", "visual effects",
      "post", "dit",
    ],
  },
  {
    id: "production",
    label: "Production",
    keywords: [
      "producer", "upm", "line producer", "production manager",
      "ad", "assistant director", "1st ad", "2nd ad",
      "pa", "production assistant", "coordinator", "script supervisor",
    ],
  },
  {
    id: "cast",
    label: "Cast",
    keywords: [
      "actor", "actress", "extras", "extra", "voice actor", "talent",
      "casting", "performer",
    ],
  },
  {
    id: "art-wardrobe",
    label: "Art & Wardrobe",
    keywords: [
      "art director", "art dept", "wardrobe", "costume", "props", "prop",
      "set design", "set dresser", "mua", "makeup", "hair",
    ],
  },
];

const OTHER_DEPARTMENT: RoleDepartment = {
  id: "other",
  label: "Other",
  keywords: [],
};

// ── API ───────────────────────────────────────────────────────────────────────

/** Classify a single free-form role string into a department ID. */
export function classifyRole(role: string): string {
  const lower = role.toLowerCase().trim();
  for (const dept of ROLE_DEPARTMENTS) {
    if (dept.keywords.some((kw) => lower === kw || lower.includes(kw))) {
      return dept.id;
    }
  }
  return OTHER_DEPARTMENT.id;
}

/** Get the department object by ID (returns the "other" bucket for unknown IDs). */
export function getDepartment(id: string): RoleDepartment {
  return ROLE_DEPARTMENTS.find((d) => d.id === id) ?? OTHER_DEPARTMENT;
}

/** Get all departments including the "other" catch-all. */
export function getAllDepartments(): RoleDepartment[] {
  return [...ROLE_DEPARTMENTS, OTHER_DEPARTMENT];
}

/**
 * Group an array of role strings by department.
 * Returns a Map of department ID → role strings in that department.
 */
export function groupRolesByDepartment(roles: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const role of roles) {
    const deptId = classifyRole(role);
    const existing = map.get(deptId) ?? [];
    existing.push(role);
    map.set(deptId, existing);
  }
  return map;
}

// Backward-compatible aliases used by feature docs.
export const ROLE_GROUPS = ROLE_DEPARTMENTS;
export const groupRoles = groupRolesByDepartment;
