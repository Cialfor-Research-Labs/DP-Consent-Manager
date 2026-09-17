import sqlite3

conn = sqlite3.connect("backend/consent_manager.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("""
    SELECT id, token, notice_id, fiduciary_name, purpose, status, created_at, email_snapshot_id, message_id
    FROM consent_requests
    WHERE fiduciary_name = 'DPDP Privacy Portal'
""")
rows = c.fetchall()

print(f"Total 'DPDP Privacy Portal' records: {len(rows)}\n")

promo_pending = [r for r in rows if r["purpose"].startswith("Re: Consent for Promotional Communications") and r["status"] == "PENDING"]
promo_all = [r for r in rows if r["purpose"].startswith("Re: Consent for Promotional Communications")]
other_portal = [r for r in rows if not r["purpose"].startswith("Re: Consent for Promotional Communications")]

print(f"1. Specifically PENDING with purpose starting with 'Re: Consent for Promotional Communications': {len(promo_pending)}")
for r in promo_pending:
    print(f"   [{r['id']}] status={r['status']} created={r['created_at']} msg_id={r['message_id']} purpose={r['purpose']}")

print(f"\n2. ALL with purpose starting with 'Re: Consent for Promotional Communications' (including DENIED): {len(promo_all)}")
for r in promo_all:
    print(f"   [{r['id']}] status={r['status']} created={r['created_at']} msg_id={r['message_id']} purpose={r['purpose']}")

print(f"\n3. Other 'DPDP Privacy Portal' records: {len(other_portal)}")
for r in other_portal:
    print(f"   [{r['id']}] status={r['status']} created={r['created_at']} msg_id={r['message_id']} purpose={r['purpose']}")
