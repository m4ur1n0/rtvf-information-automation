export type HandbookSection = {
  slug: string;
  shortLabel: string;
  title: string;
  summary: string;
  keyPoints: string[];
  details: { heading: string; bullets: string[] }[];
  links?: { label: string; url: string }[];
  tags: string[];
};

export const handbookSections: HandbookSection[] = [
  {
    slug: "introduction",
    shortLabel: "Intro",
    title: "Section 1: Introduction and Document Scope",
    summary:
      "The handbook is a binding operational policy for all RTVF curricular and co-curricular production activity using department resources.",
    keyPoints: [
      "Rules are considered contractually in effect for your time making RTVF work at Northwestern.",
      "Handbook standards are in addition to university code and academic integrity policy.",
      "Violations can trigger fines, access loss, and university consequences.",
      "All students should consult instructor first for handbook interpretation questions.",
    ],
    details: [
      {
        heading: "Core Requirement",
        bullets: [
          "All RTVF class students must pass the Production Handbook Quiz at 80+ before Cage access.",
          "Quiz can be retaken until passed; you only pass once during your Northwestern enrollment.",
        ],
      },
      {
        heading: "Operating Principle",
        bullets: [
          "The policy framework is designed for safe, ethical, equitable, and efficient production.",
          "When uncertain, escalate questions before filming rather than interpreting policy alone.",
        ],
      },
    ],
    links: [
      {
        label: "Production Handbook Quiz",
        url: "https://commstudies.co1.qualtrics.com/jfe/form/SV_9uEK5j9wTHeJIoK",
      },
    ],
    tags: ["intro", "policy", "quiz"],
  },
  {
    slug: "contacts",
    shortLabel: "Contacts",
    title: "Section 2: Contact Information and Responsibility",
    summary:
      "Route production issues to the right office early to avoid delays in insurance, finance, and facility approvals.",
    keyPoints: [
      "Instructor is first line for policy interpretation and project-level questions.",
      "Production Services manages Cage and Louis operational access.",
      "Risk Management handles insurance, incidents, and non-NU liability workflows.",
      "URSA is the undergrad representation and listserv coordination channel.",
    ],
    details: [
      {
        heading: "Departmental and Financial Staff",
        bullets: [
          "Business Administration: Shannon Pritchard (shannon.pritchard@northwestern.edu; 847-491-7261) and Dawn Washington (dawn.washington@northwestern.edu; 847-491-7317).",
          "Financial Assistant: Granville Bowerbank (gbank@northwestern.edu; 847-491-7315) for undergrad and MFA grant financials.",
          "Program assistants include Arshad Deen Baruti, Brad West, and Livia Lund for program-specific workflows.",
        ],
      },
      {
        heading: "Faculty Leadership (Policy Authority)",
        bullets: [
          "Chair: Thomas Bradshaw (t-bradshaw@northwestern.edu).",
          "Associate Chair: Eric Courtney (erin.courtney@northwestern.edu).",
          "Production Area Head: Kyle Henry (kyle-henry@northwestern.edu; 847-491-2244).",
          "Director of Undergraduate Services: Clayton Brown (Clayton@northwestern.edu).",
        ],
      },
      {
        heading: "Production Services and Operational Contact Points",
        bullets: [
          "Manager of Production Services: Brian Perkinson (b-perkinson@northwestern.edu; 847-467-1710).",
          "Production Equipment Specialist: Jankhna Sura (jankhna.sura@northwestern.edu; 847-491-5226).",
          "Cage phone: 847-467-1706.",
        ],
      },
      {
        heading: "Risk and Student Coordination",
        bullets: [
          "Risk Management main office: risk@northwestern.edu; 847-467-7795.",
          "Risk contacts include Angela J. Piersanti and Juan-Carlos Perez for plan administration and claims.",
          "Incident reporting should be filed promptly when injury, loss, or non-NU property incidents occur.",
          "URSA contact: ursa@u.northwestern.edu.",
          "Undergrad listserv is managed independently through URSA channels.",
        ],
      },
    ],
    links: [
      {
        label: "Risk Management Student Film Insurance",
        url: "https://www.northwestern.edu/risk/risk-insurance/student-insuranceprograms/student-films.html",
      },
      {
        label: "URSA/Listserv Subscription Info",
        url: "https://services.northwestern.edu/TDClient/30/Portal/KB/ArticleDet?ID=433",
      },
    ],
    tags: ["contacts", "risk", "ursa", "staff"],
  },
  {
    slug: "facilities",
    shortLabel: "Facilities",
    title: "Section 3: Facilities Overview",
    summary:
      "Filming permissions and use conditions vary by building; reservation systems do not replace explicit filming approval.",
    keyPoints: [
      "You must obtain written permission from building manager for filming in campus spaces.",
      "25Live reservation alone is not filming permission.",
      "Annie May Swift cannot be used for student film production.",
      "Louis houses Cage, studio, sound stage, and post suites with additional access policies.",
    ],
    details: [
      {
        heading: "Critical Building Rule",
        bullets: [
          "In 25Live Event Description/Notes, state that filming is planned.",
          "Include load in/load out details and special access needs in request text.",
          "Without explicit filming permission, reservation does not authorize production activity.",
        ],
      },
      {
        heading: "Primary Spaces",
        bullets: [
          "Louis Hall: Cage, studios, sound stage, auditorium, and post suites.",
          "Fisk Hall B-1: undergrad post-production lab (course-priority use).",
          "Frances Searle: MA SAI facilities and SoundTank spaces.",
          "Abbott Hall/Wirtz Center: class-linked reservable rooms in Chicago campus.",
        ],
      },
    ],
    links: [
      {
        label: "25Live Reservation System",
        url: "https://25live.collegenet.com/pro/northwestern#!/home/dash",
      },
    ],
    tags: ["facilities", "25live", "louis", "ams", "fisk"],
  },
  {
    slug: "general-production",
    shortLabel: "Production",
    title: "Section 4: General Production Rules and Regulations",
    summary:
      "This is the highest-impact operational section covering deposits, checkout windows, liability, safety, and studio controls.",
    keyPoints: [
      "Active deposit is mandatory for equipment/facility privileges tied to production coursework.",
      "Equipment reservations require WebCheckout and at least 24-hour lead time.",
      "DP and principal sound recordist are responsible checkout parties.",
      "Late return, no-show pickup, damage, or theft can revoke privileges and deposits.",
      "Turnaround/safety schedule limits are mandatory.",
      "Co-curricular groups and MAG access are priority-limited and time-window constrained.",
    ],
    details: [
      {
        heading: "Deposits and Access",
        bullets: [
          "Equipment deposit: $50 refundable.",
          "Louis 105/106 access deposit: $100 refundable (plus training eligibility requirements).",
          "Key deposit: $50 refundable.",
          "Locker deposit: $10 and Cage-issued lock required.",
          "Deposit refunds happen in the last two weeks of the quarter after all gear/keys/locker contents are fully cleared.",
          "Failure to maintain deposit during eligible production course enrollment can zero out assignments requiring equipment/facilities.",
        ],
      },
      {
        heading: "Cage Circulation Windows",
        bullets: [
          "Checkout window: 2:00 PM-6:00 PM Monday-Friday.",
          "Check-in window: 9:00 AM-1:00 PM Monday-Friday.",
          "No individual circulation during 6:00 PM-9:00 PM instructor/lab support window.",
          "Reservations can be cancelled in WebCheckout up to 15 minutes before scheduled pickup.",
          "Reservations can generally be made up to 30 days in advance.",
        ],
      },
      {
        heading: "Checkout and Return Structure",
        bullets: [
          "No Saturday/Sunday checkout circulation.",
          "Typical one-day pattern: Monday->Tuesday, Tuesday->Wednesday, Wednesday->Thursday, Thursday->Friday, Friday->Monday.",
          "Extended windows (e.g., Thursday->Monday, Friday->Tuesday) are restricted to designated groups such as grad students and approved categories.",
          "All checked-out equipment must be returned by convocation/graduation to avoid replacement-cost charges and graduation holds.",
        ],
      },
      {
        heading: "Eligibility and Priority Logic",
        bullets: [
          "Students may only check out equipment they are trained on through class/workshop pathways.",
          "Curricular production has priority over non-curricular requests.",
          "Priority order: curricular first, incompletes second, co-curricular third.",
          "Co-curricular projects generally have equipment access only in first five weeks of quarter.",
          "Independent projects cannot use Cage equipment.",
        ],
      },
      {
        heading: "Scheduling and Set Safety",
        bullets: [
          "Minimum 10-hour turnaround between shoot days.",
          "Night shoots must wrap by midnight except Friday/Saturday.",
          "Students may not miss classes for production.",
          "Prop weapons on campus require University Police process at least 14 days prior.",
        ],
      },
      {
        heading: "Loss and Damage Liability",
        bullets: [
          "Responsible party is liable once checkout is signed; inspect all gear at pickup.",
          "Damage/loss/theft can suspend privileges until payment or approved payment plan begins.",
          "Police report is required for theft, with copies to Production Equipment Specialist and Risk Management.",
          "Arbitration appeals for revocation must be submitted in writing within 30 days to Production Area Head.",
          "Second offense can trigger loss of deposit card and facility/equipment privileges.",
        ],
      },
      {
        heading: "Studio-Specific Controls (Louis 105/106)",
        bullets: [
          "Studio reservations require 25Live, active studio deposit, and minimum 2 business day lead time.",
          "Single student/group usage cap: max two consecutive days and max 20 hours/week in reserved windows.",
          "No food or drink in Louis 105/109; no smoke/fog/pyro/firearms in studio/sound-stage spaces.",
          "Cyclorama usage in 106 has paint/material restrictions and damage liability assigned to reserving student.",
          "Students cannot move grid lights or use scissor lift in 106; training gates apply to control-board operations.",
        ],
      },
    ],
    links: [
      { label: "WebCheckout", url: "https://webcheckout.northwestern.edu/patron" },
      {
        label: "University Police Weapon Policy",
        url: "https://www.northwestern.edu/up/your-safety/prohibition-of-weapons.html",
      },
    ],
    tags: ["deposits", "checkout", "cage", "safety", "studios"],
  },
  {
    slug: "classrooms-labs",
    shortLabel: "Class/Lab",
    title: "Section 5: Classroom and Lab Rules",
    summary:
      "Classrooms and labs are operational teaching spaces with strict restoration and equipment-handling requirements.",
    keyPoints: [
      "Reserve through 25Live and include complete event context.",
      "No food/drink in Louis 118, Louis 119, or Fisk Lab.",
      "Do not alter wiring or rack/podium configuration.",
      "Fisk Lab is RTVF class and approved project work only.",
    ],
    details: [
      {
        heading: "Louis Hall Rooms",
        bullets: [
          "Louis 118 is flexible seminar/lab; restore furniture after use.",
          "Louis 119 projection booth requires trained projectionist access path.",
          "Space misuse can revoke deposits and future reservation privilege.",
          "Reservation lead time for Louis classroom spaces is minimum 24 hours.",
          "Louis 118 maximum capacity is 25; Louis 119 maximum capacity is 60.",
          "No food/drink in Louis 118 or Louis 119 with no exception policy language.",
        ],
      },
      {
        heading: "Annie May Swift (AMS) Operational Constraints",
        bullets: [
          "AMS Helmerich reservations are reviewed and can require fees/projectionist coverage.",
          "AMS 109/219 table/wiring configurations cannot be moved.",
          "No filming in AMS for production purposes.",
          "Helmerich A/V booth requires trained/approved projectionists only.",
          "Food and drink are not allowed in Helmerich Auditorium.",
          "Reservation windows must include setup, delivery, cleanup, and all item removal.",
        ],
      },
      {
        heading: "Abbott and Fisk Rules",
        bullets: [
          "Abbott room access is tied to class enrollment context for reservable spaces.",
          "Fisk B-1 is not reservable outside RTVF classes; open time is first-come post-production use.",
          "Fisk users cannot install software/hardware or remove equipment from lab.",
          "Fisk closes on posted schedule even if student projects are unfinished.",
          "No food/drink in Fisk Lab.",
        ],
      },
    ],
    links: [{ label: "SoCIT Ticket Portal", url: "https://rb.gy/mn2eg" }],
    tags: ["labs", "classrooms", "louis118", "louis119", "fisk", "ams"],
  },
  {
    slug: "adobe-licensing",
    shortLabel: "Adobe",
    title: "Section 6: Adobe Post-Production Licensing",
    summary:
      "Adobe Creative Cloud access is provided by enrollment status and major status in RTVF production pathways.",
    keyPoints: [
      "RTVF majors receive ongoing licensing coverage.",
      "Non-majors receive licenses while enrolled in qualifying production courses.",
      "Licensing issues at quarter start should go to instructor first.",
    ],
    details: [
      {
        heading: "Who Gets Access",
        bullets: [
          "RTVF majors are maintained on department licensing.",
          "Non-majors are provisioned only while actively enrolled in production coursework.",
        ],
      },
      {
        heading: "Troubleshooting",
        bullets: [
          "Confirm enrollment and class status before escalating technical account issues.",
          "Use SoCIT support channels when instructor confirms licensing should be active.",
        ],
      },
    ],
    tags: ["adobe", "software", "licensing", "post"],
  },
  {
    slug: "post-production",
    shortLabel: "Post",
    title: "Section 7: Post-Production Rules and Regulations",
    summary:
      "Post-production suites are reservable and shared; workflow discipline and storage hygiene are mandatory.",
    keyPoints: [
      "Reserve post suites in 25Live; reservation priority governs room access.",
      "Do not rewire, remove, or alter suite peripherals.",
      "Shared storage is wiped during breaks; maintain external backups.",
      "No food or drinks in post suites.",
    ],
    details: [
      {
        heading: "Reservation and Priority",
        bullets: [
          "Reservations should be made 24+ hours ahead.",
          "Faculty and curricular needs can modify/cancel student reservations.",
          "Specialty suites have specific capacities and use intentions (color or 5.1 mix review).",
          "Post suites can be reserved for any time of day during academic year, subject to reservation approval timing.",
          "Priority access is always given to users with approved reservations.",
        ],
      },
      {
        heading: "Storage and System Integrity",
        bullets: [
          "Shared media volumes are not archival storage.",
          "Students may erase only their own media.",
          "System cabling and hardware changes can trigger deposit/privilege penalties.",
          "Shared storage arrays are wiped during term breaks (week after finals).",
          "No food or drink in post suites; violations can trigger loss of post facility access.",
        ],
      },
      {
        heading: "Room-Specific Notes",
        bullets: [
          "Small suites include rooms 207, 208, 209, 218, and 219 with shared storage and color-check displays.",
          "Specialty video finish spaces include 214 and 215 (color correction oriented).",
          "5.1-capable mix/review rooms include 231, 232, and 233; 231 supports larger group review.",
          "Non-SAI access to Louis 105/109 requires SAI course prerequisites, active studio deposit, and sound@northwestern.edu request workflow.",
        ],
      },
    ],
    tags: ["post", "editing", "storage", "suites", "sound"],
  },
  {
    slug: "project-types",
    shortLabel: "Projects",
    title: "Section 8: Curricular and Co-Curricular Project Policy",
    summary:
      "Project type controls access priority and scheduling windows for equipment and facilities.",
    keyPoints: [
      "Curricular projects are tied to courses and instructor supervision.",
      "Co-curricular projects (MAG/student groups) are lower priority and often first-5-week constrained.",
      "Leadership must enforce policies or groups can lose support/recognition.",
    ],
    details: [
      {
        heading: "Curricular",
        bullets: [
          "Includes class-based work such as RTVF 190 and advanced sequences.",
          "Instructor is primary policy authority for project-level decisions.",
          "Examples include Senior Directing, Advanced Sitcom, and Pritzker Pucker Studio Lab pathways.",
        ],
      },
      {
        heading: "Co-Curricular",
        bullets: [
          "MAG and recognized student-group projects fall under co-curricular rules.",
          "Missed coursework due to co-curricular work can require intervention and participation limits.",
          "Student groups must maintain advisor contact and compliance check-ins.",
          "Co-curricular projects have third-level priority for equipment and rooms and generally must shoot in first five weeks.",
          "Student-group sponsored work is not eligible for independent study credit.",
        ],
      },
    ],
    links: [
      {
        label: "MAG Program",
        url: "https://communication.northwestern.edu/academics/radio-televisionfilm/current-students/media-arts-grant/",
      },
    ],
    tags: ["curricular", "co-curricular", "mag", "student-groups"],
  },
  {
    slug: "independent-study",
    shortLabel: "Ind. Study",
    title: "Section 9: Independent Study Policy",
    summary:
      "Independent studies are limited and cannot be used to access Cage resources for production work.",
    keyPoints: [
      "399/499 is petition-based for juniors/seniors/graduate students with required academic standing.",
      "Independent studies require substantial faculty-supervised independent inquiry.",
      "Cage equipment is not available for independent study projects.",
    ],
    details: [
      {
        heading: "Eligibility Context",
        bullets: [
          "If project is better suited for existing course, students are directed into that course path.",
          "Independent study is not a bypass for standard curricular production access.",
        ],
      },
    ],
    links: [
      {
        label: "Independent Study Advising",
        url: "https://advising.soc.northwestern.edu/policies_procedures/independentstudies/",
      },
    ],
    tags: ["independent-study", "petition", "399", "499"],
  },
  {
    slug: "travel",
    shortLabel: "Travel",
    title: "Section 10: Travel Policy",
    summary:
      "Travel with NU equipment requires advance planning windows, risk coordination, and full custody accountability.",
    keyPoints: [
      "Domestic travel beyond normal checkout period requires at least 2 weeks notice.",
      "International travel requires faculty permission and at least 30 days advance notice.",
      "Students remain liable for transport damage/loss/theft.",
      "International travel requires destination compliance checks and risk planning.",
    ],
    details: [
      {
        heading: "Domestic",
        bullets: [
          "No extra approval needed when travel fits standard checkout period.",
          "Longer domestic windows must be coordinated with Production Equipment Specialist and course faculty.",
        ],
      },
      {
        heading: "International",
        bullets: [
          "Coordinate with Risk Management for special insurance and plan requirements.",
          "Confirm filming/visa/equipment permit rules with destination authorities.",
          "Carry-on transport is strongly recommended for production gear.",
        ],
      },
    ],
    links: [
      {
        label: "Global Safety and Security",
        url: "https://www.northwestern.edu/global-safety-security/",
      },
    ],
    tags: ["travel", "domestic", "international", "insurance"],
  },
  {
    slug: "financials",
    shortLabel: "Financials",
    title: "Section 11: Financials and Grant Compliance",
    summary:
      "Grant spending is tightly controlled; non-compliance can revoke privileges, freeze registration, or forfeit funds.",
    keyPoints: [
      "Award recipient(s) on application are responsible for compliant spending and paperwork.",
      "Restricted items include firearms, tobacco, and alcohol.",
      "Northwestern students/staff/faculty cannot be paid for student media project labor.",
      "Contracts must be countersigned by approved NU role for project type.",
    ],
    details: [
      {
        heading: "Grant Administration",
        bullets: [
          "Final budget and final film deliverables have fixed quarter deadlines.",
          "Funding mechanics are payroll-linked; tax implications remain student responsibility.",
          "International student tax withholding can apply based on documentation/treaty status.",
          "Handbook timeline includes direct-deposit disbursement target of Tuesday, September 30, 2025 when paperwork is complete.",
          "Spring-quarter week-10 deadlines govern final budget and finished film upload requirements.",
        ],
      },
      {
        heading: "Spending and Labor Restrictions",
        bullets: [
          "Restricted spending includes firearms, tobacco, and alcohol purchases.",
          "Northwestern students/staff/faculty may volunteer but cannot be paid on student media projects.",
          "Contract workers and SAG performers require eligibility and process checks before commitments.",
          "Tax exemption does not apply to food/lodging categories.",
        ],
      },
      {
        heading: "Contracts, Countersigners, and Filing",
        bullets: [
          "Class instructors/advisors can countersign RMP and SAG attestations for advised projects.",
          "Other contracts require designated countersigners by project type.",
          "Submit contracts for countersignature at least 4 business days in advance.",
          "Approved countersigner mapping includes Spencer Parsons (MAG), Kyle Henry (Senior Directing), Shannon Pritchard (MFA Doc/Writing), Clayton Brown (undergrad curricular).",
          "Contracts must use naming convention with production, responsible student, and contract type then be uploaded to SharePoint portal.",
        ],
      },
    ],
    links: [
      {
        label: "RTVF SharePoint Budget/Contracts Portal",
        url: "https://nuwildcat.sharepoint.com/sites/SOC-RTVF-Student-Budget",
      },
    ],
    tags: ["financials", "grants", "contracts", "tax", "hiring"],
  },
  {
    slug: "insurance-liability",
    shortLabel: "Insurance",
    title: "Section 12: Insurance and Liability",
    summary:
      "Insurance coverage is conditional; students remain liable for uncovered losses, deductibles, and excluded claims.",
    keyPoints: [
      "Off-campus productions needing insurance require approved Risk Management Plan.",
      "Mysterious disappearance is excluded from property coverage.",
      "Group productions create joint/several liability exposure for loss/damage.",
      "Certain activities are excluded outright from RTVF student production.",
    ],
    details: [
      {
        heading: "Coverage Context",
        bullets: [
          "Insurance covers approved student film activities under university terms.",
          "Students acknowledge liability obligations when placing equipment deposits.",
          "Outstanding claims can hold grades/graduation records until resolved.",
          "Off-campus projects using NU or non-NU equipment generally require approved Risk Management Plan for coverage activation.",
          "On-campus NU-equipment shoots may not require additional risk-office insurance, but student liability still applies.",
          "Mysterious disappearance is excluded from coverage and fully billed to responsible students.",
        ],
      },
      {
        heading: "Excluded/Prohibited Activities",
        bullets: [
          "Open fire, fireworks, smoking/pyrotechnics.",
          "Real firearms, alcohol/illegal-substance related activity.",
          "Air/water stunts, live animals, public open-scene operations, and other listed high-risk categories.",
          "Additional exclusions include certain machinery/vehicle activities, bungee/skydiving/rock climbing, and incorporated/partnership entities.",
        ],
      },
    ],
    links: [{ label: "Risk Website", url: "http://www.northwestern.edu/risk" }],
    tags: ["insurance", "liability", "rmp", "exclusions"],
  },
  {
    slug: "releases-contracts-permits",
    shortLabel: "Contracts",
    title: "Section 13: Releases, Contracts, and Permits",
    summary:
      "Most production interactions with non-NU people, property, or equipment require signed forms and retained countersigned records.",
    keyPoints: [
      "Use personal release for subjects/actors whether paid or unpaid.",
      "Use location/equipment/vendor contracts and riders as applicable.",
      "Acquire municipal permits where required and confirm with jurisdiction directly.",
      "Upload final countersigned documents to official portal for claim support.",
    ],
    details: [
      {
        heading: "Required Documentation Pattern",
        bullets: [
          "Director/producer prepares forms; external party signs; approved NU countersigner signs.",
          "Store copies locally and in designated portal.",
          "Even $0 engagements still require signed contract terms.",
          "Use the right package by scenario: Personal Release, Location Contract + Rider, Equipment Contract + Rider, Vendor Contract + Rider.",
          "If claims arise, Risk Management may require copies of fully countersigned documents before honoring claims.",
        ],
      },
      {
        heading: "Union and Municipal Lead Time",
        bullets: [
          "SAG/AFTRA student film paperwork should start 4-6 weeks before production.",
          "Permit requirements vary by city; student is responsible for confirming and securing all approvals.",
          "Municipal permitting references include Evanston and Chicago guidance portals; outside cities require local inquiry.",
          "Location owners and municipalities may not proactively disclose permit needs; students must verify directly.",
        ],
      },
    ],
    links: [
      {
        label: "SAG Student Film Start Guide",
        url: "https://www.sagaftra.org/production-center/contract/817/getting-started",
      },
      {
        label: "Evanston Film Permit",
        url: "https://www.cityofevanston.org/residents/permits-licenses/film-movie-photoshoot-permit",
      },
      {
        label: "Chicago Film Permit Info",
        url: "http://www.cityofchicago.org/city/en/depts/dca/supp_info/permits.html",
      },
    ],
    tags: ["releases", "permits", "locations", "vendors", "sag"],
  },
];

