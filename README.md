# Data Principal Consent Manager (DP-Consent-Manager)

A compliance-grade digital privacy management platform built in strict adherence to India's **Digital Personal Data Protection (DPDP) Act, 2023** (Sections 6, 11, 12, 13, and 14).

Empowers **Data Principals** (individuals) to manage consent, exercise data access and deletion rights, file grievances, and designate statutory nominees, while enabling **Data Fiduciaries** (enterprises, institutions, banks) to dispatch legally compliant consent notices and capture verifiable audit trails.

---

## Key Features

- **Automated Gmail Sync & Intent Detection**: Integrates with Google Apps Script to scan Gmail for genuine data processing consent notices, discarding OTPs, receipts, and newsletters via an explainable contextual scoring engine.
- **Granular Attribute-Level Consent (DPDP Sec 6)**: Data Principals can review purpose, legal basis, data region, and selectively grant or deny optional data attributes.
- **Cryptographic Receipts**: Generates deterministic `SHA-256` integrity signatures for all granted consents with downloadable JSON certificates.
- **Statutory Revocation (DPDP Sec 6(4))**: One-click withdrawal of consent with immediate notification dispatched back to the fiduciary.
- **Data Subject Rights (DSR) & Grievances (DPDP Sec 11–13)**: Request data correction or erasure with a 30-day SLA, or file formal grievances with a statutory 7-day SLA.
- **Legal Nomination (DPDP Sec 14)**: Designate a statutory nominee in the event of death or incapacity.
- **Same-Thread Gmail Replies**: Automatically sends statutory receipts and decision updates back to the original email thread.
- **Tamper-Evident Audit Trails**: Every action (view, grant, deny, revoke, grievance) is logged with timestamps and IP addresses.

---

## Tech Stack

- **Frontend**: React 19, Vite, Lucide Icons, Modern Responsive CSS
- **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLite3 (WAL mode)
- **Security & Auth**: JWT (HS256), Bcrypt password hashing, Role-Based Access Control (RBAC)
- **Integration**: Google Apps Script (`gmail_sync.gs`), Cloudflare Quick Tunnels

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- SQLite3

### 2. Environment Configuration
Copy `.env.example` to `.env` and set your secrets:
```bash
cp .env.example .env
```
Ensure `JWT_SECRET_KEY` and `GMAIL_WEBHOOK_SECRET` are configured.

### 3. Installation
```bash
# Install frontend dependencies
npm install

# Build frontend production bundle
npm run build
```

### 4. Running the Application

You can start the entire application with one command:

#### 1. Linux & macOS (`start-all.sh`):
```bash
chmod +x start-all.sh
./start-all.sh          # Starts unified application (http://localhost:8000)
./start-all.sh --dev    # Starts development mode (Vite 5173 + FastAPI 8000)
```

#### 2. PowerShell (`start-all.ps1` — Windows, macOS, Linux):
```powershell
.\start-all.ps1         # Starts unified application (http://localhost:8000)
.\start-all.ps1 -Dev    # Starts development mode (Vite 5173 + FastAPI 8000)
```

#### 3. Windows Command Prompt (`start-all.bat`):
```cmd
start-all.bat           # Double-click or run from cmd.exe
```

#### 4. Universal Python Launcher (`start.py`):
```bash
python start.py         # Production single-port mode (http://localhost:8000)
python start.py --dev   # Development mode (Vite 5173 + FastAPI 8000)
```

#### 5. Using npm:
```bash
npm start               # Runs universal launcher
npm run dev             # Frontend development server only
```

### 5. Running Tests
```bash
# Backend pytest suite (70 unit & integration tests)
python -m pytest backend/tests

# Google Apps Script test suite
node --test tests/gmail_sync.test.cjs
```
