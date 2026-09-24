import socket
import os
import re
import json
import hmac
import random
import logging
import mimetypes
import threading
import urllib.request
import uvicorn
from typing import Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException, Query, Path, Depends, Header, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

logger = logging.getLogger(__name__)


def get_hosted_base_url(request: Optional[Request] = None) -> str:
    """
    Resolves the reachable base URL for the hosted application.
    Prioritizes explicit non-localhost APP_BASE_URL from environment,
    or falls back to detecting the host machine's LAN IP address so links
    in emails work on devices connected to the same Wi-Fi/network.
    """
    env_base = (os.getenv("APP_BASE_URL") or "").strip().rstrip("/")
    if env_base and not ("localhost" in env_base or "127.0.0.1" in env_base):
        return env_base

    if request:
        host_header = request.headers.get("host")
        if host_header and not (host_header.startswith("localhost") or host_header.startswith("127.0.0.1")):
            proto = request.headers.get("x-forwarded-proto", "http")
            return f"{proto}://{host_header}".rstrip("/")

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        host_ip = s.getsockname()[0]
        s.close()
        if host_ip and host_ip != "127.0.0.1":
            port = os.getenv("PORT", "8000")
            return f"http://{host_ip}:{port}"
    except Exception:
        pass

    return env_base or f"http://localhost:{os.getenv('PORT', '8000')}"

from consent_intent_detector import (
    detect_consent_intent,
    CONSENT_REQUEST,
    NOT_CONSENT,
    AMBIGUOUS
)
from database import (
    get_db, 
    init_db, 
    generate_sha256_signature, 
    generate_data_principal_id, 
    generate_unpredictable_token,
    get_user_by_email,
    get_user_by_id,
    create_user_account,
    link_or_create_data_principal,
    normalize_email_address
)
from auth import (
    hash_password,
    verify_password,
    validate_password_strength,
    create_access_token,
    get_current_user,
    get_optional_user,
    require_role
)
from email_service import send_consent_invite
from models import (
    DecisionPayload, 
    RevokePayload, 
    DSRRequestPayload, 
    ConsentRequestCreatePayload, 
    EmailIngestPayload, 
    GrievancePayload, 
    NomineePayload,
    UserRegisterPayload,
    AdminUserProvisionPayload,
    UserLoginPayload,
    AuthResponse,
    UserOut
)

# Initialize database tables and seed records
init_db()

app = FastAPI(
    title="Data Principal Consent Manager - Real Gmail Webhook Integration Backend",
    description="DPDP Act 2023 Compliant Python FastAPI REST API Backend with Real Gmail Webhook Ingestion & Context Resolution",
    version="1.5.0"
)

# CORS configuration supporting frontend integration with credentials
cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]
env_origins = os.getenv("ALLOWED_ORIGINS", "")
if env_origins:
    for o in env_origins.split(","):
        clean_o = o.strip()
        if clean_o and clean_o not in cors_origins:
            cors_origins.append(clean_o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── SINGLE-PORT ASSETS CONFIGURATION ─────────────────────────────────────────
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))
ASSETS_DIR = os.path.join(DIST_DIR, "assets")

