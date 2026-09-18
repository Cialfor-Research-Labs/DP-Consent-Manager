"""
Unit and Integration Test Suite for the Consent Intent Detector.

Validates the explainable weighted scoring model and contextual evidence rules:
1. Genuine healthcare consent request -> accepted (CONSENT_REQUEST)
2. Genuine banking KYC consent request -> accepted (CONSENT_REQUEST)
3. Genuine education consent request -> accepted (CONSENT_REQUEST)
4. Password reset with "Action Required" -> rejected (NOT_CONSENT)
5. Newsletter containing "consent" -> rejected (NOT_CONSENT)
6. OTP/security mail -> rejected (NOT_CONSENT)
7. DPDP receipt -> rejected (NOT_CONSENT)
8. Vague privacy notice -> ambiguous/rejected (AMBIGUOUS or NOT_CONSENT)
9. Email explicitly requesting permission to process named personal data for a purpose -> accepted (CONSENT_REQUEST)

Also tests end-to-end /api/gmail-webhook integration, SQLite persistence, and idempotency.
"""

import os
import sys
import uuid
import unittest
import json

# Ensure backend and tests directory are in python search path
TESTS_DIR = os.path.abspath(os.path.dirname(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(TESTS_DIR, ".."))
if TESTS_DIR not in sys.path:
    sys.path.insert(0, TESTS_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from test_helper import create_isolated_test_db, destroy_isolated_test_db, assert_not_production_db
from consent_intent_detector import (
    detect_consent_intent,
    CONSENT_REQUEST,
    NOT_CONSENT,
    AMBIGUOUS,
    HIGH,
    MEDIUM
)
from main import app
from database import get_db
from fastapi.testclient import TestClient


class TestConsentIntentDetectorUnit(unittest.TestCase):
    """Unit tests for the scoring model and contextual evidence rules."""

    def test_01_genuine_healthcare_consent_request_accepted(self):
        """1. Genuine healthcare consent request -> accepted (CONSENT_REQUEST)."""
        subject = "Action Required: Consent for Healthcare Data Processing"
        body = (
            "Dear Patient,\n\n"
            "Apollo Health Center requires your explicit consent for processing diagnostic lab reports "
            "and medical treatment history in accordance with the DPDP Act 2023.\n\n"
            "Please review and submit your decision:\n"
            "http://localhost:5173/request/tok_health_123"
        )
        sender = "Apollo Health Center <compliance@apollohealth.org>"
        result = detect_consent_intent(subject, body, sender)

        self.assertTrue(result["is_consent_request"])
        self.assertEqual(result["classification"], CONSENT_REQUEST)
        self.assertGreaterEqual(result["score"], 6)
        self.assertEqual(result["confidence"], HIGH)
        self.assertTrue(any("consent request" in r.lower() for r in result["reasons"]))
        self.assertTrue(any("attributes" in r.lower() for r in result["reasons"]))

    def test_02_genuine_banking_kyc_consent_request_accepted(self):
        """2. Genuine banking KYC consent request -> accepted (CONSENT_REQUEST)."""
        subject = "Action Required: Consent for Bank KYC and Account Verification"
        body = (
            "Dear Customer,\n\n"
            "We require your explicit consent to verify your PAN, Aadhaar number, and annual income "
            "for opening your digital savings bank account under RBI mandatory KYC rules.\n\n"
            "Click here to review the privacy notice and configure your granular consent choices."
        )
        sender = "State Bank Operations <kyc-notice@sbi-online.in>"
        result = detect_consent_intent(subject, body, sender)

        self.assertTrue(result["is_consent_request"])
        self.assertEqual(result["classification"], CONSENT_REQUEST)
        self.assertGreaterEqual(result["score"], 6)
        self.assertEqual(result["confidence"], HIGH)
        self.assertTrue(any("consent request" in r.lower() for r in result["reasons"]))

    def test_03_genuine_education_consent_request_accepted(self):
        """3. Genuine education consent request -> accepted (CONSENT_REQUEST)."""
        subject = "Action Required: Student Academic Records Consent"
        body = (
            "Dear Student,\n\n"
            "ABC Institute of Technology requests your digital consent under the DPDP Act 2023 "
            "to process your student academic records, marks, and graduation certificates for student services.\n\n"
            "Data Requested:\n"
            "- Full Name\n- Enrollment Number\n- Academic Records\n"
        )
        sender = "Delhi Institute of Technology <registrar@dit.edu.in>"
        result = detect_consent_intent(subject, body, sender)

        self.assertTrue(result["is_consent_request"])
        self.assertEqual(result["classification"], CONSENT_REQUEST)
        self.assertGreaterEqual(result["score"], 6)
        self.assertEqual(result["confidence"], HIGH)

    def test_04_password_reset_with_action_required_rejected(self):
        """4. Password reset with 'Action Required' -> rejected (NOT_CONSENT)."""
        subject = "Action Required: Reset Your Account Password Immediately"
        body = (
            "Hello,\n\n"
            "We received a request to reset your password. If you initiated this request, please "
            "click the link below to set a temporary password:\n"
            "https://auth.example.com/reset-password?token=abc123xyz\n\n"
            "If you did not request this, please contact our security alert team immediately."
        )
        sender = "Security Alert <security@accounts.example.com>"
        result = detect_consent_intent(subject, body, sender)

        self.assertFalse(result["is_consent_request"])
        self.assertEqual(result["classification"], NOT_CONSENT)
        self.assertLess(result["score"], 3)
        self.assertTrue(any("password reset" in r.lower() or "security alert" in r.lower() for r in result["reasons"]))

    def test_05_newsletter_containing_consent_rejected(self):
        """5. Newsletter containing 'consent' -> rejected (NOT_CONSENT)."""
        subject = "Tech Weekly Digest: Trends in AI, Privacy, and DPDP"
        body = (
            "Welcome to the weekly newsletter!\n\n"
            "In this edition, we analyze how consumer consent models are evolving under modern data protection laws. "
            "Top stories:\n"
            "1. Best practices for obtaining user consent\n"
            "2. Global regulatory updates\n\n"
            "You received this email because you subscribed to our weekly digest. "
            "To unsubscribe from this list or manage your email preferences, click here."
        )
        sender = "Tech Digest <newsletter@technews.com>"
        result = detect_consent_intent(subject, body, sender)

        self.assertFalse(result["is_consent_request"])
        self.assertEqual(result["classification"], NOT_CONSENT)
        self.assertLess(result["score"], 3)
        self.assertTrue(any("newsletter" in r.lower() or "promotional" in r.lower() for r in result["reasons"]))

    def test_06_otp_security_mail_rejected(self):
        """6. OTP/security mail -> rejected (NOT_CONSENT)."""
        subject = "Action Required: Your Verification Code for Login"
        body = (
            "Dear User,\n\n"
            "Your one-time password (OTP) is 584920. This verification code is valid for 10 minutes.\n\n"
            "Do not share this code with anyone. Our customer support will never ask for your password or OTP."
        )
        sender = "Auth Gateway <noreply@login.bank.com>"
        result = detect_consent_intent(subject, body, sender)

        self.assertFalse(result["is_consent_request"])
        self.assertEqual(result["classification"], NOT_CONSENT)
        self.assertLess(result["score"], 3)
        self.assertTrue(any("one-time password" in r.lower() or "otp" in r.lower() for r in result["reasons"]))

    def test_07_dpdp_receipt_rejected(self):
        """7. DPDP receipt -> rejected (NOT_CONSENT)."""
        subject = "Re: Action Required: Student Academic Records Consent"
        body = (
            "=== DIGITAL CONSENT STATUS UPDATE ===\n"
            "Decision: CONSENT GRANTED\n"
            "Notice ID: NTC-2026-TEST-101\n"
            "Artifact ID: CNST-2026-9999\n"
            "SHA-256 Integrity Hash: sha256:4a854930bfae792\n"
            "Generated by Data Principal Consent Manager\n"
            "Secured by Data Principal Consent Manager"
        )
        sender = "DPDP System <receipts@consentmanager.local>"
        result = detect_consent_intent(subject, body, sender)

        self.assertFalse(result["is_consent_request"])
        self.assertEqual(result["classification"], NOT_CONSENT)
        self.assertLess(result["score"], 3)
        self.assertTrue(any("system-generated" in r.lower() or "receipt" in r.lower() for r in result["reasons"]))

    def test_08_vague_privacy_notice_ambiguous_or_rejected(self):
        """8. Vague privacy notice -> ambiguous/rejected (NOT_CONSENT or AMBIGUOUS, never accepted)."""
        subject = "Notice: Updates to Our Privacy Policy and Terms"
        body = (
            "Dear Valued Customer,\n\n"
            "We have updated our Privacy Policy to enhance transparency in accordance with DPDP Act guidance. "
            "We value your privacy and are committed to protecting your personal data.\n\n"
            "You can view the updated terms on our website. For your information only — no action is required on your part."
        )
        sender = "Notice Desk <info@genericportal.org>"
        result = detect_consent_intent(subject, body, sender)

        self.assertFalse(result["is_consent_request"], "Vague privacy notice must NOT be classified as consent request")
        self.assertIn(result["classification"], [NOT_CONSENT, AMBIGUOUS])
        self.assertTrue(any("policy update" in r.lower() or "insufficient" in r.lower() for r in result["reasons"]))

    def test_09_explicit_permission_to_process_named_personal_data_accepted(self):
        """9. Email explicitly requesting permission to process named personal data for a purpose -> accepted."""
        subject = "Data Processing Authorization: Clinical Oncology Trial 2026"
        body = (
            "BioResearch Therapeutics requests your permission to collect and process your personal data "
            "for the purpose of the Clinical Oncology Trial 2026.\n\n"
            "Data Requested:\n"
            "- Full Name\n- Blood test results\n- Genetic markers\n- Medical diagnosis\n\n"
            "You maintain the right to withdraw your consent at any time. "
            "Please click below to review and submit your decision:\n"
            "http://localhost:5173/request/tok_bioresearch_trial"
        )
        sender = "BioResearch Therapeutics <trials@bioresearch.org>"
        result = detect_consent_intent(subject, body, sender)

        self.assertTrue(result["is_consent_request"])
        self.assertEqual(result["classification"], CONSENT_REQUEST)
        self.assertGreaterEqual(result["score"], 6)
        self.assertEqual(result["confidence"], HIGH)
        self.assertTrue(any("permission" in r.lower() or "authorization" in r.lower() for r in result["reasons"]))
        self.assertTrue(any("purpose" in r.lower() for r in result["reasons"]))

    def test_10_isolated_subject_keywords_without_evidence_rejected(self):
        """Subject keywords 'Consent', 'Action Required', 'DPDP' without contextual evidence must NOT pass."""
        subject = "Action Required: Consent Notice under DPDP"
        body = "Hello team, please see the attached meeting schedule for Monday."
        result = detect_consent_intent(subject, body, "Team Lead <lead@corp.com>")

        self.assertFalse(result["is_consent_request"])
        self.assertIn(result["classification"], [NOT_CONSENT, AMBIGUOUS])


class TestConsentIntentDetectorWebhookIntegration(unittest.TestCase):
    """End-to-end integration tests through /api/gmail-webhook endpoint."""

    @classmethod
    def setUpClass(cls):
        cls.test_db_path = create_isolated_test_db()
        assert_not_production_db()
        cls.webhook_secret = os.getenv("GMAIL_WEBHOOK_SECRET", "test-secret-intent-12345")
        os.environ["GMAIL_WEBHOOK_SECRET"] = cls.webhook_secret
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        destroy_isolated_test_db(cls.test_db_path)

    def setUp(self):
        assert_not_production_db()
        self.headers = {"X-Webhook-Secret": self.webhook_secret}

    def test_e2e_genuine_consent_request_creates_db_record(self):
        """Genuine consent request passes detector, creates 1 consent request row with intent metadata."""
        msg_id = f"msg_intent_real_{uuid.uuid4().hex[:12]}"
        payload = {
            "from_address": "Apollo Health Center <compliance@apollohealth.org>",
            "to_address": "Patient Sharma <sharma@example.com>",
            "subject": "Action Required: Consent for Healthcare Data Processing",
            "body_text": (
                "Dear Patient,\n\n"
                "Apollo Health Center requires your explicit consent for processing diagnostic lab reports "
                "and medical treatment history in accordance with the DPDP Act 2023.\n\n"
                "Please review and submit your decision on our portal."
            ),
            "message_id": msg_id
        }

        res = self.client.post("/api/gmail-webhook", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertFalse(data.get("ignored", False))
        self.assertTrue(data.get("token", "").startswith("tok_"))
        self.assertEqual(data.get("intent_classification"), CONSENT_REQUEST)
        self.assertGreaterEqual(data.get("intent_score", 0), 6)
        self.assertIsInstance(data.get("intent_reasons"), list)

        # Check DB row
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT id, token, intent_score, intent_classification FROM consent_requests WHERE message_id = ?;", (msg_id,))
        row = c.fetchone()
        conn.close()

        self.assertIsNotNone(row, "Record must be created in DB")
        self.assertGreaterEqual(row[2], 6)
        self.assertEqual(row[3], CONSENT_REQUEST)

    def test_e2e_password_reset_rejected_with_zero_db_records(self):
        """Password reset with 'Action Required' is ignored and creates 0 rows in DB."""
        msg_id = f"msg_intent_pwd_{uuid.uuid4().hex[:12]}"
        payload = {
            "from_address": "Security Alert <security@accounts.example.com>",
            "to_address": "User <user@example.com>",
            "subject": "Action Required: Reset your account password",
            "body_text": "A password reset request was received. Click here to reset your password.",
            "message_id": msg_id
        }

        res = self.client.post("/api/gmail-webhook", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertTrue(data.get("ignored"))
        self.assertEqual(data.get("classification"), NOT_CONSENT)
        self.assertLess(data.get("intent_score", 10), 3)

        # Verify 0 DB rows created
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM consent_requests WHERE message_id = ?;", (msg_id,))
        count = c.fetchone()[0]
        conn.close()
        self.assertEqual(count, 0, "No consent request should be created for password resets")

    def test_e2e_newsletter_with_consent_word_rejected(self):
        """Newsletter mentioning 'consent' is ignored and creates 0 rows in DB."""
        msg_id = f"msg_intent_news_{uuid.uuid4().hex[:12]}"
        payload = {
            "from_address": "Weekly Tech <digest@technews.com>",
            "to_address": "Reader <reader@example.com>",
            "subject": "Weekly Newsletter: Digital Privacy & User Consent Insights",
            "body_text": "Read our latest articles on user consent and digital platforms. Unsubscribe from this list here.",
            "message_id": msg_id
        }

        res = self.client.post("/api/gmail-webhook", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertTrue(data.get("ignored"))
        self.assertEqual(data.get("classification"), NOT_CONSENT)

        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM consent_requests WHERE message_id = ?;", (msg_id,))
        count = c.fetchone()[0]
        conn.close()
        self.assertEqual(count, 0)

    def test_e2e_vague_privacy_notice_rejected(self):
        """Vague privacy policy notice is ignored and creates 0 rows in DB."""
        msg_id = f"msg_intent_vague_{uuid.uuid4().hex[:12]}"
        payload = {
            "from_address": "Legal <legal@corp.com>",
            "to_address": "User <user@example.com>",
            "subject": "Notice: Privacy Policy Update",
            "body_text": "We updated our privacy policy. No action is required on your part.",
            "message_id": msg_id
        }

        res = self.client.post("/api/gmail-webhook", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertTrue(data.get("ignored"))
        self.assertIn(data.get("classification"), [NOT_CONSENT, AMBIGUOUS])

        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM consent_requests WHERE message_id = ?;", (msg_id,))
        count = c.fetchone()[0]
        conn.close()
        self.assertEqual(count, 0)

    def test_e2e_idempotency_preserved_for_accepted_emails(self):
        """Posting the same genuine consent email twice returns the same token and request ID."""
        msg_id = f"msg_intent_idemp_{uuid.uuid4().hex[:12]}"
        payload = {
            "from_address": "Apex Lending <loans@apexlending.io>",
            "to_address": "Borrower <borrower@example.com>",
            "subject": "Action Required: Consent for Credit Assessment & CIBIL Verification",
            "body_text": (
                "Apex Lending requests your explicit digital consent to verify your PAN, Aadhaar, "
                "and CIBIL credit score for your personal loan application."
            ),
            "message_id": msg_id
        }

        res1 = self.client.post("/api/gmail-webhook", json=payload, headers=self.headers)
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertFalse(data1.get("ignored", False))

        res2 = self.client.post("/api/gmail-webhook", json=payload, headers=self.headers)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()

        self.assertEqual(data1["token"], data2["token"])
        self.assertEqual(data1["id"], data2["id"])

        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM consent_requests WHERE message_id = ?;", (msg_id,))
        count = c.fetchone()[0]
        conn.close()
        self.assertEqual(count, 1)




if __name__ == "__main__":
    unittest.main()


# --- Admin-field isolation regression tests ---
class TestIntentFieldsNotLeakedToPublicAPIs(unittest.TestCase):
    """
    Security regression: intent_score / intent_classification / intent_reasons
    must NEVER appear in responses served to Data Principals or Data Fiduciaries.
    They are persisted in the DB for admin/debug and returned only on the
    server-to-server /api/gmail-webhook endpoint (X-Webhook-Secret protected).
    """

    ADMIN_INTENT_FIELDS = {
        "intent_score", "intentScore",
        "intent_classification", "intentClassification",
        "intent_reasons", "intentReasons",
    }

    @classmethod
    def setUpClass(cls):
        cls.test_db_path = create_isolated_test_db()
        cls.addClassCleanup(destroy_isolated_test_db, cls.test_db_path)
        assert_not_production_db()
        cls.webhook_secret = os.getenv("GMAIL_WEBHOOK_SECRET", "test-secret-isolation-99999")
        os.environ["GMAIL_WEBHOOK_SECRET"] = cls.webhook_secret
        cls.client = TestClient(app)
        cls.addClassCleanup(cls.client.close)

    def setUp(self):
        assert_not_production_db()
        self.headers = {"X-Webhook-Secret": self.webhook_secret}
        self.email = f"intent_isolation_{uuid.uuid4().hex}@example.com"
        registered = self.client.post("/api/auth/register", json={
            "name": "Patient Arora", "email": self.email,
            "password": "Test@1234", "role": "DATA_PRINCIPAL",
        })
        self.assertEqual(registered.status_code, 200, registered.text)
        self.dp_headers = {"Authorization": "Bearer " + registered.json()["access_token"]}
        msg_id = f"msg_isolation_{uuid.uuid4().hex[:12]}"
        payload = {
            "from_address": "City Hospital <compliance@cityhospital.org>",
            "to_address": f"Patient Arora <{self.email}>",
            "subject": "Action Required: Consent for Healthcare Data Processing",
            "body_text": (
                "Dear Patient,\n\n"
                "City Hospital requires your explicit consent for processing diagnostic lab reports "
                "and medical treatment history under the DPDP Act 2023.\n\n"
                "Please review and submit your decision on our portal."
            ),
            "message_id": msg_id,
        }
        res = self.client.post("/api/gmail-webhook", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data.get("ignored", False), "Precondition: test email must be accepted")
        self.token = data["token"]
        self.webhook_data = data
        self.payload = payload

    def _assert_no_intent_fields(self, body, context):
        if isinstance(body, list):
            for item in body:
                self._assert_no_intent_fields(item, context)
        elif isinstance(body, dict):
            for field in self.ADMIN_INTENT_FIELDS:
                self.assertNotIn(field, body,
                    "Admin field '{}' must NOT be present in {} response".format(field, context))
            for value in body.values():
                self._assert_no_intent_fields(value, context)

    def test_webhook_response_carries_intent_fields(self):
        """Baseline: the webhook (server-to-server) response DOES include intent fields."""
        for field in ("intent_score", "intent_classification", "intent_reasons"):
            self.assertIn(field, self.webhook_data,
                          "Webhook response should include admin field '{}'".format(field))

    def test_get_request_by_token_has_no_intent_fields(self):
        """GET /api/consent-requests/{token} must not leak intent fields."""
        res = self.client.get("/api/consent-requests/{}".format(self.token))
        self.assertEqual(res.status_code, 200)
        self._assert_no_intent_fields(res.json(), "GET /api/consent-requests/{token}")

    def test_list_consent_requests_has_no_intent_fields(self):
        """GET /api/consent-requests must not leak intent fields."""
        res = self.client.get("/api/consent-requests", headers=self.dp_headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn(self.token, [r["token"] for r in res.json()])
        self._assert_no_intent_fields(res.json(), "GET /api/consent-requests")

    def test_resolve_endpoint_has_no_intent_fields(self):
        """GET /api/consent-requests/resolve must not leak intent fields."""
        res = self.client.get("/api/consent-requests/resolve?token={}".format(self.token))
        self.assertEqual(res.status_code, 200)
        self._assert_no_intent_fields(res.json(), "GET /api/consent-requests/resolve")

    def test_me_consent_requests_has_no_intent_fields(self):
        """GET /api/me/consent-requests must not leak intent fields."""
        res = self.client.get("/api/me/consent-requests", headers=self.dp_headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn(self.token, [r["token"] for r in res.json()])
        self._assert_no_intent_fields(res.json(), "GET /api/me/consent-requests")

    def test_notice_has_no_intent_fields(self):
        res = self.client.get("/api/consent-requests/notice/" + self.webhook_data["notice_id"])
        self.assertEqual(res.status_code, 200)
        self._assert_no_intent_fields(res.json(), "notice")

    def test_manual_request_and_fiduciary_dashboard_have_no_intent_fields(self):
        from auth import create_access_token
        from database import create_user_account
        user = create_user_account(
            name="Test Fiduciary", email=f"intent_df_{uuid.uuid4().hex}@example.com",
            password_hash="unused", role="DATA_FIDUCIARY", fiduciary_name="City Hospital",
        )
        headers = {"Authorization": "Bearer " + create_access_token({
            "sub": user["id"], "role": "DATA_FIDUCIARY",
        })}
        res = self.client.post("/api/consent-requests", headers=headers, json={
            "fiduciary_name": "City Hospital", "fiduciary_email": "compliance@cityhospital.org",
            "principal_name": "Patient Arora", "principal_email": self.email,
            "purpose": "Diagnostic care", "email_subject": self.payload["subject"],
            "email_body": self.payload["body_text"],
            "requested_attributes": [{"id": "medical", "name": "Medical records",
                                      "intentScore": 99, "nested": {"intent_reasons": ["internal"]}}],
        })
        self.assertEqual(res.status_code, 200, res.text)
        self._assert_no_intent_fields(res.json(), "manual creation")
        res = self.client.get("/api/consent-requests", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn(self.token, [r["token"] for r in res.json()])
        self._assert_no_intent_fields(res.json(), "DF dashboard")

    def test_webhook_aliases_do_not_return_debug_metadata(self):
        for path in ("/api/sync-gmail", "/api/ingest-email"):
            for body in (self.payload, dict(self.payload, subject="Password reset", body_text="Reset your password")):
                with self.subTest(path=path, subject=body["subject"]):
                    res = self.client.post(path, json=body, headers=self.headers)
                    self.assertEqual(res.status_code, 200)
                    self._assert_no_intent_fields(res.json(), path)
                    for field in ("classification", "confidence", "detail"):
                        self.assertNotIn(field, res.json())

    def test_webhook_secret_is_required(self):
        from unittest.mock import patch
        for path in ("/api/gmail-webhook", "/api/sync-gmail", "/api/ingest-email"):
            for headers in ({}, {"X-Webhook-Secret": "wrong-secret"}):
                with self.subTest(path=path, headers=headers):
                    res = self.client.post(path, json=self.payload, headers=headers)
                    self.assertIn(res.status_code, (401, 403))
                    self._assert_no_intent_fields(res.json(), path)
        with patch.dict(os.environ, {"GMAIL_WEBHOOK_SECRET": ""}):
            res = self.client.post("/api/gmail-webhook", json=self.payload, headers=self.headers)
            self.assertEqual(res.status_code, 500)

    def test_public_reads_preserve_internal_metadata(self):
        for path in ("/api/consent-requests/" + self.token,
                     "/api/consent-requests/resolve?token=" + self.token):
            self.assertEqual(self.client.get(path).status_code, 200)
        conn = get_db()
        try:
            for table, key, value in (
                ("consent_requests", "token", self.token),
                ("email_snapshots", "id", self.webhook_data["email_snapshot_id"]),
            ):
                row = conn.execute(
                    f"SELECT intent_score, intent_classification, intent_reasons FROM {table} WHERE {key} = ?",
                    (value,),
                ).fetchone()
                self.assertEqual(row[0], self.webhook_data["intent_score"])
                self.assertEqual(row[1], CONSENT_REQUEST)
                self.assertEqual(json.loads(row[2]), self.webhook_data["intent_reasons"])
        finally:
            conn.close()

    def test_resolve_new_request_has_no_intent_fields(self):
        res = self.client.get("/api/consent-requests/resolve", params={
            "token": "tok_isolation_" + uuid.uuid4().hex,
            "to_email": self.email, "subject": self.payload["subject"],
            "body": self.payload["body_text"],
        })
        self.assertEqual(res.status_code, 200)
        self._assert_no_intent_fields(res.json(), "new resolved request")

    def test_decisions_receipts_and_dashboard_payloads_have_no_intent_fields(self):
        from unittest.mock import patch
        for decision in ("GRANTED", "DENIED"):
            with self.subTest(decision=decision):
                payload = dict(self.payload, message_id="msg_isolation_" + uuid.uuid4().hex)
                ingested = self.client.post("/api/gmail-webhook", json=payload, headers=self.headers)
                self.assertEqual(ingested.status_code, 200)
                token = ingested.json()["token"]
                dashboard = self.client.get("/api/me/consent-requests", headers=self.dp_headers)
                self.assertEqual(dashboard.status_code, 200)
                self._assert_no_intent_fields(dashboard.json(), "dashboard before decision")
                request = next(r for r in dashboard.json() if r["token"] == token)
                attributes = [a["id"] for a in request["requestedAttributes"]]
                with patch("main.request_immediate_dispatch"):
                    res = self.client.post(f"/api/consent-requests/{token}/decision",
                        headers=self.dp_headers, json={
                            "decision": decision,
                            "selected_attributes": attributes if decision == "GRANTED" else [],
                            "denied_attributes": attributes if decision == "DENIED" else [],
                        })
                self.assertEqual(res.status_code, 200)
                self.assertTrue(res.json()["success"])
                self._assert_no_intent_fields(res.json(), "decision")
                if decision == "GRANTED":
                    consent = res.json()["consent"]
                    receipt = self.client.get(
                        "/api/consents/" + consent["consentId"] + "/receipt", headers=self.dp_headers)
                    self.assertEqual(receipt.status_code, 200)
                    self._assert_no_intent_fields(receipt.json(), "receipt")
                updated = self.client.get("/api/consent-requests/" + token)
                self.assertEqual(updated.json()["status"], decision)
                self._assert_no_intent_fields(updated.json(), "request after decision")
        for path in ("/api/consents", "/api/audit", "/api/audit-logs",
                     "/api/data-rights", "/api/nominee", "/api/auth/me"):
            res = self.client.get(path, headers=self.dp_headers)
            self.assertEqual(res.status_code, 200, path)
            self._assert_no_intent_fields(res.json(), path)


if __name__ == "__main__":
    unittest.main()
