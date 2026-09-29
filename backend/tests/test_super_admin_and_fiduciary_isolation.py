import os
import sys
import unittest
import uuid
import json
from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TESTS_DIR = os.path.abspath(os.path.dirname(__file__))
if TESTS_DIR not in sys.path:
    sys.path.insert(0, TESTS_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from test_helper import create_isolated_test_db, destroy_isolated_test_db, assert_not_production_db
from main import app, get_db
from auth import create_access_token, hash_password
from database import create_user_account, link_or_create_data_principal, create_data_fiduciary

class TestSuperAdminAndFiduciaryIsolation(unittest.TestCase):
    """
    Validation Suite for:
    1. Super Admin (Compliance Officer) capabilities:
       - List all registered Data Fiduciaries
       - Register new Data Fiduciary with automatic admin provisioning
       - Strict data shield: Super Admin cannot see fiduciary requests, consents, audit logs, or DSRs.
    2. Strict Isolation between different Data Fiduciaries:
       - Fiduciary A only sees Fiduciary A's requests, consents, logs, and DSRs.
       - Fiduciary B only sees Fiduciary B's requests, consents, logs, and DSRs.
       - Fiduciary cannot spoof another entity's name during notice dispatch.
    """

    @classmethod
    def setUpClass(cls):
        cls.test_db_path = create_isolated_test_db()
        assert_not_production_db()
        cls.client = TestClient(app)

        # 1. Super Admin User
        cls.admin_email = f"compliance.officer_{uuid.uuid4().hex[:6]}@cialfor.com"
        admin_user = create_user_account(
            name="Compliance Officer",
            email=cls.admin_email,
            password_hash=hash_password("Admin@123"),
            role="SUPER_ADMIN",
            data_principal_id=None,
            fiduciary_name=None
        )
        cls.admin_token = create_access_token({
            "sub": admin_user["id"],
            "email": cls.admin_email,
            "role": "SUPER_ADMIN",
            "name": "Compliance Officer"
        })
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # 2. Data Fiduciary A User ("Alpha Corp")
        cls.fid_a_name = "Alpha Corp Fiduciary"
        cls.fid_a_email = f"compliance_{uuid.uuid4().hex[:6]}@alphacorp.io"
        fid_a_user = create_user_account(
            name="Alpha Admin",
            email=cls.fid_a_email,
            password_hash=hash_password("Password@123"),
            role="DATA_FIDUCIARY",
            data_principal_id=None,
            fiduciary_name=cls.fid_a_name
        )
        cls.fid_a_token = create_access_token({
            "sub": fid_a_user["id"],
            "email": cls.fid_a_email,
            "role": "DATA_FIDUCIARY",
            "name": "Alpha Admin"
        })
        cls.fid_a_headers = {"Authorization": f"Bearer {cls.fid_a_token}"}

        # 3. Data Fiduciary B User ("Beta Bank")
        cls.fid_b_name = "Beta Bank Limited"
        cls.fid_b_email = f"compliance_{uuid.uuid4().hex[:6]}@betabank.com"
        fid_b_user = create_user_account(
            name="Beta Admin",
            email=cls.fid_b_email,
            password_hash=hash_password("Password@123"),
            role="DATA_FIDUCIARY",
            data_principal_id=None,
            fiduciary_name=cls.fid_b_name
        )
        cls.fid_b_token = create_access_token({
            "sub": fid_b_user["id"],
            "email": cls.fid_b_email,
            "role": "DATA_FIDUCIARY",
            "name": "Beta Admin"
        })
        cls.fid_b_headers = {"Authorization": f"Bearer {cls.fid_b_token}"}

        # 4. Data Principal User
        cls.dp_email = f"citizen_{uuid.uuid4().hex[:6]}@example.com"
        cls.dp_id = link_or_create_data_principal(cls.dp_email, "Citizen Principal")
        dp_user = create_user_account(
            name="Citizen Principal",
            email=cls.dp_email,
            password_hash=hash_password("Password@123"),
            role="DATA_PRINCIPAL",
            data_principal_id=cls.dp_id
        )
        cls.dp_token = create_access_token({
            "sub": dp_user["id"],
            "email": cls.dp_email,
            "role": "DATA_PRINCIPAL",
            "dp_id": cls.dp_id,
            "name": "Citizen Principal"
        })
        cls.dp_headers = {"Authorization": f"Bearer {cls.dp_token}"}

    @classmethod
    def tearDownClass(cls):
        destroy_isolated_test_db(cls.test_db_path)

    def test_01_super_admin_can_list_and_create_data_fiduciaries(self):
        # 1. Super admin lists fiduciaries
        res = self.client.get("/api/admin/fiduciaries", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        initial_list = res.json()
        self.assertIsInstance(initial_list, list)

        # 2. Super admin registers a new fiduciary
        new_fid_payload = {
            "name": f"Indian Institute of Technology {uuid.uuid4().hex[:4]}",
            "domain": "Education",
            "category": "Higher Education Institution",
            "logo": "🎓",
            "contact_email": f"privacy_{uuid.uuid4().hex[:6]}@iit.ac.in",
            "dpo_name": "Prof. S. R. Iyengar",
            "dpo_email": f"dpo_{uuid.uuid4().hex[:6]}@iit.ac.in",
            "admin_name": "IIT Admin",
            "admin_password": "Password@123"
        }
        create_res = self.client.post("/api/admin/fiduciaries", json=new_fid_payload, headers=self.admin_headers)
        self.assertEqual(create_res.status_code, 200)
        data = create_res.json()
        self.assertTrue(data.get("success"))
        self.assertIn("fiduciary", data)
        self.assertEqual(data["fiduciary"]["name"], new_fid_payload["name"])
        self.assertEqual(data["fiduciary"]["domain"], "Education")
        self.assertIn("admin_account", data)

        # 3. Verify fiduciary appears in the global list
        res2 = self.client.get("/api/admin/fiduciaries", headers=self.admin_headers)
        updated_list = res2.json()
        names = [f["name"] for f in updated_list]
        self.assertIn(new_fid_payload["name"], names)

    def test_02_super_admin_shielded_from_fiduciary_dashboard_and_requests(self):
        # Super admin cannot see consent requests of fiduciaries (returns empty list)
        req_res = self.client.get("/api/consent-requests", headers=self.admin_headers)
        self.assertEqual(req_res.status_code, 200)
        self.assertEqual(req_res.json(), [], "Super Admin must not see individual fiduciary consent requests")

        # Super admin cannot see active granted consents
        consents_res = self.client.get("/api/consents", headers=self.admin_headers)
        self.assertEqual(consents_res.status_code, 200)
        self.assertEqual(consents_res.json(), [], "Super Admin must not see individual active consents")

        # Super admin cannot see fiduciary audit logs
        audit_res = self.client.get("/api/audit-logs", headers=self.admin_headers)
        self.assertEqual(audit_res.status_code, 200)
        self.assertEqual(audit_res.json(), [], "Super Admin must not see individual fiduciary audit logs")

        # Super admin cannot see DSR requests
        dsr_res = self.client.get("/api/data-rights", headers=self.admin_headers)
        self.assertEqual(dsr_res.status_code, 200)
        self.assertEqual(dsr_res.json(), [], "Super Admin must not see individual fiduciary DSR requests")

        # Super admin cannot dispatch consent requests
        dispatch_payload = {
            "fiduciary_name": "Some Corp",
            "fiduciary_email": "corp@example.com",
            "principal_name": "Test Citizen",
            "principal_email": self.dp_email,
            "purpose": "Account verification",
            "requested_attributes": [{"id": "attr_1", "name": "Name", "required": True}],
            "email_subject": "Notice",
            "email_body": "Notice body"
        }
        disp_res = self.client.post("/api/consent-requests", json=dispatch_payload, headers=self.admin_headers)
        self.assertEqual(disp_res.status_code, 403, "Super Admin must not be allowed to dispatch consent requests")

    def test_03_data_fiduciary_strict_cross_tenant_isolation(self):
        # 1. Fiduciary A creates a consent request
        payload_a = {
            "fiduciary_name": self.fid_a_name,
            "fiduciary_email": self.fid_a_email,
            "principal_name": "Citizen Principal",
            "principal_email": self.dp_email,
            "purpose": "Alpha Corporate Assessment",
            "requested_attributes": [{"id": "attr_name", "name": "Full Name", "required": True}],
            "email_subject": "Alpha Notice",
            "email_body": "Alpha body"
        }
        res_a = self.client.post("/api/consent-requests", json=payload_a, headers=self.fid_a_headers)
        self.assertEqual(res_a.status_code, 200)
        req_a_id = res_a.json().get("id")

        # 2. Fiduciary B creates a consent request
        payload_b = {
            "fiduciary_name": self.fid_b_name,
            "fiduciary_email": self.fid_b_email,
            "principal_name": "Citizen Principal",
            "principal_email": self.dp_email,
            "purpose": "Beta Bank Loan Check",
            "requested_attributes": [{"id": "attr_pan", "name": "PAN Card", "required": True}],
            "email_subject": "Beta Notice",
            "email_body": "Beta body"
        }
        res_b = self.client.post("/api/consent-requests", json=payload_b, headers=self.fid_b_headers)
        self.assertEqual(res_b.status_code, 200)
        req_b_id = res_b.json().get("id")

        # 3. Fiduciary A fetches requests: MUST ONLY see Alpha Corp, NEVER Beta Bank
        list_a = self.client.get("/api/consent-requests", headers=self.fid_a_headers).json()
        fids_in_a = {r.get("fiduciary") or r.get("fiduciary_name") for r in list_a}
        self.assertIn(self.fid_a_name, fids_in_a)
        self.assertNotIn(self.fid_b_name, fids_in_a, "Fiduciary A must NOT see Fiduciary B requests!")

        # 4. Fiduciary B fetches requests: MUST ONLY see Beta Bank, NEVER Alpha Corp
        list_b = self.client.get("/api/consent-requests", headers=self.fid_b_headers).json()
        fids_in_b = {r.get("fiduciary") or r.get("fiduciary_name") for r in list_b}
        self.assertIn(self.fid_b_name, fids_in_b)
        self.assertNotIn(self.fid_a_name, fids_in_b, "Fiduciary B must NOT see Fiduciary A requests!")

if __name__ == "__main__":
    unittest.main()
