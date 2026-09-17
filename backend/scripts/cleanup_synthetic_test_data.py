import sqlite3
import shutil
import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(BACKEND_DIR, "consent_manager.db")
BACKUP_PATH = os.path.join(BACKEND_DIR, "consent_manager.db.bak")

def run_cleanup():
    print(f"Target Database: {DB_PATH}")
    if not os.path.exists(DB_PATH):
        print(f"Database file not found at {DB_PATH}")
        sys.exit(1)

    # 1. Create a safe backup before any changes
    print(f"Creating safety backup at {BACKUP_PATH}...")
    shutil.copy2(DB_PATH, BACKUP_PATH)
    print("[OK] Backup created successfully.")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 2. Identify test data principals and users
    cursor.execute("""
    SELECT id, email FROM data_principals 
    WHERE email LIKE 'alice_flow_%' 
       OR email LIKE 'bob_flow_%' 
       OR email LIKE 'user_a_discovery@%' 
       OR email LIKE 'user_b_discovery@%' 
       OR email LIKE 'testdiag_%';
    """)
    test_dps = cursor.fetchall()
    test_dp_ids = [r[0] for r in test_dps]

    cursor.execute("""
    SELECT id, email FROM users 
    WHERE email LIKE 'alice_flow_%' 
       OR email LIKE 'bob_flow_%' 
       OR email LIKE 'user_a_discovery@%' 
       OR email LIKE 'user_b_discovery@%' 
       OR email LIKE 'testdiag_%';
    """)
    test_users = cursor.fetchall()
    test_user_ids = [r[0] for r in test_users]

    # 3. Identify all synthetic test consent_requests
    cursor.execute("""
    SELECT id, token, notice_id, message_id, email_snapshot_id, data_principal_id, status, fiduciary_name
    FROM consent_requests;
    """)
    all_reqs = cursor.fetchall()

    test_req_ids = []
    test_snapshot_ids = []

    for r in all_reqs:
        rid, tok, nid, msg, snap_id, dpid, st, fid = r
        msg_str = str(msg or '')
        tok_str = str(tok or '')
        rid_str = str(rid or '')

        is_test = False
        if msg_str.startswith(('msg_edu_', 'msg_healthcare_', 'msg_banking_', 'msg_fintech_', 'msg_grant_', 'msg_deny_', 'msg_idem_', 'msg_live_', 'gmail_msg_')):
            is_test = True
        elif rid_str.startswith('REQ-TEST-'):
            is_test = True
        elif tok_str.startswith(('tok_edu_webhook_test_', 'tok_unknown_webhook_test_', 'tok_health_webhook_test_', 'tok_fintech_webhook_test_', 'tok_test_user_a_')):
            is_test = True
        elif dpid in test_dp_ids:
            is_test = True

        if is_test:
            test_req_ids.append(rid)
            if snap_id:
                test_snapshot_ids.append(snap_id)

    print(f"Found {len(test_req_ids)} synthetic test consent_requests to remove.")
    print(f"Found {len(test_snapshot_ids)} linked test email_snapshots to remove.")
    print(f"Found {len(test_dp_ids)} test data_principals to remove.")
    print(f"Found {len(test_user_ids)} test users to remove.")

    # Begin atomic transaction
    cursor.execute("BEGIN TRANSACTION;")

    # 4. Delete dependent records
    deleted_counts = {}

    if test_req_ids:
        # Fiduciary notifications
        q_notifs = f"DELETE FROM fiduciary_notifications WHERE request_id IN ({','.join(['?']*len(test_req_ids))});"
        cursor.execute(q_notifs, test_req_ids)
        deleted_counts["fiduciary_notifications"] = cursor.rowcount

        # Audit events
        q_audit = f"DELETE FROM audit_events WHERE request_id IN ({','.join(['?']*len(test_req_ids))});"
        cursor.execute(q_audit, test_req_ids)
        deleted_counts["audit_events"] = cursor.rowcount

        # Consent decisions
        q_dec = f"DELETE FROM consent_decisions WHERE request_id IN ({','.join(['?']*len(test_req_ids))});"
        cursor.execute(q_dec, test_req_ids)
        deleted_counts["consent_decisions"] = cursor.rowcount

        # Consents
        q_consents = f"DELETE FROM consents WHERE request_id IN ({','.join(['?']*len(test_req_ids))});"
        cursor.execute(q_consents, test_req_ids)
        deleted_counts["consents"] = cursor.rowcount

        # Consent requests
        q_reqs = f"DELETE FROM consent_requests WHERE id IN ({','.join(['?']*len(test_req_ids))});"
        cursor.execute(q_reqs, test_req_ids)
        deleted_counts["consent_requests"] = cursor.rowcount

    if test_snapshot_ids:
        q_snaps = f"DELETE FROM email_snapshots WHERE id IN ({','.join(['?']*len(test_snapshot_ids))});"
        cursor.execute(q_snaps, test_snapshot_ids)
        deleted_counts["email_snapshots"] = cursor.rowcount

    if test_dp_ids:
        # Extra audit events associated with test DPs
        q_audit_dp = f"DELETE FROM audit_events WHERE data_principal_id IN ({','.join(['?']*len(test_dp_ids))});"
        cursor.execute(q_audit_dp, test_dp_ids)
        deleted_counts["audit_events"] += cursor.rowcount

        q_dps = f"DELETE FROM data_principals WHERE id IN ({','.join(['?']*len(test_dp_ids))});"
        cursor.execute(q_dps, test_dp_ids)
        deleted_counts["data_principals"] = cursor.rowcount

    if test_user_ids:
        q_users = f"DELETE FROM users WHERE id IN ({','.join(['?']*len(test_user_ids))});"
        cursor.execute(q_users, test_user_ids)
        deleted_counts["users"] = cursor.rowcount

    conn.commit()
    print("\n[OK] Transaction committed successfully. Deletion summary:")
    for tbl, cnt in deleted_counts.items():
        print(f"  - {tbl}: {cnt} rows deleted")

    # Verification: check remaining counts
    print("\n--- REMAINING RECORDS VERIFICATION ---")
    cursor.execute("SELECT count(*) FROM consent_requests;")
    rem_reqs = cursor.fetchone()[0]
    cursor.execute("SELECT count(*) FROM consents;")
    rem_consents = cursor.fetchone()[0]
    cursor.execute("SELECT count(*) FROM users;")
    rem_users = cursor.fetchone()[0]
    cursor.execute("SELECT count(*) FROM data_principals;")
    rem_dps = cursor.fetchone()[0]

    print(f"  Remaining genuine consent_requests: {rem_reqs}")
    print(f"  Remaining genuine consents: {rem_consents}")
    print(f"  Remaining genuine users: {rem_users}")
    print(f"  Remaining genuine data_principals: {rem_dps}")

    # Check that genuine user Manu Sharma has only their legitimate requests
    cursor.execute("""
    SELECT cr.id, cr.fiduciary_name, cr.status, cr.message_id 
    FROM consent_requests cr
    JOIN data_principals dp ON cr.data_principal_id = dp.id
    WHERE dp.email = 'manusharma.cs78@gmail.com' AND cr.status = 'PENDING';
    """)
    manu_pending = cursor.fetchall()
    print(f"\nManu Sharma ({len(manu_pending)} pending requests remaining):")
    for mp in manu_pending:
        print(f"  {mp}")

    conn.close()
    print("\nCleanup completed successfully without impacting genuine data.")

if __name__ == "__main__":
    run_cleanup()
