"""Brevo transactional email helpers."""
import os
import logging
import requests

logger = logging.getLogger(__name__)

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "no-reply@cartoonix.ro")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "Cartoonix")
BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def _verification_html(nickname: str, code: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0E1116;font-family:'Manrope',Segoe UI,Tahoma,sans-serif;color:#F6EFE6;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#121722;border-radius:18px;overflow:hidden;border:1px solid #242B3A;box-shadow:0 14px 40px rgba(0,0,0,0.55);">
      <div style="background:#171D2A;padding:28px 32px;border-bottom:1px solid #242B3A;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:10px;background:#FF5A2A;display:inline-block;text-align:center;line-height:36px;font-weight:900;font-size:18px;color:#0E1116;">C</div>
          <span style="font-size:24px;font-weight:800;letter-spacing:0.06em;">CARTOONIX</span>
          <span style="flex:1;"></span>
          <span style="font-size:12px;color:#B9B0A6;letter-spacing:0.1em;text-transform:uppercase;">Email Verification</span>
        </div>
      </div>
      <div style="padding:36px 32px;">
        <h1 style="font-size:26px;margin:0 0 12px;color:#F6EFE6;font-weight:800;letter-spacing:0.01em;">Welcome, {nickname}!</h1>
        <p style="margin:0 0 24px;color:#B9B0A6;font-size:15px;line-height:1.6;">Verify your email to unlock the vault of classic cartoons. Enter the 6-digit code below in the app:</p>
        <div style="text-align:center;margin:30px 0;">
          <div style="display:inline-block;background:#171D2A;border:1px solid #242B3A;border-radius:14px;padding:22px 36px;">
            <div style="font-size:34px;font-weight:800;letter-spacing:0.35em;color:#FFD84A;font-family:'Courier New',monospace;">{code}</div>
          </div>
        </div>
        <p style="margin:0 0 8px;color:#B9B0A6;font-size:13px;">This code expires in 15 minutes.</p>
        <p style="margin:0;color:#B9B0A6;font-size:13px;">Didn’t request this? You can safely ignore this email.</p>
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid #242B3A;">
          <p style="margin:0;color:#6F6960;font-size:12px;">Cartoonix — Stream the classics. © 2026 Cartoonix.</p>
        </div>
      </div>
    </div>
    <div style="text-align:center;color:#6F6960;font-size:11px;margin-top:18px;">This is an automated message. Please do not reply.</div>
  </div>
</body></html>"""


def send_verification_email(to_email: str, nickname: str, code: str) -> bool:
    if not BREVO_API_KEY:
        logger.error("BREVO_API_KEY not configured")
        return False
    payload = {
        "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
        "to": [{"email": to_email, "name": nickname}],
        "subject": f"Your Cartoonix verification code: {code}",
        "htmlContent": _verification_html(nickname, code),
        "textContent": f"Welcome to Cartoonix, {nickname}! Your verification code is: {code} (expires in 15 minutes).",
    }
    headers = {"accept": "application/json", "api-key": BREVO_API_KEY, "content-type": "application/json"}
    try:
        resp = requests.post(BREVO_URL, json=payload, headers=headers, timeout=20)
        if resp.status_code in (200, 201, 202):
            logger.info(f"Sent verification email to {to_email} (id={resp.json().get('messageId','?')})")
            return True
        logger.error(f"Brevo send failed {resp.status_code}: {resp.text[:300]}")
        return False
    except Exception as e:
        logger.error(f"Brevo exception: {e}")
        return False
