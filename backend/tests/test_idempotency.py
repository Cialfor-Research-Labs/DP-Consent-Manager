import os
import sys
import unittest
import sqlite3
import uuid

# Ensure backend and tests directory are in python search path
TESTS_DIR = os.path.abspath(os.path.dirname(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(TESTS_DIR, ".."))
if TESTS_DIR not in sys.path:
    sys.path.insert(0, TESTS_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from test_helper import create_isolated_test_db, destroy_isolated_test_db, assert_not_production_db
from main import app, get_db
from fastapi.testclient import TestClient


class TestWebhookIdempotency(unittest.TestCase):
    """
    Test suite for backend-level Gmail webhook idempotency:
    - First POST with message_id -> creates request
    - Second POST with same message_id -> returns same request/token
    - Total consent_request count for that message remains 1
    """

    @classmethod
    def setUpClass(cls):
        cls.test_db_path = create_isolated_test_db()
        assert_not_production_db()
        cls.webhook_secret = os.getenv("GMAIL_WEBHOOK_SECRET", "test-secret-idempotency-123")
        os.environ["GMAIL_WEBHOOK_SECRET"] = cls.webhook_secret
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        destroy_isolated_test_db(cls.test_db_path)

    def setUp(self):
        assert_not_production_db()
        self.webhook_secret = os.getenv("GMAIL_WEBHOOK_SECRET", "test-secret-idempotency-123")
        self.client = TestClient(app)

    def test_gmail_webhook_idempotency_same_message_id(self):
        """
        Posting to /api/gmail-webhook twice with the exact same Gmail message_id
        must return the existing request/token and NOT create a duplicate row in DB.
        """
        unique_msg_id = f"gmail_msg_{uuid.uuid4().hex[:16]}"
        unique_thread_id = f"gmail_thd_{uuid.uuid4().hex[:16]}"
        
        payload = {
            "from_address": "ABC Institute of Technology <records@abcinstitute.edu>",
            "to_address": "Manu Sharma <manusharma.cs78@gmail.com>",
            "subject": "Action Required: University Student Records Consent Verification",
            "body_text": (
                "Dear Student,\n\n"
                "ABC Institute of Technology requests your consent to process academic records "
                "and student profile details.\n\n"
                "Regards,\nStudent Records Team"
            ),
            "sent_date": "Wednesday, September 16, 2026",
            "message_id": unique_msg_id,
            "thread_id": unique_thread_id
            # Notice: extracted_token is omitted to ensure the backend generates one
        }
        headers = {"X-Webhook-Secret": self.webhook_secret}

        # ── 1. FIRST POST: Should create a new consent request ────────────────
        res1 = self.client.post("/api/gmail-webhook", json=payload, headers=headers)
        self.assertEqual(res1.status_code, 200, f"First POST failed: {res1.text}")
        data1 = res1.json()

        token1 = data1.get("token")
        id1 = data1.get("id")
        link1 = data1.get("link")
        domain1 = data1.get("domain")

        self.assertIsNotNone(token1, "First POST must return a token")
        self.assertTrue(token1.startswith("tok_"), "Token must start with tok_")
        self.assertEqual(domain1, "Education")
        self.assertIn(token1, link1, "Link must contain the generated token")

        # Verify exactly 1 record exists in DB for this message_id
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT count(id), token, id FROM consent_requests WHERE message_id = ?;", (unique_msg_id,))
        count_after_first, db_token, db_id = c.fetchone()
        conn.close()

        self.assertEqual(count_after_first, 1, "Expected exactly 1 consent_request in DB after first POST")
        self.assertEqual(db_token, token1)
        self.assertEqual(db_id, id1)

        # ── 2. SECOND POST: Exactly same message_id should return existing ────
        res2 = self.client.post("/api/gmail-webhook", json=payload, headers=headers)
        self.assertEqual(res2.status_code, 200, f"Second POST failed: {res2.text}")
        data2 = res2.json()

        token2 = data2.get("token")
        id2 = data2.get("id")
        link2 = data2.get("link")
        domain2 = data2.get("domain")

        # Assert same request, token, link, and domain returned
        self.assertEqual(token2, token1, "Second POST must return the exact same token")
        self.assertEqual(id2, id1, "Second POST must return the exact same request ID")
        self.assertEqual(link2, link1, "Second POST must return the exact same link")
        self.assertEqual(domain2, domain1, "Second POST must return the exact same domain")

        # ── 3. DB VERIFICATION: Still exactly 1 consent_request in DB ─────────
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT count(id) FROM consent_requests WHERE message_id = ?;", (unique_msg_id,))
        count_after_second = c.fetchone()[0]

        # Also check email_snapshots table
        c.execute("SELECT count(id) FROM email_snapshots WHERE message_id = ?;", (unique_msg_id,))
        snapshot_count = c.fetchone()[0]
        conn.close()

        self.assertEqual(count_after_second, 1, "Total consent_request count for that message must remain 1")
        self.assertEqual(snapshot_count, 1, "Total email_snapshot count for that message must remain 1")

    def test_gmail_webhook_idempotency_preserves_decision(self):
        """
        If a user has already granted or denied a request, a duplicate webhook call
        must return the existing request and NOT revert the status back to PENDING.
        """
        unique_msg_id = f"gmail_msg_{uuid.uuid4().hex[:16]}"
        unique_thread_id = f"gmail_thd_{uuid.uuid4().hex[:16]}"

        payload = {
            "from_address": "Apollo Care Hospital <compliance@apollo.com>",
            "to_address": "Manu Sharma <manusharma.cs78@gmail.com>",
            "subject": "Consent Request: Healthcare Processing",
            "body_text": "Apollo Care requests consent to process diagnostic medical records.",
            "message_id": unique_msg_id,
            "thread_id": unique_thread_id
        }
        headers = {"X-Webhook-Secret": self.webhook_secret}

        res1 = self.client.post("/api/gmail-webhook", json=payload, headers=headers)
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        req_id = data1["id"]
        token1 = data1["token"]

        # Simulate user decision recorded in DB
        conn = get_db()
        c = conn.cursor()
        c.execute("UPDATE consent_requests SET status = 'GRANTED' WHERE id = ?;", (req_id,))
        conn.commit()
        conn.close()

        # Retry webhook call with same message_id
        res2 = self.client.post("/api/gmail-webhook", json=payload, headers=headers)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()

        self.assertEqual(data2["token"], token1)
        self.assertEqual(data2["id"], req_id)
        self.assertEqual(data2["status"], "GRANTED", "Status must remain GRANTED, not reset to PENDING")

        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT count(id), status FROM consent_requests WHERE message_id = ?;", (unique_msg_id,))
        count, status = c.fetchone()
        conn.close()

        self.assertEqual(count, 1)
        self.assertEqual(status, "GRANTED")


if __name__ == "__main__":
    unittest.main()
