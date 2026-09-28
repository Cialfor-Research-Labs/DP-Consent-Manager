import unittest
import os
import sys
import json
from unittest.mock import patch

# Ensure backend and tests directory are in python search path
TESTS_DIR = os.path.abspath(os.path.dirname(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(TESTS_DIR, ".."))
if TESTS_DIR not in sys.path:
    sys.path.insert(0, TESTS_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from test_helper import create_isolated_test_db, destroy_isolated_test_db, assert_not_production_db
from fastapi.testclient import TestClient

try:
    import backend.main as main_module
    from backend.main import app
    from backend.auth import hash_password, create_access_token
    from backend.database import get_db, create_user_account, link_or_create_data_principal
    from backend.email_service import (
        _build_consent_confirmation_email_html,
        send_consent_confirmation_email,
    )
except ImportError:
    import main as main_module
    from main import app
    from auth import hash_password, create_access_token
    from database import get_db, create_user_account, link_or_create_data_principal
    from email_service import (
        _build_consent_confirmation_email_html,
        send_consent_confirmation_email,
    )


class TestConsentConfirmationEmail(unittest.TestCase):
    """
    Test suite for DPDP Act 2023 Consent Confirmation Email integration:
    - Data Principal receives an automated confirmation email upon granting consent
    - Confirmation email lists all granted attributes and any withheld attributes
    - Cryptographic receipt hash and DPDP statutory rights are included
    - Audit log records CONFIRMATION_EMAIL_SENT event
    - Denied consent decisions do not send grant confirmation emails
    """

    @classmethod
    def setUpClass(cls):
        cls.test_db_path = create_isolated_test_db()
        assert_not_production_db()
        cls.client = TestClient(app)

        cls.user_email = "dp.applicant@testmail.com"
        cls.user_name = "Aarav Sharma"
        cls.dp_id = link_or_create_data_principal(cls.user_email, cls.user_name)

        cls.user = create_user_account(
            name=cls.user_name,
            email=cls.user_email,
            password_hash=hash_password("SecurePassword@2026"),
            role="DATA_PRINCIPAL",
            data_principal_id=cls.dp_id,
            fiduciary_name=None
        )

        token = create_access_token({
            "sub": cls.user["id"],
            "email": cls.user_email,
            "role": "DATA_PRINCIPAL",
            "name": cls.user_name,
            "dp_id": cls.dp_id
        })
        cls.auth_headers = {"Authorization": f"Bearer {token}"}

    @classmethod
    def tearDownClass(cls):
        destroy_isolated_test_db(cls.test_db_path)

    def _create_test_consent_request(self, token="tok_test_conf_01", notice_id="NTC-2026-TEST-01"):
        conn = get_db()
        cursor = conn.cursor()
        req_id = f"REQ-TEST-{token}"
        attrs = [
            {"id": "attr_name", "name": "Full Legal Name", "category": "Identity", "required": True},
            {"id": "attr_email", "name": "Official Email Address", "category": "Contact", "required": True},
            {"id": "attr_pan", "name": "PAN Card Number", "category": "Financial", "sensitive": True, "required": False},
            {"id": "attr_salary", "name": "Salary Slips", "category": "Financial", "required": False}
        ]
        cursor.execute("""
        INSERT OR REPLACE INTO consent_requests (
            id, token, notice_id, data_principal_id, email_snapshot_id,
            fiduciary_name, fiduciary_category, fiduciary_logo, fiduciary_email,
            dpo_name, dpo_email, purpose, domain, legal_basis, validity_period,
            data_region, requested_attributes, status, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z');
        """, (
            req_id, token, notice_id, self.dp_id, "ES-TEST-01",
            "Acme FinTech Corp", "Financial Services", "🏦", "compliance@acmefintech.com",
            "Mr. R. Verma", "dpo@acmefintech.com",
            "Loan Underwriting & Digital KYC Assessment", "Finance",
            "Consent under DPDP Act 2023 (Section 6)", "12 Months", "India",
            json.dumps(attrs)
        ))
        conn.commit()
        conn.close()
        return req_id, token, notice_id

    @patch.object(main_module, "send_consent_confirmation_email")
    def test_01_grant_consent_dispatches_confirmation_email(self, mock_send_email):
        """When consent is GRANTED, confirmation email is dispatched with granted attributes."""
        mock_send_email.return_value = {
            "success": True,
            "message": "Confirmation email dispatched",
            "email_id": "smtp-test-12345",
            "dev_mode": False
        }

        req_id, token, notice_id = self._create_test_consent_request("tok_conf_grant_01", "NTC-CONF-GRANT-01")

        payload = {
            "decision": "GRANTED",
            "selected_attributes": ["attr_name", "attr_email", "attr_pan"],
            "denied_attributes": ["attr_salary"],
            "remark": "Approved for loan evaluation"
        }

        response = self.client.post(
            f"/api/consent-requests/{token}/decision",
            json=payload,
            headers=self.auth_headers
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("consent", {}).get("status"), "ACTIVE")

        # Verify confirmation email dispatch
        self.assertTrue(mock_send_email.called, "send_consent_confirmation_email must be called upon GRANT")
        kwargs = mock_send_email.call_args[1]

        self.assertEqual(kwargs["to_email"], self.user_email)
        self.assertEqual(kwargs["fiduciary_name"], "Acme FinTech Corp")
        self.assertEqual(kwargs["notice_id"], notice_id)
        self.assertIn("Full Legal Name", kwargs["granted_attributes"])
        self.assertIn("Official Email Address", kwargs["granted_attributes"])
        self.assertIn("PAN Card Number", kwargs["granted_attributes"])
        self.assertIn("Salary Slips", kwargs["denied_attributes"])
        self.assertTrue(kwargs["receipt_hash"].startswith("sha256:"))

        # Check response contains confirmation_email summary
        self.assertIn("confirmation_email", data)
        self.assertTrue(data["confirmation_email"].get("success"))

        # Verify audit trail event CONFIRMATION_EMAIL_SENT
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_events WHERE action = 'CONFIRMATION_EMAIL_SENT' AND request_id = ?;", (req_id,))
        audit_row = cursor.fetchone()
        self.assertIsNotNone(audit_row, "Audit event CONFIRMATION_EMAIL_SENT must be recorded")
        conn.close()

    @patch.object(main_module, "send_consent_confirmation_email")
    def test_02_denied_consent_does_not_dispatch_grant_confirmation(self, mock_send_email):
        """When consent is DENIED, grant confirmation email is NOT dispatched."""
        req_id, token, notice_id = self._create_test_consent_request("tok_conf_deny_01", "NTC-CONF-DENY-01")

        payload = {
            "decision": "DENIED",
            "selected_attributes": [],
            "denied_attributes": ["attr_name", "attr_email", "attr_pan", "attr_salary"],
            "remark": "I do not wish to share my personal details"
        }

        response = self.client.post(
            f"/api/consent-requests/{token}/decision",
            json=payload,
            headers=self.auth_headers
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertIsNone(data.get("consent"))

        # send_consent_confirmation_email must NOT be called for DENIED
        self.assertFalse(mock_send_email.called)
        self.assertIsNone(data.get("confirmation_email"))

    def test_03_email_html_template_generation(self):
        """Verify HTML template contains all essential DPDP confirmation and attribute elements."""
        html = _build_consent_confirmation_email_html(
            to_name="Aarav Sharma",
            to_email="dp.applicant@testmail.com",
            fiduciary_name="HDFC Life Insurance",
            fiduciary_category="Insurance",
            purpose="Policy Underwriting & Risk Assessment",
            notice_id="NTC-2026-INS-550",
            consent_id="CNST-2026-8812",
            granted_attributes=[
                {"name": "Full Name", "category": "Identity", "sensitive": False},
                {"name": "Medical Records", "category": "Health", "sensitive": True}
            ],
            denied_attributes=["Aadhaar Number"],
            granted_on="2026-09-25T10:00:00Z",
            expires_on="2027-09-25T10:00:00Z",
            receipt_hash="sha256:abcd1234ef5678",
            dpo_email="dpo@hdfclife.com",
            data_region="India",
            dashboard_link="http://localhost:8000/?tab=consents"
        )

        self.assertIn("Consent Recorded Successfully", html)
        self.assertIn("HDFC Life Insurance", html)
        self.assertIn("CNST-2026-8812", html)
        self.assertIn("NTC-2026-INS-550", html)
        self.assertIn("Full Name", html)
        self.assertIn("Medical Records", html)
        self.assertIn("🔒 Sensitive", html)
        self.assertIn("Aadhaar Number", html)
        self.assertIn("Withheld", html)
        self.assertIn("sha256:abcd1234ef5678", html)
        self.assertIn("dpo@hdfclife.com", html)
        self.assertIn("Section 6(4)", html)  # Right to withdraw
        self.assertIn("View &amp; Manage in Consent Dashboard", html)

    def test_04_send_confirmation_email_dev_mode_fallback(self):
        """In dev mode without SMTP/Resend, function returns success: True with dev_mode: True."""
        result = send_consent_confirmation_email(
            to_email="test.dp@example.com",
            to_name="Test DP",
            fiduciary_name="Test Bank",
            consent_id="CNST-TEST-001",
            granted_attributes=["Phone Number", "Address"]
        )

        self.assertTrue(result.get("success"))

    def test_05_send_confirmation_email_missing_email_handled(self):
        """Missing to_email returns error dictionary without throwing."""
        result = send_consent_confirmation_email(
            to_email="",
            to_name="Test DP",
            fiduciary_name="Test Bank",
            consent_id="CNST-TEST-002"
        )

        self.assertFalse(result.get("success"))
        self.assertIn("No recipient email", result.get("message"))


if __name__ == "__main__":
    unittest.main()
