import sqlite3

conn = sqlite3.connect("backend/consent_manager.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("SELECT id, token, fiduciary_name, purpose, status, created_at, message_id, thread_id FROM consent_requests ORDER BY created_at ASC")
rows = c.fetchall()

print(f"Total requests in DB: {len(rows)}\n")
for i, r in enumerate(rows, 1):
    print(f"{i:2d}. [{r['id']}] fid={r['fiduciary_name']!r:30s} status={r['status']:8s} purpose={r['purpose']!r:60s} msg_id={r['message_id']}")
