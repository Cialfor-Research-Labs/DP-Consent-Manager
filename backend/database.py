import sqlite3
import json
import os
import random
from datetime import datetime, timedelta
import hashlib

DB_FILE = os.path.join(os.path.dirname(__file__), "consent_manager.db")

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def generate_sha256_signature(data_dict):
    json_str = json.dumps(data_dict, sort_keys=True)
    return f"sha256:{hashlib.sha256(json_str.encode('utf-8')).hexdigest()}"

def generate_unpredictable_token():
    return f"tok_{hashlib.sha256(os.urandom(32)).hexdigest()[:16]}"

def generate_data_principal_id(email):
    if not email:
        return 'DP-2026-00000'
    hash_val = 0
    for char in email:
        hash_val = ((hash_val << 5) - hash_val) + ord(char)
        hash_val &= 0xFFFFFFFF
    abs_hash = str(abs(hash_val)).zfill(5)[-5:]
    return f"DP-2026-{abs_hash}"

def init_db():
    conn = get_db()
    cursor = conn.cursor()

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

    # 3. ConsentRequest Table (with universal domain column)
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
        domain TEXT DEFAULT 'Corporate/Enterprise',
        legal_basis TEXT,
        validity_period TEXT,
        data_region TEXT,
        requested_attributes TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (data_principal_id) REFERENCES data_principals (id),
        FOREIGN KEY (email_snapshot_id) REFERENCES email_snapshots (id)
    );
    """)

    # Auto-add domain column if existing table lacks it
    try:
        cursor.execute("ALTER TABLE consent_requests ADD COLUMN domain TEXT DEFAULT 'Corporate/Enterprise';")
    except Exception:
        pass

    # 4. ConsentDecision Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS consent_decisions (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        data_principal_id TEXT NOT NULL,
        decision TEXT NOT NULL,
        selected_attributes TEXT NOT NULL,
        denied_attributes TEXT,
        remark TEXT,
        decided_at TEXT NOT NULL,
        FOREIGN KEY (request_id) REFERENCES consent_requests (id)
    );
    """)

    # 5. Consent Table (Active Granted Consents)
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
        status TEXT DEFAULT 'ACTIVE',
        granted_attributes TEXT NOT NULL,
        denied_attributes TEXT,
        dpo_contact TEXT,
        data_region TEXT,
        receipt_hash TEXT NOT NULL,
        custom_note TEXT,
        granted_on TEXT NOT NULL,
        expires_on TEXT NOT NULL,
        revoked_on TEXT,
        revocation_reason TEXT
    );
    """)

    # 6. AuditEvent Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        consent_id TEXT,
        data_principal_id TEXT NOT NULL,
        action TEXT NOT NULL,
        fiduciary TEXT NOT NULL,
        notice_id TEXT NOT NULL,
        details TEXT NOT NULL,
        ip_address TEXT DEFAULT '103.21.124.88',
        timestamp TEXT NOT NULL,
        status TEXT NOT NULL
    );
    """)

    # 7. DataRightsRequest Table (DSR Sec 11-14)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS data_rights_requests (
        id TEXT PRIMARY KEY,
        data_principal_id TEXT NOT NULL,
        request_type TEXT NOT NULL,
        target_fiduciary TEXT NOT NULL,
        details TEXT NOT NULL,
        status TEXT DEFAULT 'PROCESSING',
        sla_deadline TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    cursor.execute("SELECT COUNT(*) FROM consent_requests;")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_db(cursor)

    conn.commit()
    conn.close()

