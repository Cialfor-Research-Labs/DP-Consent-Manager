"""
email_service.py — Resend Transactional Email Integration
Data Principal Consent Manager - DPDP Act 2023

Sends beautifully formatted consent invite emails to Data Principals
using the Resend API (https://resend.com).

If RESEND_API_KEY is not configured, falls back to console logging
so the system works fully in local/dev environments without a real key.
"""

import os
import json
import logging
import urllib.request
import urllib.error
from datetime import datetime
from dotenv import load_dotenv

import socket

logger = logging.getLogger(__name__)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(ROOT_DIR, ".env")


def _detect_host_base_url() -> str:
    env_base = (os.getenv("APP_BASE_URL") or "").strip().rstrip("/")
    if env_base and not ("localhost" in env_base or "127.0.0.1" in env_base):
        return env_base
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        host_ip = s.getsockname()[0]
        s.close()
        if host_ip and host_ip != "127.0.0.1":
            port = os.getenv("PORT", "8000")
            return f"http://{host_ip}:{port}"
    except Exception:
        pass
    return env_base or f"http://localhost:{os.getenv('PORT', '8000')}"


def _get_resend_config():
    """Lazily reads email & Resend config from environment (always reflects current .env without mutating global os.environ)."""
    env_file_vars = {}
    if os.path.exists(ENV_FILE):
        try:
            from dotenv import dotenv_values
            env_file_vars = dotenv_values(ENV_FILE) or {}
        except Exception:
            pass

    def get_val(key, default=""):
        return os.environ.get(key) if key in os.environ else (env_file_vars.get(key) or default)

    return {
        "api_key": get_val("RESEND_API_KEY", ""),
        "from_email": get_val("RESEND_FROM_EMAIL", "onboarding@resend.dev"),
        "from_name": get_val("RESEND_FROM_NAME", "DPDP Consent Manager"),
        "app_base_url": _detect_host_base_url(),
        # Optional direct SMTP (e.g. Gmail App Password — bypasses domain verification requirement)
        "smtp_host": get_val("SMTP_HOST", "smtp.gmail.com"),
        "smtp_port": int(get_val("SMTP_PORT", "587")),
        "smtp_user": get_val("SMTP_USER") or get_val("GMAIL_USER", ""),
        "smtp_pass": get_val("SMTP_PASS") or get_val("GMAIL_APP_PASSWORD", ""),
    }


