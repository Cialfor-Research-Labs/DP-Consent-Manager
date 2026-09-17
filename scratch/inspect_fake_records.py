import sqlite3
import json

conn = sqlite3.connect("backend/consent_manager.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Check all consent_requests
c.execute("""
    SELECT id, token, notice_id, fiduciary_name, purpose, status, created_at, email_snapshot_id, data_principal_id
    FROM consent_requests
    WHERE fiduciary_name = 'DPDP Privacy Portal'
       OR purpose LIKE 'Re:%'
""")
rows = c.fetchall()
print(f"Total matching requests: {len(rows)}")

req_ids = [r["id"] for r in rows]
snapshot_ids = [r["email_snapshot_id"] for r in rows if r["email_snapshot_id"]]

print("\n--- Matching Requests ---")
for r in rows:
    print(f"[{r['id']}] status={r['status']} fid={r['fiduciary_name']!r} purpose={r['purpose']!r} created={r['created_at']}")

# Check dependent records in consent_decisions
if req_ids:
    placeholders = ",".join("?" * len(req_ids))
    c.execute(f"SELECT id, request_id, decision, decided_at FROM consent_decisions WHERE request_id IN ({placeholders})", req_ids)
    decisions = c.fetchall()
    print(f"\nDependent consent_decisions: {len(decisions)}")
    for d in decisions:
        print(f"  decision id={d['id']} req_id={d['request_id']} decision={d['decision']}")

    # Check dependent records in consents
    c.execute(f"SELECT consent_id, request_id, fiduciary_name, status FROM consents WHERE request_id IN ({placeholders})", req_ids)
    consents = c.fetchall()
    print(f"\nDependent consents: {len(consents)}")
    for cn in consents:
        print(f"  consent id={cn['consent_id']} req_id={cn['request_id']} fid={cn['fiduciary_name']}")

    # Check dependent records in fiduciary_notifications
    c.execute(f"SELECT id, request_id, fiduciary_name, action, status FROM fiduciary_notifications WHERE request_id IN ({placeholders})", req_ids)
    notifs = c.fetchall()
    print(f"\nDependent fiduciary_notifications: {len(notifs)}")
    for n in notifs:
        print(f"  notif id={n['id']} req_id={n['request_id']} action={n['action']}")

    # Check dependent records in audit_events
    c.execute(f"SELECT id, request_id, action, fiduciary FROM audit_events WHERE request_id IN ({placeholders})", req_ids)
    audits = c.fetchall()
    print(f"\nDependent audit_events: {len(audits)}")
    for a in audits:
        print(f"  audit id={a['id']} req_id={a['request_id']} action={a['action']}")

# Check email snapshots
if snapshot_ids:
    placeholders = ",".join("?" * len(snapshot_ids))
    c.execute(f"SELECT id, subject, from_address FROM email_snapshots WHERE id IN ({placeholders})", snapshot_ids)
    snapshots = c.fetchall()
    print(f"\nDependent email_snapshots: {len(snapshots)}")
    for s in snapshots:
        print(f"  snapshot id={s['id']} from={s['from_address']} subj={s['subject']}")

# Total counts in the DB
print("\n--- Current Total Table Counts in backend/consent_manager.db ---")
tables = [
    "consent_requests", "email_snapshots", "fiduciary_notifications",
    "audit_events", "consent_decisions", "consents", "data_principals", "users",
    "data_rights_requests", "statutory_nominees"
]
for t in tables:
    c.execute(f"SELECT COUNT(*) FROM {t}")
    cnt = c.fetchone()[0]
    print(f"{t}: {cnt}")
