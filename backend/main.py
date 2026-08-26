import json
import random
import uvicorn
from typing import Optional
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from database import get_db, init_db, generate_sha256_signature, generate_data_principal_id
from models import DecisionPayload, RevokePayload, DSRRequestPayload, ConsentRequestCreatePayload

# Initialize database tables and seed records
init_db()

app = FastAPI(
    title="Data Principal Consent Manager - Python Backend",
    description="DPDP Act 2023 Compliant Python FastAPI REST API Backend",
    version="1.0.0"
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
    req["dataPrincipal"] = dict(dp_row) if dp_row else {}

    # Hydrate EmailSnapshot
    cursor.execute("SELECT * FROM email_snapshots WHERE id = ?;", (req["email_snapshot_id"],))
    es_row = cursor.fetchone()
    req["emailSnapshot"] = dict(es_row) if es_row else {}

    # Compatibility mappings for frontend UI
    req["fiduciary"] = req["fiduciary_name"]
    req["fiduciaryCategory"] = req["fiduciary_category"]
    req["fiduciaryLogo"] = req["fiduciary_logo"]
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

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "Python FastAPI DP Consent Manager Backend",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.post("/api/consent-requests")
def create_consent_request(payload: ConsentRequestCreatePayload):
    conn = get_db()
    cursor = conn.cursor()

    # 1. Resolve or create DataPrincipal
    dp_id = generate_data_principal_id(payload.principal_email)
    cursor.execute("SELECT * FROM data_principals WHERE id = ?;", (dp_id,))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO data_principals (id, name, email, registered_on)
        VALUES (?, ?, ?, ?);
        """, (dp_id, payload.principal_name, payload.principal_email, datetime.utcnow().isoformat() + "Z"))

    # 2. Create EmailSnapshot
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

    # 3. Create ConsentRequest
    req_id = f"REQ-2026-CR-{random.randint(100, 999)}"
    token = f"tok_{random.randint(100000, 999999)}_sec"
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
def resolve_consent_request(token: str = Query(..., description="Secure request token")):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consent_requests WHERE token = ?;", (token,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Consent request not found for provided token")

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
def get_consent_request_by_token_path(request_token: str = Path(..., description="Request token, notice ID, or request ID")):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM consent_requests WHERE token = ? OR notice_id = ? OR id = ?;", (request_token, request_token, request_token))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Consent request not found for token/id: {request_token}")

    result = hydrate_request(row, conn)
    conn.close()
    return result

@app.post("/api/consent-requests/{request_id}/decision")
def record_consent_decision(request_id: str, payload: DecisionPayload):
    if payload.decision not in ["GRANTED", "DENIED"]:
        raise HTTPException(status_code=400, detail="Invalid decision (must be GRANTED or DENIED)")

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM consent_requests WHERE id = ? OR notice_id = ?;", (request_id, request_id))
    req_row = cursor.fetchone()
    if not req_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Consent request not found")

    req = dict(req_row)
    now = datetime.utcnow().isoformat() + "Z"
    decision_id = f"DEC-{int(datetime.utcnow().timestamp() * 1000)}"

    # Insert into consent_decisions
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

    # Update consent_requests status
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

    # Record Audit Event
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
        f"Consent revoked. Reason: {payload.reason}",
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
    dp_id = payload.dataPrincipalId or generate_data_principal_id("ananya.sharma@delhiuniv.ac.in")

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
    print("DP Consent Manager Python FastAPI Backend starting")
    print("REST Base URL: http://localhost:8000/api")
    print("====================================================")
    uvicorn.run(app, host="0.0.0.0", port=8000)
