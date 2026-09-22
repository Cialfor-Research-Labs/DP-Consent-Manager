<#
.SYNOPSIS
    Data Principal Consent Manager — Universal Application Launcher (PowerShell)
    Cross-platform startup script for Windows, macOS, and Linux (PowerShell 5.1+ / pwsh 7+).

.DESCRIPTION
    Performs all pre-flight environment checks:
    1. Detects Python 3.9+ (python3 or python) and Node.js/npm.
    2. Initializes .env with secure random cryptographic secrets if missing.
    3. Checks and installs Python dependencies from requirements.txt.
    4. Checks and installs frontend dependencies (npm install).
    5. Builds the production frontend bundle (npm run build).
    6. Starts the application seamlessly and launches the browser.

.PARAMETER Dev
    Starts in development mode: runs Vite dev server (port 5173 with HMR)
    and FastAPI backend (port 8000) concurrently.

.PARAMETER Build
    Forces a fresh rebuild of the frontend bundle before starting.

.PARAMETER NoBrowser
    Suppresses automatic browser launch.

.EXAMPLE
    .\start-all.ps1
    Starts the unified single-port application at http://localhost:8000

.EXAMPLE
    .\start-all.ps1 -Dev
    Starts development mode (Vite 5173 + FastAPI 8000)
#>

[CmdletBinding()]
param(
    [switch]$Dev,
    [switch]$Build,
    [switch]$NoBrowser
)

# Set error action and strict location to project root
$ErrorActionPreference = "Stop"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
Set-Location -Path $PSScriptRoot

$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"
$DistDir = Join-Path $ProjectRoot "dist"
$DistIndex = Join-Path $DistDir "index.html"
$EnvFile = Join-Path $ProjectRoot ".env"
$EnvExample = Join-Path $ProjectRoot ".env.example"
$RequirementsFile = Join-Path $ProjectRoot "requirements.txt"
$NodeModules = Join-Path $ProjectRoot "node_modules"

# Helper output functions with color
function Write-Info([string]$Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success([string]$Message) {
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-WarnMsg([string]$Message) {
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-ErrMsg([string]$Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Open-BrowserUrl([string]$Url) {
    try {
        if ($IsMacOS) {
            Start-Process "open" $Url
        } elseif ($IsLinux) {
            Start-Process "xdg-open" $Url
        } else {
            Start-Process $Url
        }
    } catch {
        # Fallback if system default handler is unavailable
    }
}

# ── 1. DISPLAY BANNER ────────────────────────────────────────────────────────
Clear-Host -ErrorAction SilentlyContinue
Write-Host "====================================================================" -ForegroundColor DarkCyan
Write-Host "  [*] DATA PRINCIPAL CONSENT MANAGER (DPDP ACT 2023)" -ForegroundColor Cyan
$ModeLabel = if ($Dev) { "Development Mode (Vite 5173 + FastAPI 8000)" } else { "Single-Port Unified Mode (Port 8000)" }
Write-Host "  Mode: $ModeLabel" -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor DarkCyan
Write-Host ""

# ── 2. PRE-FLIGHT: PYTHON DETECTION ──────────────────────────────────────────
Write-Info "Checking Python environment..."
$PythonCmd = $null
if (Get-Command python3 -ErrorAction SilentlyContinue) {
    $PythonCmd = "python3"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $PythonCmd = "python"
} else {
    Write-ErrMsg "Python 3 is required but not found in PATH."
    Write-ErrMsg "Please install Python 3.9+ from https://www.python.org/downloads/"
    exit 1
}

$PyVersionOutput = (& $PythonCmd -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')" 2>&1).Trim()
& $PythonCmd -c "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)" 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-ErrMsg "Python 3.9 or higher is required. Detected Python $PyVersionOutput"
    exit 1
}
Write-Success "Python $PyVersionOutput detected ($PythonCmd)"

# ── 3. PRE-FLIGHT: NODE.JS & NPM DETECTION ───────────────────────────────────
Write-Info "Checking Node.js & npm..."
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-ErrMsg "Node.js is required to build and run the frontend."
    Write-ErrMsg "Please install Node.js (v18+ recommended) from https://nodejs.org/"
    exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-ErrMsg "npm package manager is required but not found in PATH."
    exit 1
}

$NodeVer = (node -v).Trim()
$NpmVer = (npm -v).Trim()
Write-Success "Node.js $NodeVer | npm $NpmVer detected."

# ── 4. PRE-FLIGHT: .ENV CONFIGURATION ─────────────────────────────────────────
if (-not (Test-Path $EnvFile)) {
    Write-WarnMsg ".env file not found. Initializing with secure random cryptographic secrets..."

    # Generate 256-bit (32-byte) hex string for JWT secret
    $JwtBytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($JwtBytes)
    $JwtSecret = [System.BitConverter]::ToString($JwtBytes).Replace("-", "").ToLower()

    # Generate 128-bit (16-byte) hex string for webhook secret
    $WebhookBytes = New-Object byte[] 16
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($WebhookBytes)
    $WebhookSecret = [System.BitConverter]::ToString($WebhookBytes).Replace("-", "").ToLower()

    if (Test-Path $EnvExample) {
        $TemplateContent = Get-Content -Path $EnvExample -Raw -Encoding utf8
        $EnvContent = $TemplateContent.Replace("your_secure_random_jwt_secret_key_here", $JwtSecret)
        $EnvContent = $EnvContent.Replace("your_gmail_webhook_secret_here", $WebhookSecret)
    } else {
        $EnvContent = @"
# Data Principal Consent Manager - Environment Variables
ENVIRONMENT=development
JWT_SECRET_KEY=$JwtSecret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GMAIL_WEBHOOK_SECRET=$WebhookSecret
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000
PORT=8000
"@
    }

    Set-Content -Path $EnvFile -Value $EnvContent -Encoding utf8
    Write-Success "Created .env with secure random JWT_SECRET_KEY and GMAIL_WEBHOOK_SECRET."
} else {
    Write-Success "Environment configuration (.env) verified."
}

# ── 5. PRE-FLIGHT: PYTHON DEPENDENCIES ────────────────────────────────────────
Write-Info "Verifying Python dependencies..."
$PyCheckScript = "import fastapi, uvicorn, pydantic, jwt, bcrypt, dotenv"
& $PythonCmd -c $PyCheckScript 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-WarnMsg "Missing Python dependencies. Installing from requirements.txt..."
    if (Test-Path $RequirementsFile) {
        & $PythonCmd -m pip install -r $RequirementsFile
    } else {
        & $PythonCmd -m pip install fastapi "uvicorn[standard]" pydantic pyjwt bcrypt python-dotenv httpx pytest
    }
    if ($LASTEXITCODE -ne 0) {
        Write-ErrMsg "Failed to install Python dependencies. Please run: pip install -r requirements.txt"
        exit 1
    }
    Write-Success "Python dependencies installed."
} else {
    Write-Success "Python dependencies verified."
}

# ── 6. PRE-FLIGHT: FRONTEND NODE_MODULES ──────────────────────────────────────
if (-not (Test-Path $NodeModules)) {
    Write-Info "Frontend node_modules missing. Running npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-ErrMsg "npm install failed. Please inspect errors above."
        exit 1
    }
    Write-Success "Frontend dependencies installed."
} else {
    Write-Success "Frontend node_modules verified."
}

# ── 7. FRONTEND BUILD (FOR SINGLE-PORT SERVING) ───────────────────────────────
if (-not $Dev) {
    if ($Build -or (-not (Test-Path $DistIndex))) {
        Write-Info "Building production frontend bundle (npm run build)..."
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-ErrMsg "Frontend build failed. Please inspect build output above."
            exit 1
        }
        Write-Success "Frontend production build complete."
    } else {
        Write-Success "Frontend production bundle (dist/) verified."
    }
}

