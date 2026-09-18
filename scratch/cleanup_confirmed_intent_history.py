"""One-time, allowlisted cleanup; never selects records by a broad 'test' pattern."""
import json
import sqlite3
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / "scratch/intent-cleanup-backup.db"
DATABASE = ROOT / "backend/consent_manager.db"
REPORT = ROOT / "scratch/intent-cleanup-result.json"
E2E = {
    "224": "1789470794", "354": "1789470841", "670": "1789470961",
    "272": "1789471003", "805": "1789471205",
}
TARGETS = {"REQ-2026-CIALFOR-" + suffix for suffix in (*E2E, "999", "932")}
ORDER = ("fiduciary_notifications", "audit_events", "consent_decisions",
         "consents", "consent_requests", "email_snapshots")


def snapshot(conn):
    tables = [r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
    return {table: {r[0]: tuple(r) for r in conn.execute(f'SELECT * FROM "{table}"')}
            for table in tables}


def plan(conn):
    conn.row_factory = sqlite3.Row
    requests = {r["id"]: dict(r) for r in conn.execute("SELECT * FROM consent_requests")}
    if not TARGETS.intersection(requests):
        return {table: set() for table in ORDER}
    assert TARGETS <= requests.keys(), "Partial or changed target set; review required"
    evidence = {}
    for suffix, stamp in E2E.items():
        rid = "REQ-2026-CIALFOR-" + suffix
        req = requests[rid]
        email = conn.execute("SELECT * FROM email_snapshots WHERE id=?",
                             (req["email_snapshot_id"],)).fetchone()
        assert req["token"] == "tok_test_e2e_" + stamp
        assert req["message_id"] == "msg_" + stamp
        assert email["body_text"] == (
            "Please verify your KYC details here: http://localhost:5173/request/" + req["token"])
        evidence[rid] = "Explicit E2E test token, matching synthetic message timestamp, exact localhost test template"
    req = requests["REQ-2026-CIALFOR-999"]
    assert req["token"] == "tok_sec_rev_1"
    assert conn.execute("SELECT 1 FROM consent_decisions WHERE request_id=? AND remark=?",
                        (req["id"], "Approved for testing receipt hash")).fetchone()
    evidence[req["id"]] = "Decision explicitly states: Approved for testing receipt hash"
    req = requests["REQ-2026-CIALFOR-932"]
    body = conn.execute("SELECT body_text FROM email_snapshots WHERE id=?",
                        (req["email_snapshot_id"],)).fetchone()[0]
    assert "Principal Statement: Automated test grievance under DPDP Act Section 13." in body
    evidence[req["id"]] = "Ingested grievance explicitly identifies itself as an automated test"
    selected = {table: set() for table in ORDER}
    selected["consent_requests"] = set(TARGETS)
    for row in conn.execute("SELECT * FROM consents"):
        if row["request_id"] in TARGETS:
            selected["consents"].add(row["consent_id"])
    for table in ("consent_decisions", "audit_events", "fiduciary_notifications"):
        for row in conn.execute(f"SELECT * FROM {table}"):
            row = dict(row)
            if (row["request_id"] in TARGETS or
                    row.get("consent_id") in selected["consents"] or
                    row.get("artifact_id") in selected["consents"]):
                assert row["request_id"] not in requests or row["request_id"] in TARGETS, "Mixed provenance"
                selected[table].add(row["id"])
    candidates = {requests[rid]["email_snapshot_id"] for rid in TARGETS}
    shared = {r["email_snapshot_id"] for rid, r in requests.items() if rid not in TARGETS}
    selected["email_snapshots"] = candidates - shared
    return selected


def cleanup(conn, expected_snapshot=None):
    conn.execute("BEGIN IMMEDIATE")
    try:
        before = snapshot(conn)
        if expected_snapshot is not None:
            assert before == expected_snapshot, "DB changed since backup; re-review required"
        fk_before = {tuple(r) for r in conn.execute("PRAGMA foreign_key_check")}
        selected = plan(conn)
        for table in ORDER:
            key = "consent_id" if table == "consents" else "id"
            for value in selected[table]:
                conn.execute(f"DELETE FROM {table} WHERE {key}=?", (value,))
        after = snapshot(conn)
        for table, rows in before.items():
            expected = {k: v for k, v in rows.items() if k not in selected.get(table, set())}
            assert after[table] == expected, f"Unexpected change to {table}"
        assert conn.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert {tuple(r) for r in conn.execute("PRAGMA foreign_key_check")} <= fk_before
        assert not any(plan(conn).values()), "Cleanup is not idempotent"
        conn.commit()
        return {table: sorted(ids) for table, ids in selected.items()}
    except BaseException:
        conn.rollback()
        raise


def clone():
    source = sqlite3.connect(BACKUP.as_uri() + "?mode=ro", uri=True)
    conn = sqlite3.connect(":memory:")
    source.backup(conn)
    source.close()
    return conn


class CleanupTests(unittest.TestCase):
    def setUp(self):
        self.conn = clone()
        self.addCleanup(self.conn.close)

    def test_exact_deletions_preservation_integrity_and_idempotency(self):
        removed = cleanup(self.conn)
        self.assertEqual(set(removed["consent_requests"]), TARGETS)
        self.assertEqual(len(removed["email_snapshots"]), 7)
        self.assertFalse(any(cleanup(self.conn).values()))

    def test_changed_evidence_aborts_without_deletion(self):
        self.conn.execute("UPDATE consent_requests SET message_id='real-message' WHERE id=?",
                          ("REQ-2026-CIALFOR-224",))
        self.conn.commit()
        before = snapshot(self.conn)
        with self.assertRaises(AssertionError):
            cleanup(self.conn)
        self.assertEqual(snapshot(self.conn), before)

    def test_shared_snapshot_is_preserved(self):
        sid = self.conn.execute("SELECT email_snapshot_id FROM consent_requests WHERE id=?",
                                ("REQ-2026-CIALFOR-224",)).fetchone()[0]
        self.conn.execute("UPDATE consent_requests SET email_snapshot_id=? WHERE token=?",
                          (sid, "tok_test_loan_123"))
        self.conn.commit()
        removed = cleanup(self.conn)
        self.assertNotIn(sid, removed["email_snapshots"])
        self.assertTrue(self.conn.execute("SELECT 1 FROM email_snapshots WHERE id=?", (sid,)).fetchone())

    def test_failure_rolls_back_all_deletions(self):
        self.conn.execute("CREATE TRIGGER reject_cleanup BEFORE DELETE ON consent_requests "
                          "BEGIN SELECT RAISE(ABORT, 'simulated failure'); END")
        self.conn.commit()
        before = snapshot(self.conn)
        with self.assertRaises(sqlite3.IntegrityError):
            cleanup(self.conn)
        self.assertEqual(snapshot(self.conn), before)


if __name__ == "__main__":
    if sys.argv[1:] == ["--apply"]:
        conn = sqlite3.connect(DATABASE, timeout=10)
        try:
            baseline = clone()
            try:
                expected = snapshot(baseline)
            finally:
                baseline.close()
            removed = cleanup(conn, expected_snapshot=expected)
            REPORT.write_text(json.dumps({
                "backup": str(BACKUP), "removed": removed,
                "counts": {k: len(v) for k, v in removed.items()},
                "preserved": "All other rows, including all users and data principals, verified byte-for-byte",
                "integrity": "ok", "new_foreign_key_violations": 0,
            }, indent=2), encoding="utf-8")
            print(json.dumps({k: len(v) for k, v in removed.items()}))
        finally:
            conn.close()
    else:
        unittest.main()
