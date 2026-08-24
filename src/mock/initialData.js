export const CURRENT_DATA_PRINCIPAL = {
  id: "DP-2026-88491",
  name: "Ananya Sharma",
  email: "ananya.sharma@delhiuniv.ac.in",
  phone: "+91 98765 43210",
  rollNo: "2023-CS-1049",
  institution: "Delhi Technological University",
  kycStatus: "Verified",
  registeredOn: "2025-08-15"
};

export const MOCK_SCENARIOS = [
  {
    id: "scen-placement-2026",
    title: "Campus Recruitment & Placement Drive 2026",
    fiduciary: "Central Training & Placement Cell (CTPC)",
    fiduciaryCategory: "Educational Institution",
    fiduciaryLogo: "🎓",
    fiduciaryEmail: "placements@dtu.ac.in",
    dpoName: "Dr. R. K. Verma (DPO)",
    dpoEmail: "dpo@dtu.ac.in",
    purpose: "Processing student profile, academic scores, resume, and contact credentials for shortlisting by empanelled corporate recruiters for On-Campus Placement 2026.",
    noticeId: "NTC-2026-CTPC-881",
    legalBasis: "Consent under DPDP Act 2023 (Section 6)",
    validityPeriod: "12 Months (Till Graduation)",
    dataRegion: "India (MeitY Empanelled Cloud)",
    attributes: [
      { id: "attr_name", name: "Full Name & Roll No", category: "Identity", required: true, description: "Official student name and enrollment number", sensitive: false },
      { id: "attr_email", name: "Institutional Email", category: "Contact", required: true, description: "Official college email address for interview call letters", sensitive: false },
      { id: "attr_phone", name: "Mobile Phone Number", category: "Contact", required: true, description: "Direct phone number for urgent recruiter coordination", sensitive: false },
      { id: "attr_cgpa", name: "Cumulative Grade (CGPA & Marksheets)", category: "Academic", required: false, description: "Semester 1-6 marksheets for eligibility criteria verification", sensitive: true, defaultGranted: true },
      { id: "attr_resume", name: "Resume & Portfolio Document", category: "Professional", required: false, description: "PDF Resume to be shared with visiting recruitment teams", sensitive: false, defaultGranted: true },
      { id: "attr_backlogs", name: "Active Backlog / Arrears Status", category: "Academic", required: false, description: "Declaration of pending academic backlog courses", sensitive: true, defaultGranted: false },
      { id: "attr_govt_id", name: "Aadhaar / Government Photo ID Proof", category: "KYC Identity", required: false, description: "Identity verification for company entry pass & background check", sensitive: true, defaultGranted: false }
    ],
    emailSubject: "ACTION REQUIRED: Grant Data Consent for Campus Placement Drive 2026",
    emailBody: `Dear Ananya Sharma,

The Central Training & Placement Cell (CTPC) requires your explicit consent to process your academic records and resume for the upcoming Campus Recruitment Drive 2026.

Under the Digital Personal Data Protection (DPDP) Act, you have full granular control to select which data points you wish to share with partner recruiters.

Please click the button below to review the Privacy Notice and configure your consent choices on the official Data Principal Consent Portal.`
  },
  {
    id: "scen-scholarship-2026",
    title: "National Merit Scholarship & Financial Aid",
    fiduciary: "Higher Education Scholarship Board (HESB)",
    fiduciaryCategory: "Government Body",
    fiduciaryLogo: "🏛️",
    fiduciaryEmail: "nodal-scholarship@gov.in",
    dpoName: "Smt. S. Mukherjee",
    dpoEmail: "grievance-hesb@gov.in",
    purpose: "Verification of annual family income, bank account details, and marksheets for disbursement of Merit-cum-Means Financial Assistance.",
    noticeId: "NTC-2026-HESB-409",
    legalBasis: "DPDP Act 2023 & Direct Benefit Transfer Guidelines",
    validityPeriod: "6 Months",
    dataRegion: "India (NIC Cloud)",
    attributes: [
      { id: "attr_name", name: "Full Legal Name", category: "Identity", required: true, description: "Name matching bank account and Aadhaar", sensitive: false },
      { id: "attr_income", name: "Annual Family Income Certificate", category: "Financial", required: true, description: "Tehsildar issued income proof document", sensitive: true },
      { id: "attr_bank", name: "Bank Account & IFSC Code", category: "Financial", required: true, description: "Bank details for direct credit of scholarship amount", sensitive: true },
      { id: "attr_caste", name: "Category / Disability Certificate (If applicable)", category: "Demographic", required: false, description: "Reservation benefits eligibility verification", sensitive: true, defaultGranted: false },
      { id: "attr_attendance", name: "Semester Attendance Record", category: "Academic", required: false, description: "Minimum 75% attendance proof from HOD", sensitive: false, defaultGranted: true }
    ],
    emailSubject: "Consent Notice: Verification of Records for National Merit Scholarship 2026",
    emailBody: `Dear Ananya Sharma,

Your application for the National Merit Scholarship 2026 has passed initial screening. 

To proceed with bank disbursement, the Higher Education Scholarship Board requires your digital consent to verify your financial and academic documents. You can grant or restrict access to specific attributes.`
  },
  {
    id: "scen-health-2026",
    title: "University Health & Immunization Verification",
    fiduciary: "DTU Campus Wellness Center",
    fiduciaryCategory: "Healthcare Provider",
    fiduciaryLogo: "🏥",
    fiduciaryEmail: "health-wellness@dtu.ac.in",
    dpoName: "Dr. A. K. Sundaram",
    dpoEmail: "dpo-health@dtu.ac.in",
    purpose: "Maintenance of emergency health contacts, blood group record, and vaccination history for campus medical emergencies and sports clearance.",
    noticeId: "NTC-2026-HEALTH-112",
    legalBasis: "DPDP Health Protocol & University Safety By-laws",
    validityPeriod: "24 Months",
    dataRegion: "India (Encrypted Health Data Vault)",
    attributes: [
      { id: "attr_blood", name: "Blood Group & Allergies", category: "Medical", required: true, description: "Vital medical information for emergency responder team", sensitive: true },
      { id: "attr_emergency_contact", name: "Parent / Guardian Emergency Contact", category: "Contact", required: true, description: "Phone number of parent/guardian for medical emergencies", sensitive: false },
      { id: "attr_vaccine", name: "Vaccination Records (COVID/Hepatitis)", category: "Medical", required: false, description: "Immunization history for hostel clearance", sensitive: true, defaultGranted: true },
      { id: "attr_chronic", name: "Pre-existing Medical Condition Declaration", category: "Medical", required: false, description: "Optional health notes for campus clinic doctors", sensitive: true, defaultGranted: false }
    ],
    emailSubject: "Health Center Notice: Annual Student Wellness & Emergency Contact Consent",
    emailBody: `Dear Ananya,

The Campus Wellness Center is updating emergency response records. Please review the consent notice to allow access to your blood group and emergency contact info.`
  }
];

