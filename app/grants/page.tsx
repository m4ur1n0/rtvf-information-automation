'use client';

import { useState, useMemo, useEffect } from 'react';

interface Grant {
  id: number;
  source: 'northwestern-mag' | 'external-chicago' | 'school-affiliated' | 'national';
  grantType?: string; // e.g., "Small Production", "Large Production"
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
}

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
  },
];

export default function GrantsPage() {
  const [expandedGrant, setExpandedGrant] = useState<number | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [bookmarkedGrants, setBookmarkedGrants] = useState<number[]>([]);

  useEffect(() => {
    // Load bookmarked grants
    const bookmarks = localStorage.getItem('bookmarkedGrants');
    if (bookmarks) {
      setBookmarkedGrants(JSON.parse(bookmarks));
    }
  }, []);

  const handleBookmark = (grantId: number) => {
    const newBookmarks = bookmarkedGrants.includes(grantId)
      ? bookmarkedGrants.filter(id => id !== grantId)
      : [...bookmarkedGrants, grantId];

    setBookmarkedGrants(newBookmarks);
    localStorage.setItem('bookmarkedGrants', JSON.stringify(newBookmarks));

    // Also save to calendar items
    const grant = MOCK_GRANTS.find(g => g.id === grantId);
    if (grant) {
      const calendarItems = JSON.parse(localStorage.getItem('calendarItems') || '[]');
      if (newBookmarks.includes(grantId)) {
        calendarItems.push({
          id: `grant-${grantId}`,
          title: grant.title,
          type: 'grant',
          date: new Date(grant.deadline).toISOString(),
          link: '/grants',
        });
      } else {
        const filtered = calendarItems.filter((item: any) => item.id !== `grant-${grantId}`);
        localStorage.setItem('calendarItems', JSON.stringify(filtered));
        return;
      }
      localStorage.setItem('calendarItems', JSON.stringify(calendarItems));
    }
  };

  const filteredGrants = useMemo(() => {
    if (sourceFilter === 'all') return MOCK_GRANTS;
    return MOCK_GRANTS.filter(g => g.source === sourceFilter);
  }, [sourceFilter]);

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
      case 'northwestern-mag': return 'Northwestern MAG';
      case 'external-chicago': return 'Chicago Area';
      case 'school-affiliated': return 'School Affiliated';
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

  const GrantCard = ({ grant }: { grant: Grant }) => {
    const isExpanded = expandedGrant === grant.id;
    const isBookmarked = bookmarkedGrants.includes(grant.id);

    return (
      <div
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          position: 'relative',
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleBookmark(grant.id);
          }}
          style={{
            position: 'absolute',
            top: 'var(--space-md)',
            right: 'var(--space-md)',
            zIndex: 10,
            padding: 'var(--space-xs) var(--space-sm)',
            background: isBookmarked ? 'var(--accent-grant)' : 'var(--bg-elevated)',
            border: `1px solid ${isBookmarked ? 'var(--accent-grant)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-sm)',
            color: isBookmarked ? 'var(--bg-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'all 0.2s ease',
          }}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark grant'}
        >
          {isBookmarked ? '★' : '☆'}
        </button>
        <button
          onClick={() => setExpandedGrant(isExpanded ? null : grant.id)}
          style={{
            width: '100%',
            padding: 'var(--space-lg)',
            paddingRight: '60px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            color: 'inherit',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 'var(--space-md)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-elevated)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-sm)',
              flexWrap: 'wrap',
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                {grant.title}
              </h3>
              <span className={`status-badge ${getStatusColor(grant.status)}`}>
                {getStatusLabel(grant.status)}
              </span>
              <span style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-elevated)',
                color: getSourceColor(grant.source),
                border: `1px solid ${getSourceColor(grant.source)}`,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
              }}>
                {getSourceLabel(grant.source)}
              </span>
            </div>

            <div style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-sm)',
            }}>
              {grant.organization}
            </div>

            <div style={{
              display: 'flex',
              gap: 'var(--space-lg)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              flexWrap: 'wrap',
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Amount: </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: 'var(--accent-grant)',
                }}>
                  {grant.amount}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Deadline: </span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {grant.deadline}
                </span>
              </div>
              {grant.eligibility && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Eligibility: </span>
                  <span>{grant.eligibility}</span>
                </div>
              )}
            </div>

            {grant.notes && (
              <div style={{
                marginTop: 'var(--space-sm)',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                fontStyle: 'italic',
              }}>
                {grant.notes}
              </div>
            )}
          </div>

          <div style={{
            fontSize: '20px',
            color: 'var(--text-tertiary)',
            flexShrink: 0,
          }}>
            {isExpanded ? '−' : '+'}
          </div>
        </button>

        {isExpanded && (
          <div style={{
            padding: 'var(--space-lg)',
            paddingTop: 0,
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-subtle)',
          }}>
            {/* Requirements */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="detail-label" style={{ marginBottom: 'var(--space-sm)' }}>
                Required Materials
              </div>
              <ul className="reason-list">
                {grant.requirements.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </div>

            {/* Selection Criteria */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="detail-label" style={{ marginBottom: 'var(--space-sm)' }}>
                Selection Criteria
              </div>
              <ul className="reason-list">
                {grant.selectionCriteria.map((criteria, idx) => (
                  <li key={idx}>{criteria}</li>
                ))}
              </ul>
            </div>

            {/* Application Link */}
            <a
              href={grant.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: 'var(--space-sm) var(--space-lg)',
                background: grant.status === 'open' ? 'var(--accent-grant)' : 'var(--bg-elevated)',
                color: grant.status === 'open' ? 'var(--bg-primary)' : 'var(--text-tertiary)',
                border: `1px solid ${grant.status === 'open' ? 'var(--accent-grant)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                cursor: grant.status === 'open' ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
              onClick={(e) => {
                if (grant.status !== 'open') {
                  e.preventDefault();
                }
              }}
            >
              {grant.status === 'open' ? 'Apply Now →' : 'Application Not Yet Open'}
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">Media Arts Grants</h1>
            <div className="header-stats">
              <div className="stat-pill stat-open">
                <span className="stat-value">
                  {MOCK_GRANTS.filter(g => g.status === 'open').length}
                </span>
                <span className="stat-label">open now</span>
              </div>
              <div className="stat-pill stat-total">
                <span className="stat-value">{bookmarkedGrants.length}</span>
                <span className="stat-label">bookmarked</span>
              </div>
              <div className="stat-pill stat-total">
                <span className="stat-value">{MOCK_GRANTS.length}</span>
                <span className="stat-label">total</span>
              </div>
            </div>
          </div>
          <p className="dashboard-subtitle">
            Funding for student filmmaking projects
          </p>
        </div>
      </header>

      {/* Source Filter */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-md)',
        alignItems: 'center',
        padding: 'var(--space-md)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-lg)',
      }}>
        <label style={{
          fontSize: '12px',
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Filter by Source:
        </label>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          style={{
            padding: '6px 12px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontFamily: 'var(--font-body)',
          }}
        >
          <option value="all">All Sources</option>
          <option value="northwestern-mag">Northwestern MAG</option>
          <option value="external-chicago">Chicago Area</option>
          <option value="school-affiliated">School Affiliated</option>
          <option value="national">National</option>
        </select>

        <div style={{
          marginLeft: 'auto',
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          {filteredGrants.length} {filteredGrants.length === 1 ? 'grant' : 'grants'} available
        </div>
      </div>

      {/* All Grants */}
      <section>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)',
        }}>
          {filteredGrants.length === 0 ? (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-xl)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '48px',
                opacity: 0.3,
                marginBottom: 'var(--space-md)',
              }}>
                ∅
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                No grants found
              </div>
            </div>
          ) : (
            filteredGrants.map(grant => (
              <GrantCard key={grant.id} grant={grant} />
            ))
          )}
        </div>
      </section>

      {/* Additional Resources */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg)',
        marginTop: 'var(--space-xl)',
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-md)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Need Help?
        </h3>
        <div style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            Questions about the Media Arts Grant? Check the{' '}
            <a
              href="#"
              style={{
                color: 'var(--accent-grant)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--accent-grant)',
              }}
            >
              FAQs
            </a>
            {' '}or reach out to the RTF Department for guidance.
          </p>
          <p>
            Grants are evaluated on artistic merit and feasibility. Make sure your pitch video
            clearly demonstrates your vision and your previous work showcases your abilities.
          </p>
        </div>
      </div>
    </div>
  );
}
