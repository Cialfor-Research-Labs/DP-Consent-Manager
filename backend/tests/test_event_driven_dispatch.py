import os
import sys
import unittest
import uuid
import json
from unittest.mock import patch

# Ensure backend and tests directory are in python search path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TESTS_DIR = os.path.abspath(os.path.dirname(__file__))
if TESTS_DIR not in sys.path:
    sys.path.insert(0, TESTS_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from test_helper import create_isolated_test_db, destroy_isolated_test_db, assert_not_production_db
from main import app, get_db, request_immediate_dispatch
from auth import create_access_token, hash_password
from database import link_or_create_data_principal, create_user_account
from fastapi.testclient import TestClient


class TestEventDrivenDispatch(unittest.TestCase):
    """
    Test suite for event-driven consent receipt dispatch, latency optimization,
    and scheduled fallback idempotency:
    1. Transactional persistence: Notification created as 'PENDING' immediately upon Grant/Deny.
    2. Event-driven immediate dispatch request: Non-blocking HTTP request sent to Apps Script Web App.
    3. Delivery & ACK lifecycle: Apps Script delivers receipt and ACKs notification -> status becomes 'SENT'.
    4. Idempotency: Immediate dispatch + scheduled fallback never sends duplicate receipts.
    5. Scheduled fallback recovery: If immediate dispatch fails, scheduled poll picks up pending notification.
    6. Security: Webhook secret authentication enforced on all notification endpoints.
    7. Frontend polling configuration: 5000ms polling interval in ConsentContext.jsx.
    """

    @classmethod
    def setUpClass(cls):
        cls.test_db_path = create_isolated_test_db()
        assert_not_production_db()
        cls.webhook_secret = "test-event-dispatch-secret-456"
        os.environ["GMAIL_WEBHOOK_SECRET"] = cls.webhook_secret
        cls.client = TestClient(app)

        # Setup test Data Principal user
        cls.user_email = f"principal_{uuid.uuid4().hex[:8]}@example.com"
        cls.user_name = "Test Data Principal"
        cls.dp_id = link_or_create_data_principal(cls.user_email, cls.user_name)

        user_row = create_user_account(
            name=cls.user_name,
            email=cls.user_email,
            password_hash=hash_password("TestPassword123!"),
            role="DATA_PRINCIPAL",
            data_principal_id=cls.dp_id
        )
        cls.user_id = user_row["id"]
        cls.auth_token = create_access_token({
            "sub": cls.user_id,
            "email": cls.user_email,
            "role": "DATA_PRINCIPAL",
            "dp_id": cls.dp_id,
            "name": cls.user_name
        })
        cls.user_headers = {"Authorization": f"Bearer {cls.auth_token}"}

    @classmethod
    def tearDownClass(cls):
        destroy_isolated_test_db(cls.test_db_path)

    def setUp(self):
        assert_not_production_db()
        self.webhook_secret = "test-event-dispatch-secret-456"
        os.environ["GMAIL_WEBHOOK_SECRET"] = self.webhook_secret
        self.client = TestClient(app)

    def _create_test_consent_request(self):
        """Helper to create a pending consent request via gmail-webhook belonging to test principal"""
        unique_id = uuid.uuid4().hex[:12]
        payload = {
            "from_address": "Axis Bank <alerts@axisbank.com>",
            "to_address": f"{self.user_name} <{self.user_email}>",
            "subject": f"Consent Request for Credit Assessment {unique_id}",
            "body_text": f"Please grant consent for financial assessment {unique_id}.",
            "sent_date": "2026-09-17",
            "message_id": f"msg_event_{unique_id}",
            "thread_id": f"thd_event_{unique_id}",
        }
        res = self.client.post(
            "/api/gmail-webhook",
            json=payload,
            headers={"X-Webhook-Secret": self.webhook_secret},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        token = data.get("token")
        self.assertTrue(token)
        return token, payload

    def test_grant_decision_creates_pending_notification_and_triggers_immediate_dispatch(self):
        """
        Recording a GRANT decision must:
        1. Persist decision and notification transactionally in DB with status 'PENDING'.
        2. Immediately invoke request_immediate_dispatch.
        """
        token, _ = self._create_test_consent_request()

        # Get request attributes
        req_res = self.client.get(f"/api/consent-requests/{token}", headers=self.user_headers)
        self.assertEqual(req_res.status_code, 200)
        req_data = req_res.json()
        attr_ids = [a["id"] for a in req_data.get("requestedAttributes", []) if isinstance(a, dict)]

        with patch("main.request_immediate_dispatch") as mock_dispatch:
            grant_payload = {
                "decision": "GRANTED",
                "selected_attributes": attr_ids,
                "denied_attributes": [],
                "remark": "Approved for 6 months loan evaluation.",
            }
            res = self.client.post(
                f"/api/consent-requests/{token}/decision",
                json=grant_payload,
                headers=self.user_headers,
            )
            self.assertEqual(res.status_code, 200)
            res_data = res.json()
            self.assertTrue(res_data.get("success"))

            # Verify immediate dispatch was requested
            mock_dispatch.assert_called_once()

        # Verify notification was committed to DB with status 'PENDING'
        pending_res = self.client.get(
            "/api/notifications/pending",
            headers={"X-Webhook-Secret": self.webhook_secret},
        )
        self.assertEqual(pending_res.status_code, 200)
        pending_list = pending_res.json()
        matching = [n for n in pending_list if n.get("token") == token]
        self.assertEqual(len(matching), 1)
        notif = matching[0]
        self.assertEqual(notif.get("action"), "GRANTED")
        self.assertEqual(notif.get("status"), "PENDING")
        self.assertIn("receiptHash", notif.get("details", {}).get("artifact", {}))

    def test_deny_decision_creates_pending_notification_and_triggers_immediate_dispatch(self):
        """
        Recording a DENY decision must:
        1. Persist notification with status 'PENDING'.
        2. Immediately invoke request_immediate_dispatch.
        """
        token, _ = self._create_test_consent_request()

        with patch("main.request_immediate_dispatch") as mock_dispatch:
            deny_payload = {
                "decision": "DENIED",
                "selected_attributes": [],
                "denied_attributes": [],
                "remark": "Refused credit check.",
            }
            res = self.client.post(
                f"/api/consent-requests/{token}/decision",
                json=deny_payload,
                headers=self.user_headers,
            )
            self.assertEqual(res.status_code, 200)

            mock_dispatch.assert_called_once()

        # Check pending notification
        pending_res = self.client.get(
            "/api/notifications/pending",
            headers={"X-Webhook-Secret": self.webhook_secret},
        )
        self.assertEqual(pending_res.status_code, 200)
        matching = [n for n in pending_res.json() if n.get("token") == token]
        self.assertEqual(len(matching), 1)
        notif = matching[0]
        self.assertEqual(notif.get("action"), "DENIED")
        self.assertEqual(notif.get("status"), "PENDING")

    def test_notification_delivery_ack_flow_and_idempotency(self):
        """
        Verifies that after successful delivery:
        1. POST /api/notifications/{id}/ack marks the notification as 'SENT'.
        2. GET /api/notifications/pending no longer returns the ACKed notification.
        3. Scheduled 1-minute fallback polling receives 0 pending items (strictly idempotent - no duplicate receipts).
        """
        token, _ = self._create_test_consent_request()

        # Get request attributes
        req_res = self.client.get(f"/api/consent-requests/{token}", headers=self.user_headers)
        req_data = req_res.json()
        attr_ids = [a["id"] for a in req_data.get("requestedAttributes", []) if isinstance(a, dict)]

        # Record decision
        self.client.post(
            f"/api/consent-requests/{token}/decision",
            json={"decision": "GRANTED", "selected_attributes": attr_ids, "remark": "Test grant"},
            headers=self.user_headers,
        )

        # 1. Fetch pending
        pending_res = self.client.get(
            "/api/notifications/pending",
            headers={"X-Webhook-Secret": self.webhook_secret},
        )
        matching = [n for n in pending_res.json() if n.get("token") == token]
        self.assertEqual(len(matching), 1)
        notif_id = matching[0]["id"]

        # 2. Simulate delivery and ACK from Apps Script
        ack_res = self.client.post(
            f"/api/notifications/{notif_id}/ack",
            headers={"X-Webhook-Secret": self.webhook_secret},
        )
        self.assertEqual(ack_res.status_code, 200)
        self.assertTrue(ack_res.json().get("success"))

        # 3. Verify DB state directly in isolated test DB
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT status, sent_at FROM fiduciary_notifications WHERE id = ?", (notif_id,))
        row = cursor.fetchone()
        conn.close()
        self.assertIsNotNone(row)
        self.assertEqual(row[0], "SENT")
        self.assertIsNotNone(row[1])  # sent_at timestamp populated

        # 4. Fallback execution: Subsequent polling returns nothing for this token
        fallback_res = self.client.get(
            "/api/notifications/pending",
            headers={"X-Webhook-Secret": self.webhook_secret},
        )
        self.assertEqual(fallback_res.status_code, 200)
        remaining = [n for n in fallback_res.json() if n.get("token") == token]
        self.assertEqual(len(remaining), 0, "ACKed notification must not be returned to scheduled fallback!")

        # 5. Idempotent repeat ACK: Calling ACK again succeeds safely without error
        repeat_ack = self.client.post(
            f"/api/notifications/{notif_id}/ack",
            headers={"X-Webhook-Secret": self.webhook_secret},
        )
        self.assertEqual(repeat_ack.status_code, 200)

    def test_scheduled_fallback_recovers_unacknowledged_delivery(self):
        """
        If immediate dispatch is delayed, fails, or was not reached, the notification
        remains 'PENDING' and is safely processed and ACKed by the scheduled fallback.
        """
        token, _ = self._create_test_consent_request()

        # Record decision without acknowledging
        self.client.post(
            f"/api/consent-requests/{token}/decision",
            json={"decision": "DENIED", "remark": "Immediate dispatch simulation offline"},
            headers=self.user_headers,
        )

        # Scheduled trigger runs 1 minute later:
        scheduled_poll = self.client.get(
            "/api/notifications/pending",
            headers={"X-Webhook-Secret": self.webhook_secret},
        )
        pending_items = [n for n in scheduled_poll.json() if n.get("token") == token]
        self.assertEqual(len(pending_items), 1, "Scheduled fallback must pick up un-ACKed notifications")
        notif_id = pending_items[0]["id"]

        # Scheduled trigger sends Gmail reply and ACKs:
        ack_res = self.client.post(
            f"/api/notifications/{notif_id}/ack",
            headers={"X-Webhook-Secret": self.webhook_secret},
        )
        self.assertEqual(ack_res.status_code, 200)

        # Next scheduled trigger run finds 0 pending items:
        next_poll = self.client.get(
            "/api/notifications/pending",
            headers={"X-Webhook-Secret": self.webhook_secret},
        )
        self.assertEqual(len([n for n in next_poll.json() if n.get("token") == token]), 0)

    def test_security_webhook_secret_enforcement(self):
        """
        Security check: /api/notifications/pending, /ack, and /dispatch-immediate
        must strictly reject unauthorized requests.
        """
        # Missing header
        res1 = self.client.get("/api/notifications/pending")
        self.assertEqual(res1.status_code, 401)

        # Invalid secret
        res2 = self.client.get(
            "/api/notifications/pending",
            headers={"X-Webhook-Secret": "wrong-secret-token"},
        )
        self.assertEqual(res2.status_code, 401)

        # ACK with invalid secret
        res3 = self.client.post(
            "/api/notifications/1/ack",
            headers={"X-Webhook-Secret": "wrong-secret-token"},
        )
        self.assertEqual(res3.status_code, 401)

        # Dispatch immediate endpoint with invalid secret
        res4 = self.client.post(
            "/api/notifications/dispatch-immediate",
            headers={"X-Webhook-Secret": "wrong-secret-token"},
        )
        self.assertEqual(res4.status_code, 401)

    def test_frontend_consent_polling_configured_to_5_seconds(self):
        """
        Verify that ConsentContext.jsx has updated its polling interval from 15000ms to 5000ms.
        """
        context_file = os.path.abspath(
            os.path.join(BACKEND_DIR, "..", "src", "context", "ConsentContext.jsx")
        )
        self.assertTrue(os.path.exists(context_file), f"ConsentContext.jsx not found at {context_file}")
        with open(context_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Check for 5000ms polling interval
        self.assertIn("setInterval", content)
        self.assertIn("5000", content)
        # Verify 15000ms is no longer the interval
        self.assertNotIn("15000", content, "Polling interval was not reduced from 15000 to 5000 ms!")


if __name__ == "__main__":
    unittest.main()