export const INITIAL_ACTIVE_CONSENTS = [
  {
    consentId: "CNST-2026-8819A",
    fiduciary: "Central Library & Digital E-Resource Portal",
    fiduciaryCategory: "Library Services",
    fiduciaryLogo: "📚",
    purpose: "Issue of digital library pass and access to IEEE / ACM online research journals.",
    noticeId: "NTC-2025-LIB-092",
    status: "ACTIVE",
    grantedOn: "2025-09-10T10:30:00Z",
    expiresOn: "2026-09-10T10:30:00Z",
    grantedAttributes: ["Full Name", "Roll Number", "Institutional Email"],
    deniedAttributes: ["Mobile Number", "Address"],
    dpoContact: "library-dpo@dtu.ac.in",
    dataRegion: "India",
    receiptHash: "0x8f4b...c391"
  },
  {
    consentId: "CNST-2026-4402B",
    fiduciary: "Student Innovation & Incubation Cell (SIIC)",
    fiduciaryCategory: "Research & Startup",
    fiduciaryLogo: "🚀",
    purpose: "Grant eligibility evaluation for university startup seed fund.",
    noticeId: "NTC-2025-SIIC-311",
    status: "ACTIVE",
    grantedOn: "2025-11-20T14:15:00Z",
    expiresOn: "2026-11-20T14:15:00Z",
    grantedAttributes: ["Full Name", "Institutional Email", "Project Proposal Pitch", "CGPA"],
    deniedAttributes: ["Government Photo ID"],
    dpoContact: "incubation-dpo@dtu.ac.in",
    dataRegion: "India",
    receiptHash: "0x3e1a...9b42"
  }
];

export const INITIAL_AUDIT_LOGS = [
  {
    id: "AUD-901",
    timestamp: "2025-09-10T10:30:00Z",
    action: "CONSENT_GRANTED",
    fiduciary: "Central Library & Digital E-Resource Portal",
    consentId: "CNST-2026-8819A",
    details: "Granted consent for 3 data attributes (Name, Roll No, Email).",
    ipAddress: "103.21.124.88",
    status: "SUCCESS"
  },
  {
    id: "AUD-902",
    timestamp: "2025-11-20T14:15:00Z",
    action: "CONSENT_GRANTED",
    fiduciary: "Student Innovation & Incubation Cell (SIIC)",
    consentId: "CNST-2026-4402B",
    details: "Granted consent for 4 attributes. Denied Govt Photo ID.",
    ipAddress: "103.21.124.88",
    status: "SUCCESS"
  },
  {
    id: "AUD-899",
    timestamp: "2025-08-01T09:00:00Z",
    action: "CONSENT_REVOKED",
    fiduciary: "Third-Party Alumni Feedback Vendor",
    consentId: "CNST-2025-0012Z",
    details: "Consent revoked by Data Principal. Reason: Purpose completed.",
    ipAddress: "103.21.124.88",
    status: "REVOKED"
  }
];

export const INITIAL_NOMINEE = {
  nomineeName: "Rajesh Sharma",
  relationship: "Father / Parent",
  contactPhone: "+91 98112 34567",
  contactEmail: "rajesh.sharma@gmail.com",
  idType: "Aadhaar Card",
  idNumber: "XXXX-XXXX-4819",
  dateDesignated: "2025-08-20",
  status: "ACTIVE_VERIFIED"
};

export const INITIAL_DSR_REQUESTS = [
  {
    ticketId: "DSR-2026-8910",
    type: "RIGHT_TO_ERASURE",
    fiduciary: "Third-Party Alumni Feedback Vendor",
    consentId: "CNST-2025-0012Z",
    details: "Complete deletion of student feedback logs, contact email, and session metadata following consent revocation.",
    submittedOn: "2025-08-01T09:15:00Z",
    status: "COMPLETED",
    slaDeadline: "2025-08-31",
    completionHash: "0x7d91...a412"
  },
  {
    ticketId: "DSR-2026-4021",
    type: "RIGHT_TO_CORRECTION",
    fiduciary: "Central Training & Placement Cell (CTPC)",
    consentId: "N/A",
    details: "Correction of residential address and updated mobile phone number (+91 98765 43210).",
    submittedOn: "2026-01-15T11:20:00Z",
    status: "PROCESSING",
    slaDeadline: "2026-02-14",
    completionHash: "PENDING"
  }
];
