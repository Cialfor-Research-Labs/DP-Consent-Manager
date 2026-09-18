import os
import shutil
import sqlite3
import sys

def main():
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "consent_manager.db"))
    backup_path = f"{db_path}.bak_loop_cleanup"
    
    print(f"Target Database: {db_path}")
    if not os.path.exists(db_path):
        print(f"Error: {db_path} does not exist!")
        sys.exit(1)

    # 1. Create a safe backup
    shutil.copy2(db_path, backup_path)
    print(f"Created backup at: {backup_path}")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # 2. Select target fake PENDING requests
    c.execute("""
        SELECT id, token, notice_id, fiduciary_name, purpose, status, created_at, email_snapshot_id
        FROM consent_requests
        WHERE fiduciary_name = 'DPDP Privacy Portal'
          AND purpose LIKE 'Re: Consent for Promotional Communications%'
          AND status = 'PENDING';
    """)
    target_requests = c.fetchall()
    print(f"\nFound {len(target_requests)} fake PENDING requests to remove:")
    
    req_ids = [r["id"] for r in target_requests]
    snapshot_ids = [r["email_snapshot_id"] for r in target_requests if r["email_snapshot_id"]]

    for r in target_requests:
        print(f"  - [{r['id']}] {r['status']} | {r['purpose']} | snapshot={r['email_snapshot_id']}")

    if not req_ids:
        print("No target records found. Database is already clean.")
        conn.close()
        return

    placeholders = ",".join("?" * len(req_ids))
    snap_placeholders = ",".join("?" * len(snapshot_ids)) if snapshot_ids else ""

    # Check dependent records
    c.execute(f"SELECT COUNT(*) FROM consent_decisions WHERE request_id IN ({placeholders});", req_ids)
    dep_decisions = c.fetchone()[0]

    c.execute(f"SELECT COUNT(*) FROM consents WHERE request_id IN ({placeholders});", req_ids)
    dep_consents = c.fetchone()[0]

    c.execute(f"SELECT COUNT(*) FROM fiduciary_notifications WHERE request_id IN ({placeholders});", req_ids)
    dep_notifs = c.fetchone()[0]

    c.execute(f"SELECT COUNT(*) FROM audit_events WHERE request_id IN ({placeholders});", req_ids)
    dep_audits = c.fetchone()[0]

    print(f"\nDependent records found:")
    print(f"  - consent_decisions: {dep_decisions}")
    print(f"  - consents: {dep_consents}")
    print(f"  - fiduciary_notifications: {dep_notifs}")
    print(f"  - audit_events: {dep_audits}")
    print(f"  - email_snapshots: {len(snapshot_ids)}")

    # 3. Perform Deletions within a transaction
    try:
        conn.execute("BEGIN TRANSACTION;")

        if dep_decisions > 0:
            c.execute(f"DELETE FROM consent_decisions WHERE request_id IN ({placeholders});", req_ids)
        if dep_consents > 0:
            c.execute(f"DELETE FROM consents WHERE request_id IN ({placeholders});", req_ids)
        if dep_notifs > 0:
            c.execute(f"DELETE FROM fiduciary_notifications WHERE request_id IN ({placeholders});", req_ids)
        if dep_audits > 0:
            c.execute(f"DELETE FROM audit_events WHERE request_id IN ({placeholders});", req_ids)

        c.execute(f"DELETE FROM consent_requests WHERE id IN ({placeholders});", req_ids)
        deleted_requests = c.rowcount

        deleted_snapshots = 0
        if snapshot_ids:
            # Only delete snapshots not referenced by other requests
            c.execute(f"""
                DELETE FROM email_snapshots 
                WHERE id IN ({snap_placeholders})
                  AND id NOT IN (SELECT email_snapshot_id FROM consent_requests WHERE email_snapshot_id IS NOT NULL);
            """, snapshot_ids)
            deleted_snapshots = c.rowcount

        conn.commit()
        print(f"\nSuccessfully cleaned:")
        print(f"  - Removed {deleted_requests} fake consent_requests")
        print(f"  - Removed {deleted_snapshots} dependent email_snapshots")

    except Exception as e:
        conn.rollback()
        print(f"Error during cleanup, transaction rolled back: {e}")
        sys.exit(1)

    # 4. Verification of remaining counts
    print("\n--- Remaining Database Row Counts ---")
    tables = [
        "consent_requests", "email_snapshots", "fiduciary_notifications",
        "audit_events", "consent_decisions", "consents", "data_principals", "users",
        "data_rights_requests", "statutory_nominees"
    ]
    for t in tables:
        cnt = c.execute(f"SELECT COUNT(*) FROM {t};").fetchone()[0]
        print(f"  {t}: {cnt}")

    conn.close()
    print("\nDatabase cleanup complete.")

if __name__ == "__main__":
    main()
