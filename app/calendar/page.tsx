'use client';

import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, isToday, isBefore, addDays } from 'date-fns';

type Category = 'shoot' | 'grant' | 'petition' | 'event' | 'equipment';

interface TimelineItem {
  id: string;
  title: string;
  category: Category;
  date: Date;
  detail: string;
  description: string;
}

const CATEGORY_CONFIG: Record<Category, { label: string; color: string; badge: string }> = {
  shoot: { label: 'Shoot Dates', color: '#7ca0c4', badge: 'SH' },
  grant: { label: 'Grant Deadlines', color: '#d4a574', badge: 'GR' },
  petition: { label: 'Petition Deadlines', color: '#c27d9e', badge: 'PT' },
  event: { label: 'Events & Premieres', color: '#b8a9d4', badge: 'EV' },
  equipment: { label: 'Equipment/Cage', color: '#7daf8f', badge: 'EQ' },
};

const TIMELINE_ITEMS: TimelineItem[] = [
  // Shoot Dates
  { id: 's1', title: 'Thesis Film Shoot — Sound Stage A', category: 'shoot', date: new Date('2026-02-18'), detail: 'Sound Stage A, 8am–6pm', description: 'Full day shoot for thesis film "Echoes." Crew call at 7:30am. Sound Stage A reserved with full lighting grid. Lunch provided. Contact AD Maria Chen for call sheet.' },
  { id: 's2', title: 'Doc Project B-Roll Downtown', category: 'shoot', date: new Date('2026-02-25'), detail: 'Michigan Ave & Loop area', description: 'B-roll and pickup shots for documentary project on Chicago architecture. Meet at Millennium Park south entrance. Bring handheld rig and wireless lav kit.' },
  { id: 's3', title: 'Music Video Shoot — Lakefill', category: 'shoot', date: new Date('2026-03-07'), detail: 'Northwestern Lakefill, golden hour', description: 'Shooting music video for campus band "Lake Effect." Sunset shoot 4pm–7pm. Need drone operator and gimbal. Permit secured through Student Activities.' },
  { id: 's4', title: 'Short Film Pickup Day', category: 'shoot', date: new Date('2026-03-21'), detail: 'Annie May Swift Hall, Room 201', description: 'Pickup shots and reshoots for "Borrowed Time." Interior dialogue scenes. Minimal crew needed — director, DP, sound, and 2 actors confirmed.' },
  { id: 's5', title: 'Experimental Film Shoot', category: 'shoot', date: new Date('2026-04-04'), detail: 'Deering Library + campus exteriors', description: 'Abstract experimental piece exploring campus spaces. Multiple locations across north campus. Solo shoot with tripod and natural light.' },

  // Grant Deadlines
  { id: 'g1', title: 'MAG Winter 2026 — Large Production', category: 'grant', date: new Date('2026-02-20'), detail: '$750–$3,000 · Northwestern RTF', description: 'Media Arts Grant for large production projects. Requires pitch video, complete screenplay, detailed budget, crew list, and faculty recommendation. Apply through Office Forms.' },
  { id: 'g2', title: 'Indie Chicago Micro-Budget Award', category: 'grant', date: new Date('2026-02-25'), detail: '$500–$1,500 · Indie Chicago', description: 'Monthly award for micro-budget short films. Submit written pitch, sample reel, budget outline, production schedule, and distribution plan. Winners screened at Indie Chicago events.' },
  { id: 'g3', title: 'MAG Winter 2026 — Small Production', category: 'grant', date: new Date('2026-02-28'), detail: 'Up to $750 · Northwestern RTF', description: 'Media Arts Grant for small production projects. Ideal for short films, music videos, experimental work. Requires pitch video, links to previous work, screenplay/treatment, and itemized budget.' },
  { id: 'g4', title: 'Student Academy Awards Submission', category: 'grant', date: new Date('2026-05-01'), detail: '$2,000–$5,000 · Academy of Motion Picture Arts', description: 'Prestigious national competition for student filmmakers. Must submit completed film made as a student project with official school submission. Entry form and screening copy required.' },

  // Petition Deadlines
  { id: 'p1', title: 'Spring Quarter Petition Due', category: 'petition', date: new Date('2026-02-22'), detail: 'RTF Department · Undergrad', description: 'Submit petitions for spring quarter course overrides, independent studies, or special arrangements. Must have faculty advisor signature. Submit through department portal.' },
  { id: 'p2', title: 'Independent Study Form Deadline', category: 'petition', date: new Date('2026-03-01'), detail: 'All SoC students', description: 'Last day to submit independent study proposals for Spring 2026. Requires faculty sponsor, project outline, meeting schedule, and expected deliverables.' },
  { id: 'p3', title: 'Summer Course Petition Window', category: 'petition', date: new Date('2026-03-15'), detail: 'RTF Department', description: 'Petition period opens for summer course enrollment, cross-registration, and transfer credit pre-approval. See department website for eligible courses.' },
  { id: 'p4', title: 'Thesis Committee Approval Forms', category: 'petition', date: new Date('2026-04-01'), detail: 'RTF Seniors', description: 'Final deadline to submit thesis committee approval forms. Must include committee member signatures, thesis proposal abstract, and projected completion timeline.' },

  // Events & Premieres
  { id: 'e1', title: 'RTVF Screening Night', category: 'event', date: new Date('2026-02-21'), detail: 'Block Museum, 7pm', description: 'Monthly screening of student work. This month features thesis works-in-progress. Q&A with filmmakers after each screening. Reception to follow with faculty and guest industry professionals.' },
  { id: 'e2', title: 'Chicago Film Fest Panel', category: 'event', date: new Date('2026-03-10'), detail: 'Music Box Theatre, 6pm', description: 'Panel discussion: "From Student Film to Festival Circuit." Featuring NU alumni who premiered at Sundance, SXSW, and Tribeca. Free for students with valid ID.' },
  { id: 'e3', title: 'Thesis Presentations', category: 'event', date: new Date('2026-04-15'), detail: 'Annie May Swift Hall, all day', description: 'Senior thesis presentation day. All RTF seniors present final thesis projects to faculty committee and student audience. Schedule TBD — check department board.' },
  { id: 'e4', title: 'Spring Quarter Kickoff Mixer', category: 'event', date: new Date('2026-03-28'), detail: 'RTF Lounge, 5pm', description: 'Casual networking mixer for RTF students. Meet potential collaborators for spring projects. Pizza and drinks provided. Bring business cards or project lookbooks.' },

  // Equipment / Cage
  { id: 'eq1', title: 'Cage Checkout Window Opens', category: 'equipment', date: new Date('2026-02-17'), detail: 'Spring quarter reservations', description: 'Equipment cage opens spring quarter reservation window. Reserve cameras, lenses, lighting kits, and audio gear. First-come, first-served for high-demand items like RED cameras and Arri kits.' },
  { id: 'eq2', title: 'Equipment Return Deadline', category: 'equipment', date: new Date('2026-03-14'), detail: 'All winter checkouts due', description: 'All equipment checked out for winter quarter productions must be returned by 5pm. Late returns incur holds on future checkout privileges. Clean and inspect gear before return.' },
  { id: 'eq3', title: 'Cage Maintenance — Closed', category: 'equipment', date: new Date('2026-03-20'), detail: 'No checkouts available', description: 'Equipment cage closed for annual maintenance and inventory. No checkouts or returns. Plan projects accordingly — checkout resumes March 23.' },
];

