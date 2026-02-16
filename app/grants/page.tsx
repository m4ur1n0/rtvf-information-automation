'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { addDays, format } from 'date-fns';

interface Grant {
  id: number;
  source: 'northwestern-mag' | 'external-chicago' | 'school-affiliated' | 'national';
  grantType?: string;
  title: string;
  organization: string;
  amount: string;
  deadline: string;
  status: 'open' | 'upcoming' | 'closed';
  requirements: string[];
  selectionCriteria: string[];
  applicationUrl: string;
  eligibility?: string;
  notes?: string;
  tags: string[];
}

type CategoryKey = 'nu' | 'external';

const CATEGORY_CONFIG: Record<CategoryKey, { label: string; description: string; color: string; sources: string[] }> = {
  nu: {
    label: 'Northwestern Grants',
    description: 'Funding from NU departments and affiliated programs',
    color: 'var(--accent-grant)',
    sources: ['northwestern-mag', 'school-affiliated'],
  },
  external: {
    label: 'External Grants',
    description: 'Chicago-area, national, and independent funding sources',
    color: 'var(--accent-crew)',
    sources: ['external-chicago', 'national'],
  },
};

const MOCK_GRANTS: Grant[] = [
  {
    id: 1,
    source: 'northwestern-mag',
    grantType: 'Small Production',
    title: 'MAG Winter 2026 - Small Production',
    organization: 'Northwestern RTF Department',
    amount: 'Up to $750',
    deadline: 'February 28, 2026',
    status: 'open',
    eligibility: 'RTF undergraduates',
    requirements: [
      'Pitch video (YouTube/Vimeo/Panopto)',
      'Up to 2 links to previous work in key creative position',
      'Screenplay or detailed treatment',
      'Itemized budget',
      'List of relevant courses and production experience',
      'Optional: Up to 2 links to non-cinema artistic works',
    ],
    selectionCriteria: [
      'Clarity and originality of project and script',
      'Rationale for the project',
      'Adaptability for safety/pandemic restrictions',
      'Feasibility and prospect for completion',
      'Quality of prior work',
    ],
    applicationUrl: 'https://forms.office.com/small-production',
    notes: 'Ideal for short films, music videos, experimental projects. Includes equipment checkout.',
    tags: ['NU', 'Student Film'],
  },
  {
    id: 2,
    source: 'northwestern-mag',
    grantType: 'Large Production',
    title: 'MAG Winter 2026 - Large Production',
    organization: 'Northwestern RTF Department',
    amount: '$750 - $3,000',
    deadline: 'February 20, 2026',
    status: 'open',
    eligibility: 'RTF undergraduates with demonstrated experience',
    requirements: [
      'Pitch video (YouTube/Vimeo/Panopto)',
      'Up to 2 links to previous work in key creative position',
      'Complete screenplay',
      'Detailed itemized budget with justifications',
      'Production timeline and schedule',
      'List of confirmed crew positions',
      'Location scouting documentation',
      'Equipment needs assessment',
      'Faculty recommendation',
    ],
    selectionCriteria: [
      'Exceptional artistic vision and originality',
      'Strong rationale for higher budget',
      'Demonstrated ability to manage larger productions',
      'Clear feasibility plan with contingencies',
      'Outstanding portfolio of prior work',
      'Professional-level crew and resources secured',
    ],
    applicationUrl: 'https://forms.office.com/large-production',
    notes: 'For ambitious narrative and documentary features. Requires more extensive planning and faculty endorsement.',
    tags: ['NU', 'Student Film'],
  },
  {
    id: 3,
    source: 'external-chicago',
    title: 'Chicago Film Grant for Emerging Filmmakers',
    organization: 'Chicago Film Office',
    amount: '$2,000 - $5,000',
    deadline: 'February 27, 2026',
    status: 'open',
    eligibility: 'Filmmakers 18+ residing in Chicago area',
    requirements: [
      'Project proposal (3-5 pages)',
      'Director\'s statement',
      'Budget breakdown',
      'Work samples (link to previous films)',
      'Chicago residency proof',
      'Letters of support from 2 collaborators',
    ],
    selectionCriteria: [
      'Artistic merit and originality',
      'Connection to Chicago communities',
      'Diversity and inclusion in casting/crew',
      'Feasibility of production plan',
      'Potential cultural impact',
    ],
    applicationUrl: 'https://chicago.gov/film-grants',
    notes: 'Prioritizes projects that showcase Chicago neighborhoods and diverse voices.',
    tags: ['External', 'Student Film'],
  },
  {
    id: 4,
    source: 'school-affiliated',
    title: 'SoC Innovation Fund',
    organization: 'Northwestern School of Communication',
    amount: 'Up to $2,500',
    deadline: 'February 15, 2026',
    status: 'open',
    eligibility: 'All SoC students (undergrad & grad)',
    requirements: [
      'Project proposal describing innovation',
      'Budget with detailed justification',
      'Faculty advisor signature',
      'Timeline and milestones',
      'Impact statement',
    ],
    selectionCriteria: [
      'Innovative approach to media/communication',
      'Cross-disciplinary potential',
      'Clear learning objectives',
      'Feasibility within academic year',
      'Potential for wider impact',
    ],
    applicationUrl: 'https://northwestern.edu/soc/innovation',
    notes: 'Open to experimental projects, installations, interactive media, and traditional film.',
    tags: ['NU', 'Student Film'],
  },
  {
    id: 5,
    source: 'external-chicago',
    title: 'Indie Chicago Micro-Budget Award',
    organization: 'Indie Chicago',
    amount: '$500 - $1,500',
    deadline: 'February 25, 2026',
    status: 'open',
    eligibility: 'Independent filmmakers in Illinois',
    requirements: [
      'Short film pitch (written)',
      'Sample reel or previous work',
      'Budget outline',
      'Production schedule',
      'Distribution plan',
    ],
    selectionCriteria: [
      'Story originality',
      'Efficient use of resources',
      'Potential for festival circuit',
      'Independent spirit',
    ],
    applicationUrl: 'https://indiechicago.org/awards',
    notes: 'Monthly awards for micro-budget shorts. Winners screened at Indie Chicago events.',
    tags: ['External', 'Student Film'],
  },
  {
    id: 6,
    source: 'national',
    title: 'Student Academy Awards',
    organization: 'Academy of Motion Picture Arts and Sciences',
    amount: '$2,000 - $5,000',
    deadline: 'May 1, 2026',
    status: 'upcoming',
    eligibility: 'Students at accredited colleges/universities',
    requirements: [
      'Completed film (made as student project)',
      'Official school submission',
      'Entry form and fees',
      'Screening copy',
      'Filmmaker biography',
    ],
    selectionCriteria: [
      'Overall excellence in filmmaking',
      'Originality and artistic vision',
      'Technical achievement',
      'Storytelling effectiveness',
    ],
    applicationUrl: 'https://oscars.org/saa',
    notes: 'Prestigious national competition. Winners receive cash prizes and Academy recognition.',
    tags: ['External', 'Student Film', 'Travel'],
  },
  {
    id: 7,
    source: 'northwestern-mag',
    grantType: 'Small Production',
    title: 'MAG Fall 2026 - Small Production',
    organization: 'Northwestern RTF Department',
    amount: 'Up to $750',
    deadline: 'September 20, 2026',
    status: 'upcoming',
    eligibility: 'RTF undergraduates',
    requirements: [
      'Pitch video (YouTube/Vimeo/Panopto)',
      'Up to 2 links to previous work in key creative position',
      'Screenplay or detailed treatment',
      'Itemized budget',
      'List of relevant courses and production experience',
    ],
    selectionCriteria: [
      'Clarity and originality of project and script',
      'Rationale for the project',
      'Adaptability for safety/pandemic restrictions',
      'Feasibility and prospect for completion',
      'Quality of prior work',
    ],
    applicationUrl: 'https://forms.office.com/small-production',
    tags: ['NU', 'Student Film'],
  },
];