if os.path.isdir(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

# ── ADMIN / DEBUG FIELD GUARD ─────────────────────────────────────────────────
# Fields that are backend/admin-debug only and must NEVER be returned to
# Data Principal or Data Fiduciary-facing API responses.
_ADMIN_ONLY_FIELDS = frozenset({
    "intent_score", "intentScore",
    "intent_classification", "intentClassification",
    "intent_reasons", "intentReasons",
})


def strip_admin_fields(response):
    """Remove internal intent metadata, including nested snapshots and attributes."""
    if isinstance(response, dict):
        for field in _ADMIN_ONLY_FIELDS:
            response.pop(field, None)
        for value in response.values():
            strip_admin_fields(value)
    elif isinstance(response, list):
        for value in response:
            strip_admin_fields(value)
    return response


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

    # Keep database metadata internal by default. Only the protected Gmail
    # webhook explicitly adds intent debugging metadata to its response.
    return strip_admin_fields(req)

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

def _has_kw(text: str, keywords: list) -> bool:
    """Check if any keyword or phrase exists in text with word boundaries."""
    for kw in keywords:
        pattern = r'\b' + re.escape(kw.lower()).replace(r'\ ', r'\s+') + r'\b'
        if re.search(pattern, text):
            return True
    return False


def detect_domain_from_content(subject: str, body: str) -> str:
    """
    Detect the business domain/sector from actual email subject + body text.
    Uses strict word boundaries to eliminate false-positive substring collisions
    (such as 'emi' matching inside 'academic').
    """
    text = (subject + " " + body).lower()

    # 1. Education & Academic Services (Prioritized: university, institute, academic records)
    education_keywords = [
        "education", "educational", "institute", "institution", "university",
        "college", "student", "academic", "enrollment", "enrolment",
        "examination", "exam result", "certificate", "scholarship",
        "placement", "school", "admission", "degree", "marksheet",
        "transcript", "alumni", "campus", "tuition", "curriculum", "faculty",
        "semester", "coursework"
    ]
    if _has_kw(text, education_keywords):
        return "Education"

    # 2. Healthcare & Diagnostic Services
    healthcare_keywords = [
        "hospital", "medical", "health insurance", "diagnosis", "prescription",
        "lab report", "clinic", "doctor", "patient", "treatment", "mediclaim",
        "healthcare", "pathology", "diagnostic", "radiology"
    ]
    if _has_kw(text, healthcare_keywords):
        return "Healthcare"

    # 3. EPFO / Statutory Payroll
    payroll_keywords = [
        "uan", "provident fund", "epfo", "pf account", "payroll", "esic",
        "gratuity", "employee provident"
    ]
    if _has_kw(text, payroll_keywords):
        return "EPFO / Payroll"

    # 4. FinTech & Digital Lending (Word boundaries prevent 'emi' substring collisions)
    fintech_keywords = [
        "loan", "cibil", "lending", "credit line", "emi", "fintech",
        "nbfc", "credit score", "borrower", "disburse", "instant credit"
    ]
    if _has_kw(text, fintech_keywords):
        return "FinTech"

    # 5. Banking & Financial Services
    banking_keywords = [
        "savings account", "fixed deposit", "neft", "rtgs", "rbi guideline",
        "banking", "demat", "current account", "bank account", "ifsc"
    ]
    if _has_kw(text, banking_keywords):
        return "Banking"

    # 6. Insurance & Coverage
    insurance_keywords = [
        "insurance policy", "premium", "tpa", "claim settlement", "insurance coverage"
    ]
    if _has_kw(text, insurance_keywords):
        return "Insurance"

    # 7. E-Commerce & Retail Logistics
    ecom_keywords = [
        "order", "shipping", "delivery address", "ecommerce", "e-commerce",
        "checkout", "cart", "retail"
    ]
    if _has_kw(text, ecom_keywords):
        return "E-Commerce"

    # 8. Corporate HR & Employment Onboarding
    hr_keywords = [
        "background verification", "bgv", "degree verification", "employment onboarding",
        "hr department", "hiring", "experience letter", "relieving letter"
    ]
    if _has_kw(text, hr_keywords):
        return "Corporate HR"

    # 9. Government & Public Administration
    govt_keywords = [
        "gst", "income tax", "government scheme", "ministry", "ration card", "voter id"
    ]
    if _has_kw(text, govt_keywords):
        return "Government"

    # 10. Neutral General Fallback (Requirement 5: Never FinTech)
    return "General"


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
    Ensures institutional name is returned instead of personal names.
    """
    token_lower = (token or "").lower()
    full_text = f"{subject} {body}"
    text_lower = full_text.lower()
    fiduciary_clean = (fiduciary or "").strip()

    # 1. Education institution detection from content takes precedence
    if domain == "Education" or "edu" in token_lower or _has_kw(text_lower, ["university", "college", "institute", "school", "academy"]):
        inst_match = re.search(r'([A-Z][A-Za-z0-9\s&]+(?:Institute of Technology|Institute|University|College|Academy|School))', full_text)
        if inst_match:
            candidate = inst_match.group(1).strip()
            if len(candidate) > 4:
                return candidate
        if not fiduciary_clean or any(p in fiduciary_clean.lower() for p in ["prerna", "pandey", "manu", "sharma", "@", "unknown", "data fiduciary", "test", "student"]):
            return "ABC Institute of Technology"

    # 2. If an institutional organization was explicitly provided (and is not an individual person or email)
    is_personal_name = any(p in fiduciary_clean.lower() for p in [
        "prerna", "pandey", "manu", "sharma", "@", "unknown", "data fiduciary", "test", "admin", "user", "student"
    ])
    if fiduciary_clean and not is_personal_name and len(fiduciary_clean) > 2:
        return fiduciary_clean

    # Detect specific real banks if mentioned in text
    if any(kw in text_lower for kw in ["hdfc bank", "hdfc"]):
        return "HDFC Bank"
    if any(kw in text_lower for kw in ["icici bank", "icici"]):
        return "ICICI Bank"
    if any(kw in text_lower for kw in ["state bank of india", "sbi"]):
        return "State Bank of India"
    if any(kw in text_lower for kw in ["axis bank", "axis"]):
        return "Axis Bank"
    if any(kw in text_lower for kw in ["kotak mahindra", "kotak bank", "kotak"]):
        return "Kotak Mahindra Bank"
    if any(kw in text_lower for kw in ["punjab national bank", "pnb"]):
        return "Punjab National Bank"
    if any(kw in text_lower for kw in ["bank of baroda", "bob"]):
        return "Bank of Baroda"

    # FinTech / Loan
    if "fintech" in token_lower or "loan" in token_lower or "credit" in token_lower or domain == "FinTech" or _has_kw(text_lower, ["cibil", "lending", "credit score"]):
        return "PayFlex Lending"

    # Banking link / domain check
    if "bank" in token_lower or domain == "Banking" or _has_kw(text_lower, ["savings account", "current account", "fixed deposit", "kyc verification", "rbi guideline", "bank account", "ifsc"]):
        return "ABC National Bank"

    # Healthcare
    if "health" in token_lower or "med" in token_lower or domain == "Healthcare" or _has_kw(text_lower, ["hospital", "clinic", "diagnosis", "mediclaim", "patient", "apollo"]):
        return "Apollo Care Hospital"

    # EPFO / PF
    if "pf" in token_lower or "uan" in token_lower or "provident" in token_lower or domain == "EPFO / Payroll" or _has_kw(text_lower, ["epfo", "provident fund", "uan"]):
        return "EPFO / Cialfor Payroll Cell"

    # E-Commerce
    if "ecom" in token_lower or "order" in token_lower or "retail" in token_lower or domain == "E-Commerce":
        return "ShopEase Retail"

    # Corporate HR / BGV
    if "bgv" in token_lower or "corp" in token_lower or "hr" in token_lower or domain == "Corporate HR" or _has_kw(text_lower, ["background verification", "onboarding"]):
        return "GlobalTech Solutions HR"

    if domain and domain not in ["General", "Corporate / Enterprise", "Corporate/Enterprise"]:
        return f"{domain} Enterprise"

    return "General Service Fiduciary"


def get_fiduciary_metadata(fiduciary_name: str, domain: str):
    """Return category and emoji logo appropriate for the institutional fiduciary."""
    name_low = fiduciary_name.lower()
    domain_low = (domain or "").lower()

    # Education (Prioritized for Academic Services)
    if "education" in domain_low or "academic" in domain_low or any(k in name_low for k in ["university", "college", "institute", "school", "academy"]):
        return "Education & Academic Services", "🎓"

    # Healthcare
    if "healthcare" in domain_low or "health" in domain_low or "hospital" in name_low or "care" in name_low:
        return "Healthcare & Diagnostic Services", "🏥"

    # FinTech
    if "fintech" in domain_low or "lending" in name_low or "fintech" in name_low or "payflex" in name_low:
        return "FinTech & Digital Lending", "💳"

    # Banking
    if "banking" in domain_low or "bank" in name_low:
        return "Banking & Financial Services", "🏦"

    # EPFO / Payroll
    if "epfo" in name_low or "payroll" in domain_low or "pf" in name_low:
        return "Statutory & Government Payroll", "💼"

    # E-Commerce
    if "retail" in name_low or "shopease" in name_low or "commerce" in domain_low:
        return "E-Commerce & Retail Logistics", "🛒"

    # Corporate HR
    if "hr" in name_low or "globaltech" in name_low or "corporate" in domain_low or "recruitment" in domain_low:
        return "Corporate HR & Recruitment", "🏢"

    # Government
    if "government" in domain_low or "ministry" in name_low:
        return "Government & Public Administration", "🏛️"

    # Insurance
    if "insurance" in domain_low or "insurance" in name_low:
        return "Insurance & Risk Services", "🛡️"

    # Requirement 5: Neutral General fallback (Never FinTech)
    return "General Corporate Services", "🏢"


def extract_attributes_from_email_content(subject: str, body: str, domain: str = None) -> list:
    """
    Universal DPDP-compliant attribute extractor.
    Reads the actual email subject + body text and dynamically identifies
    which personal data attributes are being requested.
    Uses strict word boundaries and full education sector support.
    """
    text = (subject + " " + body).lower()
    if not domain:
        domain = detect_domain_from_content(subject, body)

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

    # 1. Full Name (Always required)
    add("attr_name", "Full Name", "IDENTITY", True,
        "Official legal name of the Data Principal for verification and records", False)

    # 2. Date of Birth
    if _has_kw(text, ["date of birth", "dob", "birth date", "birthdate", "age proof"]) or domain == "Education":
        add("attr_dob", "Date of Birth", "IDENTITY", True,
            "Date of birth for age verification and statutory record-keeping", False)

    # 3. Mobile Number
    if _has_kw(text, ["phone", "mobile", "contact number", "cell", "telephone", "otp", "sms"]) or domain == "Education":
        add("attr_phone", "Mobile Number", "CONTACT", True,
            "Contact mobile number for communications, alerts, and 2FA", False)

    # 4. Email Address
    if _has_kw(text, ["email", "e-mail", "email address", "email id"]) or domain == "Education":
        add("attr_email_id", "Email Address", "CONTACT", True,
            "Official email address for correspondence and notices", False)

    # 5. Residential Address
    if _has_kw(text, ["address", "residential address", "home address", "permanent address", "delivery address", "shipping address", "pincode", "location proof"]) or domain == "Education":
        add("attr_address", "Residential Address", "CONTACT", True,
            "Permanent and residential address for correspondence and KYC", False)

    # 6. Enrollment Number (Education specific)
    if _has_kw(text, ["enrollment", "enrolment", "enrollment number", "enrolment number", "roll number", "roll no", "registration number", "student id", "matriculation", "hall ticket"]) or domain == "Education":
        add("attr_enrollment", "Enrollment Number", "ACADEMIC", True,
            "Unique student enrollment / registration identifier assigned by the institution", False)

    # 7. Academic Records (Education specific)
    if _has_kw(text, ["academic record", "academic records", "academic information", "transcript", "credit", "marksheet", "degree", "diploma", "gpa", "coursework", "qualification"]) or domain == "Education":
        add("attr_academic_records", "Academic Records", "ACADEMIC", True,
            "Transcripts, course credits, marksheet copies, and academic progress records", False)

    # 8. Examination Results (Education specific)
    if _has_kw(text, ["examination", "examination result", "examination results", "exam result", "exam results", "scorecard", "semester result", "evaluation", "grades", "board exam"]) or domain == "Education":
        add("attr_exam_results", "Examination Results", "ACADEMIC", True,
            "Semester examination scorecards, evaluation results, and official grade sheets", False)

    # 9. Identity Proof (Education / General KYC)
    if _has_kw(text, ["identity proof", "id proof", "govt id", "identity document", "aadhaar", "aadhar", "passport", "voter id", "driving license", "photo id", "government photo id"]) or domain == "Education":
        add("attr_identity_proof", "Identity Proof", "IDENTITY", True,
            "Official government-issued identity proof document for authentication", True)

    # 10. Placement Profile Details (Education specific)
    if _has_kw(text, ["placement", "placement profile", "placement profile details", "campus placement", "career portfolio", "resume", "cv", "internship", "job profile"]) or domain == "Education":
        add("attr_placement", "Placement Profile Details", "PROFESSIONAL", False,
            "Career portfolio, placement preferences, resume, and recruiter profile details", False, default_granted=True)

    # 11. Scholarship Details (Education specific)
    if _has_kw(text, ["scholarship", "financial aid", "stipend", "grant", "fellowship"]):
        add("attr_scholarship", "Scholarship & Financial Aid Records", "ACADEMIC", False,
            "Scholarship eligibility, disbursement records, and grant documentation", False, default_granted=True)

    # 12. PAN Card (Financial)
    if _has_kw(text, ["pan", "pan card", "permanent account number", "tax deduction", "form 60"]):
        add("attr_pan", "Permanent Account Number (PAN Card)", "FINANCIAL", True,
            "Government-issued tax identity document for financial compliance", True)

    # 13. Bank Account (Financial)
    if _has_kw(text, ["bank account", "account number", "ifsc", "savings account", "current account", "neft", "rtgs", "upi id", "bank details"]):
        add("attr_bank", "Bank Account Number & IFSC Code", "FINANCIAL", True,
            "Bank account details for payment processing and fund transfer", True)

    # 14. Bank Statement (Financial)
    if _has_kw(text, ["bank statement", "account statement", "6 month", "6-month", "bank passbook"]):
        add("attr_bank_stmt", "Bank Account Statement (6 Months)", "FINANCIAL", True,
            "Recent bank statement for income and transaction verification", True)

    # 15. CIBIL / Credit Score (Financial)
    if _has_kw(text, ["cibil", "credit score", "credit report", "experian", "equifax", "crif", "credit bureau"]):
        add("attr_cibil", "Credit Score Report (CIBIL / Experian)", "FINANCIAL", True,
            "Credit bureau score report for loan/credit eligibility assessment", True)

    # 16. UAN / PF / EPFO (Payroll)
    if _has_kw(text, ["uan", "universal account number", "provident fund", "pf account", "epfo", "employee provident"]):
        add("attr_uan", "Universal Account Number (UAN) & PF ID", "FINANCIAL", True,
            "EPFO UAN for Provident Fund account linking and management", True)

    # 17. Medical / Health (Healthcare)
    if _has_kw(text, ["medical record", "health record", "diagnostic", "lab report", "prescription", "treatment history", "patient record"]):
        add("attr_medical", "Medical Records & Diagnostic History", "HEALTH", True,
            "Medical records required for healthcare service and insurance processing", True)

    # 18. Health Insurance (Healthcare)
    if _has_kw(text, ["health insurance", "insurance policy", "tpa", "cashless", "mediclaim", "policy number"]):
        add("attr_insurance", "Health Insurance Policy Number", "HEALTH", True,
            "Insurance policy details for cashless treatment and claim processing", True)

    # 19. Background Verification (Corporate HR)
    if _has_kw(text, ["background verification", "bgv", "criminal check", "police verification", "employment verification"]):
        add("attr_bgv", "Background Verification & Criminal Record Check", "LEGAL/VERIFICATION", True,
            "Third-party background check for employment onboarding clearance", True)

    # 20. Prior Employment & Experience (Corporate HR)
    if _has_kw(text, ["experience letter", "relieving letter", "reference check", "prior employment", "work history"]):
        add("attr_prior_emp", "Prior Employment & Experience Records", "PROFESSIONAL", False,
            "Relieving letter and employment reference for background check", False, default_granted=True)

    # 21. Income Proof (Financial)
    if _has_kw(text, ["salary slip", "income proof", "salary statement", "ctc", "annual income", "itr", "form 16"]):
        add("attr_income", "Income Proof & Salary Records", "FINANCIAL", False,
            "Income documentation for financial eligibility and tax verification", True, default_granted=True)

    # 22. Payment Card (Financial)
    if _has_kw(text, ["credit card", "debit card", "card details", "payment method", "express checkout", "tokenized card"]):
        add("attr_card", "Tokenized Payment Card Details", "FINANCIAL", False,
            "RBI-compliant tokenized card data for express payment checkout", True, default_granted=False)

    # 23. Device & Location
    if _has_kw(text, ["device", "location data", "gps", "ip address", "device fingerprint", "anti-fraud"]):
        add("attr_device", "Device & Location Data", "DIGITAL", False,
            "Device fingerprint and location for fraud prevention and security", True, default_granted=True)

    # 24. Supporting Documents
    if _has_kw(text, ["supporting document", "records required", "proof required", "file upload", "attach document"]):
        add("attr_docs", "Supporting Documents & Records", "LEGAL/VERIFICATION", False,
            "Relevant supporting documents for requested service delivery", True, default_granted=True)

    # Fallback if sparse
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
    message_id: str = None,
    intent_score: int = None,
    intent_classification: str = None,
    intent_reasons: str = None
):
    cursor = conn.cursor()
    clean_msg_id = (message_id or "").strip()
    if clean_msg_id:
        cursor.execute("SELECT * FROM consent_requests WHERE message_id = ? ORDER BY created_at ASC LIMIT 1;", (clean_msg_id,))
        existing = cursor.fetchone()
        if existing:
            return existing

    parsed_name, norm_email = normalize_email_address(to_email or "pandeyprerna1407@gmail.com")
    dp_name = to_name or parsed_name or "Data Principal"
    dp_email = norm_email
    dp_id = link_or_create_data_principal(dp_email, dp_name)

    # ── UNIVERSAL EMAIL CONTENT ANALYSIS ─────────────────────────────────────
    # Domain, purpose, and attributes are extracted from the ACTUAL email
    # subject + body text. We no longer use token keywords to decide what
    # to show. The real email content drives everything.
    final_domain    = detect_domain_from_content(subject or "", body or "")
    final_subject   = subject or "Action Required: Data Processing Consent Notice"
    final_purpose   = purpose or extract_purpose_from_content(subject or "", body or "")
    final_fiduciary = resolve_fiduciary_name(token, final_domain, subject or "", body or "", fiduciary or "")
    final_category, final_logo = get_fiduciary_metadata(final_fiduciary, final_domain)

    # Intent detection metadata default if not explicitly provided
    if intent_score is None:
        det = detect_consent_intent(final_subject, body or "", final_fiduciary)
        intent_score = det["score"]
        intent_classification = det["classification"]
        intent_reasons = json.dumps(det["reasons"])

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
        subject or "", body or "", domain=final_domain
    )

    # 2. Create EmailSnapshot
    snapshot_id = f"ES-2026-CIALFOR-{int(datetime.utcnow().timestamp() * 1000)}-{random.randint(1000, 9999)}"
    cursor.execute("""
    INSERT INTO email_snapshots (id, from_address, to_address, subject, sent_date, body_text, attachment_name, attachment_size, dkim_status, spf_status, thread_id, message_id, intent_score, intent_classification, intent_reasons)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
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
        message_id,
        intent_score,
        intent_classification,
        intent_reasons
    ))

    # 3. Create ConsentRequest
    req_id = f"REQ-2026-CIALFOR-{int(datetime.utcnow().timestamp() * 1000)}-{random.randint(100, 999)}"
    notice_id = f"NTC-2026-CIALFOR-{int(datetime.utcnow().timestamp() * 1000)}-{random.randint(100, 999)}"
    now = datetime.utcnow().isoformat() + "Z"
    expires = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"

    cursor.execute("""
    INSERT INTO consent_requests (id, token, notice_id, data_principal_id, email_snapshot_id, fiduciary_name, fiduciary_category, fiduciary_logo, fiduciary_email, dpo_name, dpo_email, purpose, domain, legal_basis, validity_period, data_region, requested_attributes, status, created_at, expires_at, thread_id, message_id, intent_score, intent_classification, intent_reasons)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
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
        message_id,
        intent_score,
        intent_classification,
        intent_reasons
    ))

    conn.commit()

    cursor.execute("SELECT * FROM consent_requests WHERE id = ?;", (req_id,))
    return cursor.fetchone()

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "Python FastAPI DP Consent Manager Backend (Real Email Integration)",
        "security_features": ["cryptographic_tokens", "server_timestamps", "expiry_handling", "duplicate_prevention", "attribute_validation", "jwt_auth", "rbac"],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

# ── AUTHENTICATION & RBAC ENDPOINTS ──────────────────────────────────────────

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

@app.post("/api/auth/register", response_model=AuthResponse)
def register_user(payload: UserRegisterPayload):
    # 1. Required fields check
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Full name is required.")
    if not payload.email or not payload.email.strip():
        raise HTTPException(status_code=400, detail="Email address is required.")
    if not payload.password:
        raise HTTPException(status_code=400, detail="Password is required.")

    # 2. Email format validation
    normalized_email = payload.email.strip().lower()
    if not re.match(EMAIL_REGEX, normalized_email):
        raise HTTPException(status_code=422, detail="Invalid email address format.")

    # 3. Duplicate email check
    existing = get_user_by_email(normalized_email)
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email address already exists.")

    # 4. Password strength validation
    valid_pwd, pwd_error = validate_password_strength(payload.password)
    if not valid_pwd:
        raise HTTPException(status_code=422, detail=pwd_error)

    # 5. Strict Role Enforcement: Public self-registration is strictly restricted to DATA_PRINCIPAL
    role_input = (payload.role or "DATA_PRINCIPAL").strip().upper()
    if role_input not in ["DATA_PRINCIPAL", "PRINCIPAL", "CITIZEN", ""]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public self-registration is strictly restricted to Data Principals. Data Fiduciary / Admin accounts cannot be self-registered and must be provisioned by a system administrator."
        )

    role = "DATA_PRINCIPAL"
    dp_id = link_or_create_data_principal(normalized_email, payload.name.strip())
    fiduciary_name = None

    # 6. Secure password hashing with bcrypt
    pw_hash = hash_password(payload.password)

    # 7. Create user account
    user_row = create_user_account(
        name=payload.name.strip(),
        email=normalized_email,
        password_hash=pw_hash,
        role=role,
        data_principal_id=dp_id,
        fiduciary_name=fiduciary_name
    )

    # 8. Issue JWT
    token = create_access_token({
        "sub": user_row["id"],
        "email": user_row["email"],
        "role": user_row["role"],
        "dp_id": user_row.get("data_principal_id"),
        "name": user_row["name"]
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_row
    }


@app.post("/api/auth/login", response_model=AuthResponse)
def login_user(payload: UserLoginPayload):
    if not payload.email or not payload.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    normalized_email = payload.email.strip().lower()
    user = get_user_by_email(normalized_email)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = create_access_token({
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "dp_id": user.get("data_principal_id"),
        "name": user["name"]
    })

    user_clean = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "data_principal_id": user.get("data_principal_id"),
        "fiduciary_name": user.get("fiduciary_name"),
        "created_at": user.get("created_at")
    }

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_clean
    }


@app.get("/api/auth/me")
def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    return {
        "user": {
            "id": current_user["id"],
            "name": current_user["name"],
            "email": current_user["email"],
            "role": current_user["role"],
            "data_principal_id": current_user.get("data_principal_id"),
            "fiduciary_name": current_user.get("fiduciary_name"),
            "created_at": current_user.get("created_at")
        }
    }


@app.post("/api/admin/users/provision", response_model=AuthResponse)
def provision_fiduciary_user(
    payload: AdminUserProvisionPayload,
    current_user: dict = Depends(require_role(["DATA_FIDUCIARY", "ADMIN"]))
):
    """
    Controlled administrative endpoint to provision Data Fiduciary or Admin accounts.
    Accessible only by authenticated administrators / data fiduciaries.
    """
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Full name is required.")
    if not payload.email or not payload.email.strip():
        raise HTTPException(status_code=400, detail="Email address is required.")
    if not payload.password:
        raise HTTPException(status_code=400, detail="Password is required.")

    normalized_email = payload.email.strip().lower()
    if not re.match(EMAIL_REGEX, normalized_email):
        raise HTTPException(status_code=422, detail="Invalid email address format.")

    existing = get_user_by_email(normalized_email)
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email address already exists.")

    valid_pwd, pwd_error = validate_password_strength(payload.password)
    if not valid_pwd:
        raise HTTPException(status_code=422, detail=pwd_error)

    role_input = payload.role.strip().upper()
    if role_input not in ["DATA_FIDUCIARY", "ADMIN", "DATA_PRINCIPAL"]:
        raise HTTPException(status_code=422, detail="Invalid role specified. Must be DATA_FIDUCIARY or ADMIN.")

    dp_id = None
    fiduciary_name = None
    if role_input == "DATA_PRINCIPAL":
        dp_id = link_or_create_data_principal(normalized_email, payload.name.strip())
    else:
        fiduciary_name = payload.fiduciary_name.strip() if payload.fiduciary_name else (current_user.get("fiduciary_name") or "Cialfor Research Labs Private Limited")

    pw_hash = hash_password(payload.password)
    user_row = create_user_account(
        name=payload.name.strip(),
        email=normalized_email,
        password_hash=pw_hash,
        role=role_input,
        data_principal_id=dp_id,
        fiduciary_name=fiduciary_name
    )

    token = create_access_token({
        "sub": user_row["id"],
        "email": user_row["email"],
        "role": user_row["role"],
        "dp_id": user_row.get("data_principal_id"),
        "name": user_row["name"]
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_row
    }


# ── GMAIL SYNC & INGESTION (SERVER-TO-SERVER AUTHENTICATION) ──────────────────

def verify_webhook_secret(
    x_webhook_secret: Optional[str] = Header(None, alias="X-Webhook-Secret"),
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> bool:
    """
    Authenticate server-to-server webhook requests from Google Apps Script.
    Requires GMAIL_WEBHOOK_SECRET from the environment.
    Fails securely if GMAIL_WEBHOOK_SECRET is not configured.
    """
    expected_secret = os.getenv("GMAIL_WEBHOOK_SECRET")
    if not expected_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error: GMAIL_WEBHOOK_SECRET environment variable is not configured."
        )

    provided_secret = None
    if x_webhook_secret:
        provided_secret = x_webhook_secret.strip()
    elif authorization and authorization.startswith("Bearer "):
        provided_secret = authorization.split("Bearer ", 1)[1].strip()

    if not provided_secret or not hmac.compare_digest(provided_secret, expected_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Missing or invalid server-to-server webhook secret."
        )
    return True


def is_system_generated_email(
    from_address: Optional[str] = "",
    subject: Optional[str] = "",
    body_text: Optional[str] = "",
    fiduciary_name: Optional[str] = ""
) -> tuple[bool, str]:
    """
    Defense-in-depth guard:
    Detects whether an incoming email was generated by our own DPDP Privacy Portal / system
    (e.g., status reply receipts, DP statutory notifications, privacy grievance notices)
    rather than being a genuine incoming consent request from a third-party Data Fiduciary.
    """
    from_str = (from_address or "").strip().lower()
    subj_str = (subject or "").strip()
    body_str = (body_text or "").strip()
    fid_str = (fiduciary_name or "").strip().lower()

    # 1. Sender or fiduciary matches system identity
    if "dpdp privacy portal" in fid_str:
        return True, "fiduciary_name_is_dpdp_privacy_portal"
    if "dpdp privacy portal" in from_str:
        return True, "sender_is_dpdp_privacy_portal"

    # 2. Portal signature phrases in body
    portal_signatures = [
        "DIGITAL CONSENT STATUS UPDATE",
        "SHA-256 Integrity Hash",
        "Generated by Data Principal Consent Manager",
        "Secured by Data Principal Consent Manager",
        "Dispatched via Data Principal Consent Manager",
        "=== PRIVACY GRIEVANCE NOTICE ===",
    ]
    for marker in portal_signatures:
        if marker.lower() in body_str.lower():
            clean_marker = marker.replace(" ", "_").replace("=", "").lower()
            return True, f"contains_marker_{clean_marker}"

    # 3. Subject starts with "Re:" AND body/subject contains explicit consent decision badges
    if re.match(r"^re:\s*", subj_str, re.IGNORECASE):
        reply_markers = [
            "CONSENT GRANTED",
            "CONSENT DENIED",
            "DPDP Consent Response",
            "Digital Consent Status Confirmation",
        ]
        for marker in reply_markers:
            if marker.lower() in body_str.lower() or marker.lower() in subj_str.lower():
                clean_marker = marker.replace(" ", "_").lower()
                return True, f"reply_with_marker_{clean_marker}"

    # 4. Automated DP statutory notification dispatched by sync script
    if re.match(r"^new consent request:", subj_str, re.IGNORECASE):
        if "automated statutory notice under the digital personal data protection" in body_str.lower():
            return True, "automated_dp_statutory_notice"

    return False, ""


@app.post("/api/gmail-webhook")
def sync_gmail_webhook(
    payload: EmailIngestPayload,
    _authorized: bool = Depends(verify_webhook_secret)
):
    # NOTE: Gmail AppScript integration is deprecated. This endpoint is kept
    # for backward-compatibility but the primary flow now uses Resend email
    # invites sent directly from /api/consent-requests. The endpoint still
    # processes any incoming Gmail webhook calls if they arrive.
    # 1. Defense-in-depth guard: Ignore system-generated receipts/replies/notifications
    is_sys, sys_reason = is_system_generated_email(
        from_address=payload.from_address,
        subject=payload.subject,
        body_text=payload.body_text,
        fiduciary_name=payload.fiduciary_name
    )
    if is_sys:
        return {
            "ignored": True,
            "reason": "system_generated_message",
            "detail": sys_reason
        }

    # 2. Consent Intent Detector:
    # Requires contextual evidence; keyword matches alone must not create requests.
    intent_result = detect_consent_intent(
        subject=payload.subject or "",
        body=payload.body_text or "",
        sender=payload.from_address or "",
        fiduciary_name=payload.fiduciary_name or ""
    )

    logger.info(
        f"[INTENT-DETECTOR] Subject: '{payload.subject}' -> "
        f"Classification: {intent_result['classification']}, "
        f"Score: {intent_result['score']}, Confidence: {intent_result['confidence']}, "
        f"Reasons: {intent_result['reasons']}"
    )

    if not intent_result["is_consent_request"]:
        return {
            "ignored": True,
            "reason": f"intent_{intent_result['classification'].lower()}",
            "detail": intent_result["reasons"],
            "classification": intent_result["classification"],
            "intent_score": intent_result["score"],
            "intent_classification": intent_result["classification"],
            "intent_reasons": intent_result["reasons"],
            "confidence": intent_result["confidence"]
        }

    conn = get_db()
    cursor = conn.cursor()

    parsed_name, norm_email = normalize_email_address(payload.to_address)
    dp_name = parsed_name or "Data Principal"
    dp_email = norm_email
    dp_id = link_or_create_data_principal(dp_email, dp_name)

    clean_message_id = (payload.message_id or "").strip()
    clean_thread_id = (payload.thread_id or "").strip()

    # 1. PRIMARY IDEMPOTENCY CHECK:
    # Deduplicate by Gmail message_id across consent_requests & email_snapshots
    row = None
    if clean_message_id:
        cursor.execute("""
            SELECT cr.* FROM consent_requests cr
            WHERE cr.message_id = ? 
               OR cr.email_snapshot_id IN (SELECT es.id FROM email_snapshots es WHERE es.message_id = ?)
            ORDER BY cr.created_at ASC LIMIT 1;
        """, (clean_message_id, clean_message_id))
        row = cursor.fetchone()

    # 2. SECONDARY CHECK: If no message_id match, look for extracted token or token in body
    token = None
    if row:
        token = row["token"]
    else:
        token = payload.extracted_token
        if not token and payload.body_text:
            token_match = re.search(r'/request/([a-zA-Z0-9_\-]+)', payload.body_text)
            token = token_match.group(1) if token_match else None
        
        if token:
            cursor.execute("SELECT * FROM consent_requests WHERE token = ? OR notice_id = ? OR id = ?;", (token, token, token))
            row = cursor.fetchone()
            if row:
                token = row["token"]

    # Extract dynamic domain, purpose, and attributes from the actual email content
    new_domain = payload.domain or detect_domain_from_content(payload.subject, payload.body_text)
    new_purpose = payload.purpose or extract_purpose_from_content(payload.subject, payload.body_text)
    new_attrs = extract_attributes_from_email_content(payload.subject, payload.body_text, domain=new_domain)
    fiduciary_input = payload.fiduciary_name
    if not fiduciary_input and payload.from_address and "<" in payload.from_address:
        fiduciary_input = payload.from_address.split("<")[0].replace('"', '').strip()
    fiduciary_name = resolve_fiduciary_name(token or "", new_domain, payload.subject, payload.body_text, fiduciary_input or "")
    fiduciary_category, fiduciary_logo = get_fiduciary_metadata(fiduciary_name, new_domain)
    sent_date_str = payload.sent_date or datetime.utcnow().strftime("%A, %B %d, %Y")

    is_new = not bool(row)

    if row:
        req = dict(row)
        token = req["token"]
        effective_message_id = clean_message_id or req.get("message_id")
        effective_thread_id = clean_thread_id or req.get("thread_id")

        if req.get("status") == "PENDING":
            cursor.execute("""
                UPDATE consent_requests 
                SET data_principal_id = ?, fiduciary_name = ?, fiduciary_category = ?, fiduciary_logo = ?, domain = ?, purpose = ?, requested_attributes = ?, thread_id = COALESCE(?, thread_id), message_id = COALESCE(?, message_id), intent_score = ?, intent_classification = ?, intent_reasons = ?
                WHERE id = ?;
            """, (dp_id, fiduciary_name, fiduciary_category, fiduciary_logo, new_domain, new_purpose, json.dumps(new_attrs), effective_thread_id, effective_message_id, intent_result["score"], intent_result["classification"], json.dumps(intent_result["reasons"]), req["id"]))
        else:
            cursor.execute("""
                UPDATE consent_requests 
                SET thread_id = COALESCE(?, thread_id), message_id = COALESCE(?, message_id), intent_score = ?, intent_classification = ?, intent_reasons = ?
                WHERE id = ?;
            """, (effective_thread_id, effective_message_id, intent_result["score"], intent_result["classification"], json.dumps(intent_result["reasons"]), req["id"]))
        
        cursor.execute("""
            UPDATE email_snapshots 
            SET subject = ?, body_text = ?, from_address = ?, to_address = ?, sent_date = ?, thread_id = COALESCE(?, thread_id), message_id = COALESCE(?, message_id), intent_score = ?, intent_classification = ?, intent_reasons = ?
            WHERE id = ?;
        """, (payload.subject, payload.body_text, payload.from_address, payload.to_address, sent_date_str, effective_thread_id, effective_message_id, intent_result["score"], intent_result["classification"], json.dumps(intent_result["reasons"]), req["email_snapshot_id"]))
        conn.commit()
        cursor.execute("SELECT * FROM consent_requests WHERE id = ?;", (req["id"],))
        row = cursor.fetchone()
    else:
        if not token:
            token = generate_unpredictable_token()
        row = dynamic_create_request_for_token(
            token=token,
            conn=conn,
            to_email=dp_email,
            to_name=dp_name,
            subject=payload.subject,
            body=payload.body_text,
            purpose=new_purpose,
            fiduciary=fiduciary_name,
            thread_id=clean_thread_id or payload.thread_id,
            message_id=clean_message_id or payload.message_id,
            intent_score=intent_result["score"],
            intent_classification=intent_result["classification"],
            intent_reasons=json.dumps(intent_result["reasons"])
        )

    req = dict(row)
    result = hydrate_request(row, conn)
    conn.close()

    result["is_new"] = is_new
    result["token"] = req["token"]
    frontend_base = os.getenv("FRONTEND_BASE_URL", "http://localhost:8000").rstrip("/")
    result["link"] = f"{frontend_base}/request/{req['token']}"
    result["intent_score"] = intent_result["score"]
    result["intent_classification"] = intent_result["classification"]
    result["intent_reasons"] = intent_result["reasons"]
    result["intentScore"] = intent_result["score"]
    result["intentClassification"] = intent_result["classification"]
    result["intentReasons"] = intent_result["reasons"]
    return result


@app.post("/api/sync-gmail")
@app.post("/api/ingest-email")
def ingest_email_without_debug_metadata(
    payload: EmailIngestPayload,
    _authorized: bool = Depends(verify_webhook_secret)
):
    # NOTE: Deprecated — Gmail AppScript sync is replaced by Resend email invites.
    # Kept for backward-compatibility only.
    result = strip_admin_fields(sync_gmail_webhook(payload, _authorized))
    if result.get("ignored") and result.get("reason", "").startswith("intent_"):
        return {"ignored": True, "reason": "not_a_consent_request"}
    return result


@app.post("/api/consent-requests")
def create_consent_request(
    payload: ConsentRequestCreatePayload,
    request: Request = None,
    current_user: dict = Depends(require_role(["DATA_FIDUCIARY", "ADMIN"]))
):
    conn = get_db()
    cursor = conn.cursor()

    parsed_name, norm_email = normalize_email_address(payload.principal_email)
    dp_name = payload.principal_name or parsed_name or "Data Principal"
    dp_email = norm_email
    dp_id = link_or_create_data_principal(dp_email, dp_name)

    snapshot_id = f"ES-2026-{random.randint(1000, 9999)}"
    cursor.execute("""
    INSERT INTO email_snapshots (id, from_address, to_address, subject, sent_date, body_text, attachment_name, attachment_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        snapshot_id,
        f"{payload.fiduciary_name} <{payload.fiduciary_email}>",
        f"{dp_name} <{dp_email}>",
        payload.email_subject,
        datetime.utcnow().strftime("%A, %B %d, %Y"),
        payload.email_body,
        payload.attachment_name,
        "1.2 MB"
    ))

    req_id = f"REQ-2026-CR-{int(datetime.utcnow().timestamp() * 1000)}-{random.randint(100, 999)}"
    token = generate_unpredictable_token()
    notice_id = payload.notice_id or f"NTC-2026-CR-{int(datetime.utcnow().timestamp() * 1000)}-{random.randint(100, 999)}"
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
    result = strip_admin_fields(hydrate_request(row, conn))
    conn.close()

    # ── Send consent invite email with hosted laptop IP & port link ───────────
    app_base = get_hosted_base_url(request)
    consent_link = f"{app_base}/consent/{token}"
    email_result = send_consent_invite(
        to_email=dp_email,
        to_name=dp_name,
        fiduciary_name=payload.fiduciary_name,
        consent_link=consent_link,
        purpose=payload.purpose,
        attributes=payload.requested_attributes,
        notice_id=notice_id,
        expires_at=expires,
    )
    result["email_sent"] = email_result.get("success", False)
    result["email_message"] = email_result.get("message", "")
    result["email_dev_mode"] = email_result.get("dev_mode", False)
    result["consent_link"] = consent_link
    result["link"] = consent_link

    return result