def _build_consent_email_html(
    to_name: str,
    fiduciary_name: str,
    purpose: str,
    consent_link: str,
    attributes: list,
    notice_id: str,
    expires_at: str = "",
) -> str:
    """Build a rich HTML email template for consent invitations."""

    attr_rows = ""
    for attr in attributes[:8]:  # cap at 8 for email brevity
        name = attr.get("name", "")
        category = attr.get("category", "")
        sensitive = attr.get("sensitive", False)
        required = attr.get("required", False)
        badge = ""
        if sensitive:
            badge += '<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;margin-left:4px;">🔒 Sensitive</span>'
        if required:
            badge += '<span style="background:#fef9c3;color:#b45309;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;margin-left:4px;">Required</span>'
        attr_rows += f"""
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;">
            {name}
            <span style="color:#9ca3af;font-size:12px;margin-left:6px;">{category}</span>
            {badge}
          </td>
        </tr>"""

    attr_section = f"""
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:20px 0;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">
            Requested Data Attributes
          </th>
        </tr>
      </thead>
      <tbody>{attr_rows}</tbody>
    </table>""" if attr_rows else ""

    expires_note = ""
    if expires_at:
        try:
            exp_dt = datetime.fromisoformat(expires_at.replace("Z", ""))
            expires_note = f'<p style="font-size:12px;color:#9ca3af;margin:0 0 16px;">This consent request expires on <strong>{exp_dt.strftime("%d %B %Y")}</strong>.</p>'
        except Exception:
            pass

    year = datetime.utcnow().year

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Consent Request — {fiduciary_name}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.7);text-transform:uppercase;">
              Digital Personal Data Protection Act 2023
            </p>
            <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;line-height:1.3;">
              🔐 Consent Request Notice
            </h1>
            <p style="margin:12px 0 0;font-size:14px;color:rgba(255,255,255,.8);">
              Notice ID: <code style="background:rgba(255,255,255,.15);padding:2px 8px;border-radius:4px;">{notice_id}</code>
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

            <p style="font-size:16px;color:#374151;margin:0 0 24px;">
              Dear <strong>{to_name}</strong>,
            </p>

            <p style="font-size:15px;color:#4b5563;margin:0 0 20px;line-height:1.7;">
              <strong style="color:#1f2937;">{fiduciary_name}</strong> is requesting your informed consent
              under the <strong>Digital Personal Data Protection (DPDP) Act 2023</strong> for the following purpose:
            </p>

            <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
              <p style="margin:0;font-size:15px;font-weight:600;color:#1e40af;">📋 {purpose}</p>
            </div>

            {attr_section}

            <p style="font-size:14px;color:#6b7280;margin:0 0 8px;line-height:1.7;">
              You have the right to <strong>grant or deny</strong> this request, or grant consent for
              only selected attributes. Your decision is fully revocable at any time under Section 6(4)
              of the DPDP Act.
            </p>

            {expires_note}

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);border-radius:10px;padding:0;">
                  <a href="{consent_link}"
                     style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:.3px;">
                    Review &amp; Respond to Consent Request →
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size:13px;color:#9ca3af;margin:0 0 4px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="font-size:12px;color:#6366f1;word-break:break-all;margin:0 0 32px;">
              {consent_link}
            </p>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;">

            <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">
              This is an automated notice generated by the DPDP Consent Manager system.
              If you believe you received this in error, please ignore it — no action will be taken without your explicit consent.
              For grievances, contact the Data Protection Officer at the fiduciary organisation.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              DPDP Consent Manager &copy; {year} &middot; Sections 6, 11, 12, 13 &amp; 14 Compliant
              &middot; Powered by <a href="https://resend.com" style="color:#6366f1;text-decoration:none;">Resend</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_consent_invite(
    to_email: str,
    to_name: str,
    fiduciary_name: str,
    consent_link: str,
    purpose: str,
    attributes: list,
    notice_id: str = "",
    expires_at: str = "",
) -> dict:
    """
    Send a consent invitation email to a Data Principal.

    Returns a dict with keys:
      - success (bool)
      - message (str)
      - email_id (str|None) — Resend email ID if sent via API
      - dev_mode (bool) — True if just logged to console
    """
    if not to_email:
        return {"success": False, "message": "No recipient email provided.", "dev_mode": False}

    # Read config lazily so it always reflects the current .env (even if imported before load_dotenv ran)
    cfg = _get_resend_config()
    api_key = cfg["api_key"]
    from_email = cfg["from_email"]
    from_name = cfg["from_name"]

    html_body = _build_consent_email_html(
        to_name=to_name or "Data Principal",
        fiduciary_name=fiduciary_name,
        purpose=purpose,
        consent_link=consent_link,
        attributes=attributes or [],
        notice_id=notice_id,
        expires_at=expires_at,
    )

    subject = f"[Action Required] Consent Request from {fiduciary_name} — DPDP Act 2023"

    smtp_user = str(cfg.get("smtp_user", "")).strip()
    smtp_pass = str(cfg.get("smtp_pass", "")).strip().replace(" ", "")
    smtp_host = cfg.get("smtp_host", "smtp.gmail.com")
    smtp_port = cfg.get("smtp_port", 587)

    # ── SMTP MODE: if Gmail / SMTP credentials provided ───────────────────────
    if smtp_user and smtp_pass:
        try:
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{smtp_user}>"
            msg["To"] = to_email
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [to_email], msg.as_string())

            logger.info("[EMAIL SERVICE] Consent invite sent via SMTP (%s). To=%s", smtp_host, to_email)
            return {
                "success": True,
                "message": f"Email sent successfully via SMTP ({smtp_user}) to {to_email}",
                "email_id": f"smtp-{int(datetime.utcnow().timestamp())}",
                "dev_mode": False,
            }
        except Exception as e:
            logger.error("[EMAIL SERVICE] SMTP send failed: %s", str(e))
            return {
                "success": False,
                "message": f"SMTP send failed: {str(e)}",
                "email_id": None,
                "dev_mode": False,
            }

    # ── DEV MODE: no API key configured and no SMTP ───────────────────────────
    if not api_key or api_key.startswith("re_YOUR") or api_key == "":
        logger.warning(
            "[EMAIL SERVICE] Neither RESEND_API_KEY nor SMTP configured — printing email to console (dev mode).\n"
            "  To: %s <%s>\n  Subject: %s\n  Consent Link: %s",
            to_name, to_email, subject, consent_link,
        )
        print("\n" + "=" * 72)
        print("[EMAIL SERVICE - DEV MODE] (would be sent via Resend/SMTP in production)")
        print("=" * 72)
        print(f"  To:      {to_name} <{to_email}>")
        print(f"  From:    {from_name} <{from_email}>")
        print(f"  Subject: {subject}")
        print(f"  Link:    {consent_link}")
        print("=" * 72 + "\n")
        return {"success": True, "message": "Dev mode — email printed to console.", "email_id": None, "dev_mode": True}

    # ── PRODUCTION MODE: send via Resend API ───────────────────────────────────
    payload = {
        "from": f"{from_name} <{from_email}>",
        "to": [to_email],
        "subject": subject,
        "html": html_body,
        "tags": [
            {"name": "type", "value": "consent-invite"},
            {"name": "notice_id", "value": notice_id or "unknown"},
        ],
    }

    try:
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "DPDP-Consent-Manager/1.0 Python/3",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            response_data = json.loads(resp.read().decode("utf-8"))
            email_id = response_data.get("id")
            logger.info("[EMAIL SERVICE] Consent invite sent via Resend. ID=%s To=%s", email_id, to_email)
            return {
                "success": True,
                "message": f"Email sent successfully via Resend. ID: {email_id}",
                "email_id": email_id,
                "dev_mode": False,
            }

    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        logger.error("[EMAIL SERVICE] Resend API HTTP error %s: %s", e.code, error_body)
        return {
            "success": False,
            "message": f"Resend API error {e.code}: {error_body}",
            "email_id": None,
            "dev_mode": False,
        }
    except Exception as e:
        logger.error("[EMAIL SERVICE] Failed to send email: %s", str(e))
        return {
            "success": False,
            "message": f"Email send failed: {str(e)}",
            "email_id": None,
            "dev_mode": False,
        }


