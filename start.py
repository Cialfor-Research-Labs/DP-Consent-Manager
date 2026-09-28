#!/usr/bin/env python3
"""
Data Principal Consent Manager — Universal Application Launcher
Cross-platform startup script supporting Windows, macOS, and Linux.

Usage:
    python start.py          # Starts unified single-port production app (http://localhost:8000)
    python start.py --dev    # Starts full dev mode with Vite HMR (5173) + FastAPI (8000)
    python start.py --build  # Forces frontend rebuild before starting
    python start.py --no-browser  # Suppresses automatic browser opening
"""

import sys
import os
import shutil
import subprocess
import webbrowser
import threading
import time
import secrets
import signal

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
DIST_DIR = os.path.join(ROOT_DIR, "dist")
ENV_FILE = os.path.join(ROOT_DIR, ".env")
ENV_EXAMPLE = os.path.join(ROOT_DIR, ".env.example")
REQUIREMENTS_FILE = os.path.join(ROOT_DIR, "requirements.txt")
PACKAGE_JSON = os.path.join(ROOT_DIR, "package.json")
NODE_MODULES = os.path.join(ROOT_DIR, "node_modules")

# Color helpers for terminal output
IS_WINDOWS = sys.platform.startswith("win")
USE_COLOR = sys.stdout.isatty() and (not IS_WINDOWS or "WT_SESSION" in os.environ or "ANSICON" in os.environ or "ConEmuANSI" in os.environ or os.environ.get("TERM_PROGRAM") is not None)

def color(text: str, code: str) -> str:
    return f"\033[{code}m{text}\033[0m" if USE_COLOR else text

def log_info(msg: str):
    print(f"{color('[INFO]', '34;1')} {msg}")

def log_success(msg: str):
    print(f"{color('[SUCCESS]', '32;1')} {msg}")

def log_warn(msg: str):
    print(f"{color('[WARN]', '33;1')} {msg}")

def log_error(msg: str):
    print(f"{color('[ERROR]', '31;1')} {msg}")

def print_banner(dev_mode: bool):
    print("\n" + "=" * 68)
    print(color("  🛡️  DATA PRINCIPAL CONSENT MANAGER (DPDP ACT 2023)", "36;1"))
    mode_label = "Development Mode (Vite 5173 + FastAPI 8000)" if dev_mode else "Single-Port Unified Mode (Port 8000)"
    print(f"  Mode: {color(mode_label, '33;1')}")
    print("=" * 68 + "\n")

def check_python_version():
    if sys.version_info < (3, 9):
        log_error(f"Python 3.9+ is required. Found Python {sys.version_info.major}.{sys.version_info.minor}")
        sys.exit(1)
    log_success(f"Python environment: {sys.version.split()[0]} ({sys.executable})")

def check_node_and_npm():
    node_path = shutil.which("node")
    npm_path = shutil.which("npm")

    if not node_path or not npm_path:
        log_error("Node.js and npm are required to build and run the frontend.")
        log_error("Please install Node.js from https://nodejs.org/ (v18 or newer recommended).")
        sys.exit(1)

    try:
        node_ver = subprocess.check_output([node_path, "-v"], text=True).strip()
        npm_ver = subprocess.check_output([npm_path, "-v"], text=True).strip()
        log_success(f"Node.js: {node_ver} | npm: {npm_ver}")
    except Exception as e:
        log_warn(f"Could not verify Node.js/npm versions: {e}")

def ensure_env_file():
    """Ensure .env exists with required JWT and Webhook secrets."""
    if os.path.isfile(ENV_FILE):
        log_success("Environment configuration file (.env) found.")
        return

    log_warn(".env file not found. Initializing from template with secure random secrets...")
    jwt_secret = secrets.token_hex(32)
    webhook_secret = secrets.token_hex(16)

    content = ""
    if os.path.isfile(ENV_EXAMPLE):
        with open(ENV_EXAMPLE, "r", encoding="utf-8") as f:
            template = f.read()
        content = template.replace("your_secure_random_jwt_secret_key_here", jwt_secret)
        content = content.replace("your_gmail_webhook_secret_here", webhook_secret)
    else:
        content = f"""# Data Principal Consent Manager - Environment Variables
ENVIRONMENT=development
JWT_SECRET_KEY={jwt_secret}
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GMAIL_WEBHOOK_SECRET={webhook_secret}
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000
PORT=8000
"""

    with open(ENV_FILE, "w", encoding="utf-8") as f:
        f.write(content)
    log_success("Created .env with secure random JWT_SECRET_KEY and GMAIL_WEBHOOK_SECRET.")

def ensure_python_dependencies():
    """Verify required Python packages; install via pip if missing."""
    required = ["fastapi", "uvicorn", "pydantic", "jwt", "bcrypt", "dotenv"]
    missing = []
    for pkg in required:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)

    if not missing:
        log_success("Python backend dependencies verified.")
        return

    log_warn(f"Missing Python dependencies: {', '.join(missing)}. Installing from requirements.txt...")
    cmd = [sys.executable, "-m", "pip", "install", "-r", REQUIREMENTS_FILE]
    res = subprocess.run(cmd, cwd=ROOT_DIR)
    if res.returncode != 0:
        log_error("Failed to install Python dependencies. Please run: pip install -r requirements.txt")
        sys.exit(1)
    log_success("Python dependencies installed successfully.")

