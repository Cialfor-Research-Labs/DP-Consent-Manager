#!/usr/bin/env bash
# ==============================================================================
# Data Principal Consent Manager — Universal Application Launcher (Linux / macOS)
# Supports Linux, macOS, WSL, and Git Bash.
#
# Usage:
#   ./start-all.sh            # Starts single-port unified app (http://localhost:8000)
#   ./start-all.sh --dev      # Starts dev mode (Vite 5173 + FastAPI 8000)
#   ./start-all.sh --build    # Forces a frontend rebuild
#   ./start-all.sh --no-browser  # Suppresses opening the browser
# ==============================================================================

set -e

# Resolve project directory
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

DEV_MODE=false
FORCE_BUILD=false
NO_BROWSER=false

for arg in "$@"; do
    case "$arg" in
        --dev) DEV_MODE=true ;;
        --build) FORCE_BUILD=true ;;
        --no-browser) NO_BROWSER=true ;;
    esac
done

# Color helpers
BOLD="\033[1m"
GREEN="\033[32;1m"
CYAN="\033[36;1m"
YELLOW="\033[33;1m"
RED="\033[31;1m"
RESET="\033[0m"

log_info() { echo -e "${CYAN}[INFO]${RESET} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${RESET} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${RESET} $1"; }
log_error() { echo -e "${RED}[ERROR]${RESET} $1" >&2; }

# ── 1. DISPLAY BANNER ────────────────────────────────────────────────────────
clear 2>/dev/null || true
echo -e "${CYAN}====================================================================${RESET}"
echo -e "${BOLD}  [*] DATA PRINCIPAL CONSENT MANAGER (DPDP ACT 2023)${RESET}"
if [ "$DEV_MODE" = true ]; then
    echo -e "  Mode: ${YELLOW}Development Mode (Vite 5173 + FastAPI 8000)${RESET}"
else
    echo -e "  Mode: ${YELLOW}Single-Port Unified Mode (Port 8000)${RESET}"
fi
echo -e "${CYAN}====================================================================${RESET}\n"

# ── 2. PRE-FLIGHT: PYTHON DETECTION ──────────────────────────────────────────
log_info "Checking Python environment..."
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
else
    log_error "Python 3 is required but not found in PATH."
    log_error "Please install Python 3.9+ from https://www.python.org/downloads/ or your package manager."
    exit 1
fi