export default function GrantsPage() {
  const [selectedGrantId, setSelectedGrantId] = useState<number | null>(null);
  const [tagFilter, setTagFilter] = useState<string>('all');

  const generateGoogleCalendarUrl = (grant: Grant) => {
    const deadlineDate = new Date(grant.deadline);
    const startDate = format(deadlineDate, 'yyyyMMdd');
    const endDate = format(addDays(deadlineDate, 1), 'yyyyMMdd');
    const title = encodeURIComponent(grant.title);
    const details = encodeURIComponent(`Deadline: ${grant.deadline}\nAmount: ${grant.amount}\nOrganization: ${grant.organization}\n\n${grant.notes || ''}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    MOCK_GRANTS.forEach(g => g.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, []);

  const filteredGrants = useMemo(() => {
    if (tagFilter === 'all') return MOCK_GRANTS;
    return MOCK_GRANTS.filter(g => g.tags.includes(tagFilter));
  }, [tagFilter]);

  const groupedGrants = useMemo(() => {
    const groups: Record<CategoryKey, Grant[]> = { nu: [], external: [] };
    filteredGrants.forEach(grant => {
      const category = (Object.keys(CATEGORY_CONFIG) as CategoryKey[]).find(
        key => CATEGORY_CONFIG[key].sources.includes(grant.source)
      );
      if (category) groups[category].push(grant);
    });
    return groups;
  }, [filteredGrants]);

  const selectedGrant = MOCK_GRANTS.find(g => g.id === selectedGrantId) || null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'status-open';
      case 'upcoming': return 'status-upcoming';
      case 'closed': return 'status-closed';
      default: return 'status-unclear';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Applications Open';
      case 'upcoming': return 'Coming Soon';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'northwestern-mag': return 'MAG';
      case 'external-chicago': return 'Chicago';
      case 'school-affiliated': return 'SoC';
      case 'national': return 'National';
      default: return source;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'northwestern-mag': return 'var(--accent-grant)';
      case 'external-chicago': return 'var(--accent-crew)';
      case 'school-affiliated': return 'var(--accent-casting)';
      case 'national': return 'var(--accent-resource)';
      default: return 'var(--text-muted)';
    }
  };

  const TagPill = ({ tag }: { tag: string }) => {
    const color = tag === 'NU' ? 'var(--accent-grant)'
      : tag === 'External' ? 'var(--accent-crew)'
      : tag === 'Travel' ? 'var(--accent-resource)'
      : 'var(--text-muted)';
    return (
      <span style={{
        fontSize: '10px',
        padding: '2px 6px',
        borderRadius: '9999px',
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        {tag}
      </span>
    );
  };

  // Minimal card — just title, org, amount, deadline
  const GrantCard = ({ grant }: { grant: Grant }) => {
    const isSelected = selectedGrantId === grant.id;

    return (
      <button
        onClick={() => setSelectedGrantId(isSelected ? null : grant.id)}
        style={{
          width: '100%',
          padding: 'var(--space-md) var(--space-lg)',
          background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-tertiary)',
          border: `1px solid ${isSelected ? 'var(--border-emphasis)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'inherit',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-lg)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.borderColor = 'var(--border-default)';
            e.currentTarget.style.background = 'var(--bg-elevated)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.background = 'var(--bg-tertiary)';
          }
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '4px',
          }}>
            {grant.title}
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}>
            {grant.organization}
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-lg)',
          flexShrink: 0,
          fontSize: '13px',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {grant.amount}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            fontSize: '12px',
            minWidth: '110px',
            textAlign: 'right',
          }}>
            {grant.deadline}
          </span>
          <span style={{
            color: 'var(--text-tertiary)',
            fontSize: '14px',
            width: '16px',
            textAlign: 'center',
          }}>
            {isSelected ? '‹' : '›'}
          </span>
        </div>
      </button>
    );
  };

  // Detail panel — shown in sidebar when a grant is selected
  const DetailPanel = ({ grant }: { grant: Grant }) => (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-emphasis)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      position: 'sticky',
      top: '72px',
      maxHeight: 'calc(100vh - 88px)',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-lg)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 'var(--space-md)',
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            marginBottom: 'var(--space-sm)',
          }}>
            {grant.title}
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {grant.organization}
          </div>
        </div>
        <button
          onClick={() => setSelectedGrantId(null)}
          style={{
            padding: '4px 8px',
            background: 'transparent',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Status + tags */}
      <div style={{
        padding: 'var(--space-md) var(--space-lg)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        gap: 'var(--space-sm)',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span className={`status-badge ${getStatusColor(grant.status)}`}>
          {getStatusLabel(grant.status)}
        </span>
        <span style={{
          fontSize: '11px',
          padding: '3px 7px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-elevated)',
          color: getSourceColor(grant.source),
          border: `1px solid ${getSourceColor(grant.source)}`,
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
        }}>
          {getSourceLabel(grant.source)}
        </span>
        {grant.tags.map(tag => (
          <TagPill key={tag} tag={tag} />
        ))}
      </div>

      {/* Key details grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1px',
        background: 'var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ padding: 'var(--space-md) var(--space-lg)', background: 'var(--bg-secondary)' }}>
          <div style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '4px',
          }}>Amount</div>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--accent-grant)',
            fontFamily: 'var(--font-mono)',
          }}>{grant.amount}</div>
        </div>
        <div style={{ padding: 'var(--space-md) var(--space-lg)', background: 'var(--bg-secondary)' }}>
          <div style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '4px',
          }}>Deadline</div>
          <div style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
          }}>{grant.deadline}</div>
        </div>
        {grant.eligibility && (
          <div style={{ padding: 'var(--space-md) var(--space-lg)', background: 'var(--bg-secondary)', gridColumn: '1 / -1' }}>
            <div style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '4px',
            }}>Eligibility</div>
            <div style={{
              fontSize: '13px',
              color: 'var(--text-primary)',
            }}>{grant.eligibility}</div>
          </div>
        )}
      </div>

      {/* Notes */}
      {grant.notes && (
        <div style={{
          padding: 'var(--space-md) var(--space-lg)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}>
          {grant.notes}
        </div>
      )}

      {/* Requirements */}
      <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--space-md)',
        }}>
          Required Materials
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {grant.requirements.map((req, idx) => (
            <div key={idx} style={{
              display: 'flex',
              gap: 'var(--space-sm)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
            }}>
              <span style={{
                color: 'var(--text-muted)',
                flexShrink: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                marginTop: '2px',
              }}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span>{req}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selection Criteria */}
      <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--space-md)',
        }}>
          Selection Criteria
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          {grant.selectionCriteria.map((criteria, idx) => (
            <div key={idx} style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
              paddingLeft: 'var(--space-md)',
              position: 'relative',
            }}>
              <span style={{
                position: 'absolute',
                left: 0,
                color: 'var(--accent-grant)',
                fontSize: '8px',
                top: '5px',
              }}>&#9670;</span>
              {criteria}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{
        padding: 'var(--space-lg)',
        display: 'flex',
        gap: 'var(--space-sm)',
      }}>
        <a
          href={grant.applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-sm) var(--space-lg)',
            background: grant.status === 'open' ? 'var(--accent-grant)' : 'var(--bg-elevated)',
            color: grant.status === 'open' ? 'var(--bg-primary)' : 'var(--text-tertiary)',
            border: `1px solid ${grant.status === 'open' ? 'var(--accent-grant)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
            cursor: grant.status === 'open' ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
          }}
          onClick={(e) => {
            if (grant.status !== 'open') e.preventDefault();
          }}
        >
          {grant.status === 'open' ? 'Apply Now' : 'Not Yet Open'}
        </a>
        <a
          href={generateGoogleCalendarUrl(grant)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            textDecoration: 'none',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.15s ease',
          }}
          title="Add deadline to Google Calendar"
        >
          +Cal
        </a>
      </div>
    </div>
  );

  // Resources sidebar — shown when no grant is selected
  const ResourcesSidebar = () => (
    <aside style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-md)',
      position: 'sticky',
      top: '72px',
    }}>
      {/* Faculty Contacts */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg)',
      }}>
        <h3 style={{
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-md)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Faculty Contacts
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {[
            { name: 'Prof. Sarah Chen', role: 'MAG Advisor', email: 'sarah.chen@northwestern.edu' },
            { name: 'Prof. David Kim', role: 'Production Faculty', email: 'david.kim@northwestern.edu' },
            { name: 'RTF Main Office', role: 'General Inquiries', email: 'rtf@northwestern.edu' },
          ].map((contact) => (
            <div key={contact.email}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {contact.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                {contact.role}
              </div>
              <a
                href={`mailto:${contact.email}`}
                style={{
                  fontSize: '12px',
                  color: 'var(--accent-grant)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {contact.email}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Grant Writing Resources */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg)',
      }}>
        <h3 style={{
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-md)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Grant Writing Resources
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {[
            { label: 'How to Write a Strong Pitch', href: '#' },
            { label: 'Budget Template (Excel)', href: '#' },
            { label: 'Sample Application', href: '#' },
            { label: 'MAG FAQ', href: '#' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                padding: 'var(--space-xs) 0',
                borderBottom: '1px solid var(--border-subtle)',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-grant)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Calendar Link */}
      <Link
        href="/calendar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-md) var(--space-lg)',
          background: 'var(--accent-grant)',
          color: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: 600,
          transition: 'opacity 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
      >
        View Full Timeline
      </Link>

      {/* Tips */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg)',
      }}>
        <h3 style={{
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-md)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Tips
        </h3>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            Click any grant to see full details, requirements, and application link.
          </p>
          <p>
            Start applications early — faculty recommendations and pitch videos take time to prepare.
          </p>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">Grants & Funding</h1>
            <div className="header-stats">
              <div className="stat-pill stat-open">
                <span className="stat-value">
                  {MOCK_GRANTS.filter(g => g.status === 'open').length}
                </span>
                <span className="stat-label">open now</span>
              </div>
              <div className="stat-pill stat-total">
                <span className="stat-value">{MOCK_GRANTS.length}</span>
                <span className="stat-label">total</span>
              </div>
            </div>
          </div>
          <p className="dashboard-subtitle">
            Funding for student filmmaking projects — Northwestern and external sources
          </p>
        </div>
      </header>

      {/* Tag Filter Bar */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-sm)',
        alignItems: 'center',
        padding: 'var(--space-md)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-lg)',
        flexWrap: 'wrap',
      }}>
        <label style={{
          fontSize: '12px',
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginRight: 'var(--space-xs)',
        }}>
          Filter:
        </label>
        {['all', ...allTags].map(tag => (
          <button
            key={tag}
            onClick={() => setTagFilter(tag)}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              borderRadius: '9999px',
              border: `1px solid ${tagFilter === tag ? 'var(--accent-grant)' : 'var(--border-default)'}`,
              background: tagFilter === tag ? 'var(--accent-grant)' : 'var(--bg-tertiary)',
              color: tagFilter === tag ? 'var(--bg-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            {tag === 'all' ? 'All' : tag}
          </button>
        ))}
        <div style={{
          marginLeft: 'auto',
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          {filteredGrants.length} {filteredGrants.length === 1 ? 'grant' : 'grants'}
        </div>
      </div>

      {/* Main: grant list + sidebar/detail panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedGrant ? '1fr 380px' : '1fr 280px',
        gap: 'var(--space-lg)',
        alignItems: 'start',
        transition: 'grid-template-columns 0.2s ease',
      }}>
        {/* Grant list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          {(Object.keys(CATEGORY_CONFIG) as CategoryKey[]).map(categoryKey => {
            const config = CATEGORY_CONFIG[categoryKey];
            const grants = groupedGrants[categoryKey];
            if (grants.length === 0) return null;

            return (
              <section key={categoryKey}>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 'var(--space-md)',
                  marginBottom: 'var(--space-md)',
                  paddingBottom: 'var(--space-sm)',
                  borderBottom: `2px solid ${config.color}`,
                }}>
                  <h2 style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    {config.label}
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {config.description}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-sm)',
                }}>
                  {grants.map(grant => (
                    <GrantCard key={grant.id} grant={grant} />
                  ))}
                </div>
              </section>
            );
          })}

          {filteredGrants.length === 0 && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-xl)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: 'var(--space-md)' }}>
                ∅
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                No grants match this filter
              </div>
            </div>
          )}
        </div>

        {/* Right column: detail panel or resources */}
        {selectedGrant ? (
          <DetailPanel grant={selectedGrant} />
        ) : (
          <ResourcesSidebar />
        )}
      </div>
    </div>
  );
}
