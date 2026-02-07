'use client';

import { useState, useEffect } from 'react';

interface TimeSlot {
  id: string;
  time: string;
  date: string;
  available: boolean;
  bookedBy?: string;
}

interface Petition {
  id: number;
  title: string;
  type: 'audition' | 'crew-call' | 'interview' | 'workshop';
  description: string;
  deadline: string;
  location: string;
  contactEmail: string;
  questions: {
    id: string;
    question: string;
    type: 'text' | 'textarea' | 'select' | 'checkbox';
    required: boolean;
    options?: string[];
  }[];
  timeSlots: TimeSlot[];
}

const MOCK_PETITIONS: Petition[] = [
  {
    id: 1,
    title: 'JTE Art in Action Open Call',
    type: 'audition',
    description: 'Art in Action brings together multiple artistic mediums—like music, spoken word, visual art, dance, and film—around a unifying theme. This event will take place Week 6 of Winter Quarter.',
    deadline: '2026-02-19T23:59:00',
    location: 'Shake Smart, Norris Center',
    contactEmail: 'katemoores2028@u.northwestern.edu',
    questions: [
      {
        id: 'name',
        question: 'Name',
        type: 'text',
        required: true,
      },
      {
        id: 'pronouns',
        question: 'Pronouns (if you are comfortable sharing)',
        type: 'text',
        required: false,
      },
      {
        id: 'email',
        question: 'Email',
        type: 'text',
        required: true,
      },
      {
        id: 'medium',
        question: 'What\'s your artistic medium? (e.g., music, dance, spoken word, visual art, theater, etc.)',
        type: 'text',
        required: true,
      },
      {
        id: 'performance',
        question: 'Tell us a little bit about what type of performance you\'d like to create for the event.',
        type: 'textarea',
        required: true,
      },
      {
        id: 'collaboration',
        question: 'What excites you about being part of this kind of collaborative event?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'commitments',
        question: 'Do you have any major commitments for the Winter 2026 Quarter?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'workshops',
        question: 'Would you be interested in helping at workshops (5-6pm: 2/7, 2/21, 2/27) in a teaching/mentorship capacity?',
        type: 'select',
        required: true,
        options: ['Yes, all workshops', 'Yes, some workshops', 'No, not interested', 'Maybe, need more info'],
      },
      {
        id: 'accessibility',
        question: 'Is there anything we can do to make the audition process more accessible for you?',
        type: 'textarea',
        required: false,
      },
      {
        id: 'additional',
        question: 'Anything else you want us to know?',
        type: 'textarea',
        required: false,
      },
    ],
    timeSlots: [
      { id: 'slot1', date: '2026-02-17', time: '2:00 PM - 2:30 PM', available: true },
      { id: 'slot2', date: '2026-02-17', time: '2:30 PM - 3:00 PM', available: false, bookedBy: 'Sarah Chen' },
      { id: 'slot3', date: '2026-02-17', time: '3:00 PM - 3:30 PM', available: true },
      { id: 'slot4', date: '2026-02-17', time: '3:30 PM - 4:00 PM', available: true },
      { id: 'slot5', date: '2026-02-18', time: '1:00 PM - 1:30 PM', available: true },
      { id: 'slot6', date: '2026-02-18', time: '1:30 PM - 2:00 PM', available: true },
      { id: 'slot7', date: '2026-02-18', time: '2:00 PM - 2:30 PM', available: false, bookedBy: 'Alex Thompson' },
      { id: 'slot8', date: '2026-02-18', time: '2:30 PM - 3:00 PM', available: true },
    ],
  },
  {
    id: 2,
    title: 'Student Film "Echoes" - Cinematographer Needed',
    type: 'crew-call',
    description: 'Looking for a skilled cinematographer for a 15-minute dramatic short film. Shooting over 3 weekends in March. MAG-funded project.',
    deadline: '2026-02-28T23:59:00',
    location: 'Louis Hall Production Studio',
    contactEmail: 'filmmaker@u.northwestern.edu',
    questions: [
      {
        id: 'name',
        question: 'Name',
        type: 'text',
        required: true,
      },
      {
        id: 'email',
        question: 'Email',
        type: 'text',
        required: true,
      },
      {
        id: 'experience',
        question: 'Describe your cinematography experience',
        type: 'textarea',
        required: true,
      },
      {
        id: 'equipment',
        question: 'What camera equipment are you comfortable with?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'reel',
        question: 'Link to portfolio/reel',
        type: 'text',
        required: true,
      },
      {
        id: 'availability',
        question: 'Are you available April 5-6, 12-13, 19-20?',
        type: 'select',
        required: true,
        options: ['Yes, all weekends', 'Yes, 2 weekends', 'Yes, 1 weekend', 'No, not available'],
      },
    ],
    timeSlots: [
      { id: 'crew1', date: '2026-02-25', time: '4:00 PM - 4:20 PM', available: true },
      { id: 'crew2', date: '2026-02-25', time: '4:20 PM - 4:40 PM', available: true },
      { id: 'crew3', date: '2026-02-25', time: '4:40 PM - 5:00 PM', available: true },
      { id: 'crew4', date: '2026-02-26', time: '3:00 PM - 3:20 PM', available: true },
      { id: 'crew5', date: '2026-02-26', time: '3:20 PM - 3:40 PM', available: true },
    ],
  },
];