export const handbookMetrics = [
  { label: "Equipment Deposit", value: "$50" },
  { label: "Studio / Sound Stage Deposit", value: "$100" },
  { label: "Key Deposit", value: "$50" },
  { label: "Locker Deposit", value: "$10" },
  { label: "Equipment Reservation Lead Time", value: "24h+" },
  { label: "Studio Reservation Lead Time", value: "2 business days+" },
  { label: "Prop Weapon Campus Request", value: "14 days+" },
  { label: "International Travel Notice", value: "30 days+" },
];

export const overviewRules = [
  "Pass the Production Handbook Quiz with 80+ before initial Cage access.",
  "Reservation does not equal permission: secure written filming approval from building manager.",
  "No filming in Annie May Swift Hall.",
  "Observe 10-hour turnaround and midnight weekday wrap limits.",
  "Independent study projects do not qualify for Cage equipment access.",
  "Return all checked-out equipment by convocation/graduation timelines.",
];

export const overviewLinks = [
  {
    label: "Production Handbook Quiz",
    url: "https://commstudies.co1.qualtrics.com/jfe/form/SV_9uEK5j9wTHeJIoK",
  },
  { label: "WebCheckout", url: "https://webcheckout.northwestern.edu/patron" },
  {
    label: "25Live",
    url: "https://25live.collegenet.com/pro/northwestern#!/home/dash",
  },
  {
    label: "Risk Management",
    url: "https://www.northwestern.edu/risk/risk-insurance/student-insuranceprograms/student-films.html",
  },
  { label: "SoCIT Ticket", url: "https://rb.gy/mn2eg" },
];