# ── PUBLIC: Fetch consent request preview without authentication ───────────────
@app.get("/api/consent-requests/public/{token}")
def get_public_consent_request_preview(token: str = Path(..., description="Consent invite token")):
    """
    Public (unauthenticated) endpoint that returns a minimal preview of the
    consent request for the login page shown when recipient clicks the link.
    Returns safe public fields and recipient identity hint for frictionless login/registration.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consent_requests WHERE token = ? OR notice_id = ? OR id = ?;", (token, token, token))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Consent request not found or link is invalid.")

    req = dict(row)
    try:
        attributes = json.loads(req.get("requested_attributes") or "[]")
    except Exception:
        attributes = []

    # Look up data principal name and email to support seamless login/registration
    dp_name = ""
    dp_email = ""
    if req.get("data_principal_id"):
        cursor.execute("SELECT name, email FROM data_principals WHERE id = ?;", (req["data_principal_id"],))
        dp_row = cursor.fetchone()
        if dp_row:
            dp_name = dp_row["name"] or ""
            dp_email = dp_row["email"] or ""

    conn.close()
    return {
        "notice_id": req.get("notice_id", ""),
        "fiduciary_name": req.get("fiduciary_name", ""),
        "fiduciary_category": req.get("fiduciary_category", ""),
        "fiduciary_logo": req.get("fiduciary_logo", "🏢"),
        "purpose": req.get("purpose", ""),
        "domain": req.get("domain", ""),
        "legal_basis": req.get("legal_basis", ""),
        "validity_period": req.get("validity_period", ""),
        "data_region": req.get("data_region", ""),
        "status": req.get("status", ""),
        "expires_at": req.get("expires_at", ""),
        "principal_name": dp_name,
        "principal_email": dp_email,
        "attributes": [
            {
                "name": a.get("name", ""),
                "category": a.get("category", ""),
                "sensitive": a.get("sensitive", False),
                "required": a.get("required", False),
            }
            for a in attributes
        ],
        "token": token,
    }


# ── Resend consent invite email for an existing request ────────────────────────
@app.post("/api/consent-requests/send-email/{request_id}")
def resend_consent_email(
    request_id: str = Path(..., description="Consent request ID or token"),
    request: Request = None,
    current_user: dict = Depends(require_role(["DATA_FIDUCIARY", "ADMIN"]))
):
    """
    (Re)send the Resend consent invite email for an existing consent request.
    Only accessible by authenticated Data Fiduciaries or Admins.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consent_requests WHERE id = ? OR token = ?;", (request_id, request_id))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Consent request not found.")

    req = dict(row)
    # Fetch data principal email
    cursor.execute("SELECT * FROM data_principals WHERE id = ?;", (req["data_principal_id"],))
    dp_row = cursor.fetchone()
    dp = dict(dp_row) if dp_row else {}
    dp_email = dp.get("email", "")
    dp_name = dp.get("name", "Data Principal")

    try:
        attributes = json.loads(req.get("requested_attributes") or "[]")
    except Exception:
        attributes = []

    conn.close()

    if not dp_email:
        raise HTTPException(status_code=400, detail="No email address on record for this data principal.")

    app_base = get_hosted_base_url(request)
    consent_link = f"{app_base}/consent/{req['token']}"

    email_result = send_consent_invite(
        to_email=dp_email,
        to_name=dp_name,
        fiduciary_name=req.get("fiduciary_name", ""),
        consent_link=consent_link,
        purpose=req.get("purpose", ""),
        attributes=attributes,
        notice_id=req.get("notice_id", ""),
        expires_at=req.get("expires_at", ""),
    )

    return {
        "success": email_result.get("success", False),
        "message": email_result.get("message", ""),
        "email_id": email_result.get("email_id"),
        "dev_mode": email_result.get("dev_mode", False),
        "consent_link": consent_link,
        "to_email": dp_email,
    }


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
            parsed_name, norm_email = normalize_email_address(to_email)
            if norm_email:
                dp_name = to_name or parsed_name or "Data Principal"
                dp_id = link_or_create_data_principal(norm_email, dp_name)
                updates_cr.append("data_principal_id = ?")
                params_cr.append(dp_id)
                updates_es.append("to_address = ?")
                params_es.append(f"{dp_name} <{norm_email}>")
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

    result = strip_admin_fields(hydrate_request(row, conn))
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

    result = strip_admin_fields(hydrate_request(row, conn))
    conn.close()
    return result

