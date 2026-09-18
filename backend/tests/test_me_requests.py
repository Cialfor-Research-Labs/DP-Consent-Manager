import unittest
import os
import sys
import json
import sqlite3

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
    from backend.auth import create_access_token, hash_password
    from backend.database import get_db, link_or_create_data_principal, create_user_account
except ImportError:
    from main import app
    from auth import create_access_token, hash_password
    from database import get_db, link_or_create_data_principal, create_user_account

class TestMeConsentRequests(unittest.TestCase):
    """
    Test suite for GET /api/me/consent-requests:
    - Verifies authoritative identity derivation from JWT session
    - Verifies status filtering (?status=PENDING, etc.)
    - Verifies complete cross-user isolation
    """

    @classmethod
    def setUpClass(cls):
        cls.test_db_path = create_isolated_test_db()
        assert_not_production_db()
        cls.client = TestClient(app)
        
        # User A setup
        cls.email_a = "user_a_discovery@test.com"
        cls.name_a = "User A Test"
        cls.dp_id_a = link_or_create_data_principal(cls.email_a, cls.name_a)
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?;", (cls.email_a,))
        existing_a = cursor.fetchone()
        if existing_a:
            cls.user_id_a = existing_a["id"]
        else:
            user_row_a = create_user_account(
                name=cls.name_a,
                email=cls.email_a,
                password_hash=hash_password("Password123!"),
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

        # User B setup
        cls.email_b = "user_b_discovery@test.com"
        cls.name_b = "User B Test"
        cls.dp_id_b = link_or_create_data_principal(cls.email_b, cls.name_b)

        cursor.execute("SELECT id FROM users WHERE email = ?;", (cls.email_b,))
        existing_b = cursor.fetchone()
        if existing_b:
            cls.user_id_b = existing_b["id"]
        else:
            user_row_b = create_user_account(
                name=cls.name_b,
                email=cls.email_b,
                password_hash=hash_password("Password123!"),
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

        # Insert a sample pending request for User A
        cursor.execute("""
            INSERT OR REPLACE INTO consent_requests (
                id, token, notice_id, data_principal_id, email_snapshot_id,
                fiduciary_name, fiduciary_category, fiduciary_logo, fiduciary_email, dpo_name, dpo_email,
                purpose, domain, legal_basis, validity_period, data_region,
                requested_attributes, status, created_at, expires_at
            ) VALUES (
                'REQ-TEST-USER-A-001', 'tok_test_user_a_pending', 'NTC-TEST-A-01', ?, 1,
                'ABC Institute of Technology', 'Education & Academic Services', '🎓', 'compliance@abc.edu', 'Prof. Sharma', 'dpo@abc.edu',
                'Student Academic Records Processing', 'Education', 'Consent under DPDP Act 2023',
                '12 Months', 'India', '[]', 'PENDING', datetime('now'), datetime('now', '+30 days')
            );
        """, (cls.dp_id_a,))
        conn.commit()
        conn.close()

    @classmethod
    def tearDownClass(cls):
        destroy_isolated_test_db(cls.test_db_path)

    def test_unauthenticated_access_denied(self):
        """Unauthenticated GET /api/me/consent-requests must return 401."""
        response = self.client.get("/api/me/consent-requests")
        self.assertEqual(response.status_code, 401)

    def test_user_a_retrieves_own_request(self):
        """User A can retrieve their own pending consent request."""
        headers = {"Authorization": f"Bearer {self.token_a}"}
        response = self.client.get("/api/me/consent-requests?status=PENDING", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        found = any(r.get("token") == "tok_test_user_a_pending" for r in data)
        self.assertTrue(found, "User A's pending request should be returned.")

    def test_user_isolation_user_b_cannot_see_user_a(self):
        """User B must NOT see User A's consent request."""
        headers = {"Authorization": f"Bearer {self.token_b}"}
        response = self.client.get("/api/me/consent-requests?status=PENDING", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        found = any(r.get("token") == "tok_test_user_a_pending" for r in data)
        self.assertFalse(found, "User B must NOT see User A's consent requests.")

if __name__ == "__main__":
    unittest.main()
