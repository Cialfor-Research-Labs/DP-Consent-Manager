import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_FILE = path.join(process.cwd(), 'server', 'database.json');

/**
 * Deterministic Data Principal ID Generator
 */
export function generateDataPrincipalId(email) {
  if (!email) return 'DP-2026-00000';
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash).toString().padStart(5, '0').slice(-5);
  return `DP-2026-${absHash}`;
}

/**
 * SHA-256 Cryptographic Signature Hash Generator
 */
export function generateSHA256Signature(payload) {
  const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return '0x' + crypto.createHash('sha256').update(jsonStr).digest('hex').substring(0, 32);
}

/**
 * Seed relational data for initial DB initialization
 */
const SEED_DATA = {
  dataPrincipals: [
    {
      id: generateDataPrincipalId("ananya.sharma@delhiuniv.ac.in"),
      name: "Ananya Sharma",
      email: "ananya.sharma@delhiuniv.ac.in",
      phone: "+91 98765 43210",
      rollNo: "2023-CS-1049",
      institution: "Delhi Technological University",
      kycStatus: "Verified",
      registeredOn: "2025-08-15"
    },
    {
      id: generateDataPrincipalId("priya.nair@delhiuniv.ac.in"),
      name: "Priya Nair",
      email: "priya.nair@delhiuniv.ac.in",
      phone: "+91 98123 45678",
      rollNo: "2023-EC-3011",
      institution: "Delhi Technological University",
      kycStatus: "Verified",
      registeredOn: "2025-08-20"
    },
    {
      id: generateDataPrincipalId("rahul.verma@delhiuniv.ac.in"),
      name: "Rahul Verma",
      email: "rahul.verma@delhiuniv.ac.in",
      phone: "+91 98112 99887",
      rollNo: "2023-EE-2014",
      institution: "Delhi Technological University",
      kycStatus: "Verified",
      registeredOn: "2025-09-01"
    }
  ],
  emailSnapshots: [
    {
      id: "ES-2026-CTPC-001",
      from: "Central Training & Placement Cell (CTPC) <placements@dtu.ac.in>",
      to: "Ananya Sharma <ananya.sharma@delhiuniv.ac.in>",
      subject: "ACTION REQUIRED: Grant Data Consent for Campus Placement Drive 2026",
      date: "Monday, August 24, 2026",
      body: `Dear Ananya Sharma,\n\nThe Central Training & Placement Cell (CTPC) requires your explicit consent to process your academic records and resume for the upcoming Campus Recruitment Drive 2026.\n\nUnder the Digital Personal Data Protection (DPDP) Act, you have full granular control to select which data points you wish to share with partner recruiters.\n\nPlease click the button below to review the Privacy Notice and configure your consent choices on the official Data Principal Consent Portal.`,
      attachmentName: "Statutory_Privacy_Notice_NTC-2026-CTPC-881.pdf",
      attachmentSize: "1.4 MB",
      dkimStatus: "DKIM Signed",
      spfStatus: "SPF Pass"
    },
    {
      id: "ES-2026-HESB-002",
      from: "Higher Education Scholarship Board (HESB) <nodal-scholarship@gov.in>",
      to: "Priya Nair <priya.nair@delhiuniv.ac.in>",
      subject: "Consent Notice: Verification of Records for National Merit Scholarship 2026",
      date: "Friday, August 21, 2026",
      body: `Dear Priya Nair,\n\nYour application for the National Merit Scholarship 2026 has passed initial screening.\n\nTo proceed with bank disbursement, the Higher Education Scholarship Board requires your digital consent to verify your financial and academic documents. You can grant or restrict access to specific attributes.`,
      attachmentName: "Statutory_Privacy_Notice_NTC-2026-HESB-409.pdf",
      attachmentSize: "1.2 MB",
      dkimStatus: "DKIM Signed",
      spfStatus: "SPF Pass"
    },
    {
      id: "ES-2026-HEALTH-003",
      from: "DTU Campus Wellness Center <health-wellness@dtu.ac.in>",
      to: "Rahul Verma <rahul.verma@delhiuniv.ac.in>",
      subject: "Health Center Notice: Annual Student Wellness & Emergency Contact Consent",
      date: "Wednesday, August 19, 2026",
      body: `Dear Rahul Verma,\n\nThe Campus Wellness Center is updating emergency response records. Please review the consent notice to allow access to your blood group and emergency contact info.`,
      attachmentName: "Statutory_Privacy_Notice_NTC-2026-HEALTH-112.pdf",
      attachmentSize: "1.1 MB",
      dkimStatus: "DKIM Signed",
      spfStatus: "SPF Pass"
    }
  ],
  consentRequests: [
    {
      id: "REQ-2026-CTPC-881",
      token: "tok_placement_2026_x89a",
      noticeId: "NTC-2026-CTPC-881",
      dataPrincipalId: generateDataPrincipalId("ananya.sharma@delhiuniv.ac.in"),
      emailSnapshotId: "ES-2026-CTPC-001",
      fiduciaryName: "Central Training & Placement Cell (CTPC)",
      fiduciaryCategory: "Educational Institution",
      fiduciaryLogo: "🎓",
      fiduciaryEmail: "placements@dtu.ac.in",
      dpoName: "Dr. R. K. Verma (DPO)",
      dpoEmail: "dpo@dtu.ac.in",
      purpose: "Processing student profile, academic scores, resume, and contact credentials for shortlisting by empanelled corporate recruiters for On-Campus Placement 2026.",
      legalBasis: "Consent under DPDP Act 2023 (Section 6)",
      validityPeriod: "12 Months (Till Graduation)",
      dataRegion: "India (MeitY Empanelled Cloud)",
      requestedAttributes: [
        { id: "attr_name", name: "Full Name & Roll No", category: "Identity", required: true, description: "Official student name and enrollment number", sensitive: false },
        { id: "attr_email", name: "Institutional Email", category: "Contact", required: true, description: "Official college email address for interview call letters", sensitive: false },
        { id: "attr_phone", name: "Mobile Phone Number", category: "Contact", required: true, description: "Direct phone number for urgent recruiter coordination", sensitive: false },
        { id: "attr_cgpa", name: "Cumulative Grade (CGPA & Marksheets)", category: "Academic", required: false, description: "Semester 1-6 marksheets for eligibility criteria verification", sensitive: true, defaultGranted: true },
        { id: "attr_resume", name: "Resume & Portfolio Document", category: "Professional", required: false, description: "PDF Resume to be shared with visiting recruitment teams", sensitive: false, defaultGranted: true },
        { id: "attr_backlogs", name: "Active Backlog / Arrears Status", category: "Academic", required: false, description: "Declaration of pending academic backlog courses", sensitive: true, defaultGranted: false },
        { id: "attr_govt_id", name: "Aadhaar / Government Photo ID Proof", category: "KYC Identity", required: false, description: "Identity verification for company entry pass & background check", sensitive: true, defaultGranted: false }
      ],
      status: "PENDING",
      createdAt: "2026-08-24T09:00:00Z",
      expiresAt: "2026-09-24T09:00:00Z"
    },
    {
      id: "REQ-2026-HESB-409",
      token: "tok_scholarship_2026_m409",
      noticeId: "NTC-2026-HESB-409",
      dataPrincipalId: generateDataPrincipalId("priya.nair@delhiuniv.ac.in"),
      emailSnapshotId: "ES-2026-HESB-002",
      fiduciaryName: "Higher Education Scholarship Board (HESB)",
      fiduciaryCategory: "Government Body",
      fiduciaryLogo: "🏛️",
      fiduciaryEmail: "nodal-scholarship@gov.in",
      dpoName: "Smt. S. Mukherjee",
      dpoEmail: "grievance-hesb@gov.in",
      purpose: "Verification of annual family income, bank account details, and marksheets for disbursement of Merit-cum-Means Financial Assistance.",
      legalBasis: "DPDP Act 2023 & Direct Benefit Transfer Guidelines",
      validityPeriod: "6 Months",
      dataRegion: "India (NIC Cloud)",
      requestedAttributes: [
        { id: "attr_name", name: "Full Legal Name", category: "Identity", required: true, description: "Name matching bank account and Aadhaar", sensitive: false },
        { id: "attr_income", name: "Annual Family Income Certificate", category: "Financial", required: true, description: "Tehsildar issued income proof document", sensitive: true },
        { id: "attr_bank", name: "Bank Account & IFSC Code", category: "Financial", required: true, description: "Bank details for direct credit of scholarship amount", sensitive: true },
        { id: "attr_caste", name: "Category / Disability Certificate (If applicable)", category: "Demographic", required: false, description: "Reservation benefits eligibility verification", sensitive: true, defaultGranted: false },
        { id: "attr_attendance", name: "Semester Attendance Record", category: "Academic", required: false, description: "Minimum 75% attendance proof from HOD", sensitive: false, defaultGranted: true }
      ],
      status: "PENDING",
      createdAt: "2026-08-21T11:30:00Z",
      expiresAt: "2026-09-21T11:30:00Z"
    },
    {
      id: "REQ-2026-HEALTH-112",
      token: "tok_health_2026_h112",
      noticeId: "NTC-2026-HEALTH-112",
      dataPrincipalId: generateDataPrincipalId("rahul.verma@delhiuniv.ac.in"),
      emailSnapshotId: "ES-2026-HEALTH-003",
      fiduciaryName: "DTU Campus Wellness Center",
      fiduciaryCategory: "Healthcare Provider",
      fiduciaryLogo: "🏥",
      fiduciaryEmail: "health-wellness@dtu.ac.in",
      dpoName: "Dr. A. K. Sundaram",
      dpoEmail: "dpo-health@dtu.ac.in",
      purpose: "Maintenance of emergency health contacts, blood group record, and vaccination history for campus medical emergencies and sports clearance.",
      legalBasis: "DPDP Health Protocol & University Safety By-laws",
      validityPeriod: "24 Months",
      dataRegion: "India (Encrypted Health Data Vault)",
      requestedAttributes: [
        { id: "attr_blood", name: "Blood Group & Allergies", category: "Medical", required: true, description: "Vital medical information for emergency responder team", sensitive: true },
        { id: "attr_emergency_contact", name: "Parent / Guardian Emergency Contact", category: "Contact", required: true, description: "Phone number of parent/guardian for medical emergencies", sensitive: false },
        { id: "attr_vaccine", name: "Vaccination Records (COVID/Hepatitis)", category: "Medical", required: false, description: "Immunization history for hostel clearance", sensitive: true, defaultGranted: true },
        { id: "attr_chronic", name: "Pre-existing Medical Condition Declaration", category: "Medical", required: false, description: "Optional health notes for campus clinic doctors", sensitive: true, defaultGranted: false }
      ],
      status: "PENDING",
      createdAt: "2026-08-19T14:15:00Z",
      expiresAt: "2026-09-19T14:15:00Z"
    }
  ],
  consentDecisions: [],
  consents: [
    {
      consentId: "CNST-2026-8819A",
      requestId: "REQ-2025-LIB-092",
      dataPrincipalId: generateDataPrincipalId("ananya.sharma@delhiuniv.ac.in"),
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
      receiptHash: "0x8f4b7a91c2e4d567890123456789abcd"
    },
    {
      consentId: "CNST-2026-4402B",
      requestId: "REQ-2025-SIIC-311",
      dataPrincipalId: generateDataPrincipalId("ananya.sharma@delhiuniv.ac.in"),
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
      receiptHash: "0x3e1d9c28a7b4f567890123456789ef01"
    }
  ],
  auditEvents: [
    {
      id: "AUD-901",
      requestId: "REQ-2025-LIB-092",
      consentId: "CNST-2026-8819A",
      dataPrincipalId: generateDataPrincipalId("ananya.sharma@delhiuniv.ac.in"),
      action: "CONSENT_GRANTED",
      fiduciary: "Central Library & Digital E-Resource Portal",
      noticeId: "NTC-2025-LIB-092",
      details: "Granted 3 attributes for digital library pass access.",
      ipAddress: "103.21.124.88",
      timestamp: "2025-09-10T10:30:00Z",
      status: "SUCCESS"
    },
    {
      id: "AUD-902",
      requestId: "REQ-2025-SIIC-311",
      consentId: "CNST-2026-4402B",
      dataPrincipalId: generateDataPrincipalId("ananya.sharma@delhiuniv.ac.in"),
      action: "CONSENT_GRANTED",
      fiduciary: "Student Innovation & Incubation Cell (SIIC)",
      noticeId: "NTC-2025-SIIC-311",
      details: "Granted 4 attributes for incubation seed fund evaluation.",
      ipAddress: "103.21.124.88",
      timestamp: "2025-11-20T14:15:00Z",
      status: "SUCCESS"
    }
  ],
  dataRightsRequests: [
    {
      id: "DSR-2026-1044",
      dataPrincipalId: generateDataPrincipalId("ananya.sharma@delhiuniv.ac.in"),
      requestType: "ERASURE",
      targetFiduciary: "National Skill Development Portal",
      details: { scope: "Complete Purge", reason: "Consent Revoked under Sec 12(3)" },
      status: "COMPLETED",
      slaDeadline: "2026-03-15T00:00:00Z",
      createdAt: "2026-02-15T11:00:00Z"
    },
    {
      id: "DSR-2026-2189",
      dataPrincipalId: generateDataPrincipalId("ananya.sharma@delhiuniv.ac.in"),
      requestType: "CORRECTION",
      targetFiduciary: "University Examination Wing",
      details: { field: "Spelling of Father's Name", correctedValue: "Rajesh Kumar Sharma" },
      status: "PROCESSING",
      slaDeadline: "2026-09-18T00:00:00Z",
      createdAt: "2026-08-18T09:30:00Z"
    }
  ],
  nominees: [
    {
      dataPrincipalId: generateDataPrincipalId("ananya.sharma@delhiuniv.ac.in"),
      name: "Rajesh Sharma",
      relationship: "Father / Parent",
      email: "rajesh.sharma@example.com",
      phone: "+91 98111 22334",
      status: "ACTIVE_VERIFIED",
      dateDesignated: "2025-08-20"
    }
  ]
};