@app.get("/api/me/consent-requests")
def list_my_consent_requests(
    status: Optional[str] = Query(None, description="Filter by status: PENDING, GRANTED, DENIED, etc."),
    current_user: dict = Depends(get_current_user)
):
    """
    Authoritative endpoint for Data Principal to discover all their consent requests.
    Derives identity exclusively from authenticated JWT session.
    """
    conn = get_db()
    cursor = conn.cursor()

    dp_id = current_user.get("dp_id")
    if not dp_id:
        _, norm_user_email = normalize_email_address(current_user.get("email", ""))
        if norm_user_email:
            dp_id = link_or_create_data_principal(norm_user_email, current_user.get("name", "Data Principal"))

    if not dp_id:
        conn.close()
        return []

    if status:
        cursor.execute(
            "SELECT * FROM consent_requests WHERE data_principal_id = ? AND UPPER(status) = ? ORDER BY created_at DESC;",
            (dp_id, status.strip().upper())
        )
    else:
        cursor.execute(
            "SELECT * FROM consent_requests WHERE data_principal_id = ? ORDER BY created_at DESC;",
            (dp_id,)
        )
    rows = cursor.fetchall()
    results = [strip_admin_fields(hydrate_request(r, conn)) for r in rows]
    conn.close()
    return results