def seed_db(cursor):
    dp_rahul_id = generate_data_principal_id("rahul.verma@delhiuniv.ac.in")
    dp_sunita_id = generate_data_principal_id("sunita.rao@healthcare.org")
    dp_amit_id = generate_data_principal_id("amit.patel@fintech.io")
    dp_neha_id = generate_data_principal_id("neha.k@ecom.com")
    dp_vikrant_id = generate_data_principal_id("vikrant.m@globaltech.com")
    dp_ananya_id = generate_data_principal_id("ananya.sharma@delhiuniv.ac.in")
    dp_priya_id = generate_data_principal_id("priya.nair@delhiuniv.ac.in")

    cursor.executemany("""
    INSERT INTO data_principals (id, name, email, phone, roll_no, institution, kyc_status, registered_on)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        (dp_rahul_id, "Rahul Verma", "rahul.verma@delhiuniv.ac.in", "+91 98112 99887", "BANK-KYC-901", "ABC National Bank", "Verified", "2025-09-01"),
        (dp_sunita_id, "Dr. Sunita Rao", "sunita.rao@healthcare.org", "+91 98765 11223", "MED-8812", "Apollo Care Hospital", "Verified", "2025-09-10"),
        (dp_amit_id, "Amit Patel", "amit.patel@fintech.io", "+91 98989 77665", "FIN-4401", "PayFlex Lending", "Verified", "2025-10-05"),
        (dp_neha_id, "Neha Kapoor", "neha.k@ecom.com", "+91 98222 33445", "ECOM-5590", "ShopEase Retail", "Verified", "2025-11-12"),
        (dp_vikrant_id, "Vikrant Mehta", "vikrant.m@globaltech.com", "+91 98333 44556", "EMP-9081", "GlobalTech Solutions", "Verified", "2025-12-01"),
        (dp_ananya_id, "Ananya Sharma", "ananya.sharma@delhiuniv.ac.in", "+91 98765 43210", "2023-CS-1049", "Delhi Technological University", "Verified", "2025-08-15"),
        (dp_priya_id, "Priya Nair", "priya.nair@delhiuniv.ac.in", "+91 98123 45678", "2023-EC-3011", "Delhi Technological University", "Verified", "2025-08-20")
    ])

    cursor.executemany("""
    INSERT INTO email_snapshots (id, from_address, to_address, subject, sent_date, body_text, attachment_name, attachment_size, dkim_status, spf_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        ("ES-2026-BANK-001", "ABC National Bank <kyc-compliance@abcbank.com>", "Rahul Verma <rahul.verma@delhiuniv.ac.in>", "Action Required: Digital Consent for Savings Account Opening & KYC Verification", "Monday, September 01, 2026", "Dear Rahul Verma,\n\nAs part of RBI Mandatory KYC Guidelines and DPDP Act 2023 compliance, ABC National Bank requests your explicit digital consent to verify your Government Identity Proof, PAN Card, and Address details for your new Savings Account Opening.\n\nPlease click the button below to review the Privacy Notice and configure your granular consent choices.", "Statutory_Privacy_Notice_NTC-2026-BANK-901.pdf", "1.5 MB", "DKIM Signed", "SPF Pass"),
        ("ES-2026-HEALTH-002", "Apollo Care Hospital <privacy@apollohealth.org>", "Dr. Sunita Rao <sunita.rao@healthcare.org>", "Healthcare Privacy Notice: Consent for Diagnostic Records & Health Insurance Processing", "Sunday, August 30, 2026", "Dear Dr. Sunita Rao,\n\nApollo Care Hospital requires your consent to share diagnostic test reports and medical history with your empaneled Health Insurance Provider for cashless claim processing.\n\nYou have granular control to authorize specific medical attributes.", "Statutory_Privacy_Notice_NTC-2026-HEALTH-881.pdf", "1.3 MB", "DKIM Signed", "SPF Pass"),
        ("ES-2026-FINTECH-003", "PayFlex Lending <loans@payflex.io>", "Amit Patel <amit.patel@fintech.io>", "FinTech Notice: Consent for Credit Score & Bank Statement Analysis", "Friday, August 28, 2026", "Dear Amit Patel,\n\nTo evaluate your instant credit line application, PayFlex Lending requests consent to fetch your CIBIL Credit Score and verify recent 6-month bank statements.", "Statutory_Privacy_Notice_NTC-2026-FINTECH-440.pdf", "1.1 MB", "DKIM Signed", "SPF Pass"),
        ("ES-2026-ECOM-004", "ShopEase Retail <support@shopease.com>", "Neha Kapoor <neha.k@ecom.com>", "E-Commerce Notice: Consent for Order Delivery & Saved Payment Method Processing", "Wednesday, August 26, 2026", "Dear Neha Kapoor,\n\nShopEase Retail requests your consent to store shipping address details and tokenized payment card information for fast checkout and delivery updates.", "Statutory_Privacy_Notice_NTC-2026-ECOM-559.pdf", "1.0 MB", "DKIM Signed", "SPF Pass"),
        ("ES-2026-CORP-005", "GlobalTech Solutions HR <hr-bgv@globaltech.com>", "Vikrant Mehta <vikrant.m@globaltech.com>", "Corporate HR Notice: Background Verification & Employment Record Clearance", "Monday, August 24, 2026", "Dear Vikrant Mehta,\n\nAs part of your employment onboarding, GlobalTech HR requests consent to process your background verification, degree certificates, and prior employment reference checks.", "Statutory_Privacy_Notice_NTC-2026-CORP-908.pdf", "1.4 MB", "DKIM Signed", "SPF Pass"),
        ("ES-2026-RECRUIT-006", "TalentSearch HR <placements@talentsearch.com>", "Ananya Sharma <ananya.sharma@delhiuniv.ac.in>", "Recruitment Notice: Candidate Profile Shortlisting & Resume Sharing", "Saturday, August 22, 2026", "Dear Ananya Sharma,\n\nTalentSearch HR requests your consent to evaluate your PDF resume and marksheet credentials for shortlisting by visiting corporate recruiters.", "Statutory_Privacy_Notice_NTC-2026-RECRUIT-104.pdf", "1.2 MB", "DKIM Signed", "SPF Pass"),
        ("ES-2026-EDU-007", "Higher Education Scholarship Board <nodal-scholarship@gov.in>", "Priya Nair <priya.nair@delhiuniv.ac.in>", "Scholarship Notice: Verification of Income Certificate & Bank Account Details", "Thursday, August 20, 2026", "Dear Priya Nair,\n\nYour National Merit Scholarship application passed initial screening. Please provide digital consent to verify family income certificates and bank details for direct benefit transfer.", "Statutory_Privacy_Notice_NTC-2026-EDU-301.pdf", "1.3 MB", "DKIM Signed", "SPF Pass")
    ])

    attrs_bank = json.dumps([
        {"id": "attr_name", "name": "Full Legal Name", "category": "IDENTITY", "required": True, "description": "Legal name matching Aadhaar & PAN card", "sensitive": False},
        {"id": "attr_govt_id", "name": "Government Photo ID (Aadhaar / Passport)", "category": "IDENTITY", "required": True, "description": "Official government identity proof for RBI KYC", "sensitive": True},
        {"id": "attr_pan", "name": "Permanent Account Number (PAN Card)", "category": "FINANCIAL", "required": True, "description": "Tax ID for banking transactions and Form 60 verification", "sensitive": True},
        {"id": "attr_address", "name": "Residential Address Proof", "category": "CONTACT", "required": True, "description": "Utility bill or Aadhaar address for communication", "sensitive": False},
        {"id": "attr_income", "name": "Annual Income & Occupation Declaration", "category": "FINANCIAL", "required": False, "description": "Optional income declaration for premium debit card limits", "sensitive": True, "defaultGranted": True}
    ])

    attrs_health = json.dumps([
        {"id": "attr_name", "name": "Patient Full Name & DOB", "category": "IDENTITY", "required": True, "description": "Patient identity matching hospital registration", "sensitive": False},
        {"id": "attr_medical", "name": "Medical Diagnostic Reports & Lab History", "category": "HEALTH", "required": True, "description": "Diagnostic reports required for health insurance claim processing", "sensitive": True},
        {"id": "attr_insurance", "name": "Health Insurance Policy Number", "category": "HEALTH", "required": True, "description": "TPA insurance card number for cashless hospital approval", "sensitive": True},
        {"id": "attr_contact", "name": "Emergency Contact & Next of Kin", "category": "CONTACT", "required": False, "description": "Phone number of emergency contact person", "sensitive": False, "defaultGranted": True}
    ])

    attrs_fintech = json.dumps([
        {"id": "attr_name", "name": "Borrower Full Name", "category": "IDENTITY", "required": True, "description": "Name matching credit bureau records", "sensitive": False},
        {"id": "attr_cibil", "name": "CIBIL / Experian Credit Score Report", "category": "FINANCIAL", "required": True, "description": "Credit bureau score for instant loan approval", "sensitive": True},
        {"id": "attr_bank_stmt", "name": "6-Month Bank Account Statement", "category": "FINANCIAL", "required": True, "description": "Bank statement PDF for income verification", "sensitive": True},
        {"id": "attr_device", "name": "Device & Location Fingerprint", "category": "DIGITAL", "required": False, "description": "Anti-fraud device location check for instant disbursement", "sensitive": True, "defaultGranted": True}
    ])

    attrs_ecom = json.dumps([
        {"id": "attr_name", "name": "Customer Full Name", "category": "IDENTITY", "required": True, "description": "Name for order invoice and package delivery", "sensitive": False},
        {"id": "attr_address", "name": "Shipping & Delivery Address", "category": "CONTACT", "required": True, "description": "Physical delivery location for courier partners", "sensitive": False},
        {"id": "attr_phone", "name": "Mobile Phone Number", "category": "CONTACT", "required": True, "description": "SMS delivery updates and courier OTP verification", "sensitive": False},
        {"id": "attr_card", "name": "Tokenized Payment Card Details", "category": "FINANCIAL", "required": False, "description": "RBI compliant tokenized card data for 1-click checkout", "sensitive": True, "defaultGranted": False}
    ])

    attrs_corp = json.dumps([
        {"id": "attr_name", "name": "Employee Full Name", "category": "IDENTITY", "required": True, "description": "Official employee onboarding name", "sensitive": False},
        {"id": "attr_bgv", "name": "Background Verification & Criminal Check", "category": "LEGAL/VERIFICATION", "required": True, "description": "Third-party agency background check report", "sensitive": True},
        {"id": "attr_degree", "name": "Degree Certificates & Marksheets", "category": "PROFESSIONAL", "required": True, "description": "Educational degree verification from university registrar", "sensitive": True},
        {"id": "attr_prior_emp", "name": "Prior Employment Experience Letter", "category": "PROFESSIONAL", "required": False, "description": "Relieving letter and HR reference check", "sensitive": False, "defaultGranted": True}
    ])

    attrs_recruit = json.dumps([
        {"id": "attr_name", "name": "Candidate Full Name & Roll No", "category": "IDENTITY", "required": True, "description": "Official candidate registration name", "sensitive": False},
        {"id": "attr_email", "name": "Contact Email Address", "category": "CONTACT", "required": True, "description": "Email address for interview call letters", "sensitive": False},
        {"id": "attr_resume", "name": "Resume / CV Document", "category": "PROFESSIONAL", "required": False, "description": "PDF Resume to be shared with visiting recruitment teams", "sensitive": False, "defaultGranted": True},
        {"id": "attr_marksheet", "name": "Academic Transcript & Marksheets", "category": "PROFESSIONAL", "required": False, "description": "Semester marksheets for eligibility criteria check", "sensitive": True, "defaultGranted": True}
    ])

    attrs_edu = json.dumps([
        {"id": "attr_name", "name": "Full Legal Name", "category": "IDENTITY", "required": True, "description": "Name matching bank account and Aadhaar", "sensitive": False},
        {"id": "attr_income", "name": "Annual Family Income Certificate", "category": "FINANCIAL", "required": True, "description": "Tehsildar issued income proof document", "sensitive": True},
        {"id": "attr_bank", "name": "Bank Account & IFSC Code", "category": "FINANCIAL", "required": True, "description": "Bank details for direct credit of scholarship amount", "sensitive": True}
    ])

    cursor.executemany("""
    INSERT INTO consent_requests (id, token, notice_id, data_principal_id, email_snapshot_id, fiduciary_name, fiduciary_category, fiduciary_logo, fiduciary_email, dpo_name, dpo_email, purpose, domain, legal_basis, validity_period, data_region, requested_attributes, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        ("REQ-2026-BANK-901", "tok_bank_kyc", "NTC-2026-BANK-901", dp_rahul_id, "ES-2026-BANK-001", "ABC National Bank", "Banking & Financial Institution", "🏦", "kyc-compliance@abcbank.com", "Rajesh Kumar (DPO)", "dpo@abcbank.com", "Account Opening & Digital KYC Verification under RBI Guidelines", "Banking", "RBI KYC Master Direction & DPDP Act Section 6", "24 Months", "India (NIC Cloud Vault)", attrs_bank, "PENDING", "2026-09-01T09:00:00Z", "2026-10-01T09:00:00Z"),
        ("REQ-2026-HEALTH-881", "tok_health_records", "NTC-2026-HEALTH-881", dp_sunita_id, "ES-2026-HEALTH-002", "Apollo Care Hospital", "Healthcare Provider", "🏥", "privacy@apollohealth.org", "Dr. A. V. Reddy", "dpo@apollohealth.org", "Diagnostic Test Report Sharing & Cashless Health Insurance Claim Settlement", "Healthcare", "National Health Authority Protocol & DPDP Sec 6", "12 Months", "India (Encrypted Health Data Vault)", attrs_health, "PENDING", "2026-08-30T11:00:00Z", "2026-09-30T11:00:00Z"),
        ("REQ-2026-FINTECH-440", "tok_fintech_credit", "NTC-2026-FINTECH-440", dp_amit_id, "ES-2026-FINTECH-003", "PayFlex Lending", "FinTech / NBFC", "💳", "loans@payflex.io", "Sanjay Sharma", "dpo@payflex.io", "Credit Score Assessment & Bank Statement Verification for Instant Credit Line", "FinTech", "RBI Digital Lending Guidelines & DPDP Sec 6", "6 Months", "India (MeitY Cloud)", attrs_fintech, "PENDING", "2026-08-28T14:00:00Z", "2026-09-28T14:00:00Z"),
        ("REQ-2026-ECOM-559", "tok_ecom_delivery", "NTC-2026-ECOM-559", dp_neha_id, "ES-2026-ECOM-004", "ShopEase Retail", "E-Commerce Platform", "🛒", "support@shopease.com", "Meera Joshi", "dpo@shopease.com", "Order Fulfillment, Address Verification & Tokenized Express Checkout", "E-Commerce", "Consumer Protection Rules & DPDP Sec 6", "12 Months", "India", attrs_ecom, "PENDING", "2026-08-26T16:00:00Z", "2026-09-26T16:00:00Z"),
        ("REQ-2026-CORP-908", "tok_corp_bgv", "NTC-2026-CORP-908", dp_vikrant_id, "ES-2026-CORP-005", "GlobalTech Solutions", "Corporate Enterprise", "🏢", "hr-bgv@globaltech.com", "Karan Malhotra", "dpo@globaltech.com", "Employee Background Verification & Degree Credentials Clearance", "Corporate HR", "Employment Contract & DPDP Sec 6", "36 Months", "India (Enterprise Secure Vault)", attrs_corp, "PENDING", "2026-08-24T10:00:00Z", "2026-09-24T10:00:00Z"),
        ("REQ-2026-RECRUIT-104", "tok_recruitment_drive", "NTC-2026-RECRUIT-104", dp_ananya_id, "ES-2026-RECRUIT-006", "TalentSearch HR", "Recruitment Agency", "💼", "placements@talentsearch.com", "Dr. R. K. Verma", "dpo@talentsearch.com", "Candidate Profile Evaluation & Resume Shortlisting for Corporate Hirers", "Recruitment", "DPDP Act 2023 (Section 6)", "12 Months", "India", attrs_recruit, "PENDING", "2026-08-22T12:00:00Z", "2026-09-22T12:00:00Z"),
        ("REQ-2026-EDU-301", "tok_edu_merit", "NTC-2026-EDU-301", dp_priya_id, "ES-2026-EDU-007", "Higher Education Scholarship Board", "Government Body", "🏛️", "nodal-scholarship@gov.in", "Smt. S. Mukherjee", "grievance-hesb@gov.in", "Verification of Income Certificate & Bank Account Details for Merit Assistance", "Education", "DPDP Act 2023 & Direct Benefit Transfer", "6 Months", "India (NIC Cloud)", attrs_edu, "PENDING", "2026-08-20T08:00:00Z", "2026-09-20T08:00:00Z")
    ])

    # Initial Active Consents for Demonstration
    c1_id = "CNST-2026-8819A"
    cursor.execute("""
    INSERT INTO consents (consent_id, request_id, data_principal_id, fiduciary_name, fiduciary_category, fiduciary_logo, purpose, notice_id, status, granted_attributes, denied_attributes, dpo_contact, data_region, receipt_hash, granted_on, expires_on)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (c1_id, "REQ-2026-BANK-901", dp_rahul_id, "ABC National Bank", "Banking & Financial Institution", "🏦", "Account Opening & Digital KYC Verification under RBI Guidelines", "NTC-2026-BANK-901", "ACTIVE", json.dumps(["Full Legal Name", "Government Photo ID", "PAN Card", "Address Proof"]), json.dumps(["Income Declaration"]), "dpo@abcbank.com", "India (NIC Cloud Vault)", generate_sha256_signature({"consentId": c1_id, "dp": dp_rahul_id}), "2026-09-01T09:00:00Z", "2028-09-01T09:00:00Z"))

    cursor.execute("""
    INSERT INTO audit_events (id, request_id, consent_id, data_principal_id, action, fiduciary, notice_id, details, ip_address, timestamp, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, ("AUD-2026-001", "REQ-2026-BANK-901", c1_id, dp_rahul_id, "CONSENT_GRANTED", "ABC National Bank", "NTC-2026-BANK-901", "Granted 4 attributes for Banking KYC Verification.", "103.21.124.88", "2026-09-01T09:00:00Z", "SUCCESS"))