class RelationalDatabase {
  constructor() {
    this.ensureDirectory();
    this.data = this.loadData();
  }

  ensureDirectory() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  loadData() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (e) {
        console.error('Error reading database file, re-initializing seed data:', e);
      }
    }
    this.saveData(SEED_DATA);
    return SEED_DATA;
  }

  saveData(dataToSave) {
    fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
  }

  // --- DATA PRINCIPAL RELATIONS ---
  getDataPrincipalById(id) {
    return this.data.dataPrincipals.find(dp => dp.id === id) || this.data.dataPrincipals[0];
  }

  getDataPrincipalByEmail(email) {
    return this.data.dataPrincipals.find(dp => dp.email.toLowerCase() === email.toLowerCase());
  }

  // --- CONSENT REQUEST RELATIONS ---
  getConsentRequestByToken(token) {
    const req = this.data.consentRequests.find(r => r.token === token);
    if (!req) return null;
    return this.hydrateConsentRequest(req);
  }

  getConsentRequestByNoticeId(noticeId) {
    const req = this.data.consentRequests.find(r => r.noticeId === noticeId);
    if (!req) return null;
    return this.hydrateConsentRequest(req);
  }

  getAllConsentRequests() {
    return this.data.consentRequests.map(r => this.hydrateConsentRequest(r));
  }

  hydrateConsentRequest(req) {
    const dp = this.getDataPrincipalById(req.dataPrincipalId);
    const snapshot = this.data.emailSnapshots.find(es => es.id === req.emailSnapshotId);
    return {
      ...req,
      dataPrincipal: dp,
      emailSnapshot: snapshot
    };
  }

  // --- CONSENT DECISION & SELECTION ---
  recordConsentDecision(requestId, decisionData) {
    const req = this.data.consentRequests.find(r => r.id === requestId || r.noticeId === requestId);
    if (!req) return null;

    const decisionId = `DEC-${Date.now()}`;
    const now = new Date().toISOString();

    const decisionRecord = {
      id: decisionId,
      requestId: req.id,
      dataPrincipalId: req.dataPrincipalId,
      decision: decisionData.decision,
      selectedAttributes: decisionData.selected_attributes || [],
      deniedAttributes: decisionData.denied_attributes || [],
      remark: decisionData.remark || '',
      decidedAt: now
    };
    this.data.consentDecisions.push(decisionRecord);

    // Update ConsentRequest status
    req.status = decisionData.decision;

    let consentRecord = null;
    if (decisionData.decision === 'GRANTED') {
      const consentId = decisionData.consent_id || `CNST-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const receiptPayload = {
        consentId,
        requestId: req.id,
        principalId: req.dataPrincipalId,
        fiduciary: req.fiduciaryName,
        noticeId: req.noticeId,
        grantedAt: now
      };
      const receiptHash = generateSHA256Signature(receiptPayload);

      consentRecord = {
        consentId,
        requestId: req.id,
        dataPrincipalId: req.dataPrincipalId,
        fiduciary: req.fiduciaryName,
        fiduciaryCategory: req.fiduciaryCategory,
        fiduciaryLogo: req.fiduciaryLogo,
        purpose: req.purpose,
        noticeId: req.noticeId,
        status: 'ACTIVE',
        grantedOn: now,
        expiresOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        grantedAttributes: decisionData.selected_attributes || [],
        deniedAttributes: decisionData.denied_attributes || [],
        dpoContact: req.dpoEmail,
        dataRegion: req.dataRegion,
        receiptHash,
        customNote: decisionData.remark
      };

      // Replace existing active consent for this notice if present
      this.data.consents = this.data.consents.filter(c => c.noticeId !== req.noticeId);
      this.data.consents.unshift(consentRecord);
    }

    // Record Audit Event
    const auditEntry = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      requestId: req.id,
      consentId: consentRecord ? consentRecord.consentId : 'N/A',
      dataPrincipalId: req.dataPrincipalId,
      action: decisionData.decision === 'GRANTED' ? 'CONSENT_GRANTED' : 'CONSENT_DENIED',
      fiduciary: req.fiduciaryName,
      noticeId: req.noticeId,
      details: decisionData.decision === 'GRANTED' 
        ? `Granted ${decisionData.selected_attributes?.length || 0} data attributes.` 
        : `Consent request declined. Reason: ${decisionData.remark || 'Declined'}`,
      ipAddress: '103.21.124.88',
      timestamp: now,
      status: decisionData.decision === 'GRANTED' ? 'SUCCESS' : 'DENIED'
    };
    this.data.auditEvents.unshift(auditEntry);

    this.saveData();

    return {
      decision: decisionRecord,
      consent: consentRecord,
      audit: auditEntry
    };
  }

  // --- CONSENT REVOCATION ---
  revokeConsent(consentId, revocationData) {
    const consent = this.data.consents.find(c => c.consentId === consentId);
    if (!consent) return null;

    const now = new Date().toISOString();
    consent.status = 'REVOKED';
    consent.revokedOn = now;
    consent.revocationReason = revocationData.reason || 'User exercised right to withdraw consent';

    // Update ConsentRequest status
    const req = this.data.consentRequests.find(r => r.id === consent.requestId || r.noticeId === consent.noticeId);
    if (req) {
      req.status = 'REVOKED';
    }

    const auditEntry = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      requestId: consent.requestId,
      consentId: consent.consentId,
      dataPrincipalId: consent.dataPrincipalId,
      action: 'CONSENT_REVOKED',
      fiduciary: consent.fiduciary,
      noticeId: consent.noticeId,
      details: `Consent revoked. Reason: ${revocationData.reason}`,
      ipAddress: '103.21.124.88',
      timestamp: now,
      status: 'REVOKED'
    };
    this.data.auditEvents.unshift(auditEntry);

    this.saveData();

    return { consent, audit: auditEntry };
  }

  // --- GET ACTIVE CONSENTS ---
  getActiveConsents(principalId) {
    if (principalId) {
      return this.data.consents.filter(c => c.dataPrincipalId === principalId);
    }
    return this.data.consents;
  }

  // --- GET AUDIT EVENTS ---
  getAuditEvents(principalId) {
    if (principalId) {
      return this.data.auditEvents.filter(a => a.dataPrincipalId === principalId);
    }
    return this.data.auditEvents;
  }

  // --- DSR RIGHTS ---
  createDataRightsRequest(dsrData) {
    const id = `DSR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const sla = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const record = {
      id,
      dataPrincipalId: dsrData.dataPrincipalId,
      requestType: dsrData.requestType,
      targetFiduciary: dsrData.targetFiduciary,
      details: dsrData.details,
      status: 'PROCESSING',
      slaDeadline: sla,
      createdAt: now.toISOString()
    };
    this.data.dataRightsRequests.unshift(record);

    this.data.auditEvents.unshift({
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      requestId: id,
      consentId: 'N/A',
      dataPrincipalId: dsrData.dataPrincipalId,
      action: `DSR_${dsrData.requestType}`,
      fiduciary: dsrData.targetFiduciary,
      noticeId: 'N/A',
      details: `Statutory ${dsrData.requestType} request initiated under DPDP Act.`,
      ipAddress: '103.21.124.88',
      timestamp: now.toISOString(),
      status: 'PROCESSING'
    });

    this.saveData();
    return record;
  }

  getDataRightsRequests(principalId) {
    if (principalId) {
      return this.data.dataRightsRequests.filter(r => r.dataPrincipalId === principalId);
    }
    return this.data.dataRightsRequests;
  }
}

export const db = new RelationalDatabase();
