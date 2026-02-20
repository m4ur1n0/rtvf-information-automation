"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { addDays, format } from "date-fns";

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
  type: "audition" | "crew-call" | "interview" | "workshop";
  description: string;
  deadline: string;
  location: string;
  directorName?: string;
  calendlyUrl?: string;
  contactName: string;
  contactEmail: string;
  scriptLink?: string;
  posterImage?: string;
  roles?: string[];
  questions: {
    id: string;
    question: string;
    type: "text" | "textarea" | "select" | "checkbox";
    required: boolean;
    options?: string[];
  }[];
  timeSlots: TimeSlot[];
}

const MOCK_PETITIONS: Petition[] = [
  {
    id: 1,
    title: "JTE Art in Action Open Call",
    type: "audition",
    description:
      "Art in Action brings together multiple artistic mediums—like music, spoken word, visual art, dance, and film—around a unifying theme. This event will take place Week 6 of Winter Quarter.",
    deadline: "2026-02-19T23:59:00",
    location: "Shake Smart, Norris Center",
    directorName: "Kate Moore",
    calendlyUrl: "https://calendly.com/shreyasaini2027-u/meethi-petition",
    contactName: "Kate Moore",
    contactEmail: "katemoores2028@u.northwestern.edu",
    posterImage: "/placeholder-poster.jpg",
    roles: [
      "Musician",
      "Dancer",
      "Spoken Word Artist",
      "Visual Artist",
      "Filmmaker",
    ],
    questions: [
      {
        id: "name",
        question: "Full Name",
        type: "text",
        required: true,
      },
      {
        id: "email",
        question: "Email",
        type: "text",
        required: true,
      },
      {
        id: "role_interest",
        question: "Which role(s) are you interested in?",
        type: "select",
        required: true,
        options: [
          "Musician",
          "Dancer",
          "Spoken Word Artist",
          "Visual Artist",
          "Filmmaker",
          "Other",
        ],
      },
      {
        id: "availability",
        question: "Brief availability notes (e.g. conflicts, preferred times)",
        type: "textarea",
        required: true,
      },
    ],
    timeSlots: [
      {
        id: "slot1",
        date: "2026-02-17",
        time: "2:00 PM - 2:30 PM",
        available: true,
      },
      {
        id: "slot2",
        date: "2026-02-17",
        time: "2:30 PM - 3:00 PM",
        available: false,
        bookedBy: "Sarah Chen",
      },
      {
        id: "slot3",
        date: "2026-02-17",
        time: "3:00 PM - 3:30 PM",
        available: true,
      },
      {
        id: "slot4",
        date: "2026-02-17",
        time: "3:30 PM - 4:00 PM",
        available: true,
      },
      {
        id: "slot5",
        date: "2026-02-18",
        time: "1:00 PM - 1:30 PM",
        available: true,
      },
      {
        id: "slot6",
        date: "2026-02-18",
        time: "1:30 PM - 2:00 PM",
        available: true,
      },
      {
        id: "slot7",
        date: "2026-02-18",
        time: "2:00 PM - 2:30 PM",
        available: false,
        bookedBy: "Alex Thompson",
      },
      {
        id: "slot8",
        date: "2026-02-18",
        time: "2:30 PM - 3:00 PM",
        available: true,
      },
    ],
  },
  {
    id: 2,
    title: 'Student Film "Echoes" - Cinematographer Needed',
    type: "crew-call",
    description:
      "Looking for a skilled cinematographer for a 15-minute dramatic short film. Shooting over 3 weekends in March. MAG-funded project.",
    deadline: "2026-02-28T23:59:00",
    location: "Louis Hall Production Studio",
    contactName: "Jordan Ellis",
    contactEmail: "filmmaker@u.northwestern.edu",
    scriptLink: "https://docs.google.com/document/d/example",
    roles: ["Cinematographer", "Camera Operator", "Gaffer"],
    questions: [
      {
        id: "name",
        question: "Full Name",
        type: "text",
        required: true,
      },
      {
        id: "email",
        question: "Email",
        type: "text",
        required: true,
      },
      {
        id: "role_interest",
        question: "Which role are you most interested in?",
        type: "select",
        required: true,
        options: ["Cinematographer", "Camera Operator", "Gaffer", "Other"],
      },
      {
        id: "availability",
        question: "Are you available April 5-6, 12-13, 19-20? Any conflicts?",
        type: "textarea",
        required: true,
      },
    ],
    timeSlots: [
      {
        id: "crew1",
        date: "2026-02-25",
        time: "4:00 PM - 4:20 PM",
        available: true,
      },
      {
        id: "crew2",
        date: "2026-02-25",
        time: "4:20 PM - 4:40 PM",
        available: true,
      },
      {
        id: "crew3",
        date: "2026-02-25",
        time: "4:40 PM - 5:00 PM",
        available: true,
      },
      {
        id: "crew4",
        date: "2026-02-26",
        time: "3:00 PM - 3:20 PM",
        available: true,
      },
      {
        id: "crew5",
        date: "2026-02-26",
        time: "3:20 PM - 3:40 PM",
        available: true,
      },
    ],
  },
];

