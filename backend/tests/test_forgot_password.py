import unittest
import os
import sys
import json
import sqlite3
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
    from backend.main import app
    from backend.auth import hash_password, verify_password
    from backend.database import get_db, create_user_account, get_user_by_email, get_valid_password_reset
except ImportError:
    from main import app
    from auth import hash_password, verify_password
    from database import get_db, create_user_account, get_user_by_email, get_valid_password_reset


class TestForgotPasswordFlow(unittest.TestCase):
    """
    Test suite for DPDP Act 2023 Forgot Password & Authentication via Gmail:
    - POST /api/auth/forgot-password: OTP generation & email dispatch
    - POST /api/auth/verify-reset-otp: OTP verification
    - POST /api/auth/reset-password: Password reset, strength enforcement, login verification
    """

    @classmethod
    def setUpClass(cls):
        cls.test_db_path = create_isolated_test_db()
        assert_not_production_db()
        cls.client = TestClient(app)

        cls.test_email = "test.reset.user@gmail.com"
        cls.initial_password = "OldPassword@123"
        cls.new_password = "NewStrongPassword@2026"

        cls.user = create_user_account(
            name="Test Reset User",
            email=cls.test_email,
            password_hash=hash_password(cls.initial_password),
            role="DATA_PRINCIPAL",
            data_principal_id="DP-TEST-RESET-01",
            fiduciary_name=None
        )

    @classmethod
    def tearDownClass(cls):
        destroy_isolated_test_db(cls.test_db_path)

    @patch("main.send_password_reset_email")
    def test_01_forgot_password_initiates_otp_and_email(self, mock_send_email):
        mock_send_email.return_value = {"success": True, "message": "Email sent"}

        response = self.client.post("/api/auth/forgot-password", json={"email": self.test_email})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertIn("6-digit verification code", data.get("message"))

        # Check that send_password_reset_email was called with correct parameters
        self.assertTrue(mock_send_email.called)
        call_kwargs = mock_send_email.call_args[1]
        self.assertEqual(call_kwargs["to_email"], self.test_email)
        otp_code = call_kwargs["otp_code"]
        self.assertEqual(len(otp_code), 6)
        self.assertTrue(otp_code.isdigit())

        # Verify OTP is stored in password_resets table
        record = get_valid_password_reset(email=self.test_email, otp_code=otp_code)
        self.assertIsNotNone(record)
        self.assertEqual(record["email"], self.test_email)
        self.assertEqual(record["otp_code"], otp_code)

    def test_02_forgot_password_uniform_response_for_nonexistent_email(self):
        # Email enumeration defense
        response = self.client.post("/api/auth/forgot-password", json={"email": "nonexistent.user.12345@gmail.com"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))

    def test_03_verify_reset_otp_success_and_failure(self):
        # Request a new OTP
        with patch("main.send_password_reset_email") as mock_send:
            mock_send.return_value = {"success": True}
            self.client.post("/api/auth/forgot-password", json={"email": self.test_email})
            otp_code = mock_send.call_args[1]["otp_code"]

        # 1. Invalid OTP
        bad_resp = self.client.post("/api/auth/verify-reset-otp", json={
            "email": self.test_email,
            "otp": "000000"
        })
        self.assertEqual(bad_resp.status_code, 400)

        # 2. Valid OTP
        good_resp = self.client.post("/api/auth/verify-reset-otp", json={
            "email": self.test_email,
            "otp": otp_code
        })
        self.assertEqual(good_resp.status_code, 200)
        data = good_resp.json()
        self.assertTrue(data.get("valid"))
        self.assertTrue(data.get("reset_token").startswith("tok_rst_"))

    def test_04_reset_password_strength_enforcement(self):
        with patch("main.send_password_reset_email") as mock_send:
            mock_send.return_value = {"success": True}
            self.client.post("/api/auth/forgot-password", json={"email": self.test_email})
            otp_code = mock_send.call_args[1]["otp_code"]

        # Weak password (missing special char and uppercase)
        weak_resp = self.client.post("/api/auth/reset-password", json={
            "email": self.test_email,
            "otp": otp_code,
            "new_password": "weakpassword"
        })
        self.assertEqual(weak_resp.status_code, 422)

    def test_05_reset_password_success_and_login_verification(self):
        with patch("main.send_password_reset_email") as mock_send:
            mock_send.return_value = {"success": True}
            self.client.post("/api/auth/forgot-password", json={"email": self.test_email})
            otp_code = mock_send.call_args[1]["otp_code"]

        # Reset password with strong new password
        reset_resp = self.client.post("/api/auth/reset-password", json={
            "email": self.test_email,
            "otp": otp_code,
            "new_password": self.new_password
        })
        self.assertEqual(reset_resp.status_code, 200)
        data = reset_resp.json()
        self.assertTrue(data.get("success"))

        # Verify old password no longer works
        old_login = self.client.post("/api/auth/login", json={
            "email": self.test_email,
            "password": self.initial_password
        })
        self.assertEqual(old_login.status_code, 401)

        # Verify new password works and issues valid JWT
        new_login = self.client.post("/api/auth/login", json={
            "email": self.test_email,
            "password": self.new_password
        })
        self.assertEqual(new_login.status_code, 200)
        login_data = new_login.json()
        self.assertIn("access_token", login_data)
        self.assertEqual(login_data["user"]["email"], self.test_email)


if __name__ == "__main__":
    unittest.main()