def ensure_node_dependencies():
    """Verify node_modules exists; run npm install if missing."""
    if os.path.isdir(NODE_MODULES):
        log_success("Frontend node_modules verified.")
        return

    log_info("Frontend node_modules not found. Running npm install...")
    npm_cmd = "npm.cmd" if IS_WINDOWS else "npm"
    res = subprocess.run([npm_cmd, "install"], cwd=ROOT_DIR)
    if res.returncode != 0:
        log_error("Failed to install frontend dependencies. Please run: npm install")
        sys.exit(1)
    log_success("Frontend dependencies installed successfully.")

def build_frontend(force: bool = False):
    """Ensure dist/ is built for production single-port serving."""
    index_html = os.path.join(DIST_DIR, "index.html")
    if not force and os.path.isfile(index_html):
        log_success("Built frontend assets (dist/) verified.")
        return

    log_info("Building production frontend bundle (vite build)...")
    npm_cmd = "npm.cmd" if IS_WINDOWS else "npm"
    res = subprocess.run([npm_cmd, "run", "build"], cwd=ROOT_DIR)
    if res.returncode != 0:
        log_error("Frontend build failed. Please check build output above.")
        sys.exit(1)
    log_success("Frontend build complete.")

def open_browser_later(url: str, delay_seconds: float = 1.5):
    def _open():
        time.sleep(delay_seconds)
        log_info(f"Opening browser at: {url}")
        try:
            webbrowser.open(url)
        except Exception:
            pass
    threading.Thread(target=_open, daemon=True).start()

def run_single_port(no_browser: bool):
    """Run unified FastAPI server serving both React UI and REST APIs on port 8000."""
    url = "http://localhost:8000"
    print("\n" + "-" * 68)
    print(f"🚀 Application URL: {color(url, '32;1')}")
    print(f"🔗 REST API Base:   {color(url + '/api', '36;1')}")
    print(f"📖 Swagger Docs:    {color(url + '/docs', '35;1')}")
    print(f"🛑 Press {color('Ctrl+C', '31;1')} to stop the server.")
    print("-" * 68 + "\n")

    if not no_browser:
        open_browser_later(url)

    main_py = os.path.join(BACKEND_DIR, "main.py")
    try:
        subprocess.run([sys.executable, main_py], cwd=ROOT_DIR)
    except KeyboardInterrupt:
        print("\n" + color("Server stopped by user. Goodbye!", "33;1"))

def run_dev_mode(no_browser: bool):
    """Run Vite dev server (5173) and FastAPI backend (8000) concurrently."""
    npm_cmd = "npm.cmd" if IS_WINDOWS else "npm"
    main_py = os.path.join(BACKEND_DIR, "main.py")

    backend_url = "http://localhost:8000"
    frontend_url = "http://localhost:5173"

    print("\n" + "-" * 68)
    print(f"⚡ Vite Dev UI:     {color(frontend_url, '32;1')} (with HMR)")
    print(f"🚀 Backend API:     {color(backend_url, '36;1')}")
    print(f"📖 Swagger Docs:    {color(backend_url + '/docs', '35;1')}")
    print(f"🛑 Press {color('Ctrl+C', '31;1')} to stop both servers.")
    print("-" * 68 + "\n")

    if not no_browser:
        open_browser_later(frontend_url, delay_seconds=2.0)

    # Start FastAPI backend process
    backend_proc = subprocess.Popen([sys.executable, main_py], cwd=ROOT_DIR)

    # Start Vite dev frontend process
    frontend_proc = subprocess.Popen([npm_cmd, "run", "dev"], cwd=ROOT_DIR)

    def shutdown(sig, frame):
        print("\n" + color("Shutting down development servers...", "33;1"))
        for proc in [frontend_proc, backend_proc]:
            try:
                proc.terminate()
            except Exception:
                pass
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, shutdown)

    try:
        # Wait on processes
        while True:
            b_ret = backend_proc.poll()
            f_ret = frontend_proc.poll()
            if b_ret is not None or f_ret is not None:
                shutdown(None, None)
            time.sleep(0.5)
    except KeyboardInterrupt:
        shutdown(None, None)

def main():
    args = sys.argv[1:]
    dev_mode = "--dev" in args
    force_build = "--build" in args
    no_browser = "--no-browser" in args

    print_banner(dev_mode)

    log_info("Performing pre-flight environment checks...")
    check_python_version()
    check_node_and_npm()
    ensure_env_file()
    ensure_python_dependencies()
    ensure_node_dependencies()

    if dev_mode:
        run_dev_mode(no_browser=no_browser)
    else:
        build_frontend(force=force_build)
        run_single_port(no_browser=no_browser)

if __name__ == "__main__":
    main()