@app.get("/api/consent-requests")
def list_consent_requests(
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: dict = Depends(get_current_user)
):
    conn = get_db()
    cursor = conn.cursor()
    if current_user.get("role") == "DATA_PRINCIPAL":
        dp_id = current_user.get("dp_id")
        if not dp_id:
            _, norm_user_email = normalize_email_address(current_user.get("email", ""))
            if norm_user_email:
                dp_id = link_or_create_data_principal(norm_user_email, current_user.get("name", "Data Principal"))
        if status:
            cursor.execute(
                "SELECT * FROM consent_requests WHERE data_principal_id = ? AND UPPER(status) = ? ORDER BY created_at DESC;",
                (dp_id, status.strip().upper())
            )
        else:
            cursor.execute("SELECT * FROM consent_requests WHERE data_principal_id = ? ORDER BY created_at DESC;", (dp_id,))
    else:
        fiduciary_name = current_user.get("fiduciary_name")
        if fiduciary_name:
            if status:
                cursor.execute(
                    "SELECT * FROM consent_requests WHERE fiduciary_name = ? AND UPPER(status) = ? ORDER BY created_at DESC;",
                    (fiduciary_name, status.strip().upper())
                )
            else:
                cursor.execute("SELECT * FROM consent_requests WHERE fiduciary_name = ? ORDER BY created_at DESC;", (fiduciary_name,))
        else:
            if status:
                cursor.execute(
                    "SELECT * FROM consent_requests WHERE UPPER(status) = ? ORDER BY created_at DESC;",
                    (status.strip().upper(),)
                )
            else:
                cursor.execute("SELECT * FROM consent_requests ORDER BY created_at DESC;")
    rows = cursor.fetchall()
    results = [strip_admin_fields(hydrate_request(r, conn)) for r in rows]
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
            parsed_n, norm_e = normalize_email_address(to_addr)
            to_name = to_name or parsed_n
            to_email = to_email or norm_e
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
            parsed_name, norm_email = normalize_email_address(to_email)
            if norm_email:
                dp_name = to_name or parsed_name or "Data Principal"
                dp_id = link_or_create_data_principal(norm_email, dp_name)
                updates_cr.append("data_principal_id = ?")
                params_cr.append(dp_id)
                updates_es.append("to_address = ?")
                params_es.append(f"{dp_name} <{norm_email}>")
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

    result = strip_admin_fields(hydrate_request(row, conn))
    conn.close()
    return result

