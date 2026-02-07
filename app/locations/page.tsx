'use client';

import { useState, useMemo } from 'react';

interface Location {
  id: number;
  name: string;
  category: 'restaurant' | 'cafe' | 'park' | 'campus' | 'theater' | 'retail' | 'outdoor' | 'studio';
  campusLocation?: 'on-campus' | 'off-campus';
  address: string;
  cost: string;
  availability: string;
  contact: {
    name: string;
    email: string;
    phone?: string;
  };
  restrictions: string[];
  amenities: string[];
  notes?: string;
  requiresContract: boolean;
  exampleContract?: {
    ownerName: string;
    propertyDescription: string;
    filmingDates: string;
    compensation: string;
    specialConditions: string[];
    signedDate: string;
  };
}

const MOCK_LOCATIONS: Location[] = [
  {
    id: 1,
    name: 'Louis Hall Production Studio',
    category: 'studio',
    campusLocation: 'on-campus',
    address: '1877 Campus Dr., Evanston, IL 60208 - Room 106',
    cost: 'Free (equipment checkout included)',
    availability: 'Reserve via 25Live + building manager approval',
    contact: {
      name: 'Production Services',
      email: 'rtvf-production@northwestern.edu',
    },
    restrictions: [
      'Must obtain written permission from building manager',
      'Indicate filming in 25Live Event Description and Event Notes',
      'Include load in/load out details in reservation',
      'No filming during scheduled classes',
    ],
    amenities: [
      'Professional production studio',
      'Lighting grid',
      'Green screen available',
      'Sound equipment access via Cage',
      'Climate controlled',
    ],
    notes: 'Primary studio space for RTVF students. Book early for peak times. Adjacent to equipment Cage for easy checkout.',
    requiresContract: false,
  },
  {
    id: 2,
    name: 'Fisk Hall Computer Lab',
    category: 'campus',
    campusLocation: 'on-campus',
    address: '1845 Campus Dr., Evanston, IL 60208 - Room B-1',
    cost: 'Free',
    availability: 'Reserve via 25Live + building manager approval',
    contact: {
      name: 'Fisk Building Manager',
      email: 'fisk-manager@northwestern.edu',
    },
    restrictions: [
      'Written permission from building manager required',
      'Used for RTVF courses - check schedule',
      'No filming during classes',
      'Must indicate filming purpose in 25Live',
    ],
    amenities: [
      '10 editing workstations',
      'Projector and screen',
      'Personal laptop hookups (6 monitors)',
      'Instructor station',
    ],
    notes: 'Basement location. Good for scenes requiring computer lab setting.',
    requiresContract: false,
  },
  {
    id: 3,
    name: 'Annie May Swift Hall',
    category: 'campus',
    campusLocation: 'on-campus',
    address: '1920 Campus Dr., Evanston, IL 60208',
    cost: 'N/A',
    availability: 'FILMING PROHIBITED',
    contact: {
      name: 'RTVF Admin Office',
      email: 'rtvf@northwestern.edu',
    },
    restrictions: [
      'STUDENT FILM PRODUCTION IS PROHIBITED',
      'Houses main RTVF administrative office',
      'Contains MFA Documentary lab - no disruptions',
    ],
    amenities: [],
    notes: 'DO NOT ATTEMPT TO FILM HERE. This is explicitly prohibited by the department.',
    requiresContract: false,
  },
  {
    id: 4,
    name: 'The Stacked Deli',
    category: 'restaurant',
    campusLocation: 'off-campus',
    address: '812 Church St., Evanston, IL 60201',
    cost: '$150/hour (2 hour minimum)',
    availability: 'After hours (9 PM - 6 AM) or slow periods',
    contact: {
      name: 'Rachel Martinez',
      email: 'rachel@stackeddeli.com',
      phone: '847-555-0123',
    },
    restrictions: [
      'Must film after business hours or during agreed slow periods',
      'No disruption to regular customers',
      'Certificate of insurance required',
      'Maximum crew size: 15 people',
      '48-hour advance notice required',
    ],
    amenities: [
      'Authentic deli atmosphere',
      'Full kitchen (with supervision)',
      'Booth and counter seating',
      'Large windows for natural light',
      'Parking available on Church St.',
    ],
    notes: 'Popular student location. Owner is film-friendly. Must sign NU contract.',
    requiresContract: true,
    exampleContract: {
      ownerName: 'Rachel Martinez, The Stacked Deli LLC',
      propertyDescription: 'Restaurant interior and exterior at 812 Church St., Evanston, IL including dining area, counter, and storefront',
      filmingDates: 'March 15-16, 2026 (9:00 PM - 2:00 AM)',
      compensation: '$300 (2 hours × 2 nights at $150/hour)',
      specialConditions: [
        'PRODUCER responsible for any food/beverage used as props',
        'Kitchen access requires owner supervision',
        'All furniture must be returned to original positions',
        'Deep cleaning if any spills or messes occur',
      ],
      signedDate: 'February 20, 2026',
    },
  },
  {
    id: 5,
    name: 'Kafein Coffee House',
    category: 'cafe',
    campusLocation: 'off-campus',
    address: '1621 Chicago Ave., Evanston, IL 60201',
    cost: '$75/hour or $200 for 4 hours',
    availability: 'Before 7 AM or after 8 PM',
    contact: {
      name: 'David Park',
      email: 'david@kafeincoffee.com',
      phone: '847-555-0198',
    },
    restrictions: [
      'Limited to 10 crew members',
      'No filming during business hours',
      'Must purchase coffee/food for crew',
      '72-hour advance booking',
      'Proof of insurance required',
    ],
    amenities: [
      'Cozy coffee shop aesthetic',
      'Free WiFi',
      'Multiple seating areas',
      'Large storefront windows',
      'Vintage decor',
    ],
    notes: 'Very popular with student filmmakers. Books up quickly. Owner requires minimum $50 food/beverage purchase.',
    requiresContract: true,
    exampleContract: {
      ownerName: 'David Park, Kafein Coffee House Inc.',
      propertyDescription: 'Coffee shop interior at 1621 Chicago Ave., Evanston including seating areas, counter, and front windows',
      filmingDates: 'April 3, 2026 (5:00 AM - 9:00 AM)',
      compensation: '$200 (4-hour block rate) + $50 minimum food/beverage purchase',
      specialConditions: [
        'Crew must purchase minimum $50 in food/beverages',
        'No rearrangement of bar/counter equipment',
        'Owner reserves right to stay on premises during filming',
        'Outlets available for equipment - no generator needed',
      ],
      signedDate: 'March 10, 2026',
    },
  },
  {
    id: 6,
    name: 'Lighthouse Beach',
    category: 'outdoor',
    campusLocation: 'off-campus',
    address: 'Sheridan Rd & Lake Michigan, Evanston, IL',
    cost: '$0 (public space)',
    availability: 'Dawn to dusk, year-round',
    contact: {
      name: 'Evanston Parks Dept',
      email: 'parks@cityofevanston.org',
      phone: '847-866-2900',
    },
    restrictions: [
      'Filming permit required for crews over 5 people',
      'No blocking of public pathways',
      'Noise ordinance applies',
      'Park rules apply to all crew/cast',
      'Must clean up all equipment and trash',
    ],
    amenities: [
      'Lakefront views',
      'Historic lighthouse',
      'Beach and pier access',
      'Natural lighting',
      'Free parking nearby (metered)',
    ],
    notes: 'Public space, but permit required for larger crews. Weather dependent. Beautiful golden hour shots.',
    requiresContract: false,
  },
  {
    id: 7,
    name: 'The Celtic Knot Public House',
    category: 'restaurant',
    campusLocation: 'off-campus',
    address: '626 Church St., Evanston, IL 60201',
    cost: '$200/hour (3 hour minimum)',
    availability: 'Monday-Thursday after 11 PM',
    contact: {
      name: 'Michael O\'Brien',
      email: 'mike@celticknotevanston.com',
      phone: '847-864-1679',
    },
    restrictions: [
      'Late night filming only',
      'Insurance certificate required',
      'Maximum 20 crew/cast',
      'No alteration of existing decor',
      'One week advance booking',
    ],
    amenities: [
      'Authentic Irish pub atmosphere',
      'Full bar (non-functional during filming)',
      'Multiple rooms and angles',
      'Dartboards and pub games',
      'Live music stage',
    ],
    notes: 'Great for bar/pub scenes. Owner very accommodating. Can arrange for bartender as extra if needed.',
    requiresContract: true,
    exampleContract: {
      ownerName: 'Michael O\'Brien, Celtic Knot Hospitality LLC',
      propertyDescription: 'Irish pub interior at 626 Church St., Evanston including main bar area, side room, and stage area',
      filmingDates: 'May 12-13, 2026 (11:00 PM - 2:00 AM)',
      compensation: '$600 (3 hours × 2 nights at $200/hour)',
      specialConditions: [
        'No use of actual alcohol during filming',
        'Props/fake bottles must be clearly marked',
        'Owner or manager must be present during all filming',
        'All lighting equipment must be safely secured',
        'Damage deposit: $500 (refundable)',
      ],
      signedDate: 'April 15, 2026',
    },
  },
  {
    id: 8,
    name: 'Noyes Cultural Arts Center',
    category: 'theater',
    campusLocation: 'off-campus',
    address: '927 Noyes St., Evanston, IL 60201',
    cost: '$100-$300 depending on space',
    availability: 'By appointment, varies by room',
    contact: {
      name: 'Arts Center Admin',
      email: 'info@noyesculturalartscenter.org',
      phone: '847-448-8260',
    },
    restrictions: [
      'Advance booking required (2 weeks minimum)',
      'Insurance certificate required',
      'Respect ongoing art exhibitions',
      'Clean-up required after shoot',
      'Limited parking - plan accordingly',
    ],
    amenities: [
      'Gallery spaces',
      'Theater/performance spaces',
      'Art studios',
      'Unique artistic backdrops',
      'Natural and stage lighting options',
    ],
    notes: 'Multiple rooms available at different price points. Great for art-focused or gallery scenes.',
    requiresContract: true,
    exampleContract: {
      ownerName: 'Noyes Cultural Arts Center Board',
      propertyDescription: 'Gallery space and theater at 927 Noyes St., Evanston - Room 201 (main gallery)',
      filmingDates: 'March 22, 2026 (10:00 AM - 6:00 PM)',
      compensation: '$200 (full day gallery rental)',
      specialConditions: [
        'No touching or moving of displayed artwork',
        'All lighting must be freestanding - no wall/ceiling mounts',
        'Representative from Arts Center must be present',
        'Certificate of insurance naming Arts Center as additional insured',
      ],
      signedDate: 'February 28, 2026',
    },
  },
];