PY_VER=$("$PYTHON_CMD" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')" 2>/dev/null || echo "Unknown")
if ! "$PYTHON_CMD" -c "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)" 2>/dev/null; then
    log_error "Python 3.9 or higher is required. Detected Python $PY_VER"
    exit 1
fi
log_success "Python $PY_VER detected ($PYTHON_CMD)"

# ── 3. PRE-FLIGHT: NODE.JS & NPM DETECTION ───────────────────────────────────
log_info "Checking Node.js & npm..."
if ! command -v node >/dev/null 2>&1; then
    log_error "Node.js is required to build and run the frontend."
    log_error "Please install Node.js (v18+ recommended) from https://nodejs.org/"
    exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
    log_error "npm package manager is required but not found in PATH."
    exit 1
fi

NODE_VER=$(node -v)
NPM_VER=$(npm -v)
log_success "Node.js $NODE_VER | npm $NPM_VER detected."

# ── 4. PRE-FLIGHT: .ENV CONFIGURATION ─────────────────────────────────────────
if [ ! -f "$DIR/.env" ]; then
    log_warn ".env file not found. Generating with secure random cryptographic secrets..."
    
    JWT_SECRET=$("$PYTHON_CMD" -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32 2>/dev/null || echo "8f9a2b4c6e1d3f5a7b9c0e2d4f6a8b0c2e4f6a8b0c2e4f6a8b0c2e4f6a8b0c2e")
    WEBHOOK_SECRET=$("$PYTHON_CMD" -c "import secrets; print(secrets.token_hex(16))" 2>/dev/null || openssl rand -hex 16 2>/dev/null || echo "4f6a8b0c2e4f6a8b0c2e4f6a8b0c2e4f")

    if [ -f "$DIR/.env.example" ]; then
        sed -e "s/your_secure_random_jwt_secret_key_here/$JWT_SECRET/g" \
            -e "s/your_gmail_webhook_secret_here/$WEBHOOK_SECRET/g" \
            "$DIR/.env.example" > "$DIR/.env"
    else
        cat <<EOF > "$DIR/.env"
ENVIRONMENT=development
JWT_SECRET_KEY=$JWT_SECRET
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GMAIL_WEBHOOK_SECRET=$WEBHOOK_SECRET
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000
PORT=8000
EOF
    fi
    log_success "Created .env with secure random JWT_SECRET_KEY and GMAIL_WEBHOOK_SECRET."
else
    log_success "Environment configuration (.env) verified."
fi

# ── 5. PRE-FLIGHT: PYTHON DEPENDENCIES ────────────────────────────────────────
log_info "Verifying Python dependencies..."
if ! "$PYTHON_CMD" -c "import fastapi, uvicorn, pydantic, jwt, bcrypt, dotenv" 2>/dev/null; then
    log_warn "Missing Python dependencies. Installing from requirements.txt..."
    if [ -f "$DIR/requirements.txt" ]; then
        "$PYTHON_CMD" -m pip install -r "$DIR/requirements.txt"
    else
        "$PYTHON_CMD" -m pip install fastapi "uvicorn[standard]" pydantic pyjwt bcrypt python-dotenv httpx pytest
    fi
    log_success "Python dependencies installed."
else
    log_success "Python dependencies verified."
fi

# ── 6. PRE-FLIGHT: FRONTEND NODE_MODULES ──────────────────────────────────────
if [ ! -d "$DIR/node_modules" ]; then
    log_info "Frontend node_modules missing. Running npm install..."
    npm install
    log_success "Frontend dependencies installed."
else
    log_success "Frontend node_modules verified."
fi

# ── 7. FRONTEND BUILD (FOR SINGLE-PORT SERVING) ───────────────────────────────
if [ "$DEV_MODE" = false ]; then
    if [ "$FORCE_BUILD" = true ] || [ ! -f "$DIR/dist/index.html" ]; then
        log_info "Building production frontend bundle (npm run build)..."
        npm run build
        log_success "Frontend production build complete."
    else
        log_success "Frontend production bundle (dist/) verified."
    fi
fi

# ── 8. START APPLICATION ──────────────────────────────────────────────────────
TARGET_URL="http://localhost:8000"
if [ "$DEV_MODE" = true ]; then
    TARGET_URL="http://localhost:5173"
fi

echo -e "\n${CYAN}--------------------------------------------------------------------${RESET}"
if [ "$DEV_MODE" = true ]; then
    echo -e ">> Application URL: ${GREEN}$TARGET_URL${RESET} ${YELLOW}(Vite HMR Dev)${RESET}"
else
    echo -e ">> Application URL: ${GREEN}$TARGET_URL${RESET} ${CYAN}(Single-Port Unified App)${RESET}"
fi
echo -e ">> REST API Base:   ${CYAN}http://localhost:8000/api${RESET}"
echo -e ">> Swagger Docs:    \033[35;1mhttp://localhost:8000/docs${RESET}"
echo -e ">> Press ${YELLOW}Ctrl+C${RESET} to stop the application."
echo -e "${CYAN}--------------------------------------------------------------------${RESET}\n"

# Background browser opener
open_browser() {
    local url="$1"
    (
        sleep 2
        if [ "$(uname)" = "Darwin" ]; then
            open "$url" >/dev/null 2>&1 || true
        elif command -v xdg-open >/dev/null 2>&1; then
            xdg-open "$url" >/dev/null 2>&1 || true
        elif command -v wslview >/dev/null 2>&1; then
            wslview "$url" >/dev/null 2>&1 || true
        fi
    ) &
}

if [ "$NO_BROWSER" = false ]; then
    open_browser "$TARGET_URL"
fi

if [ "$DEV_MODE" = true ]; then
    # Run FastAPI and Vite concurrently
    cleanup() {
        echo -e "\n${YELLOW}Shutting down development servers...${RESET}"
        kill $(jobs -p) 2>/dev/null || true
        wait 2>/dev/null || true
        echo -e "${GREEN}Servers stopped. Goodbye!${RESET}"
        exit 0
    }
    trap cleanup SIGINT SIGTERM EXIT

    "$PYTHON_CMD" "$DIR/backend/main.py" &
    npm run dev &
    wait
else
    # Single-port mode: FastAPI serves both frontend and API
    exec "$PYTHON_CMD" "$DIR/backend/main.py"
fi
