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
    """Lazily reads email & Resend config from environment (always reflects current .env)."""
    load_dotenv(dotenv_path=ENV_FILE, override=True)  # guarantees loading root .env dynamically
    return {
        "api_key": os.getenv("RESEND_API_KEY", ""),
        "from_email": os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev"),
        "from_name": os.getenv("RESEND_FROM_NAME", "DPDP Consent Manager"),
        "app_base_url": _detect_host_base_url(),
        # Optional direct SMTP (e.g. Gmail App Password — bypasses domain verification requirement)
        "smtp_host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
        "smtp_port": int(os.getenv("SMTP_PORT", "587")),
        "smtp_user": os.getenv("SMTP_USER") or os.getenv("GMAIL_USER", ""),
        "smtp_pass": os.getenv("SMTP_PASS") or os.getenv("GMAIL_APP_PASSWORD", ""),
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