function generateGoogleCalendarUrl(item: TimelineItem): string {
  const startDate = format(item.date, "yyyyMMdd");
  const endDate = format(addDays(item.date, 1), "yyyyMMdd");
  const title = encodeURIComponent(item.title);
  const details = encodeURIComponent(item.detail + '\n\n' + item.description);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
}

export default function CalendarPage() {
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    new Set(['shoot', 'grant', 'petition', 'event', 'equipment'])
  );
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const toggleCategory = (cat: Category) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    return TIMELINE_ITEMS
      .filter(item => activeCategories.has(item.category))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [activeCategories]);

  const weekGroups = useMemo(() => {
    const groups: { weekStart: Date; weekEnd: Date; items: TimelineItem[] }[] = [];
    const weekMap = new Map<string, { weekStart: Date; weekEnd: Date; items: TimelineItem[] }>();

    filteredItems.forEach(item => {
      const ws = startOfWeek(item.date, { weekStartsOn: 1 });
      const key = format(ws, 'yyyy-MM-dd');
      if (!weekMap.has(key)) {
        weekMap.set(key, {
          weekStart: ws,
          weekEnd: endOfWeek(item.date, { weekStartsOn: 1 }),
          items: [],
        });
      }
      weekMap.get(key)!.items.push(item);
    });

    weekMap.forEach(group => groups.push(group));
    groups.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
    return groups;
  }, [filteredItems]);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const todayWeekKey = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">Timeline</h1>
            <div className="header-stats">
              <div className="stat-pill stat-open">
                <span className="stat-value">
                  {filteredItems.filter(i => !isBefore(i.date, now)).length}
                </span>
                <span className="stat-label">upcoming</span>
              </div>
              <div className="stat-pill stat-total">
                <span className="stat-value">{filteredItems.length}</span>
                <span className="stat-label">total</span>
              </div>
            </div>
          </div>
          <p className="dashboard-subtitle">
            All listserv opportunities organized by date — click any item to add to Google Calendar
          </p>
        </div>
      </header>

      {/* Category Filters */}
      <div style={{
        display: 'flex',
        gap: '6px',
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
          Show:
        </label>
        {(Object.keys(CATEGORY_CONFIG) as Category[]).map(cat => {
          const config = CATEGORY_CONFIG[cat];
          const active = activeCategories.has(cat);
          const count = TIMELINE_ITEMS.filter(i => i.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '13px',
                fontFamily: 'var(--font-display)',
                borderRadius: '999px',
                border: `1px solid ${active ? config.color : 'var(--border-subtle)'}`,
                background: active ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontWeight: 500,
                boxShadow: active ? `0 0 0 1px ${config.color}` : 'none',
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--bg-primary)',
                background: config.color,
                opacity: active ? 1 : 0.4,
              }}>
                {config.badge}
              </span>
              <span>{config.label}</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xl)',
      }}>
        {weekGroups.length === 0 && (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-xl)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: 'var(--space-sm)' }}>
              ∅
            </div>
            <div style={{
              fontSize: '13px',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              No items match the selected filters
            </div>
          </div>
        )}

        {weekGroups.map(group => {
          const weekKey = format(group.weekStart, 'yyyy-MM-dd');
          const isCurrentWeek = weekKey === todayWeekKey;
          const isPastWeek = isBefore(group.weekEnd, now);

          return (
            <section key={weekKey} style={{ opacity: isPastWeek ? 0.5 : 1 }}>
              {/* Week Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-md)',
                paddingBottom: 'var(--space-sm)',
                borderBottom: `2px solid ${isCurrentWeek ? 'var(--accent-crew)' : 'var(--border-subtle)'}`,
              }}>
                <h2 style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: isCurrentWeek ? 'var(--accent-crew)' : 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {format(group.weekStart, 'MMM d')} – {format(group.weekEnd, 'MMM d, yyyy')}
                </h2>
                {isCurrentWeek && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--bg-primary)',
                    background: 'var(--accent-crew)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    This Week
                  </span>
                )}
                {isPastWeek && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)',
                  }}>
                    Past
                  </span>
                )}
                <span style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  marginLeft: 'auto',
                }}>
                  {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Week Items */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-sm)',
              }}>
                {group.items.map(item => {
                  const config = CATEGORY_CONFIG[item.category];
                  const isPast = isBefore(item.date, now);
                  const isItemToday = isToday(item.date);
                  const isExpanded = expandedItem === item.id;

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: `1px solid ${isItemToday ? 'var(--accent-crew)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        opacity: isPast ? 0.6 : 1,
                        boxShadow: isItemToday ? '0 0 0 1px var(--accent-crew)' : 'none',
                      }}
                    >
                      <button
                        onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                        style={{
                          width: '100%',
                          padding: 'var(--space-md) var(--space-lg)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          color: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-md)',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-elevated)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {/* Date */}
                        <div className="calendar-item-date" style={{
                          flexShrink: 0,
                          width: '52px',
                          textAlign: 'center',
                        }}>
                          <div style={{
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono)',
                            color: isItemToday ? 'var(--accent-crew)' : 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                            {format(item.date, 'EEE')}
                          </div>
                          <div style={{
                            fontSize: '20px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: isItemToday ? 'var(--accent-crew)' : 'var(--text-primary)',
                            lineHeight: 1.2,
                          }}>
                            {format(item.date, 'd')}
                          </div>
                          <div style={{
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-muted)',
                          }}>
                            {format(item.date, 'MMM')}
                          </div>
                        </div>

                        {/* Category Badge */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'var(--bg-primary)',
                          background: config.color,
                          flexShrink: 0,
                        }}>
                          {config.badge}
                        </div>

                        {/* Title & Detail */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: '2px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {item.title}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-tertiary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {item.detail}
                          </div>
                        </div>

                        {/* Today Marker */}
                        {isItemToday && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--accent-crew)',
                            background: 'rgba(124, 160, 196, 0.15)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--accent-crew)',
                            flexShrink: 0,
                          }}>
                            Today
                          </span>
                        )}

                        {/* Expand Icon */}
                        <span style={{
                          fontSize: '16px',
                          color: 'var(--text-tertiary)',
                          flexShrink: 0,
                          fontFamily: 'var(--font-mono)',
                          width: '20px',
                          textAlign: 'center',
                        }}>
                          {isExpanded ? '−' : '+'}
                        </span>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div style={{
                          padding: 'var(--space-md) var(--space-lg)',
                          paddingTop: 0,
                          background: 'var(--bg-secondary)',
                          borderTop: '1px solid var(--border-subtle)',
                          animation: 'slideDown 0.2s ease',
                        }}>
                          <div style={{
                            display: 'flex',
                            gap: 'var(--space-lg)',
                            alignItems: 'flex-start',
                            paddingTop: 'var(--space-md)',
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: 'var(--text-muted)',
                                marginBottom: 'var(--space-xs)',
                                fontWeight: 600,
                              }}>
                                Details
                              </div>
                              <div style={{
                                fontSize: '13px',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.7,
                              }}>
                                {item.description}
                              </div>

                              <div style={{
                                display: 'flex',
                                gap: 'var(--space-md)',
                                marginTop: 'var(--space-lg)',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                              }}>
                                <span style={{
                                  fontSize: '11px',
                                  padding: '4px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: `color-mix(in srgb, ${config.color} 15%, transparent)`,
                                  color: config.color,
                                  border: `1px solid ${config.color}`,
                                  fontFamily: 'var(--font-mono)',
                                  textTransform: 'uppercase',
                                }}>
                                  {config.label}
                                </span>
                                <span style={{
                                  fontSize: '12px',
                                  fontFamily: 'var(--font-mono)',
                                  color: 'var(--text-muted)',
                                }}>
                                  {format(item.date, 'EEEE, MMMM d, yyyy')}
                                </span>
                              </div>
                            </div>

                            <a
                              href={generateGoogleCalendarUrl(item)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Add to Google Calendar"
                              style={{
                                flexShrink: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: 'var(--space-sm) var(--space-md)',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-default)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-secondary)',
                                fontSize: '12px',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 500,
                                textDecoration: 'none',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = config.color;
                                e.currentTarget.style.color = 'var(--bg-primary)';
                                e.currentTarget.style.borderColor = config.color;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--bg-elevated)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.borderColor = 'var(--border-default)';
                              }}
                            >
                              +Cal
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
