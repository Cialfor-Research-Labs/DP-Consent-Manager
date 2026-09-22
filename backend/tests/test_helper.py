import os
import sys
import tempfile
import sqlite3

# Ensure backend directory is in python search path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database import DEFAULT_DB_FILE, get_db_path, init_db

def assert_not_production_db():
    """
    Safety assertion: strictly verifies that the active database path
    does NOT resolve to the real development database.
    """
    active = os.path.abspath(get_db_path())
    prod = os.path.abspath(DEFAULT_DB_FILE)
    if active == prod:
        raise RuntimeError(
            f"FATAL SAFETY CHECK FAILED: Resolved DB path equals real development DB: {prod}. "
            f"Automated tests are strictly forbidden from running against or mutating the development database!"
        )

def create_isolated_test_db() -> str:
    """
    Creates a temporary SQLite test database, sets environment variables,
    asserts isolation from development DB, and initializes the complete schema.
    """
    # Create temp file and close handle immediately so Windows allows sqlite access
    temp_fd, temp_path = tempfile.mkstemp(suffix="_test_consent.db", prefix="isolated_")
    os.close(temp_fd)
    temp_path = os.path.abspath(temp_path)

    os.environ["DATABASE_PATH"] = temp_path
    os.environ["TEST_DATABASE_URL"] = f"sqlite:///{temp_path}"
    os.environ.setdefault("JWT_SECRET_KEY", "test-cryptographic-jwt-secret-key-32bytes-long!")
    os.environ.setdefault("GMAIL_WEBHOOK_SECRET", "test-gmail-webhook-secret-12345")

    # Strict safety check
    assert_not_production_db()

    # Initialize complete schema in isolated test DB
    init_db()

    return temp_path

def destroy_isolated_test_db(temp_path: str):
    """
    Cleans up the temporary test database files (-wal, -shm, .db)
    and clears test environment variables.
    """
    if not temp_path:
        return

    # Clear environment variables first
    os.environ.pop("DATABASE_PATH", None)
    os.environ.pop("TEST_DATABASE_URL", None)

    # Remove temporary database and journal files
    for ext in ["", "-wal", "-shm", "-journal"]:
        fpath = temp_path + ext
        if os.path.exists(fpath):
            try:
                os.remove(fpath)
            except Exception:
                pass
