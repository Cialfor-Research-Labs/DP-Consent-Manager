import sqlite3

conn = sqlite3.connect("backend/consent_manager.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("""
    SELECT id, token, notice_id, fiduciary_name, purpose, status, created_at, email_snapshot_id, message_id
    FROM consent_requests
    WHERE fiduciary_name = 'DPDP Privacy Portal'
      AND purpose LIKE 'Re: Consent for Promotional Communications%'
      AND status = 'PENDING'
""")
pending_promo = c.fetchall()

print(f"Target Fake PENDING Requests: {len(pending_promo)}")
ids = [r["id"] for r in pending_promo]
snapshot_ids = [r["email_snapshot_id"] for r in pending_promo if r["email_snapshot_id"]]

for r in pending_promo:
    print(f" - {r['id']} | {r['status']} | {r['purpose']} | {r['created_at']} | snapshot={r['email_snapshot_id']}")

placeholders = ",".join("?" * len(ids))

# Check decisions
c.execute(f"SELECT * FROM consent_decisions WHERE request_id IN ({placeholders})", ids)
print(f"Dependent decisions: {len(c.fetchall())}")

# Check consents
c.execute(f"SELECT * FROM consents WHERE request_id IN ({placeholders})", ids)
print(f"Dependent consents: {len(c.fetchall())}")

# Check notifications
c.execute(f"SELECT * FROM fiduciary_notifications WHERE request_id IN ({placeholders})", ids)
print(f"Dependent notifications: {len(c.fetchall())}")

# Check audit_events
c.execute(f"SELECT * FROM audit_events WHERE request_id IN ({placeholders})", ids)
print(f"Dependent audit events: {len(c.fetchall())}")

# Check snapshots
snap_placeholders = ",".join("?" * len(snapshot_ids))
c.execute(f"SELECT id, subject, from_address, to_address FROM email_snapshots WHERE id IN ({snap_placeholders})", snapshot_ids)
snaps = c.fetchall()
print(f"Dependent email_snapshots: {len(snaps)}")
for s in snaps:
    print(f" - {s['id']} | {s['from_address']} | {s['subject']}")
