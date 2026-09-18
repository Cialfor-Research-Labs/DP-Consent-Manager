import urllib.request
import urllib.error
import json
import os
import sys
sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://localhost:8000"

def test_endpoint(url, expected_code=200):
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            ct = resp.headers.get("content-type", "")
            data = resp.read()
            return status, ct, data
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("content-type", ""), e.read()

print(f"=== Testing Single-Port Server on {BASE_URL} ===\n")

# 1. Root /
st, ct, data = test_endpoint(f"{BASE_URL}/")
print(f"1. GET / -> status={st} content-type={ct}")
assert st == 200, f"Expected 200, got {st}"
assert "text/html" in ct, f"Expected HTML content-type, got {ct}"
assert b'<div id="root"></div>' in data, "Expected root div in HTML"
print("   ✓ Root serves React SPA index.html\n")

# 2. SPA Route /dashboard
st, ct, data = test_endpoint(f"{BASE_URL}/dashboard")
print(f"2. GET /dashboard -> status={st} content-type={ct}")
assert st == 200, f"Expected 200, got {st}"
assert "text/html" in ct
assert b'<div id="root"></div>' in data
print("   ✓ SPA fallback serves index.html for /dashboard\n")

# 3. SPA Route /request/tok_test123
st, ct, data = test_endpoint(f"{BASE_URL}/request/tok_test123")
print(f"3. GET /request/tok_test123 -> status={st} content-type={ct}")
assert st == 200, f"Expected 200, got {st}"
assert "text/html" in ct
assert b'<div id="root"></div>' in data
print("   ✓ SPA fallback serves index.html for /request/<token>\n")

# 4. Unknown API route -> 404 JSON (NOT HTML!)
st, ct, data = test_endpoint(f"{BASE_URL}/api/nonexistent-route-xyz")
print(f"4. GET /api/nonexistent-route-xyz -> status={st} content-type={ct}")
assert st == 404, f"Expected 404, got {st}"
assert "application/json" in ct, f"Expected JSON error response, got {ct}"
assert b"<html" not in data.lower(), "API 404 should never return HTML"
print("   ✓ Unknown /api/* route correctly returns 404 JSON\n")

# 5. Auth Me unauthenticated -> 401 JSON
st, ct, data = test_endpoint(f"{BASE_URL}/api/auth/me")
print(f"5. GET /api/auth/me -> status={st} content-type={ct}")
assert st == 401, f"Expected 401, got {st}"
assert "application/json" in ct
print("   ✓ /api/auth/me returns 401 JSON\n")

# 6. Login via /api/auth/login
login_payload = json.dumps({
    "email": "pandeyprerna1407@gmail.com",
    "password": "Password@123"
}).encode("utf-8")
login_req = urllib.request.Request(
    f"{BASE_URL}/api/auth/login",
    data=login_payload,
    headers={"Content-Type": "application/json"}
)
try:
    with urllib.request.urlopen(login_req) as resp:
        st = resp.status
        login_data = json.loads(resp.read().decode("utf-8"))
        print(f"6. POST /api/auth/login -> status={st} user={login_data.get('user', {}).get('email')}")
        token = login_data.get("access_token")
        assert token, "Login must return access_token"
        print("   ✓ Login successful, JWT token obtained\n")

        # 7. Authenticated /api/me/consent-requests
        me_req = urllib.request.Request(
            f"{BASE_URL}/api/me/consent-requests",
            headers={"Authorization": f"Bearer {token}"}
        )
        with urllib.request.urlopen(me_req) as me_resp:
            st = me_resp.status
            me_data = json.loads(me_resp.read().decode("utf-8"))
            print(f"7. GET /api/me/consent-requests -> status={st} requests_count={len(me_data)}")
            assert st == 200
            print("   ✓ Authenticated API returns consent requests\n")

except Exception as ex:
    print(f"6/7 Error: {ex}")
    raise

# 8. Static JS Asset serving
dist_assets = os.path.join(os.path.dirname(__file__), "..", "dist", "assets")
if os.path.isdir(dist_assets):
    js_files = [f for f in os.listdir(dist_assets) if f.endswith(".js")]
    if js_files:
        js_url = f"{BASE_URL}/assets/{js_files[0]}"
        st, ct, data = test_endpoint(js_url)
        print(f"8. GET /assets/{js_files[0]} -> status={st} content-type={ct}")
        assert st == 200
        assert "javascript" in ct or "text/plain" in ct
        print("   ✓ Static asset served with proper Content-Type\n")

print("=== ALL LIVE SINGLE-PORT TESTS PASSED SUCCESSFULLY! ===")
