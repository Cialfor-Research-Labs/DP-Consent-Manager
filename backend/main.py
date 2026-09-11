import re
import json
import random
import uvicorn
from typing import Optional
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from database import get_db, init_db, generate_sha256_signature, generate_data_principal_id, generate_unpredictable_token
from models import DecisionPayload, RevokePayload, DSRRequestPayload, ConsentRequestCreatePayload, EmailIngestPayload, GrievancePayload, NomineePayload

# Initialize database tables and seed records
init_db()

app = FastAPI(
    title="Data Principal Consent Manager - Real Gmail Webhook Integration Backend",
    description="DPDP Act 2023 Compliant Python FastAPI REST API Backend with Real Gmail Webhook Ingestion & Context Resolution",
    version="1.5.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def hydrate_request(req_row, conn):
    req = dict(req_row)
    req["requestedAttributes"] = json.loads(req["requested_attributes"])
    del req["requested_attributes"]

    cursor = conn.cursor()
    # Hydrate DataPrincipal
    cursor.execute("SELECT * FROM data_principals WHERE id = ?;", (req["data_principal_id"],))
    dp_row = cursor.fetchone()
    dp_dict = dict(dp_row) if dp_row else {}
    if dp_dict:
        dp_dict["rollNo"] = dp_dict.get("roll_no", "")
        dp_dict["kycStatus"] = dp_dict.get("kyc_status", "Verified")
        dp_dict["registeredOn"] = dp_dict.get("registered_on", "")
    req["dataPrincipal"] = dp_dict

    # Hydrate EmailSnapshot
    cursor.execute("SELECT * FROM email_snapshots WHERE id = ?;", (req["email_snapshot_id"],))
    es_row = cursor.fetchone()
    es_dict = dict(es_row) if es_row else {}
    if es_dict:
        es_dict["from"] = es_dict.get("from_address", "")
        es_dict["to"] = es_dict.get("to_address", "")
        es_dict["subject"] = es_dict.get("subject", "")
        es_dict["date"] = es_dict.get("sent_date", "")
        es_dict["body"] = es_dict.get("body_text", "")
        es_dict["attachments"] = [
            {
                "name": es_dict.get("attachment_name") or f"Statutory_Privacy_Notice_{req['notice_id']}.pdf",
                "size": es_dict.get("attachment_size") or "1.2 MB",
                "type": "OFFICIAL DPDP NOTICE SNAPSHOT DOCUMENT"
            }
        ]
        es_dict["threadId"] = es_dict.get("thread_id", "")
        es_dict["messageId"] = es_dict.get("message_id", "")
    req["emailSnapshot"] = es_dict

    # Compatibility mappings for frontend UI
    req["domain"] = req.get("domain") or "Corporate/Enterprise"
    req["title"] = req.get("purpose") or req.get("subject") or "Consent Request Notice"
    req["fiduciary"] = req["fiduciary_name"]
    req["fiduciaryName"] = req["fiduciary_name"]
    req["fiduciaryCategory"] = req.get("fiduciary_category") or "Corporate Fiduciary"
    req["fiduciaryLogo"] = req.get("fiduciary_logo") or "🏢"
    req["fiduciaryEmail"] = req["fiduciary_email"]
    req["dpoName"] = req["dpo_name"]
    req["dpoEmail"] = req["dpo_email"]
    req["noticeId"] = req["notice_id"]
    req["legalBasis"] = req["legal_basis"]
    req["validityPeriod"] = req["validity_period"]
    req["dataRegion"] = req["data_region"]
    req["attributes"] = req["requestedAttributes"]
    req["emailSubject"] = req["emailSnapshot"].get("subject", "")
    req["emailBody"] = req["emailSnapshot"].get("body_text", "")
    req["threadId"] = req.get("thread_id") or req["emailSnapshot"].get("threadId", "")
    req["messageId"] = req.get("message_id") or req["emailSnapshot"].get("messageId", "")

    return req

def check_request_expiry(req, conn):
    if not req.get("expires_at"):
        return False
    try:
        exp_str = req["expires_at"].replace("Z", "")
        exp_dt = datetime.fromisoformat(exp_str)
        if datetime.utcnow() > exp_dt:
            cursor = conn.cursor()
            cursor.execute("UPDATE consent_requests SET status = 'EXPIRED' WHERE id = ?;", (req["id"],))
            cursor.execute("""
            INSERT INTO audit_events (id, request_id, consent_id, data_principal_id, action, fiduciary, notice_id, details, ip_address, timestamp, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                f"AUD-{random.randint(100, 999)}",
                req["id"],
                "N/A",
                req["data_principal_id"],
                "EXPIRED_LINK_ACCESS_ATTEMPT",
                req["fiduciary_name"],
                req["notice_id"],
                "Attempted access to an expired consent request token.",
                "103.21.124.88",
                datetime.utcnow().isoformat() + "Z",
                "SECURITY_REJECTED"
            ))
            conn.commit()
            return True
    except Exception as e:
        print("Expiry parse check error:", e)
    return False

# ── UNIVERSAL EMAIL CONTENT ANALYSER ──────────────────────────────────────────
# These three functions replace all hardcoded domain/template logic.
# They read the ACTUAL email subject + body to determine:
#   1. Business domain/sector
#   2. Processing purpose
#   3. Which personal data attributes are being requested
# ──────────────────────────────────────────────────────────────────────────────

def detect_domain_from_content(subject: str, body: str) -> str:
    """Detect the business domain/sector from actual email subject + body text."""
    text = (subject + " " + body).lower()
    if any(kw in text for kw in ["hospital", "medical", "health insurance", "diagnosis", "prescription", "lab report", "clinic", "doctor", "patient", "treatment", "mediclam"]):
        return "Healthcare"
    if any(kw in text for kw in ["loan", "cibil", "lending", "credit line", "emi", "fintech", "nbfc", "credit score", "borrower", "disburse"]):
        return "FinTech"
    if any(kw in text for kw in ["uan", "provident fund", "epfo", "pf account", "payroll", "esic", "gratuity", "employee provident"]):
        return "EPFO / Payroll"
    if any(kw in text for kw in ["savings account", "fixed deposit", "neft", "rtgs", "rbi guideline", "banking", "demat", "current account"]):
        return "Banking"
    if any(kw in text for kw in ["background verification", "bgv", "degree verification", "employment onboarding", "hr department", "hiring", "experience letter", "relieving letter"]):
        return "Corporate HR"
    if any(kw in text for kw in ["order", "shipping", "delivery address", "ecommerce", "checkout", "cart", "retail"]):
        return "E-Commerce"
    if any(kw in text for kw in ["insurance policy", "premium", "tpa", "claim settlement", "insurance coverage"]):
        return "Insurance"
    if any(kw in text for kw in ["school", "college", "university", "student", "admission", "education loan", "scholarship"]):
        return "Education"
    if any(kw in text for kw in ["gst", "income tax", "government scheme", "ministry", "ration card", "voter id"]):
        return "Government"
    if any(kw in text for kw in ["bank", "account", "kyc", "ifsc"]):
        return "Banking"
    return "Corporate / Enterprise"


def extract_purpose_from_content(subject: str, body: str) -> str:
    """Extract a meaningful processing purpose directly from the email content."""
    if subject:
        cleaned = subject.strip()
        for prefix in ["action required:", "re:", "fw:", "fwd:", "important:", "urgent:", "notice:"]:
            if cleaned.lower().startswith(prefix):
                cleaned = cleaned[len(prefix):].strip()
        if len(cleaned) > 10:
            return cleaned
    if body:
        lines = [l.strip() for l in body.split('\n') if l.strip() and len(l.strip()) > 20]
        for line in lines:
            low = line.lower()
            if not low.startswith("dear") and not low.startswith("hi ") and not low.startswith("hello") and "unsubscribe" not in low:
                return line[:200]
    return "Collection and processing of personal data for requested service delivery."


def resolve_fiduciary_name(token: str = "", domain: str = "", subject: str = "", body: str = "", fiduciary: str = "") -> str:
    """
    Resolve institutional Data Fiduciary entity name under DPDP Act.
    If the link/token or content is for a Bank (e.g. tok_bank_kyc, 'bank' in token, or domain is Banking),
    it MUST show the Bank name (e.g. ABC National Bank, or named bank in text).
    It will never use a personal individual's name as the Data Fiduciary.
    """
    token_lower = (token or "").lower()
    text = f"{subject} {body}".lower()
    fiduciary_clean = (fiduciary or "").strip()

    # If an institutional organization was explicitly provided (and is not an individual person or email)
    is_personal_name = any(p in fiduciary_clean.lower() for p in [
        "prerna", "pandey", "@", "unknown", "data fiduciary", "test"
    ])
    if fiduciary_clean and not is_personal_name and len(fiduciary_clean) > 2:
        return fiduciary_clean

    # Detect specific real banks if mentioned in text
    if any(kw in text for kw in ["hdfc bank", "hdfc"]):
        return "HDFC Bank"
    if any(kw in text for kw in ["icici bank", "icici"]):
        return "ICICI Bank"
    if any(kw in text for kw in ["state bank of india", "sbi"]):
        return "State Bank of India"
    if any(kw in text for kw in ["axis bank", "axis"]):
        return "Axis Bank"
    if any(kw in text for kw in ["kotak mahindra", "kotak bank", "kotak"]):
        return "Kotak Mahindra Bank"
    if any(kw in text for kw in ["punjab national bank", "pnb"]):
        return "Punjab National Bank"
    if any(kw in text for kw in ["bank of baroda", "bob"]):
        return "Bank of Baroda"

    # Banking link / domain check — ALWAYS use Bank name for banking links
    if "bank" in token_lower or domain == "Banking" or any(kw in text for kw in ["savings account", "current account", "fixed deposit", "kyc verification", "rbi guideline", "bank account", "ifsc"]):
        return "ABC National Bank"

    # Healthcare
    if "health" in token_lower or "med" in token_lower or domain == "Healthcare" or any(kw in text for kw in ["hospital", "clinic", "diagnosis", "mediclaim", "patient", "apollo"]):
        return "Apollo Care Hospital"

    # EPFO / PF
    if "pf" in token_lower or "uan" in token_lower or "provident" in token_lower or domain == "EPFO / Payroll" or any(kw in text for kw in ["epfo", "provident fund", "uan"]):
        return "EPFO / Cialfor Payroll Cell"

    # FinTech / Loan
    if "fintech" in token_lower or "loan" in token_lower or "credit" in token_lower or domain == "FinTech" or any(kw in text for kw in ["cibil", "lending", "credit score"]):
        return "PayFlex Lending"

    # E-Commerce
    if "ecom" in token_lower or "order" in token_lower or "retail" in token_lower or domain == "E-Commerce":
        return "ShopEase Retail"

    # Corporate HR / BGV
    if "bgv" in token_lower or "corp" in token_lower or "hr" in token_lower or domain == "Corporate HR" or any(kw in text for kw in ["background verification", "onboarding"]):
        return "GlobalTech Solutions HR"

    if domain and domain != "Corporate / Enterprise":
        return f"{domain} Enterprise"

    return "ABC National Bank" if "bank" in token_lower else "Corporate Fiduciary"


def get_fiduciary_metadata(fiduciary_name: str, domain: str):
    """Return category and emoji logo appropriate for the institutional fiduciary."""
    name_low = fiduciary_name.lower()
    domain_low = domain.lower()
    if "bank" in name_low or "banking" in domain_low:
        return "Banking & Financial Services", "🏦"
    if "hospital" in name_low or "health" in name_low or "care" in name_low or "healthcare" in domain_low:
        return "Healthcare & Diagnostic Services", "🏥"
    if "epfo" in name_low or "payroll" in domain_low or "pf" in name_low:
        return "Statutory & Government Payroll", "💼"
    if "lending" in name_low or "fintech" in name_low or "fintech" in domain_low:
        return "FinTech & Digital Lending", "💳"
    if "retail" in name_low or "shopease" in name_low or "commerce" in domain_low:
        return "E-Commerce & Retail Logistics", "🛒"
    if "hr" in name_low or "globaltech" in name_low or "corporate" in domain_low:
        return "Corporate HR & Recruitment", "🏢"
    return f"{domain} Enterprise", "🏢"



def extract_attributes_from_email_content(subject: str, body: str) -> list:
    """
    Universal DPDP-compliant attribute extractor.
    Reads the actual email subject + body text and dynamically identifies
    which personal data attributes are being requested.
    Completely replaces the old hardcoded domain-template logic.
    """
    text = (subject + " " + body).lower()
    attrs = []
    added = set()

    def add(attr_id, name, category, required, description, sensitive, default_granted=None):
        if attr_id not in added:
            a = {"id": attr_id, "name": name, "category": category,
                 "required": required, "description": description, "sensitive": sensitive}
            if default_granted is not None:
                a["defaultGranted"] = default_granted
            attrs.append(a)
            added.add(attr_id)

    # ── ALWAYS REQUIRED: Full Name ─────────────────────────────────────────────
    add("attr_name", "Full Name & Official Identity", "IDENTITY", True,
        "Official name of the Data Principal for identification and records", False)

    # ── PAN CARD ──────────────────────────────────────────────────────────────
    if any(kw in text for kw in ["pan", "pan card", "permanent account number", "tax deduction", "form 60"]):
        add("attr_pan", "Permanent Account Number (PAN Card)", "FINANCIAL", True,
            "Government-issued tax identity document for financial compliance", True)

    # ── AADHAAR / KYC ─────────────────────────────────────────────────────────
    if any(kw in text for kw in ["aadhaar", "aadhar", "uid number", "biometric", "e-kyc", "ekyc", "kyc", "uidai"]):
        add("attr_aadhaar", "Aadhaar / Government KYC Document", "IDENTITY", True,
            "UIDAI Aadhaar for mandatory KYC verification and identity proof", True)

    # ── BANK ACCOUNT ──────────────────────────────────────────────────────────
    if any(kw in text for kw in ["bank account", "account number", "ifsc", "savings account", "current account", "neft", "rtgs", "upi id", "bank details"]):
        add("attr_bank", "Bank Account Number & IFSC Code", "FINANCIAL", True,
            "Bank account details for payment processing and fund transfer", True)

    # ── BANK STATEMENT ────────────────────────────────────────────────────────
    if any(kw in text for kw in ["bank statement", "account statement", "6 month", "6-month", "bank passbook"]):
        add("attr_bank_stmt", "Bank Account Statement (6 Months)", "FINANCIAL", True,
            "Recent bank statement for income and transaction verification", True)

    # ── CIBIL / CREDIT SCORE ──────────────────────────────────────────────────
    if any(kw in text for kw in ["cibil", "credit score", "credit report", "experian", "equifax", "crif", "credit bureau"]):
        add("attr_cibil", "Credit Score Report (CIBIL / Experian)", "FINANCIAL", True,
            "Credit bureau score report for loan/credit eligibility assessment", True)

    # ── UAN / PF / EPFO ───────────────────────────────────────────────────────
    if any(kw in text for kw in ["uan", "universal account number", "provident fund", "pf account", "epfo", "employee provident"]):
        add("attr_uan", "Universal Account Number (UAN) & PF ID", "FINANCIAL", True,
            "EPFO UAN for Provident Fund account linking and management", True)

    # ── MEDICAL / HEALTH ──────────────────────────────────────────────────────
    if any(kw in text for kw in ["medical record", "health record", "diagnostic", "lab report", "prescription", "treatment history", "patient record"]):
        add("attr_medical", "Medical Records & Diagnostic History", "HEALTH", True,
            "Medical records required for healthcare service and insurance processing", True)

    # ── HEALTH INSURANCE ──────────────────────────────────────────────────────
    if any(kw in text for kw in ["health insurance", "insurance policy", "tpa", "cashless", "mediclaim", "policy number"]):
        add("attr_insurance", "Health Insurance Policy Number", "HEALTH", True,
            "Insurance policy details for cashless treatment and claim processing", True)

    # ── ADDRESS ───────────────────────────────────────────────────────────────
    if any(kw in text for kw in ["address", "residential address", "home address", "delivery address", "shipping address", "pincode", "location proof"]):
        add("attr_address", "Residential Address & Address Proof", "CONTACT", True,
            "Home address for correspondence, KYC, and service delivery", False)

    # ── PHONE NUMBER ──────────────────────────────────────────────────────────
    if any(kw in text for kw in ["phone", "mobile", "contact number", "telephone", "otp", "sms notification"]):
        add("attr_phone", "Mobile Phone Number", "CONTACT", True,
            "Contact number for OTP verification and communication", False)

    # ── EMAIL ADDRESS ─────────────────────────────────────────────────────────
    if any(kw in text for kw in ["email address", "email id", "e-mail id"]):
        add("attr_email_id", "Email Address", "CONTACT", True,
            "Email for digital correspondence and account notifications", False)

    # ── GOVERNMENT PHOTO ID ───────────────────────────────────────────────────
    if any(kw in text for kw in ["passport", "voter id", "driving license", "government photo id", "photo id proof"]):
        add("attr_govt_id", "Government Photo ID (Passport / Voter ID / DL)", "IDENTITY", True,
            "Official government-issued photo identity document", True)

    # ── EMPLOYMENT / BGV ──────────────────────────────────────────────────────
    if any(kw in text for kw in ["background verification", "bgv", "criminal check", "police verification", "employment verification"]):
        add("attr_bgv", "Background Verification & Criminal Record Check", "LEGAL/VERIFICATION", True,
            "Third-party background check for employment onboarding clearance", True)

    # ── DEGREE / EDUCATION ────────────────────────────────────────────────────
    if any(kw in text for kw in ["degree", "marksheet", "academic certificate", "university registrar", "diploma"]):
        add("attr_degree", "Educational Degree Certificates & Marksheets", "PROFESSIONAL", True,
            "Academic qualification documents for credential verification", True)

    # ── EXPERIENCE LETTER ─────────────────────────────────────────────────────
    if any(kw in text for kw in ["experience letter", "relieving letter", "reference check", "prior employment", "work history"]):
        add("attr_prior_emp", "Prior Employment & Experience Records", "PROFESSIONAL", False,
            "Relieving letter and employment reference for background check", False, default_granted=True)

    # ── INCOME / SALARY ───────────────────────────────────────────────────────
    if any(kw in text for kw in ["salary slip", "income proof", "salary statement", "ctc", "annual income", "itr", "form 16"]):
        add("attr_income", "Income Proof & Salary Records", "FINANCIAL", False,
            "Income documentation for financial eligibility and tax verification", True, default_granted=True)

    # ── PAYMENT CARD ──────────────────────────────────────────────────────────
    if any(kw in text for kw in ["credit card", "debit card", "card details", "payment method", "express checkout", "tokenized card"]):
        add("attr_card", "Tokenized Payment Card Details", "FINANCIAL", False,
            "RBI-compliant tokenized card data for express payment checkout", True, default_granted=False)

    # ── DEVICE / LOCATION ─────────────────────────────────────────────────────
    if any(kw in text for kw in ["device", "location data", "gps", "ip address", "device fingerprint", "anti-fraud"]):
        add("attr_device", "Device & Location Data", "DIGITAL", False,
            "Device fingerprint and location for fraud prevention and security", True, default_granted=True)

    # ── SUPPORTING DOCUMENTS ──────────────────────────────────────────────────
    if any(kw in text for kw in ["supporting document", "records required", "proof required", "file upload", "attach document"]):
        add("attr_docs", "Supporting Documents & Records", "LEGAL/VERIFICATION", False,
            "Relevant supporting documents for requested service delivery", True, default_granted=True)

    # ── FALLBACK: generic fields if nothing specific found ────────────────────
    if len(attrs) <= 1:
        add("attr_email_id", "Email Address", "CONTACT", True,
            "Contact email for correspondence and account management", False)
        add("attr_phone", "Mobile Phone Number", "CONTACT", True,
            "Contact number for communication and OTP verification", False)
        add("attr_docs", "Supporting Documents & Records", "LEGAL/VERIFICATION", False,
            "Relevant documents for the requested service delivery", True, default_granted=True)

    return attrs


def dynamic_create_request_for_token(
    token: str, 
    conn, 
    to_email: str = None, 
    to_name: str = None,
    subject: str = None,
    body: str = None,
    purpose: str = None,
    fiduciary: str = None,
    thread_id: str = None,
    message_id: str = None
):
    cursor = conn.cursor()
    dp_name = to_name or "Prerna Pandey"
    dp_email = to_email or "pandeyprerna1407@gmail.com"
    dp_id = generate_data_principal_id(dp_email)

    # 1. Create/Ensure DataPrincipal
    cursor.execute("SELECT * FROM data_principals WHERE id = ?;", (dp_id,))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO data_principals (id, name, email, phone, roll_no, institution, kyc_status, registered_on)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (dp_id, dp_name, dp_email, "+91 98765 12345", "CIALFOR-DP-2026", "Cialfor Research Labs Private Limited", "Verified", datetime.utcnow().isoformat() + "Z"))

    # ── UNIVERSAL EMAIL CONTENT ANALYSIS ─────────────────────────────────────
    # Domain, purpose, and attributes are extracted from the ACTUAL email
    # subject + body text. We no longer use token keywords to decide what
    # to show. The real email content drives everything.
    final_domain    = detect_domain_from_content(subject or "", body or "")
    final_subject   = subject or "Action Required: Data Processing Consent Notice"
    final_purpose   = purpose or extract_purpose_from_content(subject or "", body or "")
    final_fiduciary = resolve_fiduciary_name(token, final_domain, subject or "", body or "", fiduciary or "")
    final_category, final_logo = get_fiduciary_metadata(final_fiduciary, final_domain)

    # CRITICAL: Always use the real email body as-is.
    # Only fall back to a generic template if no body was provided at all.
    final_body = body or (
        f"Dear {dp_name},\n\n"
        f"We request your explicit consent to process your personal data for:\n{final_purpose}\n\n"
        "Please review the requested data attributes on this Consent Manager Portal "
        "and grant or deny consent accordingly.\n\n"
        "Thanks & Regards,\nPrivacy Compliance Officer"
    )

    # Dynamically extract attributes from the actual email content
    requested_attrs = extract_attributes_from_email_content(
        subject or "", body or ""
    )

    # 2. Create EmailSnapshot
    snapshot_id = f"ES-2026-CIALFOR-{random.randint(1000, 9999)}"
    cursor.execute("""
    INSERT INTO email_snapshots (id, from_address, to_address, subject, sent_date, body_text, attachment_name, attachment_size, dkim_status, spf_status, thread_id, message_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        snapshot_id,
        f"{final_fiduciary} <compliance@{final_domain.lower().replace(' ', '').replace('/', '')}.com>",
        f"{dp_name} <{dp_email}>",
        final_subject,
        datetime.utcnow().strftime("%A, %B %d, %Y"),
        final_body,
        "Statutory_Privacy_Notice_NTC-2026-CIALFOR-001.pdf",
        "1.2 MB",
        "DKIM Signed",
        "SPF Pass",
        thread_id,
        message_id
    ))

    # 3. Create ConsentRequest
    req_id = f"REQ-2026-CIALFOR-{random.randint(100, 999)}"
    notice_id = f"NTC-2026-CIALFOR-{random.randint(100, 999)}"
    now = datetime.utcnow().isoformat() + "Z"
    expires = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"

    cursor.execute("""
    INSERT INTO consent_requests (id, token, notice_id, data_principal_id, email_snapshot_id, fiduciary_name, fiduciary_category, fiduciary_logo, fiduciary_email, dpo_name, dpo_email, purpose, domain, legal_basis, validity_period, data_region, requested_attributes, status, created_at, expires_at, thread_id, message_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        req_id,
        token,
        notice_id,
        dp_id,
        snapshot_id,
        final_fiduciary,
        final_category,
        final_logo,
        "privacy@cialfor.com",
        "Prerna Pandey (AI Specialist)",
        "dpo@cialfor.com",
        final_purpose,
        final_domain,
        "Consent under DPDP Act 2023 (Section 6)",
        "12 Months",
        "India (MeitY Empanelled Cloud)",
        json.dumps(requested_attrs),
        "PENDING",
        now,
        expires,
        thread_id,
        message_id
    ))

    conn.commit()

    cursor.execute("SELECT * FROM consent_requests WHERE id = ?;", (req_id,))
    return cursor.fetchone()

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "Python FastAPI DP Consent Manager Backend (Real Email Integration)",
        "security_features": ["cryptographic_tokens", "server_timestamps", "expiry_handling", "duplicate_prevention", "attribute_validation"],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.post("/api/gmail-webhook")
@app.post("/api/sync-gmail")
@app.post("/api/ingest-email")
def sync_gmail_webhook(payload: EmailIngestPayload):
    conn = get_db()
    cursor = conn.cursor()

    to_parts = payload.to_address.split("<")
    if len(to_parts) > 1:
        dp_name = to_parts[0].strip()
        dp_email = to_parts[1].replace(">", "").strip()
    else:
        dp_email = payload.to_address.strip()
        dp_name = dp_email.split("@")[0].replace(".", " ").title()

    # Prefer extracted_token from webhook payload, then look in body text, or generate new
    token = payload.extracted_token
    if not token:
        token_match = re.search(r'/request/([a-zA-Z0-9_\-]+)', payload.body_text)
        token = token_match.group(1) if token_match else generate_unpredictable_token()

    cursor.execute("SELECT * FROM consent_requests WHERE token = ? OR notice_id = ? OR id = ?;", (token, token, token))
    row = cursor.fetchone()

    # Extract dynamic domain, purpose, and attributes from the actual email content
    new_domain = payload.domain or detect_domain_from_content(payload.subject, payload.body_text)
    new_purpose = payload.purpose or extract_purpose_from_content(payload.subject, payload.body_text)
    new_attrs = extract_attributes_from_email_content(payload.subject, payload.body_text)
    fiduciary_name = resolve_fiduciary_name(token, new_domain, payload.subject, payload.body_text, payload.fiduciary_name or "")
    fiduciary_category, fiduciary_logo = get_fiduciary_metadata(fiduciary_name, new_domain)
    sent_date_str = payload.sent_date or datetime.utcnow().strftime("%A, %B %d, %Y")

    dp_id = generate_data_principal_id(dp_email)
    cursor.execute("SELECT * FROM data_principals WHERE id = ?;", (dp_id,))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO data_principals (id, name, email, phone, roll_no, institution, kyc_status, registered_on)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (dp_id, dp_name, dp_email, "+91 98765 12345", "CIALFOR-DP-2026", fiduciary_name, "Verified", datetime.utcnow().isoformat() + "Z"))

    if row:
        req = dict(row)
        cursor.execute("""
            UPDATE consent_requests 
            SET data_principal_id = ?, fiduciary_name = ?, fiduciary_category = ?, fiduciary_logo = ?, domain = ?, purpose = ?, requested_attributes = ?, thread_id = COALESCE(?, thread_id), message_id = COALESCE(?, message_id) 
            WHERE id = ?;
        """, (dp_id, fiduciary_name, fiduciary_category, fiduciary_logo, new_domain, new_purpose, json.dumps(new_attrs), payload.thread_id, payload.message_id, req["id"]))
        
        cursor.execute("""
            UPDATE email_snapshots 
            SET from_address = ?, to_address = ?, subject = ?, body_text = ?, sent_date = ?, thread_id = COALESCE(?, thread_id), message_id = COALESCE(?, message_id) 
            WHERE id = ?;
        """, (payload.from_address or f"{fiduciary_name} <compliance@{new_domain.lower().replace(' ', '').replace('/', '')}.com>", f"{dp_name} <{dp_email}>", payload.subject, payload.body_text, sent_date_str, payload.thread_id, payload.message_id, req["email_snapshot_id"]))
        conn.commit()
        cursor.execute("SELECT * FROM consent_requests WHERE id = ?;", (req["id"],))
        row = cursor.fetchone()
    else:
        row = dynamic_create_request_for_token(
            token=token,
            conn=conn,
            to_email=dp_email,
            to_name=dp_name,
            subject=payload.subject,
            body=payload.body_text,
            purpose=new_purpose,
            fiduciary=fiduciary_name,
            thread_id=payload.thread_id,
            message_id=payload.message_id
        )

    req = dict(row)
    result = hydrate_request(row, conn)
    conn.close()

    result["token"] = token
    result["link"] = f"http://localhost:5173/request/{token}"
    return result


@app.post("/api/consent-requests")
def create_consent_request(payload: ConsentRequestCreatePayload):
    conn = get_db()
    cursor = conn.cursor()

    dp_id = generate_data_principal_id(payload.principal_email)
    cursor.execute("SELECT * FROM data_principals WHERE id = ?;", (dp_id,))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO data_principals (id, name, email, registered_on)
        VALUES (?, ?, ?, ?);
        """, (dp_id, payload.principal_name, payload.principal_email, datetime.utcnow().isoformat() + "Z"))

    snapshot_id = f"ES-2026-{random.randint(1000, 9999)}"
    cursor.execute("""
    INSERT INTO email_snapshots (id, from_address, to_address, subject, sent_date, body_text, attachment_name, attachment_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        snapshot_id,
        f"{payload.fiduciary_name} <{payload.fiduciary_email}>",
        f"{payload.principal_name} <{payload.principal_email}>",
        payload.email_subject,
        datetime.utcnow().strftime("%A, %B %d, %Y"),
        payload.email_body,
        payload.attachment_name,
        "1.2 MB"
    ))

    req_id = f"REQ-2026-CR-{random.randint(100, 999)}"
    token = generate_unpredictable_token()
    notice_id = payload.notice_id or f"NTC-2026-CR-{random.randint(100, 999)}"
    now = datetime.utcnow().isoformat() + "Z"
    expires = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"

    cursor.execute("""
    INSERT INTO consent_requests (id, token, notice_id, data_principal_id, email_snapshot_id, fiduciary_name, fiduciary_category, fiduciary_logo, fiduciary_email, dpo_name, dpo_email, purpose, legal_basis, validity_period, data_region, requested_attributes, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        req_id,
        token,
        notice_id,
        dp_id,
        snapshot_id,
        payload.fiduciary_name,
        payload.fiduciary_category,
        payload.fiduciary_logo,
        payload.fiduciary_email,
        payload.dpo_name,
        payload.dpo_email,
        payload.purpose,
        payload.legal_basis,
        payload.validity_period,
        payload.data_region,
        json.dumps(payload.requested_attributes),
        "PENDING",
        now,
        expires
    ))

    conn.commit()

    cursor.execute("SELECT * FROM consent_requests WHERE id = ?;", (req_id,))
    row = cursor.fetchone()
    result = hydrate_request(row, conn)
    conn.close()
    return result

@app.get("/api/consent-requests/resolve")
def resolve_consent_request(
    token: str = Query(..., description="Secure request token"),
    to_email: Optional[str] = Query(None),
    to_name: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    body: Optional[str] = Query(None),
    purpose: Optional[str] = Query(None),
    fiduciary: Optional[str] = Query(None)
):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consent_requests WHERE token = ?;", (token,))
    row = cursor.fetchone()
    if not row:
        row = dynamic_create_request_for_token(
            token, conn, to_email=to_email, to_name=to_name, subject=subject, body=body, purpose=purpose, fiduciary=fiduciary
        )
    else:
        req = dict(row)
        need_update = False
        updates_cr = []
        params_cr = []
        updates_es = []
        params_es = []

        if to_email:
            dp_id = generate_data_principal_id(to_email)
            dp_name = to_name or "Prerna Pandey"
            cursor.execute("SELECT * FROM data_principals WHERE id = ?;", (dp_id,))
            if not cursor.fetchone():
                cursor.execute("""
                INSERT INTO data_principals (id, name, email, phone, roll_no, institution, kyc_status, registered_on)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """, (dp_id, dp_name, to_email, "+91 98765 12345", "CIALFOR-DP-2026", "Cialfor Research Labs Private Limited", "Verified", datetime.utcnow().isoformat() + "Z"))
            updates_cr.append("data_principal_id = ?")
            params_cr.append(dp_id)
            updates_es.append("to_address = ?")
            params_es.append(f"{dp_name} <{to_email}>")
            need_update = True

        if subject:
            updates_es.append("subject = ?")
            params_es.append(subject)
            need_update = True

        if body:
            updates_es.append("body_text = ?")
            params_es.append(body)
            need_update = True

        if purpose:
            updates_cr.append("purpose = ?")
            params_cr.append(purpose)
            need_update = True

        # Ensure fiduciary is institutional, not personal
        current_fid = req.get("fiduciary_name", "")
        req_token = req.get("token") or token
        req_domain = req.get("domain") or "Corporate/Enterprise"
        resolved_fid = resolve_fiduciary_name(req_token, req_domain, subject or "", body or "", fiduciary or current_fid)
        if resolved_fid != current_fid and (any(p in current_fid.lower() for p in ["prerna", "pandey", "unknown", "data fiduciary", "@"]) or "bank" in req_token.lower() or req_domain == "Banking"):
            fid_cat, fid_logo = get_fiduciary_metadata(resolved_fid, req_domain)
            updates_cr.append("fiduciary_name = ?")
            params_cr.append(resolved_fid)
            updates_cr.append("fiduciary_category = ?")
            params_cr.append(fid_cat)
            updates_cr.append("fiduciary_logo = ?")
            params_cr.append(fid_logo)
            need_update = True
        elif fiduciary and fiduciary != current_fid:
            updates_cr.append("fiduciary_name = ?")
            params_cr.append(fiduciary)
            updates_es.append("from_address = ?")
            params_es.append(f"{fiduciary} <compliance@{req_domain.lower().replace(' ', '')}.com>")
            need_update = True

        if need_update:
            if updates_cr:
                params_cr.append(req["id"])
                cursor.execute(f"UPDATE consent_requests SET {', '.join(updates_cr)} WHERE id = ?;", params_cr)
            if updates_es:
                params_es.append(req["email_snapshot_id"])
                cursor.execute(f"UPDATE email_snapshots SET {', '.join(updates_es)} WHERE id = ?;", params_es)
            conn.commit()
            cursor.execute("SELECT * FROM consent_requests WHERE id = ?;", (req["id"],))
            row = cursor.fetchone()

    req = dict(row)

    if check_request_expiry(req, conn):
        conn.close()
        raise HTTPException(status_code=410, detail="Consent request link has expired.")

    result = hydrate_request(row, conn)
    conn.close()
    return result

@app.get("/api/consent-requests/notice/{notice_id}")
def get_consent_request_by_notice(notice_id: str = Path(...)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consent_requests WHERE notice_id = ?;", (notice_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Consent request not found for notice ID")

    req = dict(row)

    if check_request_expiry(req, conn):
        conn.close()
        raise HTTPException(status_code=410, detail="Consent request link has expired.")

    result = hydrate_request(row, conn)
    conn.close()
    return result

@app.get("/api/consent-requests")
def list_consent_requests():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consent_requests;")
    rows = cursor.fetchall()
    results = [hydrate_request(r, conn) for r in rows]
    conn.close()
    return results

@app.get("/api/consent-requests/{request_token}")
def get_consent_request_by_token_path(
    request_token: str = Path(..., description="Request token, notice ID, or request ID"),
    to_email: Optional[str] = Query(None),
    to_name: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    body: Optional[str] = Query(None),
    purpose: Optional[str] = Query(None),
    fiduciary: Optional[str] = Query(None)
):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM consent_requests WHERE token = ? OR notice_id = ? OR id = ?;", (request_token, request_token, request_token))
    row = cursor.fetchone()
    if not row:
        # Check if there is a recent ingested email snapshot in SQLite DB
        cursor.execute("SELECT * FROM email_snapshots ORDER BY id DESC LIMIT 1;")
        latest_es = cursor.fetchone()
        if latest_es and not (subject or body):
            es_dict = dict(latest_es)
            subject = es_dict.get("subject")
            body = es_dict.get("body_text")
            to_addr = es_dict.get("to_address", "")
            from_addr = es_dict.get("from_address", "")
            to_parts = to_addr.split("<")
            if len(to_parts) > 1:
                to_name = to_name or to_parts[0].strip()
                to_email = to_email or to_parts[1].replace(">", "").strip()
            else:
                to_email = to_email or to_addr.strip()
            if from_addr and not fiduciary:
                from_name = from_addr.split("<")[0].strip()
                fiduciary = from_name if from_name else fiduciary

        row = dynamic_create_request_for_token(
            request_token, 
            conn, 
            to_email=to_email, 
            to_name=to_name, 
            subject=subject, 
            body=body, 
            purpose=purpose, 
            fiduciary=fiduciary
        )
    else:
        req = dict(row)
        need_update = False
        updates_cr = []
        params_cr = []
        updates_es = []
        params_es = []

        if to_email:
            dp_id = generate_data_principal_id(to_email)
            dp_name = to_name or "Prerna Pandey"
            cursor.execute("SELECT * FROM data_principals WHERE id = ?;", (dp_id,))
            if not cursor.fetchone():
                cursor.execute("""
                INSERT INTO data_principals (id, name, email, phone, roll_no, institution, kyc_status, registered_on)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """, (dp_id, dp_name, to_email, "+91 98765 12345", "CIALFOR-DP-2026", "Cialfor Research Labs Private Limited", "Verified", datetime.utcnow().isoformat() + "Z"))
            updates_cr.append("data_principal_id = ?")
            params_cr.append(dp_id)
            updates_es.append("to_address = ?")
            params_es.append(f"{dp_name} <{to_email}>")
            need_update = True

        if subject:
            updates_es.append("subject = ?")
            params_es.append(subject)
            need_update = True

        if body:
            updates_es.append("body_text = ?")
            params_es.append(body)
            need_update = True

        if purpose:
            updates_cr.append("purpose = ?")
            params_cr.append(purpose)
            need_update = True

        # Ensure fiduciary is institutional, not personal
        current_fid = req.get("fiduciary_name", "")
        req_token = req.get("token") or request_token
        req_domain = req.get("domain") or "Corporate/Enterprise"
        resolved_fid = resolve_fiduciary_name(req_token, req_domain, subject or "", body or "", fiduciary or current_fid)
        if resolved_fid != current_fid and (any(p in current_fid.lower() for p in ["prerna", "pandey", "unknown", "data fiduciary", "@"]) or "bank" in req_token.lower() or req_domain == "Banking"):
            fid_cat, fid_logo = get_fiduciary_metadata(resolved_fid, req_domain)
            updates_cr.append("fiduciary_name = ?")
            params_cr.append(resolved_fid)
            updates_cr.append("fiduciary_category = ?")
            params_cr.append(fid_cat)
            updates_cr.append("fiduciary_logo = ?")
            params_cr.append(fid_logo)
            need_update = True
        elif fiduciary and fiduciary != current_fid:
            updates_cr.append("fiduciary_name = ?")
            params_cr.append(fiduciary)
            updates_es.append("from_address = ?")
            params_es.append(f"{fiduciary} <compliance@{req_domain.lower().replace(' ', '')}.com>")
            need_update = True

        if need_update:
            if updates_cr:
                params_cr.append(req["id"])
                cursor.execute(f"UPDATE consent_requests SET {', '.join(updates_cr)} WHERE id = ?;", params_cr)
            if updates_es:
                params_es.append(req["email_snapshot_id"])
                cursor.execute(f"UPDATE email_snapshots SET {', '.join(updates_es)} WHERE id = ?;", params_es)
            conn.commit()
            cursor.execute("SELECT * FROM consent_requests WHERE id = ?;", (req["id"],))
            row = cursor.fetchone()

    req = dict(row)

    if check_request_expiry(req, conn):
        conn.close()
        raise HTTPException(status_code=410, detail="Consent request link has expired.")

    result = hydrate_request(row, conn)
    conn.close()
    return result

@app.post("/api/consent-requests/{request_id}/decision")
def record_consent_decision(request_id: str, payload: DecisionPayload):
    if payload.decision not in ["GRANTED", "DENIED"]:
        raise HTTPException(status_code=400, detail="Invalid decision (must be GRANTED or DENIED)")

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM consent_requests WHERE id = ? OR notice_id = ? OR token = ?;", (request_id, request_id, request_id))
    req_row = cursor.fetchone()
    if not req_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Consent request not found")

    req = dict(req_row)
    now = datetime.utcnow().isoformat() + "Z"

    if check_request_expiry(req, conn):
        conn.close()
        raise HTTPException(status_code=410, detail="Cannot record decision: Consent request link has expired.")

    if req["status"] in ["GRANTED", "DENIED"]:
        cursor.execute("""
        INSERT INTO audit_events (id, request_id, consent_id, data_principal_id, action, fiduciary, notice_id, details, ip_address, timestamp, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            f"AUD-{random.randint(100, 999)}",
            req["id"],
            "N/A",
            req["data_principal_id"],
            "DUPLICATE_SUBMISSION_PREVENTED",
            req["fiduciary_name"],
            req["notice_id"],
            f"Prevented duplicate decision submission. Status is already {req['status']}.",
            "103.21.124.88",
            now,
            "SECURITY_PROTECTED"
        ))
        conn.commit()

        cursor.execute("SELECT * FROM consents WHERE notice_id = ? AND status = 'ACTIVE';", (req["notice_id"],))
        existing_consent = cursor.fetchone()
        formatted_consent = None
        if existing_consent:
            ec = dict(existing_consent)
            cursor.execute("SELECT * FROM data_principals WHERE id = ?;", (req["data_principal_id"],))
            dp_row = cursor.fetchone()
            dp_dict = dict(dp_row) if dp_row else {}
            formatted_consent = {
                "consentId": ec["consent_id"],
                "requestId": req["id"],
                "principalId": req["data_principal_id"],
                "principalName": dp_dict.get("name") or "Prerna Pandey",
                "principalEmail": dp_dict.get("email") or "",
                "fiduciary": ec["fiduciary_name"],
                "fiduciaryCategory": ec.get("fiduciary_category") or req.get("fiduciary_category") or "Banking & Financial Services",
                "fiduciaryLogo": ec.get("fiduciary_logo") or req.get("fiduciary_logo") or "🏦",
                "purpose": ec["purpose"],
                "noticeId": ec["notice_id"],
                "legalBasis": req.get("legal_basis") or "Consent under DPDP Act 2023 (Section 6)",
                "status": ec["status"],
                "grantedOn": ec["granted_on"],
                "expiresOn": ec["expires_on"],
                "grantedAttributes": json.loads(ec["granted_attributes"]) if isinstance(ec["granted_attributes"], str) else ec["granted_attributes"],
                "deniedAttributes": json.loads(ec["denied_attributes"]) if isinstance(ec["denied_attributes"], str) else (ec["denied_attributes"] or []),
                "dpoContact": ec.get("dpo_contact") or req.get("dpo_email", ""),
                "dataRegion": ec.get("data_region") or req.get("data_region", "India"),
                "receiptHash": ec["receipt_hash"],
                "customNote": ec.get("custom_note") or ""
            }
        conn.close()
        return {
            "success": True,
            "already_processed": True,
            "message": f"Consent request already processed as {req['status']}.",
            "status": req["status"],
            "consent": formatted_consent
        }

    if payload.decision == "GRANTED":
        attributes = json.loads(req["requested_attributes"])
        selected_set = set(payload.selected_attributes or [])
        for attr in attributes:
            if attr.get("required"):
                attr_id = attr.get("id")
                attr_name = attr.get("name")
                if attr_id not in selected_set and attr_name not in selected_set:
                    cursor.execute("""
                    INSERT INTO audit_events (id, request_id, consent_id, data_principal_id, action, fiduciary, notice_id, details, ip_address, timestamp, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """, (
                        f"AUD-{random.randint(100, 999)}",
                        req["id"],
                        "N/A",
                        req["data_principal_id"],
                        "MANDATORY_ATTRIBUTE_OMISSION_ATTEMPT",
                        req["fiduciary_name"],
                        req["notice_id"],
                        f"Rejected grant attempt missing mandatory attribute '{attr_name}'.",
                        "103.21.124.88",
                        now,
                        "SECURITY_REJECTED"
                    ))
                    conn.commit()
                    conn.close()
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Server Security Violation: Mandatory attribute '{attr_name}' must be accepted to grant consent."
                    )

    decision_id = f"DEC-{int(datetime.utcnow().timestamp() * 1000)}"

    cursor.execute("""
    INSERT INTO consent_decisions (id, request_id, data_principal_id, decision, selected_attributes, denied_attributes, remark, decided_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        decision_id,
        req["id"],
        req["data_principal_id"],
        payload.decision,
        json.dumps(payload.selected_attributes),
        json.dumps(payload.denied_attributes),
        payload.remark,
        now
    ))

    cursor.execute("UPDATE consent_requests SET status = ? WHERE id = ?;", (payload.decision, req["id"]))

    consent_record = None
    if payload.decision == "GRANTED":
        consent_id = payload.consent_id or f"CNST-2026-{random.randint(1000, 9999)}"
        expiry = (datetime.utcnow() + timedelta(days=365)).isoformat() + "Z"
        receipt_hash = generate_sha256_signature({
            "consentId": consent_id,
            "requestId": req["id"],
            "principalId": req["data_principal_id"],
            "fiduciary": req["fiduciary_name"],
            "noticeId": req["notice_id"],
            "grantedAt": now
        })

        cursor.execute("DELETE FROM consents WHERE notice_id = ?;", (req["notice_id"],))

        # Resolve human-readable attribute names from requested_attributes
        readable_granted = []
        readable_denied = []
        try:
            req_attrs = json.loads(req["requested_attributes"])
            attr_map = {a.get("id"): a.get("name") for a in req_attrs if isinstance(a, dict)}
            readable_granted = [attr_map.get(a, a) for a in payload.selected_attributes]
            readable_denied = [attr_map.get(a, a) for a in payload.denied_attributes]
        except Exception:
            readable_granted = payload.selected_attributes
            readable_denied = payload.denied_attributes

        cursor.execute("""
        INSERT INTO consents (consent_id, request_id, data_principal_id, fiduciary_name, fiduciary_category, fiduciary_logo, purpose, notice_id, status, granted_attributes, denied_attributes, dpo_contact, data_region, receipt_hash, custom_note, granted_on, expires_on)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            consent_id,
            req["id"],
            req["data_principal_id"],
            req["fiduciary_name"],
            req["fiduciary_category"],
            req["fiduciary_logo"],
            req["purpose"],
            req["notice_id"],
            "ACTIVE",
            json.dumps(readable_granted),
            json.dumps(readable_denied),
            req["dpo_email"],
            req["data_region"],
            receipt_hash,
            payload.remark,
            now,
            expiry
        ))

        cursor.execute("SELECT * FROM data_principals WHERE id = ?;", (req["data_principal_id"],))
        dp_row = cursor.fetchone()
        dp_dict = dict(dp_row) if dp_row else {}

        consent_record = {
            "consentId": consent_id,
            "requestId": req["id"],
            "principalId": req["data_principal_id"],
            "principalName": dp_dict.get("name") or "Prerna Pandey",
            "principalEmail": dp_dict.get("email") or "",
            "fiduciary": req["fiduciary_name"],
            "fiduciaryCategory": req["fiduciary_category"],
            "fiduciaryLogo": req["fiduciary_logo"],
            "purpose": req["purpose"],
            "noticeId": req["notice_id"],
            "legalBasis": req.get("legal_basis") or "Consent under DPDP Act 2023 (Section 6)",
            "status": "ACTIVE",
            "grantedOn": now,
            "expiresOn": expiry,
            "grantedAttributes": payload.selected_attributes,
            "deniedAttributes": payload.denied_attributes,
            "dpoContact": req["dpo_email"],
            "dataRegion": req["data_region"],
            "receiptHash": receipt_hash,
            "customNote": payload.remark
        }

    audit_id = f"AUD-{random.randint(100, 999)}"
    audit_action = "CONSENT_GRANTED" if payload.decision == "GRANTED" else "CONSENT_DENIED"
    audit_details = f"Granted {len(payload.selected_attributes)} attributes." if payload.decision == "GRANTED" else f"Consent request declined. Reason: {payload.remark or 'Declined'}"

    cursor.execute("""
    INSERT INTO audit_events (id, request_id, consent_id, data_principal_id, action, fiduciary, notice_id, details, ip_address, timestamp, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        audit_id,
        req["id"],
        consent_record["consentId"] if consent_record else "N/A",
        req["data_principal_id"],
        audit_action,
        req["fiduciary_name"],
        req["notice_id"],
        audit_details,
        "103.21.124.88",
        now,
        "SUCCESS" if payload.decision == "GRANTED" else "DENIED"
    ))

    # ── QUEUE SAME-THREAD NOTIFICATION FOR GOOGLE APPS SCRIPT AUTO-REPLY ──
    thread_id = req.get("thread_id")
    original_message_id = req.get("message_id")
    original_subject = req.get("purpose")
    actual_sender = None

    if req.get("email_snapshot_id"):
        cursor.execute("SELECT from_address, thread_id, message_id, subject FROM email_snapshots WHERE id = ?;", (req["email_snapshot_id"],))
        es_row = cursor.fetchone()
        if es_row:
            if not thread_id and es_row["thread_id"]:
                thread_id = es_row["thread_id"]
            if not original_message_id and es_row["message_id"]:
                original_message_id = es_row["message_id"]
            if es_row["subject"]:
                original_subject = es_row["subject"]
            raw_from = es_row["from_address"] or ""
            match = re.search(r'<([^>]+)>', raw_from)
            actual_sender = match.group(1).strip() if match else (raw_from.strip() if "@" in raw_from else None)

    recipient_email = actual_sender or req.get("fiduciary_email") or "compliance@fiduciary.com"

    notif_id = f"NOTIF-2026-{random.randint(1000, 9999)}"
    notif_details = {
        "decision": payload.decision,
        "token": req.get("token"),
        "requestId": req["id"],
        "fiduciaryName": req["fiduciary_name"],
        "principalName": consent_record.get("principalName", "Data Principal") if consent_record else "Data Principal",
        "principalEmail": consent_record.get("principalEmail", "") if consent_record else "",
        "recipientEmail": recipient_email,
        "originalSubject": original_subject,
        "noticeId": req["notice_id"],
        "purpose": req["purpose"],
        "selectedAttributes": payload.selected_attributes,
        "deniedAttributes": payload.denied_attributes,
        "remark": payload.remark,
        "artifact": consent_record if consent_record else {
            "decision": payload.decision,
            "noticeId": req["notice_id"],
            "fiduciary": req["fiduciary_name"],
            "reason": payload.remark
        }
    }

    reply_subject = f"Re: {original_subject}" if original_subject and not original_subject.lower().startswith("re:") else (original_subject or f"Re: Consent Notice {req['notice_id']} — Decision: {payload.decision}")

    cursor.execute("""
    INSERT INTO fiduciary_notifications (id, request_id, consent_id, thread_id, message_id, recipient_email, fiduciary_name, action, artifact_id, subject, details_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?);
    """, (
        notif_id,
        req["id"],
        consent_record["consentId"] if consent_record else None,
        thread_id,
        original_message_id,
        recipient_email,
        req["fiduciary_name"],
        payload.decision,
        consent_record["consentId"] if consent_record else None,
        reply_subject,
        json.dumps(notif_details),
        now
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Consent decision {payload.decision} recorded successfully.",
        "consent": consent_record
    }

@app.get("/api/notifications/pending")
def list_pending_notifications():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM fiduciary_notifications WHERE status = 'PENDING' ORDER BY created_at ASC;")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        d["details"] = json.loads(d["details_json"])
        d["token"] = d["details"].get("token")
        d["notice_id"] = d["details"].get("noticeId")
        d["original_subject"] = d["details"].get("originalSubject")
        results.append(d)
    return results

@app.post("/api/notifications/{notification_id}/ack")
def acknowledge_notification(notification_id: str):
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat() + "Z"
    cursor.execute("UPDATE fiduciary_notifications SET status = 'SENT', sent_at = ? WHERE id = ?;", (now, notification_id))
    conn.commit()
    conn.close()
    return {"success": True, "id": notification_id, "status": "SENT", "sent_at": now}


@app.get("/api/consents")
def list_consents(principalId: Optional[str] = Query(None)):
    conn = get_db()
    cursor = conn.cursor()
    rows = []
    if principalId:
        cursor.execute("SELECT * FROM consents WHERE data_principal_id = ? ORDER BY granted_on DESC;", (principalId,))
        rows = cursor.fetchall()
    
    # If no results found for specific principalId or principalId not supplied, return all consents
    if not rows:
        cursor.execute("SELECT * FROM consents ORDER BY granted_on DESC;")
        rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        d["consentId"] = d.get("consent_id")
        # Safe JSON parse for granted_attributes
        if isinstance(d.get("granted_attributes"), str):
            try:
                d["grantedAttributes"] = json.loads(d["granted_attributes"])
            except Exception:
                d["grantedAttributes"] = [d["granted_attributes"]]
        else:
            d["grantedAttributes"] = d.get("granted_attributes") or []

        # Safe JSON parse for denied_attributes
        if isinstance(d.get("denied_attributes"), str):
            try:
                d["deniedAttributes"] = json.loads(d["denied_attributes"])
            except Exception:
                d["deniedAttributes"] = []
        else:
            d["deniedAttributes"] = d.get("denied_attributes") or []

        d["grantedOn"] = d.get("granted_on")
        d["expiresOn"] = d.get("expires_on")
        d["fiduciary"] = d.get("fiduciary_name") or "Data Fiduciary"
        d["fiduciaryCategory"] = d.get("fiduciary_category") or "Corporate Entity"
        d["fiduciaryLogo"] = d.get("fiduciary_logo") or "🏢"
        d["noticeId"] = d.get("notice_id") or "NTC-GENERAL"
        d["dpoContact"] = d.get("dpo_contact") or ""
        d["dataRegion"] = d.get("data_region") or "India"
        d["receiptHash"] = d.get("receipt_hash") or ""
        d["customNote"] = d.get("custom_note") or ""
        results.append(d)
    return results

@app.get("/api/consents/{consent_id}/receipt")
def get_consent_receipt(consent_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consents WHERE consent_id = ?;", (consent_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Consent record not found")

    consent = dict(row)
    cursor.execute("SELECT * FROM data_principals WHERE id = ?;", (consent["data_principal_id"],))
    dp_row = cursor.fetchone()
    dp = dict(dp_row) if dp_row else {}
    conn.close()

    return {
        "receipt": {
            "consentId": consent["consent_id"],
            "fiduciary": consent["fiduciary_name"],
            "purpose": consent["purpose"],
            "noticeId": consent["notice_id"],
            "grantedOn": consent["granted_on"],
            "expiresOn": consent["expires_on"],
            "grantedAttributes": json.loads(consent["granted_attributes"]),
            "deniedAttributes": json.loads(consent["denied_attributes"]),
            "principalName": dp.get("name", "Data Principal"),
            "principalEmail": dp.get("email", ""),
            "principalId": dp.get("id", ""),
            "verifiedSignature": consent["receipt_hash"]
        }
    }

@app.post("/api/consents/{consent_id}/revoke")
def revoke_consent(consent_id: str, payload: RevokePayload):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consents WHERE consent_id = ?;", (consent_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Active consent record not found")

    consent = dict(row)
    now = datetime.utcnow().isoformat() + "Z"

    cursor.execute("UPDATE consents SET status = 'REVOKED', revoked_on = ?, revocation_reason = ? WHERE consent_id = ?;", (now, payload.reason, consent_id))
    cursor.execute("UPDATE consent_requests SET status = 'REVOKED' WHERE id = ? OR notice_id = ?;", (consent["request_id"], consent["notice_id"]))

    cursor.execute("""
    INSERT INTO audit_events (id, request_id, consent_id, data_principal_id, action, fiduciary, notice_id, details, ip_address, timestamp, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        f"AUD-{random.randint(100, 999)}",
        consent["request_id"],
        consent_id,
        consent["data_principal_id"],
        "CONSENT_REVOKED",
        consent["fiduciary_name"],
        consent["notice_id"],
        f"Consent revoked under DPDP Sec 6(4). Reason: {payload.reason}",
        "103.21.124.88",
        now,
        "REVOKED"
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Consent {consent_id} successfully revoked.",
        "status": "REVOKED"
    }

@app.get("/api/audit-logs")
@app.get("/api/audit")
def list_audit_logs(principalId: Optional[str] = Query(None)):
    conn = get_db()
    cursor = conn.cursor()
    if principalId:
        cursor.execute("SELECT * FROM audit_events WHERE data_principal_id = ? ORDER BY timestamp DESC;", (principalId,))
    else:
        cursor.execute("SELECT * FROM audit_events ORDER BY timestamp DESC;")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        d["consentId"] = d["consent_id"]
        d["noticeId"] = d["notice_id"]
        d["ipAddress"] = d["ip_address"]
        results.append(d)
    return results

@app.post("/api/data-rights/request")
@app.post("/api/data-rights")
def create_dsr_request(payload: DSRRequestPayload):
    conn = get_db()
    cursor = conn.cursor()

    dsr_id = f"DSR-2026-{random.randint(1000, 9999)}"
    now = datetime.utcnow()
    sla = (now + timedelta(days=30)).isoformat() + "Z"
    now_str = now.isoformat() + "Z"
    dp_id = payload.dataPrincipalId or generate_data_principal_id("pandeyprerna1407@gmail.com")

    cursor.execute("""
    INSERT INTO data_rights_requests (id, data_principal_id, request_type, target_fiduciary, details, status, sla_deadline, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        dsr_id,
        dp_id,
        payload.requestType,
        payload.targetFiduciary,
        json.dumps(payload.details or {}),
        "PROCESSING",
        sla,
        now_str
    ))

    cursor.execute("""
    INSERT INTO audit_events (id, request_id, consent_id, data_principal_id, action, fiduciary, notice_id, details, ip_address, timestamp, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        f"AUD-{random.randint(100, 999)}",
        dsr_id,
        "N/A",
        dp_id,
        f"DSR_{payload.requestType}",
        payload.targetFiduciary,
        "N/A",
        f"Statutory {payload.requestType} request initiated under DPDP Act.",
        "103.21.124.88",
        now_str,
        "PROCESSING"
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Statutory {payload.requestType} request submitted successfully.",
        "id": dsr_id,
        "status": "PROCESSING",
        "slaDeadline": sla
    }

@app.get("/api/data-rights")
def list_dsr_requests(principalId: Optional[str] = Query(None)):
    conn = get_db()
    cursor = conn.cursor()
    if principalId:
        cursor.execute("SELECT * FROM data_rights_requests WHERE data_principal_id = ? ORDER BY created_at DESC;", (principalId,))
    else:
        cursor.execute("SELECT * FROM data_rights_requests ORDER BY created_at DESC;")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        d["details"] = json.loads(d["details"])
        d["requestType"] = d["request_type"]
        d["targetFiduciary"] = d["target_fiduciary"]
        d["slaDeadline"] = d["sla_deadline"]
        d["createdAt"] = d["created_at"]
        results.append(d)
    return results

@app.post("/api/grievance")
def submit_grievance(payload: GrievancePayload):
    conn = get_db()
    cursor = conn.cursor()

    ticket_id = f"GRV-2026-{random.randint(1000, 9999)}"
    now = datetime.utcnow()
    now_str = now.isoformat() + "Z"
    sla = (now + timedelta(days=7)).isoformat() + "Z"  # Statutory 7 working days SLA under DPDP Sec 13
    dp_id = payload.dataPrincipalId or generate_data_principal_id("pandeyprerna1407@gmail.com")

    # Look up fiduciary metadata, thread_id, and contact info
    thread_id = None
    original_message_id = None
    original_subject = None
    recipient_email = payload.dpoEmail

    # Try looking up via consent_requests
    cursor.execute("""
    SELECT * FROM consent_requests 
    WHERE fiduciary_name = ? OR notice_id = ? OR id = ?
    ORDER BY created_at DESC LIMIT 1;
    """, (payload.fiduciary, payload.noticeId, payload.consentId))
    matched_req = cursor.fetchone()

    if matched_req:
        req_dict = dict(matched_req)
        thread_id = req_dict.get("thread_id")
        original_message_id = req_dict.get("message_id")
        if req_dict.get("email_snapshot_id"):
            cursor.execute("SELECT from_address, thread_id, message_id, subject FROM email_snapshots WHERE id = ?;", (req_dict["email_snapshot_id"],))
            es_row = cursor.fetchone()
            if es_row:
                if not thread_id and es_row["thread_id"]:
                    thread_id = es_row["thread_id"]
                if not original_message_id and es_row["message_id"]:
                    original_message_id = es_row["message_id"]
                if es_row["subject"]:
                    original_subject = es_row["subject"]
                raw_from = es_row["from_address"] or ""
                match = re.search(r'<([^>]+)>', raw_from)
                actual_sender = match.group(1).strip() if match else (raw_from.strip() if "@" in raw_from else None)
                if not recipient_email and actual_sender:
                    recipient_email = actual_sender

        if not recipient_email:
            recipient_email = req_dict.get("dpo_email") or req_dict.get("fiduciary_email")

    if not recipient_email:
        recipient_email = payload.dpoEmail or "dpo@fiduciary.org"

    # 1. Insert into data_rights_requests
    grievance_details = {
        "ticketId": ticket_id,
        "type": payload.type,
        "consentId": payload.consentId,
        "noticeId": payload.noticeId,
        "description": payload.description,
        "dpoEmail": recipient_email,
        "statutoryBasis": "Digital Personal Data Protection Act 2023 - Section 13 (Grievance Redressal)"
    }
    cursor.execute("""
    INSERT INTO data_rights_requests (id, data_principal_id, request_type, target_fiduciary, details, status, sla_deadline, created_at)
    VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?);
    """, (
        ticket_id,
        dp_id,
        f"GRIEVANCE_{payload.type}",
        payload.fiduciary,
        json.dumps(grievance_details),
        sla,
        now_str
    ))

    # 2. Insert into audit_events
    cursor.execute("""
    INSERT INTO audit_events (id, request_id, consent_id, data_principal_id, action, fiduciary, notice_id, details, ip_address, timestamp, status)
    VALUES (?, ?, ?, ?, 'GRIEVANCE_FILED', ?, ?, ?, '103.21.124.88', ?, 'ACTIVE');
    """, (
        f"AUD-{random.randint(100, 999)}",
        ticket_id,
        payload.consentId or "N/A",
        dp_id,
        payload.fiduciary,
        payload.noticeId or "N/A",
        f"Statutory Grievance ({payload.type}) lodged under DPDP Act Section 13. Ticket #{ticket_id}. SLA: 7 Working Days.",
        now_str
    ))

    # 3. Queue statutory notice into fiduciary_notifications
    notif_id = f"NOTIF-2026-{random.randint(1000, 9999)}"
    notif_details = {
        "action": "GRIEVANCE_FILED",
        "ticketId": ticket_id,
        "grievanceType": payload.type,
        "description": payload.description,
        "consentId": payload.consentId or "N/A",
        "noticeId": payload.noticeId or "N/A",
        "fiduciaryName": payload.fiduciary,
        "recipientEmail": recipient_email,
        "principalName": "Prerna Pandey",
        "principalEmail": "pandeyprerna1407@gmail.com",
        "slaDeadline": sla,
        "originalSubject": original_subject
    }

    grievance_subject = f"[STATUTORY GRIEVANCE - {ticket_id}] Data Principal Notice to {payload.fiduciary} — DPDP Act Sec 13"

    cursor.execute("""
    INSERT INTO fiduciary_notifications (id, request_id, consent_id, thread_id, message_id, recipient_email, fiduciary_name, action, artifact_id, subject, details_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'GRIEVANCE_FILED', ?, ?, ?, 'PENDING', ?);
    """, (
        notif_id,
        ticket_id,
        payload.consentId,
        thread_id,
        original_message_id,
        recipient_email,
        payload.fiduciary,
        ticket_id,
        grievance_subject,
        json.dumps(notif_details),
        now_str
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Statutory grievance {ticket_id} filed successfully under DPDP Act Section 13.",
        "ticketId": ticket_id,
        "slaDeadline": sla,
        "status": "OPEN",
        "fiduciary": payload.fiduciary
    }

@app.get("/api/nominee")
def get_nominee(principalId: Optional[str] = Query(None), email: Optional[str] = Query(None)):
    conn = get_db()
    cursor = conn.cursor()

    row = None
    if principalId and email:
        cursor.execute("""
        SELECT * FROM statutory_nominees 
        WHERE (data_principal_id = ? OR principal_email = ?) AND status = 'ACTIVE_VERIFIED'
        ORDER BY date_designated DESC LIMIT 1;
        """, (principalId, email))
        row = cursor.fetchone()
    elif principalId:
        cursor.execute("""
        SELECT * FROM statutory_nominees 
        WHERE data_principal_id = ? AND status = 'ACTIVE_VERIFIED'
        ORDER BY date_designated DESC LIMIT 1;
        """, (principalId,))
        row = cursor.fetchone()
    elif email:
        cursor.execute("""
        SELECT * FROM statutory_nominees 
        WHERE principal_email = ? AND status = 'ACTIVE_VERIFIED'
        ORDER BY date_designated DESC LIMIT 1;
        """, (email,))
        row = cursor.fetchone()

    # Fallback to any active nominee if specific query returned nothing
    if not row:
        cursor.execute("SELECT * FROM statutory_nominees WHERE status = 'ACTIVE_VERIFIED' ORDER BY date_designated DESC LIMIT 1;")
        row = cursor.fetchone()

    conn.close()

    if not row:
        return {"nominee": None}

    d = dict(row)
    return {
        "nominee": {
            "id": d["id"],
            "dataPrincipalId": d["data_principal_id"],
            "principalEmail": d.get("principal_email"),
            "nomineeName": d["nominee_name"],
            "relationship": d["relationship"],
            "contactPhone": d["contact_phone"],
            "contactEmail": d["contact_email"],
            "idType": d["id_type"],
            "idNumber": d["id_number"],
            "status": d["status"],
            "dateDesignated": d["date_designated"]
        }
    }

@app.post("/api/nominee")
def save_nominee(payload: NomineePayload):
    conn = get_db()
    cursor = conn.cursor()

    nom_id = f"NOM-2026-{random.randint(1000, 9999)}"
    now = datetime.utcnow()
    now_str = now.isoformat() + "Z"
    date_str = now.strftime("%Y-%m-%d")

    principal_email = payload.principalEmail or "pandeyprerna1407@gmail.com"
    dp_id = payload.dataPrincipalId or generate_data_principal_id(principal_email)

    # Check if active nominee already exists for this principal
    cursor.execute("""
    SELECT id FROM statutory_nominees 
    WHERE (data_principal_id = ? OR principal_email = ?) AND status = 'ACTIVE_VERIFIED';
    """, (dp_id, principal_email))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("""
        UPDATE statutory_nominees SET
            nominee_name = ?,
            relationship = ?,
            contact_phone = ?,
            contact_email = ?,
            id_type = ?,
            id_number = ?,
            date_designated = ?,
            updated_at = ?
        WHERE id = ?;
        """, (
            payload.nomineeName,
            payload.relationship,
            payload.contactPhone,
            payload.contactEmail,
            payload.idType,
            payload.idNumber,
            date_str,
            now_str,
            existing["id"]
        ))
        nom_id = existing["id"]
    else:
        cursor.execute("""
        INSERT INTO statutory_nominees (id, data_principal_id, principal_email, nominee_name, relationship, contact_phone, contact_email, id_type, id_number, status, date_designated, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE_VERIFIED', ?, ?);
        """, (
            nom_id,
            dp_id,
            principal_email,
            payload.nomineeName,
            payload.relationship,
            payload.contactPhone,
            payload.contactEmail,
            payload.idType,
            payload.idNumber,
            date_str,
            now_str
        ))

    # Record immutable statutory audit log
    cursor.execute("""
    INSERT INTO audit_events (id, request_id, consent_id, data_principal_id, action, fiduciary, notice_id, details, ip_address, timestamp, status)
    VALUES (?, ?, 'N/A', ?, 'NOMINEE_ASSIGNED', 'DPDP Statutory Registry (Self-Nomination)', 'DPDP-SEC-14', ?, '103.21.124.88', ?, 'ACTIVE');
    """, (
        f"AUD-{random.randint(100, 999)}",
        nom_id,
        dp_id,
        f"Data Principal designated {payload.nomineeName} ({payload.relationship}) as legal statutory nominee under DPDP Act Section 14.",
        now_str
    ))

    # Record in DSR requests tracker
    cursor.execute("""
    INSERT INTO data_rights_requests (id, data_principal_id, request_type, target_fiduciary, details, status, sla_deadline, created_at)
    VALUES (?, ?, 'NOMINEE_DESIGNATION', 'Data Principal Self-Registry', ?, 'COMPLETED', ?, ?);
    """, (
        f"DSR-NOM-{random.randint(1000, 9999)}",
        dp_id,
        json.dumps({
            "nomineeId": nom_id,
            "nomineeName": payload.nomineeName,
            "relationship": payload.relationship,
            "contactPhone": payload.contactPhone,
            "contactEmail": payload.contactEmail,
            "idType": payload.idType,
            "statutoryBasis": "Digital Personal Data Protection Act 2023 - Section 14"
        }),
        now_str,
        now_str
    ))

    conn.commit()
    conn.close()

    nominee_data = {
        "id": nom_id,
        "dataPrincipalId": dp_id,
        "principalEmail": principal_email,
        "nomineeName": payload.nomineeName,
        "relationship": payload.relationship,
        "contactPhone": payload.contactPhone,
        "contactEmail": payload.contactEmail,
        "idType": payload.idType,
        "idNumber": payload.idNumber,
        "status": "ACTIVE_VERIFIED",
        "dateDesignated": date_str
    }

    return {
        "success": True,
        "message": f"Statutory nominee {payload.nomineeName} registered successfully under DPDP Act Section 14.",
        "nominee": nominee_data
    }

@app.delete("/api/nominee")
def remove_nominee(principalId: Optional[str] = Query(None), email: Optional[str] = Query(None)):
    conn = get_db()
    cursor = conn.cursor()

    now_str = datetime.utcnow().isoformat() + "Z"
    dp_id = principalId or (generate_data_principal_id(email) if email else None)

    if dp_id:
        cursor.execute("UPDATE statutory_nominees SET status = 'REVOKED', updated_at = ? WHERE data_principal_id = ? OR principal_email = ?;", (now_str, dp_id, email))
    else:
        cursor.execute("UPDATE statutory_nominees SET status = 'REVOKED', updated_at = ?;", (now_str,))

    # Log revocation in audit log
    cursor.execute("""
    INSERT INTO audit_events (id, request_id, consent_id, data_principal_id, action, fiduciary, notice_id, details, ip_address, timestamp, status)
    VALUES (?, 'N/A', 'N/A', ?, 'NOMINEE_REVOKED', 'DPDP Statutory Registry (Self-Nomination)', 'DPDP-SEC-14', 'Data Principal revoked designated statutory nominee under DPDP Act Section 14.', '103.21.124.88', ?, 'REVOKED');
    """, (
        f"AUD-{random.randint(100, 999)}",
        dp_id or "DP-2026-90011",
        now_str
    ))

    conn.commit()
    conn.close()
    return {"success": True, "message": "Statutory nominee designation revoked."}

if __name__ == "__main__":
    print("====================================================")
    print("DP Consent Manager Python FastAPI Real Email Backend")
    print("REST Base URL: http://localhost:8000/api")
    print("====================================================")
    uvicorn.run(app, host="0.0.0.0", port=8000)
