import os
import sys
import unittest
import uuid
import json

# Ensure backend and tests directory are in python search path
TESTS_DIR = os.path.abspath(os.path.dirname(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(TESTS_DIR, ".."))
if TESTS_DIR not in sys.path:
    sys.path.insert(0, TESTS_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from test_helper import create_isolated_test_db, destroy_isolated_test_db, assert_not_production_db
from main import app, get_db
from auth import create_access_token, hash_password
from database import link_or_create_data_principal, create_user_account
from fastapi.testclient import TestClient


class TestAutomatedWorkflow(unittest.TestCase):
    """
    End-to-end integration test suite verifying the complete Gmail-to-dashboard workflow:
    - Ingesting Education, Healthcare, Banking, and FinTech emails via /api/gmail-webhook
    - Automatic request discovery via GET /api/me/consent-requests
    - Strict Data Principal isolation (User A requests invisible to User B)
    - Grant and Deny consent decision execution
    - SHA-256 Integrity Hash generation
    - Same-thread fiduciary notification creation & ACK flow
    - Message ID deduplication / idempotency
    """

    @classmethod
    def setUpClass(cls):
        # 1. Create completely isolated test database before any operations
        cls.test_db_path = create_isolated_test_db()
        assert_not_production_db()

        cls.webhook_secret = os.getenv("GMAIL_WEBHOOK_SECRET", "test-secret-flow-456")
        os.environ["GMAIL_WEBHOOK_SECRET"] = cls.webhook_secret
        cls.client = TestClient(app)

        # ── Setup Data Principal User A ──────────────────────────────────────
        cls.email_a = f"alice_flow_{uuid.uuid4().hex[:8]}@example.com"
        cls.name_a = "Alice Principal"
        cls.dp_id_a = link_or_create_data_principal(cls.email_a, cls.name_a)

        user_row_a = create_user_account(
            name=cls.name_a,
            email=cls.email_a,
            password_hash=hash_password("PassAlice123!"),
            role="DATA_PRINCIPAL",
            data_principal_id=cls.dp_id_a
        )
        cls.user_id_a = user_row_a["id"]
        cls.token_a = create_access_token({
            "sub": cls.user_id_a,
            "email": cls.email_a,
            "role": "DATA_PRINCIPAL",
            "dp_id": cls.dp_id_a,
            "name": cls.name_a
        })

        # ── Setup Data Principal User B ──────────────────────────────────────
        cls.email_b = f"bob_flow_{uuid.uuid4().hex[:8]}@example.com"
        cls.name_b = "Bob Principal"
        cls.dp_id_b = link_or_create_data_principal(cls.email_b, cls.name_b)

        user_row_b = create_user_account(
            name=cls.name_b,
            email=cls.email_b,
            password_hash=hash_password("PassBob123!"),
            role="DATA_PRINCIPAL",
            data_principal_id=cls.dp_id_b
        )
        cls.user_id_b = user_row_b["id"]
        cls.token_b = create_access_token({
            "sub": cls.user_id_b,
            "email": cls.email_b,
            "role": "DATA_PRINCIPAL",
            "dp_id": cls.dp_id_b,
            "name": cls.name_b
        })

    @classmethod
    def tearDownClass(cls):
        destroy_isolated_test_db(cls.test_db_path)

    def test_01_education_ingestion_and_dashboard_discovery(self):
        """Gmail Education consent email appears in User A's dashboard via /api/me/consent-requests."""
        msg_id = f"msg_edu_{uuid.uuid4().hex[:12]}"
        thd_id = f"thd_edu_{uuid.uuid4().hex[:12]}"

        payload = {
            "from_address": "ABC Institute of Technology <admissions@abcinstitute.edu>",
            "to_address": f"{self.name_a} <{self.email_a}>",
            "subject": "Action Required: Student Academic Records Consent Notice",
            "body_text": (
                f"Dear {self.name_a},\n\n"
                "ABC Institute of Technology requests your digital consent under the DPDP Act 2023 "
                "to process your student academic records, marks, and graduation certificates.\n"
            ),
            "message_id": msg_id,
            "thread_id": thd_id
        }
        headers = {"X-Webhook-Secret": self.webhook_secret}

        res = self.client.post("/api/gmail-webhook", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        token = data.get("token")
        self.assertIsNotNone(token)
        self.assertEqual(data.get("domain"), "Education")

        # Now query User A's dashboard endpoint
        user_headers = {"Authorization": f"Bearer {self.token_a}"}
        dash_res = self.client.get("/api/me/consent-requests?status=PENDING", headers=user_headers)
        self.assertEqual(dash_res.status_code, 200)
        my_reqs = dash_res.json()

        found = [r for r in my_reqs if r.get("token") == token]
        self.assertEqual(len(found), 1, "User A's dashboard must automatically contain the ingested Education request")
        edu_req = found[0]
        self.assertEqual(edu_req.get("domain"), "Education")
        self.assertEqual(edu_req.get("status"), "PENDING")
        self.assertTrue(len(edu_req.get("attributes", [])) >= 3)

    def test_02_sector_classifications(self):
        """Verify Healthcare, Banking, and FinTech emails ingest and classify properly."""
        sectors = [
            ("Healthcare", "City Care Hospital <records@citycare.org>", "Patient Medical Health Records Processing Consent", "Heart Clinic"),
            ("Banking", "State Commerce Bank <kyc@scb.com>", "Bank Account KYC Identity Verification Notice", "Banking Services"),
            ("FinTech", "PayFlex Credit <loans@payflex.io>", "Personal Loan Assessment and Credit Score Processing", "FinTech Lending")
        ]

        user_headers = {"Authorization": f"Bearer {self.token_a}"}
        headers = {"X-Webhook-Secret": self.webhook_secret}

        for domain, from_addr, subject, body in sectors:
            msg_id = f"msg_{domain.lower()}_{uuid.uuid4().hex[:12]}"
            thd_id = f"thd_{domain.lower()}_{uuid.uuid4().hex[:12]}"

            payload = {
                "from_address": from_addr,
                "to_address": self.email_a,
                "subject": subject,
                "body_text": f"Processing personal data for {body}.",
                "message_id": msg_id,
                "thread_id": thd_id
            }

            res = self.client.post("/api/gmail-webhook", json=payload, headers=headers)
            self.assertEqual(res.status_code, 200)
            res_data = res.json()
            self.assertEqual(res_data.get("domain"), domain, f"Expected domain {domain}")

            # Verify it is returned in User A's dashboard
            token = res_data.get("token")
            dash_res = self.client.get("/api/me/consent-requests?status=PENDING", headers=user_headers)
            my_reqs = dash_res.json()
            found = any(r.get("token") == token for r in my_reqs)
            self.assertTrue(found, f"{domain} request must be discovered by User A")

    def test_03_user_isolation(self):
        """Requests belonging to User A must be completely invisible to User B."""
        headers_a = {"Authorization": f"Bearer {self.token_a}"}
        headers_b = {"Authorization": f"Bearer {self.token_b}"}

        reqs_a = self.client.get("/api/me/consent-requests?status=PENDING", headers=headers_a).json()
        reqs_b = self.client.get("/api/me/consent-requests?status=PENDING", headers=headers_b).json()

        tokens_a = {r["token"] for r in reqs_a}
        tokens_b = {r["token"] for r in reqs_b}

        intersection = tokens_a.intersection(tokens_b)
        self.assertEqual(len(intersection), 0, "No consent request tokens should overlap between User A and User B")

    def test_04_grant_consent_and_receipt_hash(self):
        """Data Principal grants consent; verifies SHA-256 Integrity Hash and same-thread notification."""
        # Ingest a fresh request for User A
        msg_id = f"msg_grant_{uuid.uuid4().hex[:12]}"
        thd_id = f"thd_grant_{uuid.uuid4().hex[:12]}"
        payload = {
            "from_address": "Tech University <records@techuni.edu>",
            "to_address": self.email_a,
            "subject": "Student Placement Consent Verification",
            "body_text": "Requesting consent to share academic grades with recruitment partners.",
            "message_id": msg_id,
            "thread_id": thd_id
        }
        res = self.client.post("/api/gmail-webhook", json=payload, headers={"X-Webhook-Secret": self.webhook_secret})
        self.assertEqual(res.status_code, 200)
        req_token = res.json()["token"]

        # Retrieve request from dashboard to extract attribute IDs
        user_headers = {"Authorization": f"Bearer {self.token_a}"}
        dash_res = self.client.get("/api/me/consent-requests?status=PENDING", headers=user_headers)
        self.assertEqual(dash_res.status_code, 200)
        found = [r for r in dash_res.json() if r.get("token") == req_token]
        self.assertTrue(len(found) > 0)
        target_req = found[0]
        all_attr_ids = [a["id"] for a in target_req.get("attributes", []) if isinstance(a, dict)]

        # Submit decision GRANTED
        decision_payload = {
            "decision": "GRANTED",
            "selected_attributes": all_attr_ids,
            "denied_attributes": [],
            "remark": "Consent granted for placement season."
        }
        dec_res = self.client.post(f"/api/consent-requests/{req_token}/decision", json=decision_payload, headers=user_headers)
        self.assertEqual(dec_res.status_code, 200)
        dec_data = dec_res.json()

        self.assertTrue(dec_data.get("success"))
        consent_record = dec_data.get("consent", {})

        # SHA-256 Integrity Hash verification
        hash_val = consent_record.get("receiptHash")
        self.assertIsNotNone(hash_val, "SHA-256 Integrity Hash must be present")
        raw_hex = hash_val.replace("sha256:", "")
        self.assertEqual(len(raw_hex), 64, "SHA-256 hash must be exactly 64 hex characters")

        # Verify same-thread notification created in fiduciary_notifications
        notif_res = self.client.get("/api/notifications/pending", headers={"X-Webhook-Secret": self.webhook_secret})
        self.assertEqual(notif_res.status_code, 200)
        pending_notifs = notif_res.json()
        
        matching = [n for n in pending_notifs if n.get("thread_id") == thd_id]
        self.assertTrue(len(matching) >= 1, "A pending notification must be created for the same Gmail thread")
        notif_id = matching[0]["id"]
        self.assertIn(matching[0]["action"], ["GRANTED", "CONSENT_GRANTED"])

        # ACK the notification
        ack_res = self.client.post(f"/api/notifications/{notif_id}/ack", headers={"X-Webhook-Secret": self.webhook_secret})
        self.assertEqual(ack_res.status_code, 200)

    def test_05_deny_consent(self):
        """Data Principal denies consent; verifies status updates to DENIED."""
        msg_id = f"msg_deny_{uuid.uuid4().hex[:12]}"
        thd_id = f"thd_deny_{uuid.uuid4().hex[:12]}"
        payload = {
            "from_address": "Marketing Partners <ads@partners.com>",
            "to_address": self.email_a,
            "subject": "Action Required: Consent for Promotional Communications",
            "body_text": "Marketing Partners requests your consent to process email address and contact details for promotional communications.",
            "message_id": msg_id,
            "thread_id": thd_id
        }
        res = self.client.post("/api/gmail-webhook", json=payload, headers={"X-Webhook-Secret": self.webhook_secret})
        self.assertEqual(res.status_code, 200)
        req_token = res.json()["token"]

        user_headers = {"Authorization": f"Bearer {self.token_a}"}
        decision_payload = {
            "decision": "DENIED",
            "selected_attributes": [],
            "denied_attributes": ["attr_email"],
            "remark": "Principal refused marketing consent."
        }
        dec_res = self.client.post(f"/api/consent-requests/{req_token}/decision", json=decision_payload, headers=user_headers)
        self.assertEqual(dec_res.status_code, 200)
        dec_data = dec_res.json()
        self.assertTrue(dec_data.get("success"))

    def test_06_duplicate_message_id_idempotency(self):
        """Duplicate Gmail message_id does not create duplicate database rows."""
        unique_msg = f"msg_idem_{uuid.uuid4().hex[:12]}"
        payload = {
            "from_address": "University <records@uni.edu>",
            "to_address": self.email_a,
            "subject": "Action Required: University Academic Records Consent Verification",
            "body_text": "University requests your explicit consent to process academic records for student verification.",
            "message_id": unique_msg,
            "thread_id": "thd_idem_1"
        }
        headers = {"X-Webhook-Secret": self.webhook_secret}

        res1 = self.client.post("/api/gmail-webhook", json=payload, headers=headers)
        self.assertEqual(res1.status_code, 200)
        token1 = res1.json()["token"]

        res2 = self.client.post("/api/gmail-webhook", json=payload, headers=headers)
        self.assertEqual(res2.status_code, 200)
        token2 = res2.json()["token"]

        self.assertEqual(token1, token2, "Subsequent calls with identical message_id must return identical token")

        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT count(*) FROM consent_requests WHERE message_id = ?;", (unique_msg,))
        count = c.fetchone()[0]
        conn.close()
        self.assertEqual(count, 1, "Exactly one consent_request must exist in DB for this message_id")


if __name__ == "__main__":
    unittest.main()