export default function PetitionsPage() {
  const [selectedPetition, setSelectedPetition] = useState<Petition | null>(
    null,
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [savedUserData, setSavedUserData] = useState<Record<string, string>>(
    {},
  );
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("userFormData");
    if (saved) {
      setSavedUserData(JSON.parse(saved));
    }
  }, []);

  const generateGoogleCalendarUrl = (petition: Petition) => {
    const deadlineDate = new Date(petition.deadline);
    const startDate = format(deadlineDate, "yyyyMMdd");
    const endDate = format(addDays(deadlineDate, 1), "yyyyMMdd");
    const title = encodeURIComponent(petition.title);
    const details = encodeURIComponent(
      `Deadline: ${new Date(petition.deadline).toLocaleString()}\nLocation: ${petition.location}\nContact: ${petition.contactName} (${petition.contactEmail})\n\n${petition.description}`,
    );
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
  };

  const handleAutoFill = () => {
    if (selectedPetition) {
      const autoFilledData: Record<string, string> = {};
      selectedPetition.questions.forEach((q) => {
        if (savedUserData[q.id]) {
          autoFilledData[q.id] = savedUserData[q.id];
        }
      });
      setFormData({ ...formData, ...autoFilledData });
    }
  };

  const handleSubmit = () => {
    const newUserData = { ...savedUserData, ...formData };
    localStorage.setItem("userFormData", JSON.stringify(newUserData));
    setSavedUserData(newUserData);

    alert("Application submitted! Time slot booked.");
    setSelectedPetition(null);
    setSelectedSlot(null);
    setFormData({});
    setShowForm(false);
  };

  const groupedSlots = selectedPetition?.timeSlots.reduce(
    (acc, slot) => {
      if (!acc[slot.date]) {
        acc[slot.date] = [];
      }
      acc[slot.date].push(slot);
      return acc;
    },
    {} as Record<string, TimeSlot[]>,
  );

  const filteredPetitions = MOCK_PETITIONS;

  const openCalendlyPopup = (url: string) => {
    const calendly = (window as Window & { Calendly?: { initPopupWidget?: (opts: { url: string }) => void } }).Calendly;
    if (calendly?.initPopupWidget) {
      calendly.initPopupWidget({ url });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <link
        href="https://assets.calendly.com/assets/external/widget.css"
        rel="stylesheet"
      />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
      />
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">Petitions</h1>
            <div className="header-stats">
              <div className="stat-pill stat-total">
                <span className="stat-value">{MOCK_PETITIONS.length}</span>
                <span className="stat-label">active</span>
              </div>
            </div>
          </div>
          <p className="dashboard-subtitle">
            Auditions, crew calls, and open positions
          </p>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-tertiary)",
              marginTop: "var(--space-xs)",
              lineHeight: 1.5,
            }}
          >
            Petitioning is an application process — you may be interviewed, and
            not all applicants are accepted.
          </p>
        </div>
      </header>

      {/* Petitions List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-md)",
        }}
      >
        {filteredPetitions.map((petition) => {
          const availableSlots = petition.timeSlots.filter(
            (s) => s.available,
          ).length;

          return (
            <div
              key={petition.id}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                transition: "all 0.2s ease",
              }}
            >
              <div
                className="petition-card-layout"
                style={{
                  padding: "var(--space-lg)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "var(--space-lg)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-md)",
                      marginBottom: "var(--space-sm)",
                      flexWrap: "wrap",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "20px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {petition.title}
                    </h3>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "4px 8px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-elevated)",
                        color: "var(--accent-casting)",
                        border: "1px solid var(--accent-casting)",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {petition.type.replace("-", " ")}
                    </span>
                    <span
                      className={
                        availableSlots > 0
                          ? "status-badge status-open"
                          : "status-badge status-closed"
                      }
                    >
                      {availableSlots} slots available
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      marginBottom: "var(--space-md)",
                    }}
                  >
                    {petition.description}
                  </p>

                  {/* Roles */}
                  {petition.roles && petition.roles.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "var(--space-xs)",
                        flexWrap: "wrap",
                        marginBottom: "var(--space-md)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          alignSelf: "center",
                        }}
                      >
                        Roles:
                      </span>
                      {petition.roles.map((role) => (
                        <span
                          key={role}
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "100px",
                            background: "var(--bg-elevated)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "var(--space-lg)",
                      fontSize: "13px",
                      color: "var(--text-tertiary)",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>
                        Deadline:{" "}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>
                        {new Date(petition.deadline).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>
                        Location:{" "}
                      </span>
                      <span>{petition.location}</span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>
                        Contact:{" "}
                      </span>
                      <span>{petition.contactName} </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "12px",
                        }}
                      >
                        ({petition.contactEmail})
                      </span>
                    </div>
                    {petition.scriptLink && (
                      <div>
                        <a
                          href={petition.scriptLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "var(--accent-crew)",
                            textDecoration: "none",
                            fontWeight: 500,
                          }}
                        >
                          View Script / Materials →
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="petition-actions"
                  style={{
                    display: "flex",
                    gap: "var(--space-sm)",
                    flexShrink: 0,
                  }}
                >
                  {petition.id === 1 && petition.calendlyUrl && (
                    <button
                      onClick={() => openCalendlyPopup(petition.calendlyUrl!)}
                      style={{
                        padding: "var(--space-sm) var(--space-lg)",
                        background: "var(--accent-casting)",
                        border: "1px solid var(--accent-casting)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--bg-primary)",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 600,
                        transition: "all 0.2s ease",
                      }}
                    >
                      Schedule Time
                    </button>
                  )}
                  <a
                    href={generateGoogleCalendarUrl(petition)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Add deadline to Google Calendar"
                    style={{
                      padding: "var(--space-sm) var(--space-md)",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-secondary)",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 500,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "var(--accent-casting)";
                      e.currentTarget.style.color = "var(--bg-primary)";
                      e.currentTarget.style.borderColor =
                        "var(--accent-casting)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--bg-elevated)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.borderColor =
                        "var(--border-default)";
                    }}
                  >
                    +Cal
                  </a>
                  <button
                    onClick={() => {
                      setSelectedPetition(petition);
                      setShowForm(false);
                      setSelectedSlot(null);
                    }}
                    style={{
                      padding: "var(--space-sm) var(--space-lg)",
                      background: "var(--accent-crew)",
                      border: "1px solid var(--accent-crew)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--bg-primary)",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: 600,
                      transition: "all 0.2s ease",
                    }}
                  >
                    Apply →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Application Modal */}
      {selectedPetition && (
        <div
          className="petition-modal-overlay"
          onClick={() => {
            setSelectedPetition(null);
            setShowForm(false);
            setSelectedSlot(null);
            setFormData({});
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-lg)",
            overflowY: "auto",
          }}
        >
          <div
            className="petition-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-emphasis)",
              borderRadius: "var(--radius-lg)",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "hidden",
              boxShadow: "var(--shadow-lg)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "var(--space-lg)",
                borderBottom: "1px solid var(--border-subtle)",
                background: "var(--bg-tertiary)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {showForm
                    ? "Complete Your Application"
                    : "Select a Time Slot"}
                </h2>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-tertiary)",
                    marginTop: "4px",
                  }}
                >
                  {showForm
                    ? "Fill out the short form below. More details may be discussed during your slot."
                    : `Pick a time for: ${selectedPetition.title}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedPetition(null);
                  setShowForm(false);
                  setSelectedSlot(null);
                  setFormData({});
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-tertiary)",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "var(--space-lg)",
              }}
            >
              {!showForm ? (
                <>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--text-secondary)",
                      marginBottom: "var(--space-lg)",
                    }}
                  >
                    Choose an available time slot for:{" "}
                    <strong>{selectedPetition.title}</strong>
                  </p>
                  {selectedPetition.directorName && (
                    <div
                      style={{
                        background: "var(--bg-tertiary)",
                        padding: "var(--space-sm) var(--space-md)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        marginBottom: "var(--space-lg)",
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>Director:</strong>{" "}
                      {selectedPetition.directorName}
                    </div>
                  )}

                  {Object.entries(groupedSlots || {}).map(([date, slots]) => (
                    <div key={date} style={{ marginBottom: "var(--space-lg)" }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          marginBottom: "var(--space-sm)",
                        }}
                      >
                        {new Date(date).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(min(180px, 100%), 1fr))",
                          gap: "var(--space-sm)",
                        }}
                      >
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
                              padding: "var(--space-md)",
                              background:
                                selectedSlot === slot.id
                                  ? "var(--accent-crew)"
                                  : slot.available
                                    ? "var(--bg-tertiary)"
                                    : "var(--bg-elevated)",
                              border: `1px solid ${
                                selectedSlot === slot.id
                                  ? "var(--accent-crew)"
                                  : slot.available
                                    ? "var(--border-default)"
                                    : "var(--border-subtle)"
                              }`,
                              borderRadius: "var(--radius-sm)",
                              color:
                                selectedSlot === slot.id
                                  ? "var(--bg-primary)"
                                  : slot.available
                                    ? "var(--text-primary)"
                                    : "var(--text-muted)",
                              cursor: slot.available
                                ? "pointer"
                                : "not-allowed",
                              fontSize: "13px",
                              fontFamily: "var(--font-mono)",
                              textAlign: "center",
                              transition: "all 0.2s ease",
                            }}
                          >
                            {slot.time}
                            {!slot.available && (
                              <div
                                style={{
                                  fontSize: "10px",
                                  marginTop: "4px",
                                  fontStyle: "italic",
                                }}
                              >
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
                  <div
                    style={{
                      background: "var(--bg-tertiary)",
                      padding: "var(--space-md)",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: "var(--space-lg)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <strong>Selected Time:</strong>{" "}
                      {
                        selectedPetition.timeSlots.find(
                          (s) => s.id === selectedSlot,
                        )?.time
                      }{" "}
                      on{" "}
                      {new Date(
                        selectedPetition.timeSlots.find(
                          (s) => s.id === selectedSlot,
                        )?.date || "",
                      ).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>

                  {Object.keys(savedUserData).length > 0 && (
                    <button
                      onClick={handleAutoFill}
                      style={{
                        width: "100%",
                        padding: "var(--space-sm)",
                        background: "rgba(125, 156, 181, 0.1)",
                        border: "1px solid var(--accent-crew)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--accent-crew)",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        marginBottom: "var(--space-lg)",
                      }}
                    >
                      Auto-fill with saved info
                    </button>
                  )}

                  {selectedPetition.questions.map((question) => (
                    <div
                      key={question.id}
                      style={{ marginBottom: "var(--space-lg)" }}
                    >
                      <label
                        style={{
                          display: "block",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          marginBottom: "var(--space-xs)",
                        }}
                      >
                        {question.question}
                        {question.required && (
                          <span style={{ color: "var(--status-closed)" }}>
                            {" "}
                            *
                          </span>
                        )}
                      </label>

                      {question.type === "text" && (
                        <input
                          type="text"
                          value={formData[question.id] || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [question.id]: e.target.value,
                            })
                          }
                          required={question.required}
                          style={{
                            width: "100%",
                            padding: "var(--space-sm)",
                            background: "var(--bg-tertiary)",
                            border: "1px solid var(--border-default)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-primary)",
                            fontSize: "14px",
                            fontFamily: "var(--font-body)",
                          }}
                        />
                      )}

                      {question.type === "textarea" && (
                        <textarea
                          value={formData[question.id] || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [question.id]: e.target.value,
                            })
                          }
                          required={question.required}
                          rows={3}
                          style={{
                            width: "100%",
                            padding: "var(--space-sm)",
                            background: "var(--bg-tertiary)",
                            border: "1px solid var(--border-default)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-primary)",
                            fontSize: "14px",
                            fontFamily: "var(--font-body)",
                            resize: "vertical",
                          }}
                        />
                      )}

                      {question.type === "select" && (
                        <select
                          value={formData[question.id] || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [question.id]: e.target.value,
                            })
                          }
                          required={question.required}
                          style={{
                            width: "100%",
                            padding: "var(--space-sm)",
                            background: "var(--bg-tertiary)",
                            border: "1px solid var(--border-default)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-primary)",
                            fontSize: "14px",
                            fontFamily: "var(--font-body)",
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
                      width: "100%",
                      padding: "var(--space-md)",
                      background: "var(--accent-crew)",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--bg-primary)",
                      fontSize: "16px",
                      fontWeight: 700,
                      cursor: "pointer",
                      marginTop: "var(--space-lg)",
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
