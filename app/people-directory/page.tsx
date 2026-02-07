'use client';

import { useState, useMemo } from 'react';

interface Person {
  id: number;
  name: string;
  pronouns: string;
  primaryRole: 'actor' | 'director' | 'cinematographer' | 'producer' | 'editor' | 'sound' | 'writer' | 'multi';
  shortBio: string;
  fullBio: string;
  photo: string;
  pastRoles: string[];
  lookingFor: string[];
  skills: string[];
  availability: 'available' | 'limited' | 'unavailable';
  contact: {
    email?: string;
    phone?: string;
  };
  experience: 'student' | 'emerging' | 'professional';
  recentWork?: string;
}

const MOCK_PEOPLE: Person[] = [
  {
    id: 1,
    name: 'Maya Rodriguez',
    pronouns: 'she/her',
    primaryRole: 'actor',
    shortBio: 'Versatile actor with stage & screen experience',
    fullBio: 'Maya is a versatile actor with 5+ years of experience in both stage and screen productions. Trained at Northwestern\'s theater program, she specializes in dramatic roles but enjoys comedy and experimental work. Recently wrapped a short film that screened at several festivals.',
    photo: 'https://i.pravatar.cc/150?img=1',
    pastRoles: ['Lead in "The Glass Menagerie"', 'Supporting in indie feature "Remnants"', 'Voice acting for podcast series', 'Background in multiple student films'],
    lookingFor: ['Lead roles in dramatic films', 'Supporting roles in comedies', 'Voice acting opportunities', 'Experimental theater'],
    skills: ['Stage combat', 'Improv', 'Voice work', 'Period acting'],
    availability: 'available',
    contact: { email: 'maya.r@example.com' },
    experience: 'emerging',
    recentWork: 'Lead in "Remnants" (2025)',
  },
  {
    id: 2,
    name: 'James Chen',
    pronouns: 'he/him',
    primaryRole: 'cinematographer',
    shortBio: 'DP specializing in narrative & documentary',
    fullBio: 'James is a cinematographer with a keen eye for visual storytelling. He has shot over 20 short films and 3 feature-length documentaries. Owns a full camera package including BMPCC 6K and professional lighting kit. Passionate about naturalistic lighting and long takes.',
    photo: 'https://i.pravatar.cc/150?img=12',
    pastRoles: ['DP on award-winning short "Homecoming"', 'Camera operator on Netflix documentary', 'Gaffer on multiple student productions', '2nd Unit DP on indie feature'],
    lookingFor: ['DP positions on narrative features', 'Documentary work', 'Music videos', 'Mentorship opportunities'],
    skills: ['Blackmagic cameras', 'Lighting design', 'Color grading', 'Gimbal operation'],
    availability: 'limited',
    contact: { email: 'jchen.dp@example.com', phone: '555-0123' },
    experience: 'professional',
    recentWork: 'DP on "Homecoming" (2024)',
  },
  {
    id: 3,
    name: 'Alex Thompson',
    pronouns: 'they/them',
    primaryRole: 'director',
    shortBio: 'Genre-bending director focused on queer narratives',
    fullBio: 'Alex is a director known for pushing boundaries and telling authentic queer stories. Their thesis film won Best Director at the Student Academy Awards. They bring a collaborative approach to filmmaking and love working with ensemble casts.',
    photo: 'https://i.pravatar.cc/150?img=33',
    pastRoles: ['Director of 5 award-winning short films', 'Assistant director on feature "Crossroads"', '1st AD on multiple productions', 'Script supervisor'],
    lookingFor: ['Feature directing opportunities', 'TV pilot directing', 'Creative collaborations', 'Seeking producers for passion project'],
    skills: ['Shot composition', 'Actor direction', 'Script development', 'Post-production supervision'],
    availability: 'available',
    contact: { email: 'alex.creates@example.com' },
    experience: 'emerging',
    recentWork: 'Directed "Crossroads" (2025)',
  },
  {
    id: 4,
    name: 'Priya Kapoor',
    pronouns: 'she/her',
    primaryRole: 'sound',
    shortBio: 'Sound designer & location recordist',
    fullBio: 'Priya is a sound professional who handles everything from location recording to final mix. She has her own recording equipment and home studio. Particularly skilled at creating atmospheric soundscapes and has a background in music composition.',
    photo: 'https://i.pravatar.cc/150?img=5',
    pastRoles: ['Sound designer on 15+ short films', 'Location sound on indie feature', 'Boom operator on commercial shoots', 'Foley artist'],
    lookingFor: ['Sound design projects', 'Location recording gigs', 'Post-production mixing', 'Collaborative film projects'],
    skills: ['Pro Tools', 'Boom operation', 'Sound effects creation', 'Audio post-production'],
    availability: 'available',
    contact: { email: 'priya.sound@example.com' },
    experience: 'professional',
    recentWork: 'Sound design on "Voices" (2024)',
  },
  {
    id: 5,
    name: 'Marcus Williams',
    pronouns: 'he/him',
    primaryRole: 'producer',
    shortBio: 'Line producer with festival distribution experience',
    fullBio: 'Marcus is an organized and resourceful producer who has successfully brought multiple projects from development through festival distribution. He excels at budgeting, scheduling, and problem-solving on set. Has strong relationships with local vendors and crew.',
    photo: 'https://i.pravatar.cc/150?img=14',
    pastRoles: ['Line producer on 3 indie features', 'Production manager on commercials', 'Coordinated festival submissions for 20+ films', 'Grant writing for film projects'],
    lookingFor: ['Producer roles on features', 'Co-production opportunities', 'Documentary producing', 'Short film collaborations'],
    skills: ['Budgeting', 'Scheduling', 'Vendor relations', 'Grant writing', 'Festival strategy'],
    availability: 'limited',
    contact: { email: 'm.williams.prod@example.com', phone: '555-0456' },
    experience: 'professional',
    recentWork: 'Producer on 3 indie features',
  },
  {
    id: 6,
    name: 'Sophie Laurent',
    pronouns: 'she/her',
    primaryRole: 'editor',
    shortBio: 'Editor with strong sense of pacing & rhythm',
    fullBio: 'Sophie is an editor who approaches each project as a puzzle to solve. She has edited everything from fast-paced action to contemplative dramas. Proficient in Premiere, DaVinci Resolve, and Avid. She also does color correction and motion graphics.',
    photo: 'https://i.pravatar.cc/150?img=9',
    pastRoles: ['Editor on award-winning documentary "Voices"', 'Assistant editor on feature film', 'Cut 30+ short films', 'Colorist on music videos'],
    lookingFor: ['Feature editing projects', 'Documentary work', 'Trailer cutting', 'Color grading gigs'],
    skills: ['Premiere Pro', 'DaVinci Resolve', 'Avid', 'After Effects', 'Color correction'],
    availability: 'available',
    contact: { email: 'sophie.edits@example.com' },
    experience: 'emerging',
    recentWork: 'Editor on "Voices" doc (2024)',
  },
  {
    id: 7,
    name: 'Devon Park',
    pronouns: 'he/they',
    primaryRole: 'writer',
    shortBio: 'Screenwriter focused on sci-fi & thriller genres',
    fullBio: 'Devon writes character-driven stories with high-concept premises. Their script "Echo Chamber" was a semifinalist in the Nicholl Fellowship. They are open to collaborating with directors and also enjoy script consulting work.',
    photo: 'https://i.pravatar.cc/150?img=13',
    pastRoles: ['Wrote 5 produced short films', 'Script consultant on indie feature', 'TV spec scripts for portfolio', 'Story editor on web series'],
    lookingFor: ['Feature writing opportunities', 'TV writing rooms', 'Script consulting work', 'Writing partnerships'],
    skills: ['Feature screenwriting', 'TV writing', 'Story structure', 'Script coverage', 'Dialogue'],
    availability: 'available',
    contact: { email: 'devon.writes@example.com' },
    experience: 'emerging',
    recentWork: '"Echo Chamber" screenplay',
  },
  {
    id: 8,
    name: 'Isabella Santos',
    pronouns: 'she/her',
    primaryRole: 'multi',
    shortBio: 'Multi-hyphenate: actor/writer/director',
    fullBio: 'Isabella wears many hats in the film world. She started as an actor but has expanded into writing and directing her own projects. She brings a unique perspective to her work, often exploring themes of identity and belonging. Open to collaboration in any capacity.',
    photo: 'https://i.pravatar.cc/150?img=10',
    pastRoles: ['Lead actor in 10+ short films', 'Wrote & directed thesis film', 'Acted in regional theater', 'Co-wrote feature screenplay'],
    lookingFor: ['Acting roles (especially leads)', 'Directing opportunities', 'Writing collaborations', 'Creative partnerships'],
    skills: ['Acting', 'Screenwriting', 'Directing', 'Casting'],
    availability: 'available',
    contact: { email: 'bella.creates@example.com' },
    experience: 'student',
    recentWork: 'Wrote & directed thesis film (2026)',
  },
];