export default function LocationsPage() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [showContract, setShowContract] = useState(false);

  const filteredLocations = useMemo(() => {
    return MOCK_LOCATIONS.filter(loc => {
      const categoryMatch = categoryFilter === 'all' || loc.category === categoryFilter;
      const campusMatch = campusFilter === 'all' || loc.campusLocation === campusFilter;
      return categoryMatch && campusMatch;
    });
  }, [categoryFilter, campusFilter]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'restaurant': return '🍽️';
      case 'cafe': return '☕';
      case 'park': return '🌳';
      case 'campus': return '🎓';
      case 'theater': return '🎭';
      case 'retail': return '🏪';
      case 'outdoor': return '🌅';
      case 'studio': return '🎬';
      default: return '📍';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'campus':
      case 'studio': return 'var(--accent-grant)';
      case 'restaurant':
      case 'cafe': return 'var(--accent-crew)';
      case 'outdoor':
      case 'park': return 'var(--accent-resource)';
      case 'theater':
      case 'retail': return 'var(--accent-casting)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">Filming Locations</h1>
            <div className="header-stats">
              <div className="stat-pill stat-total">
                <span className="stat-value">{MOCK_LOCATIONS.length}</span>
                <span className="stat-label">locations</span>
              </div>
              <div className="stat-pill stat-open">
                <span className="stat-value">
                  {MOCK_LOCATIONS.filter(l => l.campusLocation === 'on-campus').length}
                </span>
                <span className="stat-label">on campus</span>
              </div>
            </div>
          </div>
          <p className="dashboard-subtitle">
            Approved filming locations in Northwestern & Evanston area
          </p>
        </div>
      </header>

      {/* Important Notice for On-Campus Filming */}
      <div style={{
        background: 'rgba(212, 165, 116, 0.1)',
        border: '2px solid var(--accent-grant)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg)',
        marginBottom: 'var(--space-xl)',
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--accent-grant)',
          marginBottom: 'var(--space-md)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          ⚠️ Required: On-Campus Filming Permission
        </h3>
        <div style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
        }}>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            <strong>RTVF student productions MUST obtain written permission from a building manager</strong> for filming
            in any space on Northwestern's campuses. A 25Live reservation alone does NOT grant filming permission.
          </p>
          <ul className="reason-list">
            <li>Add to 25Live 'Event Description' and 'Event Notes' that you want to film</li>
            <li>Include load in/load out details and special precautions</li>
            <li>Contact building manager directly for written approval via email</li>
            <li>Annie May Swift Hall prohibits all student film production</li>
          </ul>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-md)',
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
        }}>
          Category:
        </label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
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
          <option value="all">All Categories</option>
          <option value="campus">Campus Buildings</option>
          <option value="studio">Studio Spaces</option>
          <option value="restaurant">Restaurants</option>
          <option value="cafe">Cafes</option>
          <option value="outdoor">Outdoor Spaces</option>
          <option value="theater">Theaters/Arts</option>
          <option value="retail">Retail</option>
        </select>

        <label style={{
          fontSize: '12px',
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginLeft: 'var(--space-md)',
        }}>
          Location:
        </label>
        <select
          value={campusFilter}
          onChange={(e) => setCampusFilter(e.target.value)}
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
          <option value="all">All Locations</option>
          <option value="on-campus">On Campus Only</option>
          <option value="off-campus">Off Campus Only</option>
        </select>

        <div style={{
          marginLeft: 'auto',
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Locations Table */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 2fr 120px 150px 120px 100px',
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
          <div>Name & Address</div>
          <div>Category</div>
          <div>Cost</div>
          <div>Campus</div>
          <div>Contract</div>
        </div>

        {/* Table Body */}
        <div style={{
          maxHeight: 'calc(100vh - 400px)',
          overflowY: 'auto',
        }}>
          {filteredLocations.map((location) => (
            <div
              key={location.id}
              onClick={() => setSelectedLocation(location)}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 2fr 120px 150px 120px 100px',
                gap: 'var(--space-md)',
                padding: 'var(--space-md) var(--space-lg)',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: selectedLocation?.id === location.id ? 'var(--bg-elevated)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (selectedLocation?.id !== location.id) {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedLocation?.id !== location.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ fontSize: '32px' }}>
                {getCategoryIcon(location.category)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  marginBottom: '4px',
                }}>
                  {location.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {location.address}
                </div>
              </div>
              <div>
                <span style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  color: getCategoryColor(location.category),
                  border: `1px solid ${getCategoryColor(location.category)}`,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {location.category}
                </span>
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}>
                {location.cost}
              </div>
              <div>
                <span className={`status-badge ${location.campusLocation === 'on-campus' ? 'status-open' : 'status-upcoming'}`}>
                  {location.campusLocation === 'on-campus' ? 'On Campus' : 'Off Campus'}
                </span>
              </div>
              <div style={{
                fontSize: '12px',
                color: location.requiresContract ? 'var(--accent-grant)' : 'var(--text-muted)',
                fontWeight: location.requiresContract ? 600 : 400,
              }}>
                {location.requiresContract ? 'Required' : 'N/A'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLocation && (
        <div
          onClick={() => {
            setSelectedLocation(null);
            setShowContract(false);
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
              maxWidth: '900px',
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
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              background: 'var(--bg-tertiary)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  marginBottom: 'var(--space-sm)',
                }}>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}>
                    {selectedLocation.name}
                  </h2>
                  <span className={`status-badge ${selectedLocation.campusLocation === 'on-campus' ? 'status-open' : 'status-upcoming'}`}>
                    {selectedLocation.campusLocation === 'on-campus' ? 'On Campus' : 'Off Campus'}
                  </span>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {selectedLocation.address}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedLocation(null);
                  setShowContract(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px 8px',
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
              {/* Cost & Availability */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--space-lg)',
                marginBottom: 'var(--space-xl)',
                padding: 'var(--space-lg)',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div>
                  <div className="detail-label" style={{ marginBottom: 'var(--space-xs)' }}>
                    Cost
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--accent-grant)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {selectedLocation.cost}
                  </div>
                </div>
                <div>
                  <div className="detail-label" style={{ marginBottom: 'var(--space-xs)' }}>
                    Availability
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                  }}>
                    {selectedLocation.availability}
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="detail-section">
                <div className="detail-label">Contact</div>
                <div style={{
                  padding: 'var(--space-md)',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                    {selectedLocation.contact.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                    {selectedLocation.contact.email}
                  </div>
                  {selectedLocation.contact.phone && (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {selectedLocation.contact.phone}
                    </div>
                  )}
                </div>
              </div>

              {/* Restrictions */}
              <div className="detail-section">
                <div className="detail-label">Restrictions & Requirements</div>
                <ul className="reason-list">
                  {selectedLocation.restrictions.map((restriction, idx) => (
                    <li key={idx}>{restriction}</li>
                  ))}
                </ul>
              </div>

              {/* Amenities */}
              <div className="detail-section">
                <div className="detail-label">Amenities</div>
                <div className="tag-list">
                  {selectedLocation.amenities.map((amenity, idx) => (
                    <span key={idx} className="tag">{amenity}</span>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedLocation.notes && (
                <div className="detail-section">
                  <div className="detail-label">Additional Notes</div>
                  <div style={{
                    padding: 'var(--space-md)',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                  }}>
                    {selectedLocation.notes}
                  </div>
                </div>
              )}

              {/* Contract Example */}
              {selectedLocation.requiresContract && selectedLocation.exampleContract && (
                <div className="detail-section">
                  <button
                    onClick={() => setShowContract(!showContract)}
                    style={{
                      width: '100%',
                      padding: 'var(--space-md)',
                      background: showContract ? 'var(--bg-elevated)' : 'var(--bg-tertiary)',
                      border: '1px solid var(--border-emphasis)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>📄 View Example Signed Contract for this Location</span>
                    <span>{showContract ? '−' : '+'}</span>
                  </button>

                  {showContract && (
                    <div style={{
                      marginTop: 'var(--space-md)',
                      padding: 'var(--space-lg)',
                      background: 'var(--bg-primary)',
                      border: '2px solid var(--border-emphasis)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      lineHeight: 1.8,
                      color: 'var(--text-secondary)',
                      maxHeight: '500px',
                      overflowY: 'auto',
                    }}>
                      <div style={{
                        textAlign: 'center',
                        marginBottom: 'var(--space-lg)',
                        paddingBottom: 'var(--space-md)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          marginBottom: '4px',
                        }}>
                          NORTHWESTERN UNIVERSITY FILM LOCATION AGREEMENT
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          EXAMPLE - Approved Contract
                        </div>
                      </div>

                      <div style={{ marginBottom: 'var(--space-md)' }}>
                        <strong>OWNER:</strong> {selectedLocation.exampleContract.ownerName}
                      </div>
                      <div style={{ marginBottom: 'var(--space-md)' }}>
                        <strong>PRODUCER:</strong> NORTHWESTERN UNIVERSITY (Student Production)
                      </div>
                      <div style={{ marginBottom: 'var(--space-md)' }}>
                        <strong>PROPERTY:</strong> {selectedLocation.exampleContract.propertyDescription}
                      </div>
                      <div style={{ marginBottom: 'var(--space-md)' }}>
                        <strong>FILMING DATES:</strong> {selectedLocation.exampleContract.filmingDates}
                      </div>
                      <div style={{ marginBottom: 'var(--space-md)' }}>
                        <strong>COMPENSATION:</strong> {selectedLocation.exampleContract.compensation}
                      </div>

                      {selectedLocation.exampleContract.specialConditions.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                          <strong>SPECIAL CONDITIONS:</strong>
                          <ul style={{ marginLeft: 'var(--space-lg)', marginTop: 'var(--space-xs)' }}>
                            {selectedLocation.exampleContract.specialConditions.map((condition, idx) => (
                              <li key={idx} style={{ marginBottom: '4px' }}>{condition}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div style={{
                        marginTop: 'var(--space-lg)',
                        paddingTop: 'var(--space-md)',
                        borderTop: '1px solid var(--border-subtle)',
                      }}>
                        <div style={{ marginBottom: 'var(--space-sm)' }}>
                          <strong>SIGNED DATE:</strong> {selectedLocation.exampleContract.signedDate}
                        </div>
                        <div style={{
                          marginTop: 'var(--space-md)',
                          padding: 'var(--space-sm)',
                          background: 'rgba(143, 188, 143, 0.1)',
                          border: '1px solid var(--status-open)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--status-open)',
                          fontSize: '10px',
                        }}>
                          ✓ This contract was approved and executed successfully
                        </div>
                      </div>

                      <div style={{
                        marginTop: 'var(--space-lg)',
                        paddingTop: 'var(--space-md)',
                        borderTop: '1px solid var(--border-subtle)',
                        fontSize: '10px',
                        fontStyle: 'italic',
                        color: 'var(--text-muted)',
                      }}>
                        Note: Full Northwestern University Film Location Agreement Rider applies.
                        Contact RTVF admin for complete contract template.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