@app.post("/api/consent-requests/{request_id}/decision")
def record_consent_decision(
    request_id: str, 
    payload: DecisionPayload, 
    current_user: dict = Depends(require_role(["DATA_PRINCIPAL"]))
):
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

    # Enforce ownership: Data Principal can only submit decisions for their own requests.
    # Resolve the authenticated user's canonical dp_id using the same logic as registration
    # and Gmail-webhook ingestion (link_or_create_data_principal on the normalized email).
    # This handles cases where the users.data_principal_id column was null or stale
    # (e.g., the user registered before email-normalization was introduced, or before
    # sync_and_normalize_data_principals ran). The RBAC check is NOT weakened: we still
    # require the request's dp_id to match the dp_id derived from the authenticated user's
    # own verified email — no other user's dp_id can satisfy this check.
    user_dp_id = current_user.get("dp_id")
    if not user_dp_id:
        # Fall back: re-derive dp_id from the authenticated user's normalized email,
        # using the same canonical function used during Gmail-sync ingestion.
        _, norm_user_email = normalize_email_address(current_user.get("email", ""))
        if norm_user_email:
            user_dp_id = link_or_create_data_principal(norm_user_email, current_user.get("name", "Data Principal"))

    if req["data_principal_id"] != user_dp_id:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to make a decision on another Data Principal's consent request."
        )

    now = datetime.utcnow().isoformat() + "Z"

    if check_request_expiry(req, conn):
        conn.close()
        raise HTTPException(status_code=410, detail="Cannot record decision: Consent request link has expired.")

    if req["status"] in ["GRANTED", "DENIED"]:
        cursor.execute("""
        INSERT INTO audit_events (id, request_id, consent_id, data_principal_id, action, fiduciary, notice_id, details, ip_address, timestamp, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            f"AUD-{int(datetime.utcnow().timestamp() * 1000)}-{random.randint(1000, 9999)}",
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
    readable_granted = []
    readable_denied = []
    principal_name = current_user.get("name") or "Data Principal"
    principal_email = current_user.get("email") or ""

    try:
        req_attrs = json.loads(req.get("requested_attributes") or "[]")
        attr_map = {a.get("id"): a.get("name") for a in req_attrs if isinstance(a, dict)}
        readable_granted = [attr_map.get(a, a) for a in (payload.selected_attributes or [])]
        readable_denied = [attr_map.get(a, a) for a in (payload.denied_attributes or [])]
    except Exception:
        readable_granted = payload.selected_attributes or []
        readable_denied = payload.denied_attributes or []

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

        principal_name = dp_dict.get("name")
        if not principal_name:
            cursor.execute("SELECT name FROM users WHERE data_principal_id = ? LIMIT 1;", (req["data_principal_id"],))
            u_row = cursor.fetchone()
            if u_row and u_row["name"]:
                principal_name = u_row["name"]
        if not principal_name:
            principal_name = current_user.get("name") or "Data Principal"

        principal_email = dp_dict.get("email") or current_user.get("email") or ""

        consent_record = {
            "consentId": consent_id,
            "requestId": req["id"],
            "principalId": req["data_principal_id"],
            "principalName": principal_name,
            "principalEmail": principal_email,
            "fiduciary": req["fiduciary_name"],
            "fiduciaryCategory": req["fiduciary_category"],
            "fiduciaryLogo": req["fiduciary_logo"],
            "purpose": req["purpose"],
            "noticeId": req["notice_id"],
            "legalBasis": req.get("legal_basis") or "Consent under DPDP Act 2023 (Section 6)",
            "status": "ACTIVE",
            "grantedOn": now,
            "expiresOn": expiry,
            "grantedAttributes": readable_granted,
            "deniedAttributes": readable_denied,
            "dpoContact": req["dpo_email"],
            "dataRegion": req["data_region"],
            "receiptHash": receipt_hash,
            "customNote": payload.remark
        }

    audit_id = f"AUD-{int(datetime.utcnow().timestamp() * 1000)}-{random.randint(1000, 9999)}"
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

    recipient_email = actual_sender or req.get("fiduciary_email") or req.get("dpo_email") or "compliance@fiduciary.com"

    notif_id = f"NOTIF-2026-{random.randint(1000, 9999)}"
    notif_details = {
        "decision": payload.decision,
        "token": req.get("token"),
        "requestId": req["id"],
        "fiduciaryName": req["fiduciary_name"],
        "principalName": consent_record.get("principalName", principal_name) if consent_record else (current_user.get("name") or "Data Principal"),
        "principalEmail": consent_record.get("principalEmail", principal_email) if consent_record else (current_user.get("email") or ""),
        "recipientEmail": recipient_email,
        "originalSubject": original_subject,
        "noticeId": req["notice_id"],
        "purpose": req["purpose"],
        "selectedAttributes": readable_granted if payload.decision == "GRANTED" else [],
        "deniedAttributes": readable_denied,
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

    # ── EVENT-DRIVEN IMMEDIATE DISPATCH ─────────────────────────────
    # Trigger near-immediate receipt dispatch via Apps Script Web App
    request_immediate_dispatch(notification_id=notif_id)

    return {
        "success": True,
        "message": f"Consent decision {payload.decision} recorded successfully.",
        "consent": consent_record
    }


def request_immediate_dispatch(notification_id: Optional[str] = None):
    """
    Event-driven immediate receipt dispatch:
    Triggers Google Apps Script via its deployed Web App webhook URL (APPS_SCRIPT_WEBAPP_URL)
    to deliver pending receipts to the original Gmail thread near-immediately (< 2s)
    rather than waiting up to 60s for the next scheduled trigger execution.

    Runs in a non-blocking background daemon thread so the client HTTP response is instantaneous.
    If APPS_SCRIPT_WEBAPP_URL is not configured or times out, the notification remains 'PENDING'
    and will be automatically delivered by the 1-minute time-driven trigger as a zero-risk fallback.
    """
    dispatch_url = os.getenv("APPS_SCRIPT_WEBAPP_URL") or os.getenv("GMAIL_DISPATCH_WEBHOOK_URL")
    if not dispatch_url:
        return

    secret = os.getenv("GMAIL_WEBHOOK_SECRET")

    def _trigger():
        try:
            payload_data = {
                "secret": secret,
                "notification_id": notification_id,
                "action": "DISPATCH_PENDING"
            }
            req_data = json.dumps(payload_data).encode("utf-8")
            req = urllib.request.Request(
                dispatch_url,
                data=req_data,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Secret": secret or ""
                }
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                print(f"[DISPATCH] Immediate dispatch triggered: HTTP {resp.status}")
        except Exception as ex:
            print(f"[DISPATCH-WARN] Immediate dispatch trigger encountered error: {ex}. 1-min scheduled trigger will deliver as fallback.")

    threading.Thread(target=_trigger, daemon=True).start()


@app.get("/api/notifications/pending")
def list_pending_notifications(_authorized: bool = Depends(verify_webhook_secret)):
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
def acknowledge_notification(
    notification_id: str,
    _authorized: bool = Depends(verify_webhook_secret)
):
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat() + "Z"
    cursor.execute("UPDATE fiduciary_notifications SET status = 'SENT', sent_at = ? WHERE id = ?;", (now, notification_id))
    conn.commit()
    conn.close()
    return {"success": True, "id": notification_id, "status": "SENT", "sent_at": now}


@app.post("/api/notifications/dispatch-immediate")
def trigger_dispatch_immediate(
    _authorized: bool = Depends(verify_webhook_secret)
):
    """
    Triggers immediate event-driven dispatch of all pending notifications.
    Can be called directly by administrators, tests, or external webhooks.
    """
    dispatch_url = os.getenv("APPS_SCRIPT_WEBAPP_URL") or os.getenv("GMAIL_DISPATCH_WEBHOOK_URL")
    request_immediate_dispatch()
    return {
        "success": True,
        "message": "Immediate dispatch requested.",
        "dispatch_url_configured": bool(dispatch_url)
    }


@app.get("/api/consents")
def list_consents(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    if current_user.get("role") == "DATA_PRINCIPAL":
        dp_id = current_user.get("dp_id")
        cursor.execute("SELECT * FROM consents WHERE data_principal_id = ? ORDER BY granted_on DESC;", (dp_id,))
    else:
        fiduciary_name = current_user.get("fiduciary_name")
        if fiduciary_name:
            cursor.execute("SELECT * FROM consents WHERE fiduciary_name = ? ORDER BY granted_on DESC;", (fiduciary_name,))
        else:
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
def get_consent_receipt(consent_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consents WHERE consent_id = ?;", (consent_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Consent record not found")

    consent = dict(row)
    if current_user.get("role") == "DATA_PRINCIPAL" and consent["data_principal_id"] != current_user.get("dp_id"):
        conn.close()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not have permission to access this receipt.")

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
            "sha256IntegrityHash": consent["receipt_hash"],
            "receiptHash": consent["receipt_hash"],
            "verifiedSignature": consent["receipt_hash"]
        }
    }

@app.post("/api/consents/{consent_id}/revoke")
async def revoke_consent(
    consent_id: str, 
    request: Request,
    current_user: dict = Depends(require_role(["DATA_PRINCIPAL", "ADMIN"]))
):
    # Flexible payload extraction: accept dict, string, or empty body without failing
    reason = "Consent withdrawn by Data Principal under DPDP Act Sec 6(4)"
    try:
        raw_body = await request.json()
        if isinstance(raw_body, dict):
            reason = raw_body.get("reason") or reason
        elif isinstance(raw_body, str) and raw_body.strip():
            reason = raw_body.strip()
    except Exception:
        try:
            text_body = (await request.body()).decode("utf-8").strip()
            if text_body:
                reason = text_body
        except Exception:
            pass

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consents WHERE consent_id = ?;", (consent_id,))
    row = cursor.fetchone()
    if not row:
        cursor.execute("SELECT * FROM consents WHERE LOWER(consent_id) = LOWER(?);", (consent_id,))
        row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Active consent record not found")

    consent = dict(row)
    user_dp_id = current_user.get("dp_id")
    user_id = current_user.get("id")
    user_email = current_user.get("email")
    is_admin = current_user.get("role") == "ADMIN"

    is_owner = (
        is_admin or
        (consent.get("data_principal_id") and consent["data_principal_id"] in (user_dp_id, user_id)) or
        (consent.get("data_principal_email") and consent["data_principal_email"] == user_email)
    )
    if not is_owner:
        conn.close()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You can only revoke your own consent.")

    now = datetime.utcnow().isoformat() + "Z"

    cursor.execute("UPDATE consents SET status = 'REVOKED', revoked_on = ?, revocation_reason = ? WHERE consent_id = ?;", (now, reason, consent["consent_id"]))
    if consent.get("request_id") or consent.get("notice_id"):
        cursor.execute("UPDATE consent_requests SET status = 'REVOKED' WHERE id = ? OR notice_id = ?;", (consent.get("request_id"), consent.get("notice_id")))

    cursor.execute("""
    INSERT INTO audit_events (id, request_id, consent_id, data_principal_id, action, fiduciary, notice_id, details, ip_address, timestamp, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        f"AUD-{random.randint(1000, 9999)}",
        consent.get("request_id") or "N/A",
        consent["consent_id"],
        consent.get("data_principal_id"),
        "CONSENT_REVOKED",
        consent.get("fiduciary_name") or "Data Fiduciary",
        consent.get("notice_id") or "NTC-REVOKED",
        f"Consent revoked under DPDP Sec 6(4). Reason: {reason}",
        "103.21.124.88",
        now,
        "REVOKED"
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "consent_id": consent["consent_id"],
        "message": f"Consent {consent['consent_id']} successfully revoked under DPDP Act Section 6(4).",
        "status": "REVOKED",
        "revoked_on": now,
        "revocation_reason": reason
    }

@app.get("/api/audit-logs")
@app.get("/api/audit")
def list_audit_logs(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    if current_user.get("role") == "DATA_PRINCIPAL":
        dp_id = current_user.get("dp_id")
        cursor.execute("SELECT * FROM audit_events WHERE data_principal_id = ? ORDER BY timestamp DESC;", (dp_id,))
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
def create_dsr_request(
    payload: DSRRequestPayload,
    current_user: dict = Depends(require_role(["DATA_PRINCIPAL"]))
):
    conn = get_db()
    cursor = conn.cursor()

    dsr_id = f"DSR-2026-{random.randint(1000, 9999)}"
    now = datetime.utcnow()
    sla = (now + timedelta(days=30)).isoformat() + "Z"
    now_str = now.isoformat() + "Z"
    dp_id = current_user.get("dp_id")

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
def list_dsr_requests(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    if current_user.get("role") == "DATA_PRINCIPAL":
        dp_id = current_user.get("dp_id")
        cursor.execute("SELECT * FROM data_rights_requests WHERE data_principal_id = ? ORDER BY created_at DESC;", (dp_id,))
    else:
        fiduciary_name = current_user.get("fiduciary_name")
        if fiduciary_name:
            cursor.execute("SELECT * FROM data_rights_requests WHERE target_fiduciary = ? ORDER BY created_at DESC;", (fiduciary_name,))
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
def submit_grievance(
    payload: GrievancePayload,
    current_user: dict = Depends(require_role(["DATA_PRINCIPAL"]))
):
    conn = get_db()
    cursor = conn.cursor()

    ticket_id = f"GRV-2026-{random.randint(1000, 9999)}"
    now = datetime.utcnow()
    now_str = now.isoformat() + "Z"
    sla = (now + timedelta(days=7)).isoformat() + "Z"  # Statutory 7 working days SLA under DPDP Sec 13
    dp_id = current_user.get("dp_id")

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

    # ── EVENT-DRIVEN IMMEDIATE DISPATCH ─────────────────────────────
    request_immediate_dispatch(notification_id=notif_id)

    return {
        "success": True,
        "message": f"Statutory grievance {ticket_id} filed successfully under DPDP Act Section 13.",
        "ticketId": ticket_id,
        "slaDeadline": sla,
        "status": "OPEN",
        "fiduciary": payload.fiduciary
    }

@app.get("/api/nominee")
def get_nominee(current_user: dict = Depends(require_role(["DATA_PRINCIPAL"]))):
    conn = get_db()
    cursor = conn.cursor()

    dp_id = current_user.get("dp_id")
    email = current_user.get("email")

    cursor.execute("""
    SELECT * FROM statutory_nominees 
    WHERE (data_principal_id = ? OR principal_email = ?) AND status = 'ACTIVE_VERIFIED'
    ORDER BY date_designated DESC LIMIT 1;
    """, (dp_id, email))
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
def save_nominee(
    payload: NomineePayload,
    current_user: dict = Depends(require_role(["DATA_PRINCIPAL"]))
):
    conn = get_db()
    cursor = conn.cursor()

    nom_id = f"NOM-2026-{random.randint(1000, 9999)}"
    now = datetime.utcnow()
    now_str = now.isoformat() + "Z"
    date_str = now.strftime("%Y-%m-%d")

    dp_id = current_user.get("dp_id")
    principal_email = current_user.get("email")

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
def remove_nominee(current_user: dict = Depends(require_role(["DATA_PRINCIPAL"]))):
    conn = get_db()
    cursor = conn.cursor()

    now_str = datetime.utcnow().isoformat() + "Z"
    dp_id = current_user.get("dp_id")
    email = current_user.get("email")

    cursor.execute("UPDATE statutory_nominees SET status = 'REVOKED', updated_at = ? WHERE data_principal_id = ? OR principal_email = ?;", (now_str, dp_id, email))

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


# ── SINGLE-PORT SPA & STATIC ASSET SERVING ──────────────────────────────────

@app.get("/")
async def serve_root():
    """Serves the compiled React application entry point (index.html)."""
    index_file = os.path.join(DIST_DIR, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file, media_type="text/html")
    return HTMLResponse(
        "<html><body><h1>DP Consent Manager</h1><p>Frontend dist/ not built yet. Run <code>npm run build</code>.</p></body></html>",
        status_code=200
    )


@app.get("/{full_path:path}")
async def serve_spa_fallback(full_path: str):
    """
    SPA Fallback Route:
    - Never intercepts /api/* routes (returns 404 JSON for unknown API endpoints).
    - Serves static assets directly if the file exists in dist/.
    - Serves index.html for all client-side routes (/dashboard, /request/<token>, etc.) on browser refresh.
    """
    # 1. Strict guard: Never intercept unmatched /api/* routes with HTML fallback
    if full_path.startswith("api/") or full_path == "api":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API endpoint '/{full_path}' not found."
        )

    # 2. Check if the requested path corresponds to an existing static file in DIST_DIR
    requested_file = os.path.join(DIST_DIR, full_path)
    if os.path.isfile(requested_file):
        guessed_type, _ = mimetypes.guess_type(requested_file)
        return FileResponse(requested_file, media_type=guessed_type)

    # 3. SPA Fallback: Serve index.html for all frontend routes
    index_file = os.path.join(DIST_DIR, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file, media_type="text/html")

    return HTMLResponse(
        "<html><body><h1>DP Consent Manager</h1><p>Frontend dist/ not built yet. Run <code>npm run build</code>.</p></body></html>",
        status_code=200
    )


if __name__ == "__main__":
    print("====================================================")
    print("DP Consent Manager Single-Port React + FastAPI Server")
    print("Serving UI & REST API Base: http://localhost:8000")
    print("====================================================")
    uvicorn.run(app, host="0.0.0.0", port=8000)
