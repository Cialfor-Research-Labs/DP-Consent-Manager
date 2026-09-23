import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#475569"))
            self.drawString(54, letter[1] - 36, "DPDP ACT 2023: DATA PRINCIPAL CONSENT MANAGER")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#94A3B8"))
            self.drawRightString(letter[0] - 54, letter[1] - 36, "System Architecture & Workflow Specification")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)

        # Footer (all pages)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(54, 32, "Confidential — Architectural & Technical Reference Document")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 32, page_str)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 44, letter[0] - 54, 44)
        
        self.restoreState()

def build_pdf(filename="DPDP_Consent_Manager_Architecture_and_Workflow.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor("#0F172A")    # Slate 900
    brand_blue = colors.HexColor("#2563EB")       # Blue 600
    brand_indigo = colors.HexColor("#4F46E5")     # Indigo 600
    text_dark = colors.HexColor("#1E293B")        # Slate 800
    text_muted = colors.HexColor("#475569")       # Slate 600
    bg_light = colors.HexColor("#F8FAFC")         # Slate 50
    border_color = colors.HexColor("#E2E8F0")     # Slate 200
    accent_green = colors.HexColor("#059669")     # Emerald 600
    accent_amber = colors.HexColor("#D97706")     # Amber 600

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=primary_color,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=brand_indigo,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=brand_blue,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=text_dark,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=text_dark,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    callout_text = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=text_dark
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=text_dark
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=text_dark
    )

    story = []

    # ─────────────────────────────────────────────────────────────────────────
    # COVER / HEADER BANNER
    # ─────────────────────────────────────────────────────────────────────────
    badge_data = [
        [
            Paragraph("<font color='#2563EB'><b>REGULATORY FRAMEWORK:</b></font> Digital Personal Data Protection (DPDP) Act, 2023 (India)", ParagraphStyle('Badge', fontName='Helvetica', fontSize=8, textColor=text_muted)),
            Paragraph("<b>VERSION:</b> 1.5.0 Architecture Spec", ParagraphStyle('BadgeR', fontName='Helvetica', fontSize=8, alignment=2, textColor=text_muted))
        ]
    ]
    badge_table = Table(badge_data, colWidths=[340, 164])
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_light),
        ('BOX', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("DPDP Data Principal Consent Manager", title_style))
    story.append(Paragraph("End-to-End Architecture, Workflow Specification & Modernization Strategy", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=brand_indigo, spaceBefore=0, spaceAfter=12))

    # ─────────────────────────────────────────────────────────────────────────
    # 1. EXECUTIVE SUMMARY & OBJECTIVES
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("1. Executive Summary & Core Objectives", h1_style))
    story.append(Paragraph(
        "The <b>Data Principal Consent Manager</b> is a privacy-first, enterprise-grade consent orchestration system "
        "designed in strict alignment with India's <b>Digital Personal Data Protection (DPDP) Act, 2023</b>. "
        "It empowers citizens (<b>Data Principals</b>) to exercise complete sovereignty over their personal data while providing "
        "enterprises and institutions (<b>Data Fiduciaries</b>) with a legally compliant, audit-verifiable channel for requesting, "
        "tracking, and managing personal data processing consents.",
        body_style
    ))
    story.append(Paragraph(
        "The system solves the critical operational friction of modern data governance: converting unstructured enterprise "
        "privacy communications (such as onboarding consent notices and vendor data requests) into structured, granular, "
        "and cryptographically provable consent artifacts with instant lifecycle revocation.",
        body_style
    ))

    # Core Pillars Table
    pillars_data = [
        [
            Paragraph("<b>Pillar</b>", table_header),
            Paragraph("<b>DPDP Statutory Section</b>", table_header),
            Paragraph("<b>Functional Implementation</b>", table_header)
        ],
        [
            Paragraph("<b>Informed & Granular Consent</b>", table_cell_bold),
            Paragraph("Section 6(1) & 6(2)", table_cell),
            Paragraph("Unbundled attribute selection; granular opt-in/opt-out per purpose.", table_cell)
        ],
        [
            Paragraph("<b>Multilingual Transparency</b>", table_cell_bold),
            Paragraph("Section 5(3) (8th Schedule)", table_cell),
            Paragraph("Dynamic UI & notice translation into English + 22 official Indic languages.", table_cell)
        ],
        [
            Paragraph("<b>Ease of Revocation</b>", table_cell_bold),
            Paragraph("Section 6(4)", table_cell),
            Paragraph("One-click revocation with statutory reason capture and automated Fiduciary notice.", table_cell)
        ],
        [
            Paragraph("<b>Data Subject Rights (DSR)</b>", table_cell_bold),
            Paragraph("Sections 11, 12, 13", table_cell),
            Paragraph("Right to Access Summary, Right to Correction/Erasure, and DPO Grievance Redressal.", table_cell)
        ],
        [
            Paragraph("<b>Statutory Nomination</b>", table_cell_bold),
            Paragraph("Section 14", table_cell),
            Paragraph("Designation of legal nominees to exercise rights in case of death or incapacity.", table_cell)
        ],
        [
            Paragraph("<b>Tamper-Evident Integrity</b>", table_cell_bold),
            Paragraph("Section 8 (Data Security)", table_cell),
            Paragraph("SHA-256 digital cryptographic hash receipts for every consent decision and audit trail.", table_cell)
        ]
    ]
    t_pillars = Table(pillars_data, colWidths=[120, 110, 274])
    t_pillars.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_pillars)
    story.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # 2. CURRENT SYSTEM ARCHITECTURE & TECH STACK
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("2. Current System Architecture & Technology Stack", h1_style))
    story.append(Paragraph(
        "The current implementation uses a decoupled, hybrid architecture spanning browser clients, a Python FastAPI core, "
        "an embedded SQLite datastore, and a Google Apps Script Gmail automation layer.",
        body_style
    ))

    stack_data = [
        [Paragraph("<b>Component / Layer</b>", table_header), Paragraph("<b>Current Technology Stack</b>", table_header), Paragraph("<b>Key Responsibilities</b>", table_header)],
        [
            Paragraph("<b>Frontend Web Application</b>", table_cell_bold),
            Paragraph("React 19, Vite, Lucide Icons, Vanilla CSS Design System", table_cell),
            Paragraph("Consent Decision Hub, Principal Dashboard, Fiduciary Management Portal, DSR Views, 22 Indic Languages i18n.", table_cell)
        ],
        [
            Paragraph("<b>Backend REST API</b>", table_cell_bold),
            Paragraph("Python 3.12, FastAPI, Uvicorn, Pydantic v2", table_cell),
            Paragraph("RESTful endpoints, JWT auth, RBAC (Principal/Fiduciary/Admin), Webhook ingestion, dynamic hydration, audit logging.", table_cell)
        ],
        [
            Paragraph("<b>Authentication & Security</b>", table_cell_bold),
            Paragraph("PyJWT (HS256), Passlib / Bcrypt, HMAC SHA-256", table_cell),
            Paragraph("Bearer token verification, password strength validator, webhook shared secret verification, receipt hashing.", table_cell)
        ],
        [
            Paragraph("<b>Database & Storage</b>", table_cell_bold),
            Paragraph("SQLite 3 with Write-Ahead Logging (WAL Mode)", table_cell),
            Paragraph("10 relational tables (data_principals, consent_requests, consents, decisions, audit_events, nominees, dsr, notifications).", table_cell)
        ],
        [
            Paragraph("<b>Email Ingestion & Bridge</b>", table_cell_bold),
            Paragraph("Google Apps Script (V8 Runtime, GmailApp API)", table_cell),
            Paragraph("Searches inbox for consent keywords every 5 minutes, pushes candidates to FastAPI, dispatches notifications.", table_cell)
        ],
        [
            Paragraph("<b>Context & Intent Engine</b>", table_cell_bold),
            Paragraph("Python Heuristic NLP (`consent_intent_detector.py`)", table_cell),
            Paragraph("Weighted scoring (Threshold 6), anti-loop system receipt filter, domain & attribute auto-extraction.", table_cell)
        ],
        [
            Paragraph("<b>Tunneling / Gateway</b>", table_cell_bold),
            Paragraph("Cloudflare Quick Tunnel (`trycloudflare.com`)", table_cell),
            Paragraph("Exposes local FastAPI backend port to Google Apps Script webhooks during development/testing.", table_cell)
        ]
    ]
    t_stack = Table(stack_data, colWidths=[110, 135, 259])
    t_stack.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), brand_indigo),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_stack)
    story.append(Spacer(1, 10))

    # Architecture ASCII Diagram Box
    diag_text = """
+---------------------------------------------------------------------------------------------------+
|                                 HIGH-LEVEL ARCHITECTURE TOPOLOGY                                 |
+---------------------------------------------------------------------------------------------------+
|  [External Sender / Data Fiduciary]                                                               |
|        | (Statutory Consent Email)                                                                |
|        v                                                                                          |
|  [Google Gmail Inbox] <==== (5-Min Poll) ====> [Google Apps Script Engine (gmail_sync.gs)]        |
|                                                              |                                    |
|                                                (POST Webhook + HMAC Secret)                       |
|                                                              v                                    |
|  [React 19 Frontend UI] <===============> [FastAPI Application Core (backend/main.py)]            |
|   - Decision Hub (Granular Opt-In)                 |-- [Intent Detector & Attribute Extractor]    |
|   - Principal & Fiduciary Dashboards               |-- [RBAC & Auth Engine (JWT / Bcrypt)]        |
|   - DSR, Grievance & Nominee Modals                |-- [Receipt Generator (SHA-256 Hashing)]      |
|   - 22 Indic Languages (translations.js)           |-- [SQLite Engine (10 Relational Tables)]     |
+---------------------------------------------------------------------------------------------------+
"""
    diag_table = Table([[Paragraph(f"<font name='Courier' size='7' color='#0F172A'><pre>{diag_text.strip()}</pre></font>", body_style)]], colWidths=[504])
    diag_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#94A3B8")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(diag_table)
    
    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # 3. END-TO-END WORKFLOW (STEP-BY-STEP)
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("3. End-to-End Operational Workflow", h1_style))
    story.append(Paragraph(
        "The lifecycle of a consent transaction progresses through eight distinct stages from email arrival to tamper-evident audit finality.",
        body_style
    ))

    workflow_steps = [
        ("Step 1: Email Receipt & Candidate Discovery",
         "A Data Fiduciary (e.g., Bank, University, Hospital) sends a data processing notice to the user's email address. "
         "Google Apps Script polls the inbox at regular intervals using targeted search operators (`subject:Consent`, `subject:Privacy`, `subject:DPDP`, etc.)."),
        
        ("Step 2: Security Filtering & Webhook Ingestion",
         "Apps Script verifies that the email is not an internal system receipt (preventing infinite auto-reply loops) and dispatches "
         "a secure HTTP POST request with an HMAC `X-Webhook-Secret` to the FastAPI endpoint (`/api/gmail-webhook`)."),
        
        ("Step 3: Intent Classification & Attribute Extraction",
         "FastAPI runs `consent_intent_detector.py` to evaluate linguistic signals (weights, penalties, confidence scores). "
         "If classified as `CONSENT_REQUEST`, the engine dynamically identifies the business domain (Banking, Education, Healthcare, Corporate), "
         "the purpose, and unbundles requested personal data attributes (e.g., PAN, Bank Account, Academic Transcript, Geolocation)."),
        
        ("Step 4: Token Generation & Consent Request Provisioning",
         "A unique, unpredictable cryptographic token (`tok_...`) and statutory Notice ID (`NTC-2026-XXXX`) are generated. "
         "The request is stored in SQLite under `PENDING` status, linked to the normalized `DataPrincipal` entity."),
        
        ("Step 5: User Notification & Decision Portal Access",
         "Apps Script sends an automated statutory alert to the Data Principal containing a secure review link (`/request/tok_...`). "
         "The user opens the link in the web browser."),
        
        ("Step 6: Authenticated Granular Review & Decision Execution",
         "The Data Principal logs in with their credentials. The system strictly verifies that the authenticated user's email matches the "
         "recipient on the consent notice. The user reviews the purpose, fiduciary identity, and selectively toggles optional attributes before clicking 'Grant Consent' or 'Deny Consent'."),
        
        ("Step 7: SHA-256 Receipt Generation & Immutable Audit Logging",
         "Upon granting, the backend computes a cryptographic SHA-256 hash over the canonical JSON payload (fiduciary, purpose, granted attributes, timestamp, notice ID). "
         "An active `consents` record and a tamper-evident `audit_events` entry are written to the database."),
        
        ("Step 8: Outbox Queueing & Same-Thread Fiduciary Reply",
         "A formal legal confirmation containing the digital receipt hash is queued in `fiduciary_notifications`. "
         "The synchronization worker dispatches a threaded reply directly back to the Fiduciary's email thread.")
    ]

    for title, desc in workflow_steps:
        step_box = [
            [Paragraph(f"<b>{title}</b>", ParagraphStyle('StepTitle', fontName='Helvetica-Bold', fontSize=9, textColor=brand_blue))],
            [Paragraph(desc, body_style)]
        ]
        t_step = Table(step_box, colWidths=[504])
        t_step.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), bg_light),
            ('BOX', (0,0), (-1,-1), 0.5, border_color),
            ('PADDING', (0,0), (-1,-1), 5),
            ('LINELEFT', (0,0), (0,-1), 3, brand_indigo),
        ]))
        story.append(t_step)
        story.append(Spacer(1, 4))

    story.append(Spacer(1, 6))

    # ─────────────────────────────────────────────────────────────────────────
    # 4. CRITICAL ANALYSIS: CURRENT STATE VS. PRODUCTION STATE
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("4. Architectural Gap Analysis: Current State vs. Production State", h1_style))
    story.append(Paragraph(
        "A rigorous audit of the current prototype reveals specific technical and operational bottlenecks. "
        "Below is a comparative breakdown of where the project stands today and how it should be upgraded.",
        body_style
    ))

    comp_data = [
        [
            Paragraph("<b>Architectural Dimension</b>", table_header),
            Paragraph("<b>Current Prototype State</b>", table_header),
            Paragraph("<b>Identified Bottleneck / Risk</b>", table_header),
            Paragraph("<b>Target Production Solution</b>", table_header)
        ],
        [
            Paragraph("<b>Inbound Email Ingestion</b>", table_cell_bold),
            Paragraph("Google Apps Script polling inbox every 5 min.", table_cell),
            Paragraph("5-min delay; bound to single personal Gmail account; quota limits.", table_cell),
            Paragraph("<b>Gmail API / PubSub Push Webhooks</b> or dedicated inbound email parse (SendGrid/Postmark).", table_cell)
        ],
        [
            Paragraph("<b>Outbound Email Dispatch</b>", table_cell_bold),
            Paragraph("Queued in DB; Apps Script polls and sends replies.", table_cell),
            Paragraph("Reply delayed up to 5 min; failure if Apps Script execution stops.", table_cell),
            Paragraph("<b>Direct Async SMTP</b> (`smtplib` + Gmail App Password) or <b>Resend API</b> on decision trigger.", table_cell)
        ],
        [
            Paragraph("<b>Network & Gateway</b>", table_cell_bold),
            Paragraph("Cloudflare Quick Tunnel (`trycloudflare.com`).", table_cell),
            Paragraph("Ephemeral URLs change on every restart; breaks Apps Script config.", table_cell),
            Paragraph("<b>Fixed Custom Domain with TLS</b> or <b>Ngrok / Cloudflare Named Tunnel</b>.", table_cell)
        ],
        [
            Paragraph("<b>Identity Verification</b>", table_cell_bold),
            Paragraph("Checks email on JWT against consent request record.", table_cell),
            Paragraph("No OTP verification during registration; account takeover risk if unregistered.", table_cell),
            Paragraph("<b>Email OTP / Magic Link Verification</b> required before account activation.", table_cell)
        ],
        [
            Paragraph("<b>Notice Document Parsing</b>", table_cell_bold),
            Paragraph("Regex keyword scan of plain text email body only.", table_cell),
            Paragraph("Ignores statutory PDF attachments; fragile to non-standard legal wording.", table_cell),
            Paragraph("<b>PDF Text Extractor & OCR Parser</b> (`pypdf` / `pdfplumber` / lightweight LLM extractor).", table_cell)
        ],
        [
            Paragraph("<b>Consent Expiry Management</b>", table_cell_bold),
            Paragraph("Lazy evaluation (checked only when request is queried).", table_cell),
            Paragraph("Expired consents remain in active status indefinitely if never accessed.", table_cell),
            Paragraph("<b>Background Cron Daemon</b> (APScheduler / Celery) auto-expiring consents & alerting fiduciaries.", table_cell)
        ],
        [
            Paragraph("<b>DSR Statutory Execution</b>", table_cell_bold),
            Paragraph("Stores erasure/access requests in SQLite DB only.", table_cell),
            Paragraph("Fiduciary DPO is never automatically notified to execute data deletion.", table_cell),
            Paragraph("<b>Automated Statutory DSR Dispatch</b> to Fiduciary DPO with tracking ticket & SLA timer.", table_cell)
        ],
        [
            Paragraph("<b>Statutory DPDP Safeguards</b>", table_cell_bold),
            Paragraph("Standard consent flow for all users.", table_cell),
            Paragraph("Missing minor/child consent flow (Sec 9) and DPBI grievance escalation (Sec 13).", table_cell),
            Paragraph("<b>Verifiable Parental Consent Module</b> & <b>DPBI Appellate Escalation Workflow</b>.", table_cell)
        ]
    ]
    t_comp = Table(comp_data, colWidths=[90, 115, 135, 164])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_comp)

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # 5. RECOMMENDED MODERNIZATION ROADMAP (ZERO-COST / OPEN SOURCE)
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("5. Step-by-Step Modernization Roadmap (100% Free / Open Source)", h1_style))
    story.append(Paragraph(
        "To elevate the current project from a demonstration prototype to an industrial-strength, production-ready system "
        "<b>without incurring any software licensing or infrastructure costs</b>, the following 5-phase upgrade roadmap is recommended:",
        body_style
    ))

    roadmap_phases = [
        ("Phase 1: Real-Time Zero-Cost Email Dispatch (FastAPI Native)",
         "Eliminate the 5-minute outbox polling lag. Integrate Python's built-in <code>smtplib</code> using a free Google <b>Gmail App Password</b> "
         "or <b>Resend Free API</b> (3,000 free emails/month). Whenever a Data Principal clicks 'Grant' or 'Revoke', FastAPI immediately dispatches "
         "the formatted SHA-256 consent receipt directly to both the user and the Data Fiduciary."),
        
        ("Phase 2: Stable Free Gateway & Persistent Webhooks",
         "Replace temporary <code>trycloudflare.com</code> quick tunnels with a <b>Free Cloudflare Named Tunnel</b> or <b>Ngrok Free Static Domain</b>. "
         "This establishes a permanent, immutable webhook URL (e.g., <code>https://consent.your-static-domain.com/api/gmail-webhook</code>) so you never "
         "have to manually update script properties."),
        
        ("Phase 3: Registration Identity Verification (OTP via Email)",
         "Close the account-takeover vulnerability. Update <code>/api/auth/register</code> to generate a cryptographically secure 6-digit numeric OTP "
         "stored in cache with a 5-minute TTL. The user must verify the OTP sent to their email before their <code>users</code> and <code>data_principals</code> "
         "records are activated."),
        
        ("Phase 4: Statutory Attachment Parser (PDF & Documents)",
         "Enhance the intent detector with <code>pypdf</code> or <code>pdfplumber</code> (free Python libraries). When an incoming email has an attached PDF "
         "(e.g., <i>Statutory_Privacy_Notice.pdf</i>), extract text directly from the document streams to identify unbundled data attributes and purposes "
         "even if the email body is sparse."),
        
        ("Phase 5: Automated Expiry Scheduler & DPBI Escalation",
         "Add a lightweight background worker (using FastAPI's <code>asyncio</code> background tasks or <code>APScheduler</code>) that checks consent validity dates "
         "daily, automatically marks expired consents, and sends warning notifications 7 days prior. Add a formal 'Escalate to DPBI' button for DSR grievances "
         "unresolved after 30 days.")
    ]

    for title, desc in roadmap_phases:
        r_box = [
            [Paragraph(f"<b>{title}</b>", ParagraphStyle('RTitle', fontName='Helvetica-Bold', fontSize=9, textColor=accent_green))],
            [Paragraph(desc, body_style)]
        ]
        t_r = Table(r_box, colWidths=[504])
        t_r.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), bg_light),
            ('BOX', (0,0), (-1,-1), 0.5, border_color),
            ('PADDING', (0,0), (-1,-1), 5),
            ('LINELEFT', (0,0), (0,-1), 3, accent_green),
        ]))
        story.append(t_r)
        story.append(Spacer(1, 4))

    story.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # 6. CONCLUSION & SPECIFICATION SIGN-OFF
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("6. Architectural Summary & Conclusion", h1_style))
    story.append(Paragraph(
        "The DPDP Data Principal Consent Manager has a robust functional core, featuring granular opt-in consent controls, "
        "statutory DSR support, comprehensive 22 Indic language localization, and cryptographic SHA-256 receipt verification. "
        "By replacing ephemeral tunnels with persistent endpoints, adding registration OTP verification, and transitioning outbound email "
        "dispatch to real-time asynchronous SMTP/Resend, the platform achieves complete enterprise compliance and operational stability.",
        body_style
    ))

    # Signoff block
    signoff_data = [
        [
            Paragraph("<b>Document Status:</b> Verified Technical Architecture Specification", table_cell),
            Paragraph("<b>Target Compliance:</b> DPDP Act 2023 / MeitY Guidelines", ParagraphStyle('SO', fontName='Helvetica', fontSize=8, alignment=2, textColor=text_muted))
        ]
    ]
    t_signoff = Table(signoff_data, colWidths=[252, 252])
    t_signoff.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(Spacer(1, 8))
    story.append(t_signoff)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] PDF generated at: {os.path.abspath(filename)}")

if __name__ == "__main__":
    output_pdf = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "DPDP_Consent_Manager_Architecture_and_Workflow.pdf"))
    if len(sys.argv) > 1:
        output_pdf = sys.argv[1]
    build_pdf(output_pdf)