export default function PetitionsPage() {
  const [selectedPetition, setSelectedPetition] = useState<Petition | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [savedUserData, setSavedUserData] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [bookmarkedPetitions, setBookmarkedPetitions] = useState<number[]>([]);

  useEffect(() => {
    // Load saved user data for auto-fill
    const saved = localStorage.getItem('userFormData');
    if (saved) {
      setSavedUserData(JSON.parse(saved));
    }

    // Load bookmarked petitions
    const bookmarks = localStorage.getItem('bookmarkedPetitions');
    if (bookmarks) {
      setBookmarkedPetitions(JSON.parse(bookmarks));
    }
  }, []);

  const handleBookmark = (petitionId: number) => {
    const newBookmarks = bookmarkedPetitions.includes(petitionId)
      ? bookmarkedPetitions.filter(id => id !== petitionId)
      : [...bookmarkedPetitions, petitionId];

    setBookmarkedPetitions(newBookmarks);
    localStorage.setItem('bookmarkedPetitions', JSON.stringify(newBookmarks));

    // Also save to calendar items
    const petition = MOCK_PETITIONS.find(p => p.id === petitionId);
    if (petition) {
      const calendarItems = JSON.parse(localStorage.getItem('calendarItems') || '[]');
      if (newBookmarks.includes(petitionId)) {
        calendarItems.push({
          id: `petition-${petitionId}`,
          title: petition.title,
          type: 'petition',
          date: petition.deadline,
          link: '/petitions',
        });
      } else {
        const filtered = calendarItems.filter((item: any) => item.id !== `petition-${petitionId}`);
        localStorage.setItem('calendarItems', JSON.stringify(filtered));
        return;
      }
      localStorage.setItem('calendarItems', JSON.stringify(calendarItems));
    }
  };

  const handleAutoFill = () => {
    if (selectedPetition) {
      const autoFilledData: Record<string, string> = {};
      selectedPetition.questions.forEach(q => {
        if (savedUserData[q.id]) {
          autoFilledData[q.id] = savedUserData[q.id];
        }
      });
      setFormData({ ...formData, ...autoFilledData });
    }
  };

  const handleSubmit = () => {
    // Save user data for future auto-fill
    const newUserData = { ...savedUserData, ...formData };
    localStorage.setItem('userFormData', JSON.stringify(newUserData));
    setSavedUserData(newUserData);

    alert('Petition submitted! Time slot booked.');
    setSelectedPetition(null);
    setSelectedSlot(null);
    setFormData({});
    setShowForm(false);
  };

  const groupedSlots = selectedPetition?.timeSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">Petitions</h1>
            <div className="header-stats">
              <div className="stat-pill stat-total">
                <span className="stat-value">{MOCK_PETITIONS.length}</span>
                <span className="stat-label">active</span>
              </div>
              <div className="stat-pill stat-open">
                <span className="stat-value">{bookmarkedPetitions.length}</span>
                <span className="stat-label">bookmarked</span>
              </div>
            </div>
          </div>
          <p className="dashboard-subtitle">
            Auditions, crew calls, and casting opportunities
          </p>
        </div>
      </header>

      {/* Petitions List */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
      }}>
        {MOCK_PETITIONS.map((petition) => {
          const availableSlots = petition.timeSlots.filter(s => s.available).length;
          const isBookmarked = bookmarkedPetitions.includes(petition.id);

          return (
            <div
              key={petition.id}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                padding: 'var(--space-lg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 'var(--space-lg)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    marginBottom: 'var(--space-sm)',
                    flexWrap: 'wrap',
                  }}>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}>
                      {petition.title}
                    </h3>
                    <span style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-elevated)',
                      color: 'var(--accent-casting)',
                      border: '1px solid var(--accent-casting)',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {petition.type.replace('-', ' ')}
                    </span>
                    <span className={availableSlots > 0 ? 'status-badge status-open' : 'status-badge status-closed'}>
                      {availableSlots} slots available
                    </span>
                  </div>

                  <p style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    marginBottom: 'var(--space-md)',
                  }}>
                    {petition.description}
                  </p>

                  <div style={{
                    display: 'flex',
                    gap: 'var(--space-lg)',
                    fontSize: '13px',
                    color: 'var(--text-tertiary)',
                    flexWrap: 'wrap',
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Deadline: </span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>
                        {new Date(petition.deadline).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Location: </span>
                      <span>{petition.location}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Contact: </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {petition.contactEmail}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: 'var(--space-sm)',
                  flexShrink: 0,
                }}>
                  <button
                    onClick={() => handleBookmark(petition.id)}
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      background: isBookmarked ? 'var(--accent-grant)' : 'var(--bg-tertiary)',
                      border: `1px solid ${isBookmarked ? 'var(--accent-grant)' : 'var(--border-default)'}`,
                      borderRadius: 'var(--radius-sm)',
                      color: isBookmarked ? 'var(--bg-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '16px',
                      transition: 'all 0.2s ease',
                    }}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark petition'}
                  >
                    {isBookmarked ? '★' : '☆'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPetition(petition);
                      setShowForm(false);
                      setSelectedSlot(null);
                    }}
                    style={{
                      padding: 'var(--space-sm) var(--space-lg)',
                      background: 'var(--accent-crew)',
                      border: '1px solid var(--accent-crew)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--bg-primary)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Sign Up →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Signup Modal */}
      {selectedPetition && (
        <div
          onClick={() => {
            setSelectedPetition(null);
            setShowForm(false);
            setSelectedSlot(null);
            setFormData({});
          }}
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
            overflowY: 'auto',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-emphasis)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: 'var(--space-lg)',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-tertiary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}>
                {showForm ? 'Complete Your Application' : 'Select a Time Slot'}
              </h2>
              <button
                onClick={() => {
                  setSelectedPetition(null);
                  setShowForm(false);
                  setSelectedSlot(null);
                  setFormData({});
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  fontSize: '24px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: 'var(--space-lg)',
            }}>
              {!showForm ? (
                <>
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--space-lg)',
                  }}>
                    Choose an available time slot for: <strong>{selectedPetition.title}</strong>
                  </p>

                  {Object.entries(groupedSlots || {}).map(([date, slots]) => (
                    <div key={date} style={{ marginBottom: 'var(--space-lg)' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: 'var(--space-sm)',
                      }}>
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: 'var(--space-sm)',
                      }}>
                        {slots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => {
                              if (slot.available) {
                                setSelectedSlot(slot.id);
                                setShowForm(true);
                              }
                            }}
                            disabled={!slot.available}
                            style={{
                              padding: 'var(--space-md)',
                              background: selectedSlot === slot.id
                                ? 'var(--accent-crew)'
                                : slot.available
                                ? 'var(--bg-tertiary)'
                                : 'var(--bg-elevated)',
                              border: `1px solid ${
                                selectedSlot === slot.id
                                  ? 'var(--accent-crew)'
                                  : slot.available
                                  ? 'var(--border-default)'
                                  : 'var(--border-subtle)'
                              }`,
                              borderRadius: 'var(--radius-sm)',
                              color: selectedSlot === slot.id
                                ? 'var(--bg-primary)'
                                : slot.available
                                ? 'var(--text-primary)'
                                : 'var(--text-muted)',
                              cursor: slot.available ? 'pointer' : 'not-allowed',
                              fontSize: '13px',
                              fontFamily: 'var(--font-mono)',
                              textAlign: 'center',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {slot.time}
                            {!slot.available && (
                              <div style={{
                                fontSize: '10px',
                                marginTop: '4px',
                                fontStyle: 'italic',
                              }}>
                                Booked
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div style={{
                    background: 'var(--bg-tertiary)',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 'var(--space-lg)',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <strong>Selected Time:</strong> {selectedPetition.timeSlots.find(s => s.id === selectedSlot)?.time} on{' '}
                      {new Date(selectedPetition.timeSlots.find(s => s.id === selectedSlot)?.date || '').toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>

                  {Object.keys(savedUserData).length > 0 && (
                    <button
                      onClick={handleAutoFill}
                      style={{
                        width: '100%',
                        padding: 'var(--space-sm)',
                        background: 'rgba(125, 156, 181, 0.1)',
                        border: '1px solid var(--accent-crew)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--accent-crew)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginBottom: 'var(--space-lg)',
                      }}
                    >
                      ✨ Auto-fill with saved data
                    </button>
                  )}

                  {selectedPetition.questions.map((question) => (
                    <div key={question.id} style={{ marginBottom: 'var(--space-lg)' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        marginBottom: 'var(--space-xs)',
                      }}>
                        {question.question}
                        {question.required && <span style={{ color: 'var(--status-closed)' }}> *</span>}
                      </label>

                      {question.type === 'text' && (
                        <input
                          type="text"
                          value={formData[question.id] || ''}
                          onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
                          required={question.required}
                          style={{
                            width: '100%',
                            padding: 'var(--space-sm)',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            fontFamily: 'var(--font-body)',
                          }}
                        />
                      )}

                      {question.type === 'textarea' && (
                        <textarea
                          value={formData[question.id] || ''}
                          onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
                          required={question.required}
                          rows={4}
                          style={{
                            width: '100%',
                            padding: 'var(--space-sm)',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            fontFamily: 'var(--font-body)',
                            resize: 'vertical',
                          }}
                        />
                      )}

                      {question.type === 'select' && (
                        <select
                          value={formData[question.id] || ''}
                          onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
                          required={question.required}
                          style={{
                            width: '100%',
                            padding: 'var(--space-sm)',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          <option value="">Select an option...</option>
                          {question.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={handleSubmit}
                    style={{
                      width: '100%',
                      padding: 'var(--space-md)',
                      background: 'var(--accent-crew)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--bg-primary)',
                      fontSize: '16px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginTop: 'var(--space-lg)',
                    }}
                  >
                    Submit Application
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
