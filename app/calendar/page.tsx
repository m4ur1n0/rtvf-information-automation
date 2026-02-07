'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Link from 'next/link';

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  type: 'grant' | 'petition' | 'temp-post';
  date: string;
  link: string;
  start: Date;
  end: Date;
}

export default function CalendarPage() {
  const [calendarItems, setCalendarItems] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date('2026-02-15'));
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');

  useEffect(() => {
    // Load all bookmarked items from localStorage
    const items = JSON.parse(localStorage.getItem('calendarItems') || '[]');
    const events = items.map((item: any) => ({
      ...item,
      start: new Date(item.date),
      end: new Date(item.date),
    }));
    setCalendarItems(events);
  }, []);

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '';
    switch (event.type) {
      case 'grant':
        backgroundColor = '#d4a574'; // var(--accent-grant)
        break;
      case 'petition':
        backgroundColor = '#c27d9e'; // var(--accent-casting)
        break;
      case 'temp-post':
        backgroundColor = '#7daf8f'; // var(--accent-resource)
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: '#0f1419',
        border: 'none',
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
      },
    };
  };

  const groupedEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      upcoming: calendarItems
        .filter(item => new Date(item.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      past: calendarItems
        .filter(item => new Date(item.date) < today)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  }, [calendarItems]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'grant': return '💰';
      case 'petition': return '📋';
      case 'temp-post': return '⏰';
      default: return '📌';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'grant': return 'Grant Deadline';
      case 'petition': return 'Petition Deadline';
      case 'temp-post': return 'Post Expiration';
      default: return type;
    }
  };

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">My Calendar</h1>
            <div className="header-stats">
              <div className="stat-pill stat-open">
                <span className="stat-value">{groupedEvents.upcoming.length}</span>
                <span className="stat-label">upcoming</span>
              </div>
              <div className="stat-pill stat-total">
                <span className="stat-value">{calendarItems.length}</span>
                <span className="stat-label">total</span>
              </div>
            </div>
          </div>
          <p className="dashboard-subtitle">
            All your bookmarked deadlines and important dates
          </p>
        </div>
      </header>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-lg)',
        padding: 'var(--space-md)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-lg)',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: '#d4a574',
            borderRadius: '2px',
          }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Grants</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: '#c27d9e',
            borderRadius: '2px',
          }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Petitions</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: '#7daf8f',
            borderRadius: '2px',
          }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Temp Posts</span>
        </div>
      </div>

      {/* Calendar View */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-lg)',
        marginBottom: 'var(--space-xl)',
        height: '600px',
      }}>
        <Calendar
          localizer={localizer}
          events={calendarItems}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={(event: CalendarEvent) => setSelectedEvent(event)}
          view={view}
          onView={(newView: 'month' | 'week' | 'day' | 'agenda') => setView(newView)}
          date={currentDate}
          onNavigate={(newDate: Date) => setCurrentDate(newDate)}
        />
      </div>

      {/* Upcoming Events List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-lg)',
      }}>
        {/* Upcoming */}
        <div>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-md)',
          }}>
            Upcoming Deadlines
          </h2>

          {groupedEvents.upcoming.length === 0 ? (
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
                marginBottom: 'var(--space-sm)',
              }}>
                📅
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--text-tertiary)',
              }}>
                No upcoming deadlines
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-sm)',
            }}>
              {groupedEvents.upcoming.map((event) => (
                <Link
                  key={event.id}
                  href={event.link}
                  style={{
                    textDecoration: 'none',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-md)',
                    display: 'block',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-emphasis)';
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                  }}>
                    <div style={{ fontSize: '24px' }}>
                      {getTypeIcon(event.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: '2px',
                      }}>
                        {event.title}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {getTypeLabel(event.type)}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      textAlign: 'right',
                    }}>
                      {new Date(event.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Past */}
        <div>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-md)',
          }}>
            Past Deadlines
          </h2>

          {groupedEvents.past.length === 0 ? (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-xl)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '13px',
                color: 'var(--text-tertiary)',
              }}>
                No past deadlines
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-sm)',
              opacity: 0.6,
            }}>
              {groupedEvents.past.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-md)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                  }}>
                    <div style={{ fontSize: '24px' }}>
                      {getTypeIcon(event.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: '2px',
                      }}>
                        {event.title}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {getTypeLabel(event.type)}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      textAlign: 'right',
                    }}>
                      {new Date(event.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          onClick={() => setSelectedEvent(null)}
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
              maxWidth: '500px',
              width: '100%',
              padding: 'var(--space-lg)',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              marginBottom: 'var(--space-lg)',
            }}>
              <div style={{ fontSize: '32px' }}>
                {getTypeIcon(selectedEvent.type)}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '4px',
                }}>
                  {selectedEvent.title}
                </h3>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {getTypeLabel(selectedEvent.type)}
                </div>
              </div>
            </div>

            <div style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-lg)',
            }}>
              <strong>Date:</strong>{' '}
              {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>

            <Link
              href={selectedEvent.link}
              style={{
                display: 'block',
                width: '100%',
                padding: 'var(--space-md)',
                background: 'var(--accent-crew)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--bg-primary)',
                fontSize: '14px',
                fontWeight: 700,
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              View Details →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
