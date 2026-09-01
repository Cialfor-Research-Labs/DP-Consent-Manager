"""
Data Principal Consent Manager - Real Gmail Email Listener Script
Monitors or posts real Gmail consent request emails directly into Python FastAPI SQLite Database.
"""

import sys
import json
import urllib.request
import urllib.parse

API_WEBHOOK_URL = "http://localhost:8000/api/gmail-webhook"

def post_email_to_consent_manager(from_address, to_address, subject, body_text, fiduciary_name="Cialfor Research Labs Private Limited"):
    payload = {
        "from_address": from_address,
        "to_address": to_address,
        "subject": subject,
        "body_text": body_text,
        "fiduciary_name": fiduciary_name,
        "purpose": subject
    }

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        API_WEBHOOK_URL,
        data=data,
        headers={'Content-Type': 'application/json'}
    )

    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)
            print("====================================================")
            print("[SUCCESS] Email Ingested Cleanly to Consent Manager DB!")
            print(f"Token: {res_json.get('token')}")
            print(f"Recipient: {res_json.get('dataPrincipal', {}).get('email')}")
            print(f"Subject: {res_json.get('emailSubject')}")
            print(f"Consent Link: {res_json.get('link')}")
            print("====================================================")
            return res_json
    except Exception as e:
        print(f"[ERROR] Webhook Sync Error: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) >= 5:
        from_addr = sys.argv[1]
        to_addr = sys.argv[2]
        subj = sys.argv[3]
        body = sys.argv[4]
        post_email_to_consent_manager(from_addr, to_addr, subj, body)
    else:
        print("Usage: python gmail_listener.py <from_address> <to_address> <subject> <body_text>")
        print("\nExecuting Demo Ingestion...")
        post_email_to_consent_manager(
            "Prerna Pandey <prerna.p@cialfor.com>",
            "pandeyprerna1407@gmail.com",
            "Action Required: Consent for PF Account Processing",
            "Dear Employee,\n\nAs part of our PF (Provident Fund) account processing and related statutory requirements, we are required to collect and process certain personal information.\n\nLink: http://localhost:5173/request/tok_pf_account"
        )