export function getSectionBySlug(slug: string): HandbookSection | undefined {
  return handbookSections.find((section) => section.slug === slug);
}

export type HandbookSearchResult = {
  slug: string;
  title: string;
  excerpt: string;
  area: "summary" | "key-point" | "detail" | "tag";
};

export function searchHandbook(query: string): HandbookSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: HandbookSearchResult[] = [];

  for (const section of handbookSections) {
    const summaryMatch = section.summary.toLowerCase().includes(q);
    if (summaryMatch) {
      results.push({
        slug: section.slug,
        title: section.title,
        excerpt: section.summary,
        area: "summary",
      });
      continue;
    }

    const tagMatch = section.tags.find((tag) => tag.toLowerCase().includes(q));
    if (tagMatch) {
      results.push({
        slug: section.slug,
        title: section.title,
        excerpt: `Tag match: ${tagMatch}`,
        area: "tag",
      });
      continue;
    }

    const pointMatch = section.keyPoints.find((point) =>
      point.toLowerCase().includes(q)
    );
    if (pointMatch) {
      results.push({
        slug: section.slug,
        title: section.title,
        excerpt: pointMatch,
        area: "key-point",
      });
      continue;
    }

    let detailMatch: string | null = null;
    for (const detail of section.details) {
      const headingMatch = detail.heading.toLowerCase().includes(q);
      if (headingMatch) {
        detailMatch = `Heading: ${detail.heading}`;
        break;
      }
      const bulletMatch = detail.bullets.find((bullet) =>
        bullet.toLowerCase().includes(q)
      );
      if (bulletMatch) {
        detailMatch = `${detail.heading}: ${bulletMatch}`;
        break;
      }
    }

    if (detailMatch) {
      results.push({
        slug: section.slug,
        title: section.title,
        excerpt: detailMatch,
        area: "detail",
      });
    }
  }

  return results;
}
