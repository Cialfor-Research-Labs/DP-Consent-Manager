import os
import sys
import unittest
import json

# Ensure backend directory is in python search path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from test_helper import create_isolated_test_db, destroy_isolated_test_db, assert_not_production_db
from main import (
    app,
    detect_domain_from_content,
    get_fiduciary_metadata,
    resolve_fiduciary_name,
    extract_attributes_from_email_content,
    _has_kw
)
from fastapi.testclient import TestClient


class TestClassification(unittest.TestCase):
    """
    Test suite for Gmail consent-request classification:
    - Education mail -> Education (domain, category, logo, all 10 attributes)
    - Healthcare mail -> Healthcare
    - FinTech mail -> FinTech (and no false-positive on 'academic')
    - Unknown mail -> General (never FinTech)
    - /api/gmail-webhook end-to-end integration tests
    """

    @classmethod
    def setUpClass(cls):
        cls.test_db_path = create_isolated_test_db()
        assert_not_production_db()
        cls.webhook_secret = os.getenv("GMAIL_WEBHOOK_SECRET", "test-secret-12345")
        os.environ["GMAIL_WEBHOOK_SECRET"] = cls.webhook_secret
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        destroy_isolated_test_db(cls.test_db_path)

    def setUp(self):
        assert_not_production_db()
        self.webhook_secret = os.getenv("GMAIL_WEBHOOK_SECRET", "test-secret-12345")
        self.client = TestClient(app)

    def test_education_mail_classification(self):
        """Education email must produce domain=Education, proper category, logo, and 10 attributes."""
        subject = "Action Required: University Student Records Consent TEST-2"
        body = (
            "Dear Student,\n\n"
            "ABC Institute of Technology is requesting your consent to process certain personal "
            "and academic information for student services and record management.\n\n"
            "*Purpose of Data Processing:*\n"
            "To maintain academic records, verify enrollment, process examinations, issue certificates, "
            "and support scholarship or placement-related activities.\n\n"
            "*Data Requested:*\n"
            "- Full Name\n- Date of Birth\n- Mobile Number\n- Email Address\n- Residential Address\n"
            "- Enrollment Number\n- Academic Records\n- Examination Results\n- Identity Proof\n"
            "- Placement Profile Details\n"
        )
        domain = detect_domain_from_content(subject, body)
        self.assertEqual(domain, "Education")

        fiduciary = resolve_fiduciary_name("tok_edu_test", domain, subject, body, "Manu Sharma")
        self.assertEqual(fiduciary, "ABC Institute of Technology")

        category, logo = get_fiduciary_metadata(fiduciary, domain)
        self.assertEqual(category, "Education & Academic Services")
        self.assertEqual(logo, "🎓")

        attrs = extract_attributes_from_email_content(subject, body, domain)
        attr_names = [a["name"] for a in attrs]
        attr_ids = [a["id"] for a in attrs]

        required_attributes = [
            "Full Name",
            "Date of Birth",
            "Mobile Number",
            "Email Address",
            "Residential Address",
            "Enrollment Number",
            "Academic Records",
            "Examination Results",
            "Identity Proof",
            "Placement Profile Details"
        ]
        for req_attr in required_attributes:
            self.assertIn(req_attr, attr_names, f"Expected {req_attr} in attributes")

        self.assertIn("attr_enrollment", attr_ids)
        self.assertIn("attr_academic_records", attr_ids)
        self.assertIn("attr_exam_results", attr_ids)
        self.assertIn("attr_placement", attr_ids)

    def test_education_keywords_detection(self):
        """All required Education keywords must classify to Education domain."""
        keywords = [
            "education", "educational", "institute", "university",
            "college", "student", "academic", "enrollment",
            "examination", "certificate", "scholarship", "placement"
        ]
        for kw in keywords:
            subject = f"Notice regarding {kw} verification"
            body = f"Please confirm your {kw} records."
            domain = detect_domain_from_content(subject, body)
            self.assertEqual(domain, "Education", f"Keyword '{kw}' failed to classify as Education")

    def test_fintech_no_false_positive_on_academic_records(self):
        """Word 'academic' must NOT trigger 'emi' keyword and must NOT classify as FinTech."""
        subject = "Academic Records Clearance"
        body = "Please provide academic records and coursework completion."
        domain = detect_domain_from_content(subject, body)
        self.assertEqual(domain, "Education")
        self.assertNotEqual(domain, "FinTech")

    def test_healthcare_mail_classification(self):
        """Healthcare email must produce Healthcare domain, category, and logo."""
        subject = "Action Required: Consent for Diagnostic Records & Health Insurance Processing"
        body = (
            "Apollo Care Hospital requests consent to process your medical records, diagnostic test "
            "reports, and health insurance policy details for cashless treatment."
        )
        domain = detect_domain_from_content(subject, body)
        self.assertEqual(domain, "Healthcare")

        fiduciary = resolve_fiduciary_name("tok_health_test", domain, subject, body, "Apollo Care Hospital")
        category, logo = get_fiduciary_metadata(fiduciary, domain)
        self.assertEqual(category, "Healthcare & Diagnostic Services")
        self.assertEqual(logo, "🏥")

        attrs = extract_attributes_from_email_content(subject, body, domain)
        attr_ids = [a["id"] for a in attrs]
        self.assertIn("attr_medical", attr_ids)
        self.assertIn("attr_insurance", attr_ids)

    def test_fintech_mail_classification(self):
        """FinTech email must produce FinTech domain, category, and logo."""
        subject = "FinTech Loan Consent Notice - CIBIL Credit Score Required"
        body = (
            "PayFlex Lending requires your explicit consent to fetch your CIBIL credit score report, "
            "PAN card, and bank account statement for personal loan sanction and EMI mandate."
        )
        domain = detect_domain_from_content(subject, body)
        self.assertEqual(domain, "FinTech")

        fiduciary = resolve_fiduciary_name("tok_loan_test", domain, subject, body, "PayFlex Lending")
        category, logo = get_fiduciary_metadata(fiduciary, domain)
        self.assertEqual(category, "FinTech & Digital Lending")
        self.assertEqual(logo, "💳")

        attrs = extract_attributes_from_email_content(subject, body, domain)
        attr_ids = [a["id"] for a in attrs]
        self.assertIn("attr_pan", attr_ids)
        self.assertIn("attr_cibil", attr_ids)
        self.assertIn("attr_bank_stmt", attr_ids)

    def test_unknown_mail_classification_neutral_general(self):
        """Unknown emails must fall back to General, NEVER FinTech."""
        subject = "General Inquiry and Office Facility Announcement"
        body = "Please review the attached project schedule for next week."
        domain = detect_domain_from_content(subject, body)
        self.assertEqual(domain, "General")
        self.assertNotEqual(domain, "FinTech")

        fiduciary = resolve_fiduciary_name("tok_gen_test", domain, subject, body, "Acme Logistics")
        category, logo = get_fiduciary_metadata(fiduciary, domain)
        self.assertEqual(category, "General Corporate Services")
        self.assertEqual(logo, "🏢")
        self.assertNotEqual(category, "FinTech & Digital Lending")
        self.assertNotEqual(logo, "💳")

    def test_webhook_e2e_education_ingestion(self):
        """Test POST /api/gmail-webhook for an education consent email."""
        payload = {
            "from_address": "ABC Institute <records@abcinstitute.edu>",
            "to_address": "Manu Sharma <manusharma.cs78@gmail.com>",
            "subject": "Action Required: University Student Records Consent TEST-2",
            "body_text": (
                "Dear Student,\n\n"
                "ABC Institute of Technology is requesting your consent to process certain personal "
                "and academic information for student services and record management.\n"
                "Data Requested: Full Name, Date of Birth, Mobile Number, Email Address, "
                "Residential Address, Enrollment Number, Academic Records, Examination Results, "
                "Identity Proof, Placement Profile Details."
            ),
            "sent_date": "Wednesday, September 16, 2026",
            "extracted_token": "tok_edu_webhook_test_001"
        }
        headers = {"X-Webhook-Secret": self.webhook_secret}
        response = self.client.post("/api/gmail-webhook", json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["domain"], "Education")
        self.assertEqual(data["fiduciary_category"], "Education & Academic Services")
        self.assertEqual(data["fiduciary_logo"], "🎓")
        self.assertEqual(data["token"], "tok_edu_webhook_test_001")

        attrs_list = data.get("requestedAttributes") or data.get("attributes") or []
        attr_names = [a["name"] for a in attrs_list]
        self.assertIn("Full Name", attr_names)
        self.assertIn("Date of Birth", attr_names)
        self.assertIn("Mobile Number", attr_names)
        self.assertIn("Email Address", attr_names)
        self.assertIn("Residential Address", attr_names)
        self.assertIn("Enrollment Number", attr_names)
        self.assertIn("Academic Records", attr_names)
        self.assertIn("Examination Results", attr_names)
        self.assertIn("Identity Proof", attr_names)
        self.assertIn("Placement Profile Details", attr_names)

    def test_webhook_e2e_unknown_ingestion(self):
        """Test POST /api/gmail-webhook for an unknown mail falls back to General, not FinTech."""
        payload = {
            "from_address": "Operations <ops@genericcorp.com>",
            "to_address": "Manu Sharma <manusharma.cs78@gmail.com>",
            "subject": "System Maintenance Advisory Notice",
            "body_text": "Scheduled server maintenance this weekend. No financial or health action needed.",
            "extracted_token": "tok_unknown_webhook_test_002"
        }
        headers = {"X-Webhook-Secret": self.webhook_secret}
        response = self.client.post("/api/gmail-webhook", json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["domain"], "General")
        self.assertEqual(data["fiduciary_category"], "General Corporate Services")
        self.assertEqual(data["fiduciary_logo"], "🏢")
        self.assertNotEqual(data["domain"], "FinTech")
        self.assertNotEqual(data["fiduciary_category"], "FinTech & Digital Lending")

    def test_webhook_e2e_healthcare_ingestion(self):
        """Test POST /api/gmail-webhook for healthcare mail."""
        payload = {
            "from_address": "Apollo Care Hospital <compliance@apollo.com>",
            "to_address": "Manu Sharma <manusharma.cs78@gmail.com>",
            "subject": "Consent Request: Diagnostic Health Records Processing",
            "body_text": "Apollo Care Hospital requests consent to access medical diagnostic records and health insurance.",
            "extracted_token": "tok_health_webhook_test_003"
        }
        headers = {"X-Webhook-Secret": self.webhook_secret}
        response = self.client.post("/api/gmail-webhook", json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["domain"], "Healthcare")
        self.assertEqual(data["fiduciary_category"], "Healthcare & Diagnostic Services")
        self.assertEqual(data["fiduciary_logo"], "🏥")

    def test_webhook_e2e_fintech_ingestion(self):
        """Test POST /api/gmail-webhook for fintech loan mail."""
        payload = {
            "from_address": "PayFlex Lending <support@payflex.com>",
            "to_address": "Manu Sharma <manusharma.cs78@gmail.com>",
            "subject": "Instant Loan Application: Consent for CIBIL Credit Check",
            "body_text": "PayFlex Lending requires consent to process your CIBIL score, PAN card, and bank account statement for loan disbursement.",
            "extracted_token": "tok_fintech_webhook_test_004"
        }
        headers = {"X-Webhook-Secret": self.webhook_secret}
        response = self.client.post("/api/gmail-webhook", json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["domain"], "FinTech")
        self.assertEqual(data["fiduciary_category"], "FinTech & Digital Lending")
        self.assertEqual(data["fiduciary_logo"], "💳")


if __name__ == "__main__":
    unittest.main()
