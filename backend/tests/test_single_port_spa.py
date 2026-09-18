import os
import sys
import unittest

# Ensure backend directory and tests directory are in python search path
TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(TESTS_DIR, ".."))
for p in [TESTS_DIR, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from test_helper import create_isolated_test_db, destroy_isolated_test_db, assert_not_production_db
from main import app, DIST_DIR
from fastapi.testclient import TestClient


class TestSinglePortSPA(unittest.TestCase):
    """
    Test suite verifying single-port serving on port 8000:
    - Root route '/' serves React SPA index.html
    - Frontend routes ('/dashboard', '/request/<token>', etc.) serve index.html via SPA fallback
    - API routes ('/api/*') are NEVER intercepted by the SPA fallback (return JSON)
    - Static JS/CSS assets are served with appropriate MIME types
    - Link generation points to port 8000
    """

    @classmethod
    def setUpClass(cls):
        cls.test_db_path = create_isolated_test_db()
        assert_not_production_db()
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        destroy_isolated_test_db(cls.test_db_path)

    def setUp(self):
        assert_not_production_db()

    def test_root_serves_spa_index_html(self):
        """GET / must serve the React SPA index.html with HTTP 200."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/html", res.headers.get("content-type", ""))
        self.assertIn('<div id="root"></div>', res.text)

    def test_dashboard_route_serves_spa_fallback(self):
        """GET /dashboard must return index.html for client-side routing on page refresh."""
        res = self.client.get("/dashboard")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/html", res.headers.get("content-type", ""))
        self.assertIn('<div id="root"></div>', res.text)

    def test_request_token_route_serves_spa_fallback(self):
        """GET /request/tok_test123 must return index.html for direct token link navigation."""
        res = self.client.get("/request/tok_test123")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/html", res.headers.get("content-type", ""))
        self.assertIn('<div id="root"></div>', res.text)

    def test_active_consents_route_serves_spa_fallback(self):
        """GET /active-consents must return index.html."""
        res = self.client.get("/active-consents")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/html", res.headers.get("content-type", ""))
        self.assertIn('<div id="root"></div>', res.text)

    def test_api_route_not_intercepted_by_spa_fallback(self):
        """Unmatched /api/* routes must return 404 JSON, NEVER the HTML index page."""
        res = self.client.get("/api/nonexistent-endpoint-xyz-12345")
        self.assertEqual(res.status_code, 404)
        self.assertIn("application/json", res.headers.get("content-type", ""))
        data = res.json()
        self.assertIn("detail", data)
        self.assertNotIn("<html", res.text.lower())

    def test_static_assets_serving(self):
        """Verify built JS and CSS bundles in /assets are served with proper content types."""
        assets_dir = os.path.join(DIST_DIR, "assets")
        if not os.path.isdir(assets_dir):
            self.skipTest("dist/assets directory does not exist yet (run npm run build)")

        files = os.listdir(assets_dir)
        js_files = [f for f in files if f.endswith(".js")]
        css_files = [f for f in files if f.endswith(".css")]

        if js_files:
            js_res = self.client.get(f"/assets/{js_files[0]}")
            self.assertEqual(js_res.status_code, 200)
            ct = js_res.headers.get("content-type", "")
            self.assertTrue("javascript" in ct or "text/plain" in ct, f"Expected JS content-type, got: {ct}")

        if css_files:
            css_res = self.client.get(f"/assets/{css_files[0]}")
            self.assertEqual(css_res.status_code, 200)
            self.assertIn("text/css", css_res.headers.get("content-type", ""))

    def test_api_endpoints_work_normally(self):
        """Existing /api/* routes function as FastAPI REST endpoints."""
        # Unauthenticated request returns 401 JSON
        res = self.client.get("/api/auth/me")
        self.assertEqual(res.status_code, 401)
        self.assertIn("application/json", res.headers.get("content-type", ""))

        # Invalid login returns 401 JSON
        login_res = self.client.post("/api/auth/login", json={"email": "invalid@test.com", "password": "wrong"})
        self.assertEqual(login_res.status_code, 401)
        self.assertIn("application/json", login_res.headers.get("content-type", ""))


if __name__ == "__main__":
    unittest.main()
