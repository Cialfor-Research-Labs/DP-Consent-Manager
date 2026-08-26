import sqlite3
import json
import hashlib
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "consent_manager.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def generate_data_principal_id(email: str) -> str:
    if not email:
        return "DP-2026-00000"
    hash_val = 0
    for char in email:
        hash_val = ((hash_val << 5) - hash_val) + ord(char)
        hash_val &= 0xFFFFFFFF
    abs_hash = str(abs(hash_val)).zfill(5)[-5:]
    return f"DP-2026-{abs_hash}"

def generate_sha256_signature(payload) -> str:
    json_str = payload if isinstance(payload, str) else json.dumps(payload, sort_keys=True)
    digest = hashlib.sha256(json_str.encode("utf-8")).hexdigest()[:32]
    return f"0x{digest}"

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Foreign key support
    cursor.execute("PRAGMA foreign_keys = ON;")

    # 1. DataPrincipal Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS data_principals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        roll_no TEXT,
        institution TEXT,
        kyc_status TEXT DEFAULT 'Verified',
        registered_on TEXT
    );
    """)

    # 2. EmailSnapshot Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS email_snapshots (
        id TEXT PRIMARY KEY,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        subject TEXT NOT NULL,
        sent_date TEXT NOT NULL,
        body_text TEXT NOT NULL,
        attachment_name TEXT,
        attachment_size TEXT,
        dkim_status TEXT DEFAULT 'DKIM Signed',
        spf_status TEXT DEFAULT 'SPF Pass'
    );
    """)

    # 3. ConsentRequest Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS consent_requests (
        id TEXT PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        notice_id TEXT NOT NULL,
        data_principal_id TEXT NOT NULL,
        email_snapshot_id TEXT NOT NULL,
        fiduciary_name TEXT NOT NULL,
        fiduciary_category TEXT,
        fiduciary_logo TEXT,
        fiduciary_email TEXT NOT NULL,
        dpo_name TEXT,
        dpo_email TEXT,
        purpose TEXT NOT NULL,
        legal_basis TEXT,
        validity_period TEXT,
        data_region TEXT,
        requested_attributes TEXT NOT NULL, -- JSON String
        status TEXT DEFAULT 'PENDING',
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (data_principal_id) REFERENCES data_principals(id),
        FOREIGN KEY (email_snapshot_id) REFERENCES email_snapshots(id)
    );
    """)

    # Index on token for fast URL token resolution
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_consent_requests_token ON consent_requests(token);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_consent_requests_notice ON consent_requests(notice_id);")

    # 4. ConsentDecision Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS consent_decisions (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        data_principal_id TEXT NOT NULL,
        decision TEXT NOT NULL, -- GRANTED or DENIED
        selected_attributes TEXT, -- JSON String
        denied_attributes TEXT, -- JSON String
        remark TEXT,
        decided_at TEXT NOT NULL,
        FOREIGN KEY (request_id) REFERENCES consent_requests(id),
        FOREIGN KEY (data_principal_id) REFERENCES data_principals(id)
    );
    """)

    # 5. Consent Table (Active Consents)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS consents (
        consent_id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        data_principal_id TEXT NOT NULL,
        fiduciary_name TEXT NOT NULL,
        fiduciary_category TEXT,
        fiduciary_logo TEXT,
        purpose TEXT NOT NULL,
        notice_id TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE', -- ACTIVE or REVOKED
        granted_attributes TEXT NOT NULL, -- JSON String
        denied_attributes TEXT NOT NULL, -- JSON String
        dpo_contact TEXT,
        data_region TEXT,
        receipt_hash TEXT NOT NULL,
        custom_note TEXT,
        granted_on TEXT NOT NULL,
        expires_on TEXT NOT NULL,
        revoked_on TEXT,
        revocation_reason TEXT,
        FOREIGN KEY (request_id) REFERENCES consent_requests(id),
        FOREIGN KEY (data_principal_id) REFERENCES data_principals(id)
    );
    """)

    # 6. AuditEvent Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        request_id TEXT,
        consent_id TEXT,
        data_principal_id TEXT NOT NULL,
        action TEXT NOT NULL,
        fiduciary TEXT NOT NULL,
        notice_id TEXT,
        details TEXT NOT NULL,
        ip_address TEXT DEFAULT '103.21.124.88',
        timestamp TEXT NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (data_principal_id) REFERENCES data_principals(id)
    );
    """)

    # 7. DataRightsRequest Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS data_rights_requests (
        id TEXT PRIMARY KEY,
        data_principal_id TEXT NOT NULL,
        request_type TEXT NOT NULL, -- ERASURE, CORRECTION, NOMINATION
        target_fiduciary TEXT NOT NULL,
        details TEXT NOT NULL, -- JSON String
        status TEXT DEFAULT 'PROCESSING',
        sla_deadline TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (data_principal_id) REFERENCES data_principals(id)
    );
    """)

    # Seed data if database is empty
    cursor.execute("SELECT COUNT(*) FROM data_principals;")
    if cursor.fetchone()[0] == 0:
        seed_db(cursor)

    conn.commit()
    conn.close()

def seed_db(cursor):
    dp1_id = generate_data_principal_id("ananya.sharma@delhiuniv.ac.in")
    dp2_id = generate_data_principal_id("priya.nair@delhiuniv.ac.in")
    dp3_id = generate_data_principal_id("rahul.verma@delhiuniv.ac.in")

    cursor.executemany("""
    INSERT INTO data_principals (id, name, email, phone, roll_no, institution, kyc_status, registered_on)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        (dp1_id, "Ananya Sharma", "ananya.sharma@delhiuniv.ac.in", "+91 98765 43210", "2023-CS-1049", "Delhi Technological University", "Verified", "2025-08-15"),
        (dp2_id, "Priya Nair", "priya.nair@delhiuniv.ac.in", "+91 98123 45678", "2023-EC-3011", "Delhi Technological University", "Verified", "2025-08-20"),
        (dp3_id, "Rahul Verma", "rahul.verma@delhiuniv.ac.in", "+91 98112 99887", "2023-EE-2014", "Delhi Technological University", "Verified", "2025-09-01")
    ])

    cursor.executemany("""
    INSERT INTO email_snapshots (id, from_address, to_address, subject, sent_date, body_text, attachment_name, attachment_size, dkim_status, spf_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        ("ES-2026-CTPC-001", "Central Training & Placement Cell (CTPC) <placements@dtu.ac.in>", "Ananya Sharma <ananya.sharma@delhiuniv.ac.in>", "ACTION REQUIRED: Grant Data Consent for Campus Placement Drive 2026", "Monday, August 24, 2026", "Dear Ananya Sharma,\n\nThe Central Training & Placement Cell (CTPC) requires your explicit consent to process your academic records and resume for the upcoming Campus Recruitment Drive 2026.\n\nUnder the Digital Personal Data Protection (DPDP) Act, you have full granular control to select which data points you wish to share with partner recruiters.\n\nPlease click the button below to review the Privacy Notice and configure your consent choices on the official Data Principal Consent Portal.", "Statutory_Privacy_Notice_NTC-2026-CTPC-881.pdf", "1.4 MB", "DKIM Signed", "SPF Pass"),
        ("ES-2026-HESB-002", "Higher Education Scholarship Board (HESB) <nodal-scholarship@gov.in>", "Priya Nair <priya.nair@delhiuniv.ac.in>", "Consent Notice: Verification of Records for National Merit Scholarship 2026", "Friday, August 21, 2026", "Dear Priya Nair,\n\nYour application for the National Merit Scholarship 2026 has passed initial screening.\n\nTo proceed with bank disbursement, the Higher Education Scholarship Board requires your digital consent to verify your financial and academic documents. You can grant or restrict access to specific attributes.", "Statutory_Privacy_Notice_NTC-2026-HESB-409.pdf", "1.2 MB", "DKIM Signed", "SPF Pass"),
        ("ES-2026-HEALTH-003", "DTU Campus Wellness Center <health-wellness@dtu.ac.in>", "Rahul Verma <rahul.verma@delhiuniv.ac.in>", "Health Center Notice: Annual Student Wellness & Emergency Contact Consent", "Wednesday, August 19, 2026", "Dear Rahul Verma,\n\nThe Campus Wellness Center is updating emergency response records. Please review the consent notice to allow access to your blood group and emergency contact info.", "Statutory_Privacy_Notice_NTC-2026-HEALTH-112.pdf", "1.1 MB", "DKIM Signed", "SPF Pass")
    ])

    attrs_ctpc = json.dumps([
        {"id": "attr_name", "name": "Full Name & Roll No", "category": "Identity", "required": True, "description": "Official student name and enrollment number", "sensitive": False},
        {"id": "attr_email", "name": "Institutional Email", "category": "Contact", "required": True, "description": "Official college email address for interview call letters", "sensitive": False},
        {"id": "attr_phone", "name": "Mobile Phone Number", "category": "Contact", "required": True, "description": "Direct phone number for urgent recruiter coordination", "sensitive": False},
        {"id": "attr_cgpa", "name": "Cumulative Grade (CGPA & Marksheets)", "category": "Academic", "required": False, "description": "Semester 1-6 marksheets for eligibility criteria verification", "sensitive": True, "defaultGranted": True},
        {"id": "attr_resume", "name": "Resume & Portfolio Document", "category": "Professional", "required": False, "description": "PDF Resume to be shared with visiting recruitment teams", "sensitive": False, "defaultGranted": True},
        {"id": "attr_backlogs", "name": "Active Backlog / Arrears Status", "category": "Academic", "required": False, "description": "Declaration of pending academic backlog courses", "sensitive": True, "defaultGranted": False},
        {"id": "attr_govt_id", "name": "Aadhaar / Government Photo ID Proof", "category": "KYC Identity", "required": False, "description": "Identity verification for company entry pass & background check", "sensitive": True, "defaultGranted": False}
    ])

    attrs_hesb = json.dumps([
        {"id": "attr_name", "name": "Full Legal Name", "category": "Identity", "required": True, "description": "Name matching bank account and Aadhaar", "sensitive": False},
        {"id": "attr_income", "name": "Annual Family Income Certificate", "category": "Financial", "required": True, "description": "Tehsildar issued income proof document", "sensitive": True},
        {"id": "attr_bank", "name": "Bank Account & IFSC Code", "category": "Financial", "required": True, "description": "Bank details for direct credit of scholarship amount", "sensitive": True},
        {"id": "attr_caste", "name": "Category / Disability Certificate (If applicable)", "category": "Demographic", "required": False, "description": "Reservation benefits eligibility verification", "sensitive": True, "defaultGranted": False},
        {"id": "attr_attendance", "name": "Semester Attendance Record", "category": "Academic", "required": False, "description": "Minimum 75% attendance proof from HOD", "sensitive": False, "defaultGranted": True}
    ])

    attrs_health = json.dumps([
        {"id": "attr_blood", "name": "Blood Group & Allergies", "category": "Medical", "required": True, "description": "Vital medical information for emergency responder team", "sensitive": True},
        {"id": "attr_emergency_contact", "name": "Parent / Guardian Emergency Contact", "category": "Contact", "required": True, "description": "Phone number of parent/guardian for medical emergencies", "sensitive": False},
        {"id": "attr_vaccine", "name": "Vaccination Records (COVID/Hepatitis)", "category": "Medical", "required": False, "description": "Immunization history for hostel clearance", "sensitive": True, "defaultGranted": True},
        {"id": "attr_chronic", "name": "Pre-existing Medical Condition Declaration", "category": "Medical", "required": False, "description": "Optional health notes for campus clinic doctors", "sensitive": True, "defaultGranted": False}
    ])

    cursor.executemany("""
    INSERT INTO consent_requests (id, token, notice_id, data_principal_id, email_snapshot_id, fiduciary_name, fiduciary_category, fiduciary_logo, fiduciary_email, dpo_name, dpo_email, purpose, legal_basis, validity_period, data_region, requested_attributes, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        ("REQ-2026-CTPC-881", "tok_placement_2026_x89a", "NTC-2026-CTPC-881", dp1_id, "ES-2026-CTPC-001", "Central Training & Placement Cell (CTPC)", "Educational Institution", "🎓", "placements@dtu.ac.in", "Dr. R. K. Verma (DPO)", "dpo@dtu.ac.in", "Processing student profile, academic scores, resume, and contact credentials for shortlisting by empanelled corporate recruiters for On-Campus Placement 2026.", "Consent under DPDP Act 2023 (Section 6)", "12 Months (Till Graduation)", "India (MeitY Empanelled Cloud)", attrs_ctpc, "PENDING", "2026-08-24T09:00:00Z", "2026-09-24T09:00:00Z"),
        ("REQ-2026-HESB-409", "tok_scholarship_2026_m409", "NTC-2026-HESB-409", dp2_id, "ES-2026-HESB-002", "Higher Education Scholarship Board (HESB)", "Government Body", "🏛️", "nodal-scholarship@gov.in", "Smt. S. Mukherjee", "grievance-hesb@gov.in", "Verification of annual family income, bank account details, and marksheets for disbursement of Merit-cum-Means Financial Assistance.", "DPDP Act 2023 & Direct Benefit Transfer Guidelines", "6 Months", "India (NIC Cloud)", attrs_hesb, "PENDING", "2026-08-21T11:30:00Z", "2026-09-21T11:30:00Z"),
        ("REQ-2026-HEALTH-112", "tok_health_2026_h112", "NTC-2026-HEALTH-112", dp3_id, "ES-2026-HEALTH-003", "DTU Campus Wellness Center", "Healthcare Provider", "🏥", "health-wellness@dtu.ac.in", "Dr. A. K. Sundaram", "dpo-health@dtu.ac.in", "Maintenance of emergency health contacts, blood group record, and vaccination history for campus medical emergencies and sports clearance.", "DPDP Health Protocol & University Safety By-laws", "24 Months", "India (Encrypted Health Data Vault)", attrs_health, "PENDING", "2026-08-19T14:15:00Z", "2026-09-19T14:15:00Z"),
        ("REQ-2025-LIB-092", "tok_lib_2025_092", "NTC-2025-LIB-092", dp1_id, "ES-2026-CTPC-001", "Central Library & Digital E-Resource Portal", "Library Services", "📚", "library-dpo@dtu.ac.in", "DPO Library", "library-dpo@dtu.ac.in", "Issue of digital library pass and access to IEEE / ACM online research journals.", "DPDP Act 2023", "12 Months", "India", "[]", "GRANTED", "2025-09-10T10:30:00Z", "2026-09-10T10:30:00Z"),
        ("REQ-2025-SIIC-311", "tok_siic_2025_311", "NTC-2025-SIIC-311", dp1_id, "ES-2026-CTPC-001", "Student Innovation & Incubation Cell (SIIC)", "Research & Startup", "🚀", "incubation-dpo@dtu.ac.in", "DPO SIIC", "incubation-dpo@dtu.ac.in", "Grant eligibility evaluation for university startup seed fund.", "DPDP Act 2023", "12 Months", "India", "[]", "GRANTED", "2025-11-20T14:15:00Z", "2026-11-20T14:15:00Z")
    ])

    # Seed Initial Consents & Audit Events
    c1_id = "CNST-2026-8819A"
    c2_id = "CNST-2026-4402B"

    cursor.executemany("""
    INSERT INTO consents (consent_id, request_id, data_principal_id, fiduciary_name, fiduciary_category, fiduciary_logo, purpose, notice_id, status, granted_attributes, denied_attributes, dpo_contact, data_region, receipt_hash, granted_on, expires_on)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        (c1_id, "REQ-2025-LIB-092", dp1_id, "Central Library & Digital E-Resource Portal", "Library Services", "📚", "Issue of digital library pass and access to IEEE / ACM online research journals.", "NTC-2025-LIB-092", "ACTIVE", json.dumps(["Full Name", "Roll Number", "Institutional Email"]), json.dumps(["Mobile Number", "Address"]), "library-dpo@dtu.ac.in", "India", generate_sha256_signature({"consentId": c1_id, "dp": dp1_id}), "2025-09-10T10:30:00Z", "2026-09-10T10:30:00Z"),
        (c2_id, "REQ-2025-SIIC-311", dp1_id, "Student Innovation & Incubation Cell (SIIC)", "Research & Startup", "🚀", "Grant eligibility evaluation for university startup seed fund.", "NTC-2025-SIIC-311", "ACTIVE", json.dumps(["Full Name", "Institutional Email", "Project Proposal Pitch", "CGPA"]), json.dumps(["Government Photo ID"]), "incubation-dpo@dtu.ac.in", "India", generate_sha256_signature({"consentId": c2_id, "dp": dp1_id}), "2025-11-20T14:15:00Z", "2026-11-20T14:15:00Z")
    ])

    cursor.executemany("""
    INSERT INTO audit_events (id, request_id, consent_id, data_principal_id, action, fiduciary, notice_id, details, ip_address, timestamp, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        ("AUD-901", "REQ-2025-LIB-092", c1_id, dp1_id, "CONSENT_GRANTED", "Central Library & Digital E-Resource Portal", "NTC-2025-LIB-092", "Granted 3 attributes for digital library pass access.", "103.21.124.88", "2025-09-10T10:30:00Z", "SUCCESS"),
        ("AUD-902", "REQ-2025-SIIC-311", c2_id, dp1_id, "CONSENT_GRANTED", "Student Innovation & Incubation Cell (SIIC)", "NTC-2025-SIIC-311", "Granted 4 attributes for incubation seed fund evaluation.", "103.21.124.88", "2025-11-20T14:15:00Z", "SUCCESS")
    ])

    cursor.executemany("""
    INSERT INTO data_rights_requests (id, data_principal_id, request_type, target_fiduciary, details, status, sla_deadline, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        ("DSR-2026-1044", dp1_id, "ERASURE", "National Skill Development Portal", json.dumps({"scope": "Complete Purge", "reason": "Consent Revoked under Sec 12(3)"}), "COMPLETED", "2026-03-15T00:00:00Z", "2026-02-15T11:00:00Z"),
        ("DSR-2026-2189", dp1_id, "CORRECTION", "University Examination Wing", json.dumps({"field": "Spelling of Father's Name", "correctedValue": "Rajesh Kumar Sharma"}), "PROCESSING", "2026-09-18T00:00:00Z", "2026-08-18T09:30:00Z")
    ])