def _build_password_reset_email_html(
    to_name: str,
    to_email: str,
    otp_code: str,
    reset_link: str,
    expires_in_minutes: int = 15,
) -> str:
    """Build a rich security-styled HTML email template for password reset."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - DPDP Consent Manager</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.08),0 8px 10px -6px rgba(0,0,0,0.03);max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                DPDP Consent Manager
              </div>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px;letter-spacing:0.5px;text-transform:uppercase;">
                Data Privacy &amp; Consent Management Platform
              </div>
            </td>
          </tr>

          <!-- Security Banner -->
          <tr>
            <td style="background:#f0fdf4;border-bottom:1px solid #bbf7d0;padding:12px 32px;text-align:center;">
              <span style="font-size:12px;font-weight:700;color:#15803d;letter-spacing:0.5px;">
                SECURITY NOTIFICATION - PASSWORD RESET REQUEST
              </span>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px 0;">
                Password Reset Verification
              </h2>
              <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 20px 0;">
                Hello <strong>{to_name or 'User'}</strong>,
              </p>
              <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 24px 0;">
                We received a request to reset the password for your account associated with <strong style="color:#0f172a;">{to_email}</strong>. Use the 6-digit verification code below to verify your identity and set a new password:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background:#f8fafc;border:2px dashed #0284c7;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
                <div style="font-size:11px;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                  Your Verification OTP Code
                </div>
                <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#0f172a;font-family:'Courier New',Courier,monospace;">
                  {otp_code}
                </div>
                <div style="font-size:12px;color:#64748b;margin-top:8px;">
                  This code expires in <strong>{expires_in_minutes} minutes</strong>.
                </div>
              </div>

              <!-- Direct Link Action Button -->
              <div style="text-align:center;margin:28px 0 24px 0;">
                <a href="{reset_link}" style="display:inline-block;background:#0284c7;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;box-shadow:0 4px 6px -1px rgba(2,132,199,0.25);">
                  Reset Password in Portal &rarr;
                </a>
              </div>

              <p style="font-size:13px;line-height:1.5;color:#64748b;margin:0 0 16px 0;background:#f8fafc;padding:12px 16px;border-radius:8px;border-left:4px solid #94a3b8;">
                <strong>Security Tip:</strong> Never share this OTP code or reset link with anyone. Our support team will never ask for your password or verification codes.
              </p>

              <p style="font-size:12px;line-height:1.5;color:#94a3b8;margin:0;">
                If you did not make this request, you can safely ignore this email. Your existing password will remain active and secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
              <p style="font-size:11px;color:#94a3b8;margin:0 0 4px 0;">
                This automated security notification was dispatched in accordance with DPDP Act 2023.
              </p>
              <p style="font-size:11px;color:#cbd5e1;margin:0;">
                DPDP Consent Manager Security Operations
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_password_reset_email(
    to_email: str,
    to_name: str,
    otp_code: str,
    reset_link: str,
    expires_in_minutes: int = 15,
) -> dict:
    """
    Sends an automated Password Reset OTP email to the user.
    Uses SMTP (e.g. Gmail) if configured, otherwise falls back to Resend API or dev console.
    """
    cfg = _get_resend_config()
    api_key = cfg["api_key"]
    from_name = cfg["from_name"]
    from_email = cfg["from_email"]

    subject = f"[Security] Password Reset Verification Code: {otp_code} — DPDP Consent Manager"
    html_body = _build_password_reset_email_html(
        to_name=to_name or "User",
        to_email=to_email,
        otp_code=otp_code,
        reset_link=reset_link,
        expires_in_minutes=expires_in_minutes,
    )

    smtp_user = str(cfg.get("smtp_user", "")).strip()
    smtp_pass = str(cfg.get("smtp_pass", "")).strip().replace(" ", "")
    smtp_host = cfg.get("smtp_host", "smtp.gmail.com")
    smtp_port = cfg.get("smtp_port", 587)

    # 1. SMTP Mode (Gmail)
    if smtp_user and smtp_pass:
        try:
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{smtp_user}>"
            msg["To"] = to_email
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [to_email], msg.as_string())

            logger.info("[EMAIL SERVICE] Password reset OTP sent via SMTP (%s). To=%s", smtp_host, to_email)
            return {
                "success": True,
                "message": f"Password reset email sent to {to_email}",
                "email_id": f"smtp-pwd-{int(datetime.utcnow().timestamp())}",
                "dev_mode": False,
            }
        except Exception as e:
            logger.error("[EMAIL SERVICE] SMTP password reset send failed: %s", str(e))
            # If SMTP fails, don't silently swallow; report failure or fallback
            return {
                "success": False,
                "message": f"SMTP send failed: {str(e)}",
                "email_id": None,
                "dev_mode": False,
            }

    # 2. Resend API mode
    if api_key and not api_key.startswith("re_YOUR") and api_key != "":
        try:
            payload = {
                "from": f"{from_name} <{from_email}>",
                "to": [to_email],
                "subject": subject,
                "html": html_body,
                "tags": [
                    {"name": "type", "value": "password-reset"},
                ],
            }
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "User-Agent": "DPDP-Consent-Manager/1.0 Python/3",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                response_data = json.loads(resp.read().decode("utf-8"))
                email_id = response_data.get("id")
                return {
                    "success": True,
                    "message": f"Password reset email sent via Resend to {to_email}",
                    "email_id": email_id,
                    "dev_mode": False,
                }
        except Exception as e:
            logger.error("[EMAIL SERVICE] Resend password reset send failed: %s", str(e))
            return {
                "success": False,
                "message": f"Email send failed: {str(e)}",
                "email_id": None,
                "dev_mode": False,
            }

    # 3. Dev Mode (Console fallback)
    logger.warning(
        "[EMAIL SERVICE] Dev mode: Password reset code printed to console.\n"
        "  To: %s <%s>\n  OTP: %s\n  Link: %s",
        to_name, to_email, otp_code, reset_link,
    )
    print("\n" + "=" * 72)
    print("[PASSWORD RESET - OTP VERIFICATION CODE] (DEV / LOCAL FALLBACK)")
    print("=" * 72)
    print(f"  To:       {to_name} <{to_email}>")
    print(f"  OTP Code: {otp_code}")
    print(f"  Link:     {reset_link}")
    print("=" * 72 + "\n")
    return {
        "success": True,
        "message": f"Dev mode: Password reset code {otp_code} generated for {to_email}",
        "email_id": None,
        "dev_mode": True,
    }


def _build_consent_confirmation_email_html(
    to_name: str,
    to_email: str,
    fiduciary_name: str,
    fiduciary_category: str,
    purpose: str,
    notice_id: str,
    consent_id: str,
    granted_attributes: list,
    denied_attributes: list,
    granted_on: str,
    expires_on: str,
    receipt_hash: str,
    dpo_email: str = "",
    data_region: str = "India",
    dashboard_link: str = "",
) -> str:
    """Build a rich, reassuring confirmation email HTML template for recorded consents."""

    granted_fmt = granted_on
    if granted_on:
        try:
            g_dt = datetime.fromisoformat(granted_on.replace("Z", ""))
            granted_fmt = g_dt.strftime("%d %B %Y, %I:%M %p UTC")
        except Exception:
            pass

    expires_fmt = expires_on
    if expires_on:
        try:
            e_dt = datetime.fromisoformat(expires_on.replace("Z", ""))
            expires_fmt = e_dt.strftime("%d %B %Y")
        except Exception:
            pass

    # Build granted attributes rows
    granted_rows = ""
    for attr in (granted_attributes or []):
        if isinstance(attr, dict):
            name = attr.get("name") or attr.get("id") or "Attribute"
            category = attr.get("category", "")
            sensitive = attr.get("sensitive", False)
        else:
            name = str(attr)
            category = ""
            sensitive = False

        badge = ""
        if sensitive:
            badge = '<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;margin-left:6px;">🔒 Sensitive</span>'
        cat_badge = f'<span style="color:#6b7280;font-size:12px;margin-left:6px;">({category})</span>' if category else ""

        granted_rows += f"""
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#1f2937;">
            <span style="color:#16a34a;font-weight:bold;margin-right:8px;font-size:16px;">✓</span>
            <strong>{name}</strong>
            {cat_badge}
            {badge}
          </td>
          <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;text-align:right;">
            <span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">Consented</span>
          </td>
        </tr>"""

    # Build denied / withheld attributes rows if any
    denied_section = ""
    if denied_attributes:
        denied_rows = ""
        for attr in denied_attributes:
            if isinstance(attr, dict):
                name = attr.get("name") or attr.get("id") or "Attribute"
            else:
                name = str(attr)
            denied_rows += f"""
            <tr>
              <td style="padding:10px 16px;border-bottom:1px solid #fee2e2;font-size:14px;color:#6b7280;">
                <span style="color:#dc2626;font-weight:bold;margin-right:8px;font-size:15px;">✕</span>
                <span style="text-decoration:line-through;color:#9ca3af;">{name}</span>
              </td>
              <td style="padding:10px 16px;border-bottom:1px solid #fee2e2;text-align:right;">
                <span style="background:#fee2e2;color:#b91c1c;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">Withheld</span>
              </td>
            </tr>"""

        denied_section = f"""
        <table width="100%" cellpadding="0" cellspacing="0"
               style="border:1px solid #fecaca;border-radius:8px;overflow:hidden;margin:16px 0 24px;background:#fef2f2;">
          <thead>
            <tr style="background:#fee2e2;">
              <th colspan="2" style="padding:10px 16px;text-align:left;font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:.5px;">
                ⛔ Attributes Withheld / Excluded from Consent ({len(denied_attributes)})
              </th>
            </tr>
          </thead>
          <tbody>{denied_rows}</tbody>
        </table>"""

    dpo_info = f'<p style="margin:4px 0 0;font-size:13px;color:#4b5563;">Data Protection Officer (DPO): <strong>{dpo_email}</strong></p>' if dpo_email else ""
    cta_url = dashboard_link or "#"
    year = datetime.utcnow().year

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Consent Confirmation — {fiduciary_name}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#059669 0%,#0d9488 100%);padding:36px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.85);text-transform:uppercase;">
              Digital Personal Data Protection Act 2023 · Section 6
            </p>
            <div style="font-size:36px;margin:0 0 8px;">✅</div>
            <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">
              Consent Recorded Successfully
            </h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.9);">
              Consent ID: <code style="background:rgba(255,255,255,.2);padding:3px 8px;border-radius:4px;font-family:monospace;font-weight:bold;">{consent_id}</code>
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

            <p style="font-size:16px;color:#1f2937;margin:0 0 16px;">
              Dear <strong>{to_name}</strong>,
            </p>

            <!-- Reassurance Banner (Similar to Job Application Confirmation) -->
            <div style="background:#ecfdf5;border-left:4px solid #10b981;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
              <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#065f46;">
                ✓ Your Consent Decision Has Been Safely Recorded
              </p>
              <p style="margin:0;font-size:13px;color:#047857;line-height:1.5;">
                This email confirms that you have granted consent to <strong>{fiduciary_name}</strong>. A cryptographic, tamper-evident record has been registered in your personal Consent Ledger under the DPDP Act 2023.
              </p>
            </div>

            <!-- Transaction Details Table -->
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:0 0 24px;">
              <h3 style="margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-weight:700;">
                Transaction &amp; Consent Overview
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                <tr>
                  <td style="padding:6px 0;color:#6b7280;width:38%;">Data Fiduciary:</td>
                  <td style="padding:6px 0;color:#111827;font-weight:600;">{fiduciary_name} <span style="font-weight:normal;color:#6b7280;font-size:12px;">({fiduciary_category})</span></td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;">Notice ID:</td>
                  <td style="padding:6px 0;color:#111827;font-family:monospace;font-size:13px;">{notice_id}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;">Purpose:</td>
                  <td style="padding:6px 0;color:#111827;">{purpose}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;">Granted On:</td>
                  <td style="padding:6px 0;color:#111827;">{granted_fmt}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;">Valid Until:</td>
                  <td style="padding:6px 0;color:#111827;">{expires_fmt}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;">Data Storage Region:</td>
                  <td style="padding:6px 0;color:#111827;">{data_region}</td>
                </tr>
              </table>
            </div>

            <!-- Attributes Granted Section -->
            <h3 style="margin:0 0 8px;font-size:14px;color:#1f2937;font-weight:700;">
              Attributes You Consented to Share ({len(granted_attributes or [])})
            </h3>
            <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">
              You authorized <strong>{fiduciary_name}</strong> to process solely the following specific personal data attributes:
            </p>

            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:0 0 20px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px;">
                    Consented Attribute Name
                  </th>
                  <th style="padding:10px 16px;text-align:right;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px;">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>{granted_rows}</tbody>
            </table>

            {denied_section}

            <!-- Cryptographic SHA-256 Receipt -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin:0 0 24px;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.5px;">
                🛡️ Digital Receipt Signature (SHA-256)
              </p>
              <div style="font-family:monospace;font-size:11px;color:#0f172a;word-break:break-all;background:#ffffff;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;">
                {receipt_hash}
              </div>
              <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">
                This cryptographic signature certifies the integrity and timestamp of your consent decision.
              </p>
            </div>

            <!-- DPDP Act Rights Notice -->
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
              <h4 style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.5px;">
                ⚖️ Your Rights as Data Principal (DPDP Act 2023)
              </h4>
              <ul style="margin:0;padding-left:18px;font-size:13px;color:#1e3a8a;line-height:1.6;">
                <li><strong>Right to Withdraw Consent:</strong> You have the legal right under Section 6(4) to withdraw or modify this consent at any time from your Consent Dashboard without penalty.</li>
                <li><strong>Right to Correction &amp; Erasure:</strong> You can request correction of inaccurate data or deletion of processed personal data under Section 12.</li>
                <li><strong>Right to Grievance Redressal:</strong> In case of questions or concerns, you can contact the fiduciary's Data Protection Officer directly.</li>
              </ul>
              {dpo_info}
            </div>

            <!-- CTA Button to Dashboard -->
            <table cellpadding="0" cellspacing="0" style="margin:28px 0 20px;">
              <tr>
                <td style="background:linear-gradient(135deg,#059669 0%,#0d9488 100%);border-radius:8px;padding:0;">
                  <a href="{cta_url}"
                     style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:.3px;">
                    View &amp; Manage in Consent Dashboard →
                  </a>
                </td>
              </tr>
            </table>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 20px;">

            <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">
              This is an automated confirmation notice sent to {to_email} pursuant to Section 6 of the Digital Personal Data Protection Act, 2023.
              Please retain this email as an official record of your consent transaction.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              DPDP Consent Manager &copy; {year} &middot; Sections 6, 11, 12, 13 &amp; 14 Compliant
              &middot; Cryptographically Verified Consent Receipt
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_consent_confirmation_email(
    to_email: str,
    to_name: str,
    fiduciary_name: str,
    fiduciary_category: str = "Corporate Fiduciary",
    purpose: str = "",
    notice_id: str = "",
    consent_id: str = "",
    granted_attributes: list = None,
    denied_attributes: list = None,
    granted_on: str = "",
    expires_on: str = "",
    receipt_hash: str = "",
    dpo_email: str = "",
    data_region: str = "India",
    dashboard_link: str = "",
) -> dict:
    """
    Sends an automated Consent Confirmation & Receipt email to the Data Principal
    whenever they grant consent.
    
    Contains the exact list of attributes granted, attributes withheld, purpose,
    cryptographic receipt hash, and DPDP Act rights.
    """
    if not to_email:
        return {"success": False, "message": "No recipient email provided for consent confirmation.", "dev_mode": False}

    cfg = _get_resend_config()
    api_key = cfg["api_key"]
    from_name = cfg["from_name"]
    from_email = cfg["from_email"]

    subject = f"✓ Consent Confirmed: {fiduciary_name} — DPDP Act 2023 (ID: {consent_id})"
    html_body = _build_consent_confirmation_email_html(
        to_name=to_name or "Data Principal",
        to_email=to_email,
        fiduciary_name=fiduciary_name,
        fiduciary_category=fiduciary_category or "Corporate Fiduciary",
        purpose=purpose or "Data Processing under DPDP Act",
        notice_id=notice_id or "",
        consent_id=consent_id or "",
        granted_attributes=granted_attributes or [],
        denied_attributes=denied_attributes or [],
        granted_on=granted_on or datetime.utcnow().isoformat() + "Z",
        expires_on=expires_on or "",
        receipt_hash=receipt_hash or "",
        dpo_email=dpo_email or "",
        data_region=data_region or "India",
        dashboard_link=dashboard_link or cfg["app_base_url"],
    )

    smtp_user = str(cfg.get("smtp_user", "")).strip()
    smtp_pass = str(cfg.get("smtp_pass", "")).strip().replace(" ", "")
    smtp_host = cfg.get("smtp_host", "smtp.gmail.com")
    smtp_port = cfg.get("smtp_port", 587)

    # 1. SMTP Mode (e.g. Gmail App Password)
    if smtp_user and smtp_pass:
        try:
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{smtp_user}>"
            msg["To"] = to_email
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [to_email], msg.as_string())

            logger.info("[EMAIL SERVICE] Consent confirmation email sent via SMTP (%s) to %s", smtp_host, to_email)
            return {
                "success": True,
                "message": f"Consent confirmation email sent via SMTP ({smtp_user}) to {to_email}",
                "email_id": f"smtp-cnst-{int(datetime.utcnow().timestamp())}",
                "dev_mode": False,
            }
        except Exception as e:
            logger.error("[EMAIL SERVICE] SMTP consent confirmation send failed: %s", str(e))
            return {
                "success": False,
                "message": f"SMTP send failed: {str(e)}",
                "email_id": None,
                "dev_mode": False,
            }

    # 2. Resend API mode
    if api_key and not api_key.startswith("re_YOUR") and api_key != "":
        try:
            payload = {
                "from": f"{from_name} <{from_email}>",
                "to": [to_email],
                "subject": subject,
                "html": html_body,
                "tags": [
                    {"name": "type", "value": "consent-confirmation"},
                    {"name": "consent_id", "value": consent_id or "unknown"},
                    {"name": "notice_id", "value": notice_id or "unknown"},
                ],
            }
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "User-Agent": "DPDP-Consent-Manager/1.0 Python/3",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                response_data = json.loads(resp.read().decode("utf-8"))
                email_id = response_data.get("id")
                logger.info("[EMAIL SERVICE] Consent confirmation sent via Resend. ID=%s To=%s", email_id, to_email)
                return {
                    "success": True,
                    "message": f"Consent confirmation email sent via Resend to {to_email}",
                    "email_id": email_id,
                    "dev_mode": False,
                }
        except Exception as e:
            logger.error("[EMAIL SERVICE] Resend consent confirmation send failed: %s", str(e))
            return {
                "success": False,
                "message": f"Email send failed: {str(e)}",
                "email_id": None,
                "dev_mode": False,
            }

    # 3. Dev Mode (Console fallback)
    attr_names = [a.get("name") if isinstance(a, dict) else str(a) for a in (granted_attributes or [])]
    logger.warning(
        "[EMAIL SERVICE] Dev mode: Consent confirmation printed to console.\n"
        "  To: %s <%s>\n  Consent ID: %s\n  Fiduciary: %s\n  Attributes: %s",
        to_name, to_email, consent_id, fiduciary_name, ", ".join(attr_names)
    )
    print("\n" + "=" * 72)
    print("[CONSENT CONFIRMATION EMAIL - DEV MODE] (would be sent via SMTP/Resend)")
    print("=" * 72)
    print(f"  To:         {to_name} <{to_email}>")
    print(f"  Fiduciary:  {fiduciary_name} ({fiduciary_category})")
    print(f"  Consent ID: {consent_id}")
    print(f"  Notice ID:  {notice_id}")
    print(f"  Purpose:    {purpose}")
    print(f"  Granted:    {', '.join(attr_names) or 'None'}")
    if denied_attributes:
        print(f"  Denied:     {', '.join([a.get('name') if isinstance(a, dict) else str(a) for a in denied_attributes])}")
    print(f"  Receipt:    {receipt_hash}")
    print("=" * 72 + "\n")
    return {
        "success": True,
        "message": f"Dev mode: Consent confirmation email logged for {to_email}",
        "email_id": None,
        "dev_mode": True,
    }