# ── 8. START APPLICATION ──────────────────────────────────────────────────────
$TargetUrl = if ($Dev) { "http://localhost:5173" } else { "http://localhost:8000" }

Write-Host ""
Write-Host "--------------------------------------------------------------------" -ForegroundColor DarkCyan
$ModeDesc = if ($Dev) { " (Vite HMR Dev)" } else { " (Single-Port Unified App)" }
Write-Host ">> Application URL: $TargetUrl$ModeDesc" -ForegroundColor Green
Write-Host ">> REST API Base:   http://localhost:8000/api" -ForegroundColor Cyan
Write-Host ">> Swagger Docs:    http://localhost:8000/docs" -ForegroundColor Magenta
Write-Host ">> Press Ctrl+C to stop the application." -ForegroundColor Yellow
Write-Host "--------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ""

# Background browser launcher
if (-not $NoBrowser) {
    [System.Threading.Tasks.Task]::Run([Action]{
        Start-Sleep -Seconds 2
        try {
            if ($IsMacOS) {
                Start-Process "open" $TargetUrl
            } elseif ($IsLinux) {
                Start-Process "xdg-open" $TargetUrl
            } else {
                Start-Process $TargetUrl
            }
        } catch {}
    }) | Out-Null
}

$MainPy = Join-Path $BackendDir "main.py"

if ($Dev) {
    # Run FastAPI and Vite concurrently in Dev Mode
    $BackendProcess = Start-Process -FilePath $PythonCmd -ArgumentList @($MainPy) -WorkingDirectory $ProjectRoot -PassThru
    $NpmCmd = if ($IsWindows -or ($env:OS -eq "Windows_NT")) { "npm.cmd" } else { "npm" }
    $FrontendProcess = Start-Process -FilePath $NpmCmd -ArgumentList @("run", "dev") -WorkingDirectory $ProjectRoot -PassThru

    try {
        # Keep parent script running and monitor child processes
        while (-not $BackendProcess.HasExited -and -not $FrontendProcess.HasExited) {
            Start-Sleep -Milliseconds 500
        }
    } finally {
        Write-Host "`nShutting down development servers..." -ForegroundColor Yellow
        if (-not $BackendProcess.HasExited) { Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue }
        if (-not $FrontendProcess.HasExited) { Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue }
        Write-Host "Servers stopped. Goodbye!" -ForegroundColor Green
    }
} else {
    # Single-Port Unified Mode: FastAPI serves both React UI and REST API
    try {
        & $PythonCmd $MainPy
    } finally {
        Write-Host "`nServer stopped. Goodbye!" -ForegroundColor Green
    }
}
