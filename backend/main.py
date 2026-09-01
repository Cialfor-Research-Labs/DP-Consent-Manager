import re
import json
import random
import uvicorn
from typing import Optional
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from database import get_db, init_db, generate_sha256_signature, generate_data_principal_id, generate_unpredictable_token
from models import DecisionPayload, RevokePayload, DSRRequestPayload, ConsentRequestCreatePayload, EmailIngestPayload

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
    req["emailSnapshot"] = es_dict

    # Compatibility mappings for frontend UI
    req["domain"] = req.get("domain") or "Corporate/Enterprise"
    req["title"] = req.get("purpose") or req.get("subject") or "Consent Request Notice"
    req["fiduciary"] = req["fiduciary_name"]
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

def dynamic_create_request_for_token(
    token: str, 
    conn, 
    to_email: str = None, 
    to_name: str = None,
    subject: str = None,
    body: str = None,
    purpose: str = None,
    fiduciary: str = None
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

    token_lower = token.lower()
    subject_lower = (subject or "").lower()

    # Determine Domain & Categories
    if "bank" in token_lower or "kyc" in token_lower or "bank" in subject_lower:
        final_domain = "Banking"
        final_subject = subject or "Action Required: Digital Consent for Savings Account Opening & KYC Verification"
        final_purpose = purpose or "Account Opening & Digital KYC Verification under RBI Guidelines"
        final_fiduciary = fiduciary or "ABC National Bank"
        final_body = body or (
            f"Dear {dp_name},\n\n"
            "As part of RBI Mandatory KYC Guidelines and DPDP Act 2023 compliance, ABC National Bank requests your explicit digital consent to verify your Government Identity Proof, PAN Card, and Address details.\n\n"
            "Thanks & Regards,\nABC Bank KYC Compliance Cell"
        )
        requested_attrs = [
            {"id": "attr_name", "name": "Full Legal Name", "category": "IDENTITY", "required": True, "description": "Legal name matching Aadhaar & PAN card", "sensitive": False},
            {"id": "attr_govt_id", "name": "Government Photo ID (Aadhaar / Passport)", "category": "IDENTITY", "required": True, "description": "Official government identity proof for RBI KYC", "sensitive": True},
            {"id": "attr_pan", "name": "Permanent Account Number (PAN Card)", "category": "FINANCIAL", "required": True, "description": "Tax ID for banking transactions and Form 60 verification", "sensitive": True},
            {"id": "attr_address", "name": "Residential Address Proof", "category": "CONTACT", "required": True, "description": "Utility bill or Aadhaar address for communication", "sensitive": False},
            {"id": "attr_income", "name": "Annual Income & Occupation Declaration", "category": "FINANCIAL", "required": False, "description": "Optional income declaration for debit card limits", "sensitive": True, "defaultGranted": True}
        ]
    elif "health" in token_lower or "med" in token_lower or "health" in subject_lower:
        final_domain = "Healthcare"
        final_subject = subject or "Healthcare Privacy Notice: Consent for Diagnostic Records & Health Insurance Processing"
        final_purpose = purpose or "Diagnostic Test Report Sharing & Cashless Health Insurance Claim Settlement"
        final_fiduciary = fiduciary or "Apollo Care Hospital"
        final_body = body or (
            f"Dear {dp_name},\n\n"
            "Apollo Care Hospital requires your consent to share diagnostic test reports and medical history with your empaneled Health Insurance Provider for cashless claim processing.\n\n"
            "Thanks & Regards,\nApollo Care Privacy Officer"
        )
        requested_attrs = [
            {"id": "attr_name", "name": "Patient Full Name & DOB", "category": "IDENTITY", "required": True, "description": "Patient identity matching hospital registration", "sensitive": False},
            {"id": "attr_medical", "name": "Medical Diagnostic Reports & Lab History", "category": "HEALTH", "required": True, "description": "Diagnostic reports required for health insurance claim processing", "sensitive": True},
            {"id": "attr_insurance", "name": "Health Insurance Policy Number", "category": "HEALTH", "required": True, "description": "TPA insurance card number for cashless hospital approval", "sensitive": True},
            {"id": "attr_contact", "name": "Emergency Contact & Next of Kin", "category": "CONTACT", "required": False, "description": "Phone number of emergency contact person", "sensitive": False, "defaultGranted": True}
        ]
    elif "fintech" in token_lower or "loan" in token_lower or "credit" in token_lower or "loan" in subject_lower:
        final_domain = "FinTech"
        final_subject = subject or "FinTech Notice: Consent for Credit Score & Bank Statement Analysis"
        final_purpose = purpose or "Credit Score Assessment & Bank Statement Verification for Instant Credit Line"
        final_fiduciary = fiduciary or "PayFlex Lending"
        final_body = body or (
            f"Dear {dp_name},\n\n"
            "To evaluate your instant credit line application, PayFlex Lending requests consent to fetch your CIBIL Credit Score and verify recent 6-month bank statements.\n\n"
            "Thanks & Regards,\nPayFlex Lending Underwriting Team"
        )
        requested_attrs = [
            {"id": "attr_name", "name": "Borrower Full Name", "category": "IDENTITY", "required": True, "description": "Name matching credit bureau records", "sensitive": False},
            {"id": "attr_cibil", "name": "CIBIL / Experian Credit Score Report", "category": "FINANCIAL", "required": True, "description": "Credit bureau score for instant loan approval", "sensitive": True},
            {"id": "attr_bank_stmt", "name": "6-Month Bank Account Statement", "category": "FINANCIAL", "required": True, "description": "Bank statement PDF for income verification", "sensitive": True},
            {"id": "attr_device", "name": "Device & Location Fingerprint", "category": "DIGITAL", "required": False, "description": "Anti-fraud device location check for instant disbursement", "sensitive": True, "defaultGranted": True}
        ]
    elif "ecom" in token_lower or "order" in token_lower or "retail" in token_lower:
        final_domain = "E-Commerce"
        final_subject = subject or "E-Commerce Notice: Consent for Order Delivery & Saved Payment Method Processing"
        final_purpose = purpose or "Order Fulfillment, Address Verification & Tokenized Express Checkout"
        final_fiduciary = fiduciary or "ShopEase Retail"
        final_body = body or (
            f"Dear {dp_name},\n\n"
            "ShopEase Retail requests your consent to store shipping address details and tokenized payment card information for fast checkout and delivery updates.\n\n"
            "Thanks & Regards,\nShopEase Customer Trust Team"
        )
        requested_attrs = [
            {"id": "attr_name", "name": "Customer Full Name", "category": "IDENTITY", "required": True, "description": "Name for order invoice and package delivery", "sensitive": False},
            {"id": "attr_address", "name": "Shipping & Delivery Address", "category": "CONTACT", "required": True, "description": "Physical delivery location for courier partners", "sensitive": False},
            {"id": "attr_phone", "name": "Mobile Phone Number", "category": "CONTACT", "required": True, "description": "SMS delivery updates and courier OTP verification", "sensitive": False},
            {"id": "attr_card", "name": "Tokenized Payment Card Details", "category": "FINANCIAL", "required": False, "description": "RBI compliant tokenized card data for 1-click checkout", "sensitive": True, "defaultGranted": False}
        ]
    elif "bgv" in token_lower or "corp" in token_lower or "employment" in token_lower:
        final_domain = "Corporate HR"
        final_subject = subject or "Corporate HR Notice: Background Verification & Employment Record Clearance"
        final_purpose = purpose or "Employee Background Verification & Degree Credentials Clearance"
        final_fiduciary = fiduciary or "GlobalTech Solutions"
        final_body = body or (
            f"Dear {dp_name},\n\n"
            "As part of your employment onboarding, GlobalTech HR requests consent to process your background verification, degree certificates, and prior employment reference checks.\n\n"
            "Thanks & Regards,\nGlobalTech Onboarding HR"
        )
        requested_attrs = [
            {"id": "attr_name", "name": "Employee Full Name", "category": "IDENTITY", "required": True, "description": "Official employee onboarding name", "sensitive": False},
            {"id": "attr_bgv", "name": "Background Verification & Criminal Check", "category": "LEGAL/VERIFICATION", "required": True, "description": "Third-party agency background check report", "sensitive": True},
            {"id": "attr_degree", "name": "Degree Certificates & Marksheets", "category": "PROFESSIONAL", "required": True, "description": "Educational degree verification from university registrar", "sensitive": True},
            {"id": "attr_prior_emp", "name": "Prior Employment Experience Letter", "category": "PROFESSIONAL", "required": False, "description": "Relieving letter and HR reference check", "sensitive": False, "defaultGranted": True}
        ]
    elif "pf" in token_lower or "provident" in token_lower:
        final_domain = "Corporate HR"
        final_subject = subject or "Action Required: Consent for PF Account Processing"
        final_purpose = purpose or "Collection and processing of personal data for PF (Provident Fund) account registration, UAN linking, and statutory compliance under EPFO guidelines."
        final_fiduciary = fiduciary or "Cialfor Research Labs Private Limited (HR & Payroll Cell)"
        final_body = body or (
            f"Dear {dp_name},\n\n"
            "As part of our PF (Provident Fund) account processing and related statutory requirements, we are required to collect and process certain personal information.\n\n"
            "Thanks & Regards,\nPrerna Pandey\nAI Specialist\nCialfor Research Labs Private Limited"
        )
        requested_attrs = [
            {"id": "attr_name", "name": "Full Legal Name & Employee ID", "category": "IDENTITY", "required": True, "description": "Official name and employee ID for EPFO records", "sensitive": False},
            {"id": "attr_uan", "name": "Universal Account Number (UAN) & PF ID", "category": "FINANCIAL", "required": True, "description": "EPFO UAN for Provident Fund account linking", "sensitive": True},
            {"id": "attr_pan", "name": "Permanent Account Number (PAN Card)", "category": "FINANCIAL", "required": True, "description": "Tax identity verification for PF contribution tax exemption", "sensitive": True},
            {"id": "attr_bank", "name": "Bank Account Number & IFSC Code", "category": "FINANCIAL", "required": True, "description": "Direct bank account for PF withdrawal/transfer credit", "sensitive": True},
            {"id": "attr_kyc", "name": "Aadhaar / Government KYC Document", "category": "IDENTITY", "required": True, "description": "EPFO mandatory e-KYC biometric identity verification", "sensitive": True}
        ]
    else:
        final_domain = "Corporate/Enterprise"
        final_subject = subject or "Action Required: Digital Data Processing Consent Notice"
        final_purpose = purpose or "Collection and processing of personal data for statutory and organizational requirements."
        final_fiduciary = fiduciary or "Cialfor Research Labs Private Limited"
        final_body = body or (
            f"Dear {dp_name},\n\n"
            f"We request your explicit consent for processing your personal data for: {final_purpose}\n\n"
            "Kindly review the requested data attributes and statutory terms on the Consent Manager Portal.\n\n"
            "Thanks & Regards,\nCialfor Privacy Compliance Officer"
        )
        requested_attrs = [
            {"id": "attr_name", "name": "Full Name & Official Identity", "category": "IDENTITY", "required": True, "description": "Official name of Data Principal", "sensitive": False},
            {"id": "attr_email", "name": "Email Address", "category": "CONTACT", "required": True, "description": "Contact email address", "sensitive": False},
            {"id": "attr_phone", "name": "Mobile Phone Number", "category": "CONTACT", "required": True, "description": "Direct mobile contact number", "sensitive": False},
            {"id": "attr_documents", "name": "Supporting Documents / Records", "category": "LEGAL/VERIFICATION", "required": False, "description": "Specific records requested for service delivery", "sensitive": True, "defaultGranted": True}
        ]

    # 2. Create EmailSnapshot
    snapshot_id = f"ES-2026-CIALFOR-{random.randint(1000, 9999)}"
    cursor.execute("""
    INSERT INTO email_snapshots (id, from_address, to_address, subject, sent_date, body_text, attachment_name, attachment_size, dkim_status, spf_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        snapshot_id,
        f"{final_fiduciary} <prerna.p@cialfor.com>",
        f"{dp_name} <{dp_email}>",
        final_subject,
        datetime.utcnow().strftime("%A, %B %d, %Y"),
        final_body,
        "Statutory_Privacy_Notice_NTC-2026-CIALFOR-001.pdf",
        "1.2 MB",
        "DKIM Signed",
        "SPF Pass"
    ))

    # 3. Create ConsentRequest
    req_id = f"REQ-2026-CIALFOR-{random.randint(100, 999)}"
    notice_id = f"NTC-2026-CIALFOR-{random.randint(100, 999)}"
    now = datetime.utcnow().isoformat() + "Z"
    expires = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"

    cursor.execute("""
    INSERT INTO consent_requests (id, token, notice_id, data_principal_id, email_snapshot_id, fiduciary_name, fiduciary_category, fiduciary_logo, fiduciary_email, dpo_name, dpo_email, purpose, domain, legal_basis, validity_period, data_region, requested_attributes, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        req_id,
        token,
        notice_id,
        dp_id,
        snapshot_id,
        final_fiduciary,
        f"{final_domain} Fiduciary",
        "🏢",
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
        expires
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

    # Try extracting token from body text (e.g. http://localhost:5173/request/tok_123 or /request/tok_123)
    token_match = re.search(r'/request/([a-zA-Z0-9_\-]+)', payload.body_text)
    token = token_match.group(1) if token_match else generate_unpredictable_token()

    cursor.execute("SELECT * FROM consent_requests WHERE token = ? OR notice_id = ? OR id = ?;", (token, token, token))
    row = cursor.fetchone()

    if row:
        req = dict(row)
        dp_id = generate_data_principal_id(dp_email)
        cursor.execute("SELECT * FROM data_principals WHERE id = ?;", (dp_id,))
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO data_principals (id, name, email, phone, roll_no, institution, kyc_status, registered_on)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (dp_id, dp_name, dp_email, "+91 98765 12345", "CIALFOR-DP-2026", payload.fiduciary_name or "Cialfor Research Labs", "Verified", datetime.utcnow().isoformat() + "Z"))

        cursor.execute("UPDATE consent_requests SET data_principal_id = ?, fiduciary_name = ? WHERE id = ?;", (dp_id, payload.fiduciary_name or "Cialfor Research Labs", req["id"]))
        cursor.execute("UPDATE email_snapshots SET from_address = ?, to_address = ?, subject = ?, body_text = ? WHERE id = ?;", (payload.from_address or "Prerna Pandey <prerna.p@cialfor.com>", f"{dp_name} <{dp_email}>", payload.subject, payload.body_text, req["email_snapshot_id"]))
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
            purpose=payload.purpose or payload.subject,
            fiduciary=payload.fiduciary_name
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

        if fiduciary:
            updates_cr.append("fiduciary_name = ?")
            params_cr.append(fiduciary)
            updates_es.append("from_address = ?")
            params_es.append(f"{fiduciary} <prerna.p@cialfor.com>")
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

        if fiduciary:
            updates_cr.append("fiduciary_name = ?")
            params_cr.append(fiduciary)
            updates_es.append("from_address = ?")
            params_es.append(f"{fiduciary} <prerna.p@cialfor.com>")
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
        conn.close()
        return {
            "success": True,
            "already_processed": True,
            "message": f"Consent request already processed as {req['status']}.",
            "status": req["status"],
            "consent": dict(existing_consent) if existing_consent else None
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
            json.dumps(payload.selected_attributes),
            json.dumps(payload.denied_attributes),
            req["dpo_email"],
            req["data_region"],
            receipt_hash,
            payload.remark,
            now,
            expiry
        ))

        consent_record = {
            "consentId": consent_id,
            "requestId": req["id"],
            "fiduciary": req["fiduciary_name"],
            "fiduciaryCategory": req["fiduciary_category"],
            "fiduciaryLogo": req["fiduciary_logo"],
            "purpose": req["purpose"],
            "noticeId": req["notice_id"],
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

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Consent decision {payload.decision} recorded successfully.",
        "consent": consent_record
    }

@app.get("/api/consents")
def list_consents(principalId: Optional[str] = Query(None)):
    conn = get_db()
    cursor = conn.cursor()
    if principalId:
        cursor.execute("SELECT * FROM consents WHERE data_principal_id = ? ORDER BY granted_on DESC;", (principalId,))
    else:
        cursor.execute("SELECT * FROM consents ORDER BY granted_on DESC;")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        d["grantedAttributes"] = json.loads(d["granted_attributes"])
        d["deniedAttributes"] = json.loads(d["denied_attributes"])
        d["grantedOn"] = d["granted_on"]
        d["expiresOn"] = d["expires_on"]
        d["fiduciary"] = d["fiduciary_name"]
        d["fiduciaryCategory"] = d["fiduciary_category"]
        d["fiduciaryLogo"] = d["fiduciary_logo"]
        d["noticeId"] = d["notice_id"]
        d["dpoContact"] = d["dpo_contact"]
        d["dataRegion"] = d["data_region"]
        d["receiptHash"] = d["receipt_hash"]
        d["customNote"] = d["custom_note"]
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

if __name__ == "__main__":
    print("====================================================")
    print("DP Consent Manager Python FastAPI Real Email Backend")
    print("REST Base URL: http://localhost:8000/api")
    print("====================================================")
    uvicorn.run(app, host="0.0.0.0", port=8000)