const roleFilters = [
  { key: 'all', label: 'All', icon: '👥' },
  { key: 'actor', label: 'Actors', icon: '🎭' },
  { key: 'director', label: 'Directors', icon: '🎬' },
  { key: 'cinematographer', label: 'Cinematographers', icon: '🎥' },
  { key: 'producer', label: 'Producers', icon: '📋' },
  { key: 'editor', label: 'Editors', icon: '✂️' },
  { key: 'sound', label: 'Sound', icon: '🎧' },
  { key: 'writer', label: 'Writers', icon: '✍️' },
  { key: 'multi', label: 'Multi-Hyphenate', icon: '⭐' },
];

export default function PeopleDirectoryPage() {
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredPeople = useMemo(() => {
    return MOCK_PEOPLE.filter(person => {
      const roleMatch = selectedRole === 'all' || person.primaryRole === selectedRole;
      const availMatch = availabilityFilter === 'all' || person.availability === availabilityFilter;

      // Search across multiple fields
      const searchLower = searchQuery.toLowerCase();
      const searchMatch = searchQuery === '' ||
        person.name.toLowerCase().includes(searchLower) ||
        person.shortBio.toLowerCase().includes(searchLower) ||
        person.fullBio.toLowerCase().includes(searchLower) ||
        person.skills.some(skill => skill.toLowerCase().includes(searchLower)) ||
        person.pastRoles.some(role => role.toLowerCase().includes(searchLower)) ||
        person.lookingFor.some(item => item.toLowerCase().includes(searchLower)) ||
        person.recentWork?.toLowerCase().includes(searchLower);

      return roleMatch && availMatch && searchMatch;
    });
  }, [selectedRole, availabilityFilter, searchQuery]);

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'status-open';
      case 'limited': return 'status-upcoming';
      case 'unavailable': return 'status-closed';
      default: return 'status-unclear';
    }
  };

  const getExperienceBadge = (exp: string) => {
    switch (exp) {
      case 'professional': return { label: 'Pro', color: 'var(--status-open)' };
      case 'emerging': return { label: 'Emerging', color: 'var(--status-upcoming)' };
      case 'student': return { label: 'Student', color: 'var(--accent-crew)' };
      default: return { label: 'N/A', color: 'var(--status-unclear)' };
    }
  };

  const currentConfig = roleFilters.find(f => f.key === selectedRole) || roleFilters[0];

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">People Directory</h1>
            <div className="header-stats">
              <div className="stat-pill stat-total">
                <span className="stat-value">{MOCK_PEOPLE.length}</span>
                <span className="stat-label">total</span>
              </div>
              <div className="stat-pill stat-open">
                <span className="stat-value">
                  {MOCK_PEOPLE.filter(p => p.availability === 'available').length}
                </span>
                <span className="stat-label">available</span>
              </div>
            </div>
          </div>
          <p className="dashboard-subtitle">
            Connect with crew, actors, and creatives
          </p>
        </div>
      </header>

      {/* Search and Filters */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-lg)',
      }}>
        {/* Search Bar */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-md)',
          alignItems: 'center',
          padding: 'var(--space-md)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
        }}>
          <span style={{ fontSize: '16px' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by name, skills, experience, recent work..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'var(--font-body)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                padding: '6px 12px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-tertiary)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Role and Availability Filters */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-md)',
          alignItems: 'center',
          padding: 'var(--space-md)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
        }}>
          <label style={{
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Role:
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
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
            {roleFilters.map(filter => (
              <option key={filter.key} value={filter.key}>
                {filter.label}
              </option>
            ))}
          </select>

          <label style={{
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginLeft: 'var(--space-lg)',
          }}>
            Availability:
          </label>
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
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
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="limited">Limited</option>
            <option value="unavailable">Unavailable</option>
          </select>

          <div style={{
            marginLeft: 'auto',
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            {filteredPeople.length} {filteredPeople.length === 1 ? 'person' : 'people'} found
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '80px 1fr 180px 120px 200px 100px',
          gap: 'var(--space-md)',
          padding: 'var(--space-md) var(--space-lg)',
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          <div></div>
          <div>Name</div>
          <div>Role</div>
          <div>Experience</div>
          <div>Recent Work</div>
          <div>Availability</div>
        </div>

        {/* Table Body */}
        <div style={{
          maxHeight: 'calc(100vh - 400px)',
          overflowY: 'auto',
        }}>
          {filteredPeople.length === 0 ? (
            <div className="section-empty" style={{ padding: 'var(--space-xl)' }}>
              <div className="empty-icon">∅</div>
              <div className="empty-message">No people found</div>
            </div>
          ) : (
            filteredPeople.map((person) => (
              <div
                key={person.id}
                onClick={() => setSelectedPerson(person)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 180px 120px 200px 100px',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-md) var(--space-lg)',
                  borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: selectedPerson?.id === person.id ? 'var(--bg-elevated)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (selectedPerson?.id !== person.id) {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedPerson?.id !== person.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div>
                  <img
                    src={person.photo}
                    alt={person.name}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: 'var(--radius-sm)',
                      objectFit: 'cover',
                      border: '2px solid var(--border-default)',
                    }}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    marginBottom: '2px',
                  }}>
                    {person.name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}>
                    {person.pronouns}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {person.shortBio}
                  </div>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                }}>
                  {person.primaryRole === 'multi' ? 'Multi-hyphenate' : person.primaryRole.charAt(0).toUpperCase() + person.primaryRole.slice(1)}
                </div>
                <div>
                  <span style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)',
                    color: getExperienceBadge(person.experience).color,
                    border: `1px solid ${getExperienceBadge(person.experience).color}`,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                  }}>
                    {getExperienceBadge(person.experience).label}
                  </span>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {person.recentWork || 'N/A'}
                </div>
                <div>
                  <span className={`status-badge ${getAvailabilityColor(person.availability)}`}>
                    {person.availability}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Panel - Modal Style */}
      {selectedPerson && (
        <div
          onClick={() => setSelectedPerson(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-lg)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-emphasis)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="detail-panel-header">
              <div className="detail-panel-status">
                <span className={`status-badge ${getAvailabilityColor(selectedPerson.availability)}`}>
                  {selectedPerson.availability}
                </span>
              </div>
              <button
                onClick={() => setSelectedPerson(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: 'var(--space-lg)',
            }}>

              {/* Profile Header */}
              <div style={{
                display: 'flex',
                gap: 'var(--space-lg)',
                marginBottom: 'var(--space-xl)',
                paddingBottom: 'var(--space-lg)',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <img
                  src={selectedPerson.photo}
                  alt={selectedPerson.name}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: 'var(--radius-md)',
                    objectFit: 'cover',
                    border: '2px solid var(--border-emphasis)',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '24px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-xs)',
                  }}>
                    {selectedPerson.name}
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
                    {selectedPerson.pronouns}
                  </div>
                  <div className="tag-list">
                    <span className="tag">{selectedPerson.primaryRole.toUpperCase()}</span>
                    <span className="tag">{selectedPerson.experience.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="detail-section">
                <div className="detail-section-label">Bio</div>
                <div className="detail-section-value">{selectedPerson.fullBio}</div>
              </div>

              {/* Skills */}
              <div className="detail-section">
                <div className="detail-section-label">Skills</div>
                <div className="tag-list">
                  {selectedPerson.skills.map((skill, idx) => (
                    <span key={idx} className="tag">{skill}</span>
                  ))}
                </div>
              </div>

              {/* Past Roles */}
              <div className="detail-section">
                <div className="detail-section-label">Past Experience</div>
                <ul className="reason-list">
                  {selectedPerson.pastRoles.map((role, idx) => (
                    <li key={idx}>{role}</li>
                  ))}
                </ul>
              </div>

              {/* Looking For */}
              <div className="detail-section">
                <div className="detail-section-label">Currently Seeking</div>
                <ul className="reason-list">
                  {selectedPerson.lookingFor.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div className="detail-section">
                <div className="detail-section-label">Contact</div>
                <div className="detail-section-value">
                  {selectedPerson.contact.email && (
                    <div style={{ marginBottom: 'var(--space-xs)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Email: </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {selectedPerson.contact.email}
                      </span>
                    </div>
                  )}
                  {selectedPerson.contact.phone && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Phone: </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {selectedPerson.contact.phone}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
