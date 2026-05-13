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
<html lang="ro"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0E1116;font-family:'Manrope',Segoe UI,Tahoma,sans-serif;color:#F6EFE6;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#121722;border-radius:18px;overflow:hidden;border:1px solid #242B3A;box-shadow:0 14px 40px rgba(0,0,0,0.55);">
      <div style="background:#171D2A;padding:28px 32px;border-bottom:1px solid #242B3A;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:10px;background:#FF5A2A;display:inline-block;text-align:center;line-height:36px;font-weight:900;font-size:18px;color:#0E1116;">C</div>
          <span style="font-size:24px;font-weight:800;letter-spacing:0.06em;">CARTOONIX</span>
          <span style="flex:1;"></span>
          <span style="font-size:12px;color:#B9B0A6;letter-spacing:0.1em;text-transform:uppercase;">Verificare email</span>
        </div>
      </div>
      <div style="padding:36px 32px;">
        <h1 style="font-size:26px;margin:0 0 12px;color:#F6EFE6;font-weight:800;letter-spacing:0.01em;">Bine ai venit, {nickname}!</h1>
        <p style="margin:0 0 24px;color:#B9B0A6;font-size:15px;line-height:1.6;">Verifică-ți emailul pentru a debloca tezaurul de desene animate clasice. Introdu codul de 6 cifre de mai jos în aplicație:</p>
        <div style="text-align:center;margin:30px 0;">
          <div style="display:inline-block;background:#171D2A;border:1px solid #242B3A;border-radius:14px;padding:22px 36px;">
            <div style="font-size:34px;font-weight:800;letter-spacing:0.35em;color:#FFD84A;font-family:'Courier New',monospace;">{code}</div>
          </div>
        </div>
        <p style="margin:0 0 8px;color:#B9B0A6;font-size:13px;">Acest cod expiră în 15 minute.</p>
        <p style="margin:0;color:#B9B0A6;font-size:13px;">Nu ai solicitat acest email? Poți să-l ignori în siguranță.</p>
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid #242B3A;">
          <p style="margin:0;color:#6F6960;font-size:12px;">Cartoonix — Streamează clasicele. © 2026 Cartoonix.</p>
        </div>
      </div>
    </div>
    <div style="text-align:center;color:#6F6960;font-size:11px;margin-top:18px;">Acesta este un email automat. Te rugăm să nu răspunzi la această adresă.</div>
  </div>
</body></html>"""


def send_verification_email(to_email: str, nickname: str, code: str) -> bool:
    if not BREVO_API_KEY:
        logger.error("BREVO_API_KEY not configured")
        return False
    payload = {
        "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
        "to": [{"email": to_email, "name": nickname}],
        "subject": f"Codul tău de verificare Cartoonix: {code}",
        "htmlContent": _verification_html(nickname, code),
        "textContent": f"Bine ai venit pe Cartoonix, {nickname}! Codul tău de verificare este: {code} (expiră în 15 minute).",
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


# ============================================================
#               CONTEST CONFIRMATION EMAIL
# ============================================================
def _contest_confirmation_html(contest_name: str, ticket_id: str, amount_str: str | None = None) -> str:
    amount_block = ""
    if amount_str:
        amount_block = f"""
        <tr><td style="padding:6px 0;color:#6F6960;font-size:13px;">Suma plătită</td>
            <td style="padding:6px 0;color:#F6EFE6;font-size:13px;font-weight:600;text-align:right;">{amount_str}</td></tr>"""
    return f"""<!DOCTYPE html>
<html lang="ro"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#08020a;font-family:'Manrope','Segoe UI',Tahoma,sans-serif;color:#F6EFE6;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#120406;border:1px solid rgba(214,166,72,0.20);border-radius:6px;overflow:hidden;">
      <!-- Header -->
      <div style="background:#0a0204;padding:32px 36px;border-bottom:1px solid rgba(214,166,72,0.18);text-align:center;">
        <div style="font-family:'Bebas Neue','Manrope',sans-serif;font-size:11px;letter-spacing:0.32em;color:#d6a648;text-transform:uppercase;margin-bottom:10px;">Cartoonix &middot; Concursuri</div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:700;color:#F6EFE6;letter-spacing:0.01em;">Înscriere confirmată</div>
      </div>

      <!-- Body -->
      <div style="padding:36px;">
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#cfc7bf;">
          Mulțumim! Tocmai am înregistrat participarea ta la concursul Cartoonix:
        </p>

        <div style="background:#0a0204;border:1px solid rgba(214,166,72,0.22);border-radius:4px;padding:22px 24px;margin:8px 0 22px;">
          <div style="font-size:11px;letter-spacing:0.24em;color:#d6a648;text-transform:uppercase;margin-bottom:8px;">Concurs</div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#F6EFE6;line-height:1.35;">{contest_name}</div>
        </div>

        <!-- Details table -->
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:6px 0;color:#6F6960;font-size:13px;">Cod participare</td>
              <td style="padding:6px 0;color:#F6EFE6;font-size:13px;font-weight:600;text-align:right;font-family:'Courier New',monospace;letter-spacing:0.08em;">{ticket_id}</td></tr>
          {amount_block}
          <tr><td style="padding:6px 0;color:#6F6960;font-size:13px;">Status</td>
              <td style="padding:6px 0;font-size:13px;font-weight:600;text-align:right;">
                <span style="display:inline-block;padding:3px 10px;background:rgba(52,211,153,0.12);color:#34d399;border-radius:99px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">Înregistrat</span>
              </td></tr>
        </table>

        <p style="margin:14px 0 0;color:#cfc7bf;font-size:14px;line-height:1.7;">
          Șansa ta a fost înregistrată cu succes. Vei primi un email de la noi în momentul tragerii la sorți și, dacă vei fi câștigător, vei fi anunțat la adresa aceasta de email.
        </p>

        <p style="margin:14px 0 0;color:#6F6960;font-size:13px;line-height:1.6;">
          Păstrează acest email — codul de participare este dovada înscrierii tale.
        </p>

        <div style="text-align:center;margin-top:28px;padding-top:24px;border-top:1px solid rgba(214,166,72,0.12);">
          <span style="font-family:'Bebas Neue','Manrope',sans-serif;font-size:11px;letter-spacing:0.32em;color:#6F6960;text-transform:uppercase;">Mult succes!</span>
        </div>
      </div>
    </div>

    <div style="text-align:center;color:#5a544c;font-size:11px;margin-top:20px;line-height:1.6;">
      © 2026 Cartoonix &middot; Toate drepturile rezervate<br/>
      Acesta este un email automat. Te rugăm să nu răspunzi la această adresă.
    </div>
  </div>
</body></html>"""


def _simple_contest_html(contest_name: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="ro"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#08020a;font-family:'Manrope','Segoe UI',Tahoma,sans-serif;color:#F6EFE6;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#120406;border:1px solid rgba(214,166,72,0.20);border-radius:6px;overflow:hidden;">
      <div style="background:#0a0204;padding:32px 36px;border-bottom:1px solid rgba(214,166,72,0.18);text-align:center;">
        <div style="font-family:'Bebas Neue','Manrope',sans-serif;font-size:11px;letter-spacing:0.32em;color:#d6a648;text-transform:uppercase;margin-bottom:10px;">Cartoonix &middot; Concursuri</div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:700;color:#F6EFE6;letter-spacing:0.01em;">Înscriere confirmată</div>
      </div>
      <div style="padding:36px;">
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#cfc7bf;">
          Mulțumim! Am înregistrat participarea ta la concursul Cartoonix:
        </p>
        <div style="background:#0a0204;border:1px solid rgba(214,166,72,0.22);border-radius:4px;padding:22px 24px;margin:8px 0 22px;text-align:center;">
          <div style="font-size:11px;letter-spacing:0.24em;color:#d6a648;text-transform:uppercase;margin-bottom:8px;">Concurs</div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#F6EFE6;line-height:1.35;">{contest_name}</div>
        </div>
        <p style="margin:14px 0 0;color:#cfc7bf;font-size:14px;line-height:1.7;">
          Șansa ta a fost înregistrată cu succes. Vei primi un email de la noi în momentul tragerii la sorți și, dacă vei fi câștigător, vei fi anunțat la adresa aceasta.
        </p>
        <div style="text-align:center;margin-top:28px;padding-top:24px;border-top:1px solid rgba(214,166,72,0.12);">
          <span style="font-family:'Bebas Neue','Manrope',sans-serif;font-size:11px;letter-spacing:0.32em;color:#6F6960;text-transform:uppercase;">Mult succes!</span>
        </div>
      </div>
    </div>
    <div style="text-align:center;color:#5a544c;font-size:11px;margin-top:20px;line-height:1.6;">
      © 2026 Cartoonix &middot; Toate drepturile rezervate<br/>
      Acesta este un email automat. Te rugăm să nu răspunzi la această adresă.
    </div>
  </div>
</body></html>"""


def send_simple_contest_confirmation(to_email: str, contest_name: str) -> bool:
    """Simple confirmation email — no ticket code, no amount. Used per user request."""
    if not BREVO_API_KEY:
        logger.error("BREVO_API_KEY not configured")
        return False
    payload = {
        "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
        "to": [{"email": to_email}],
        "subject": f"Înscriere confirmată — {contest_name}",
        "htmlContent": _simple_contest_html(contest_name),
        "textContent": (
            f"Mulțumim! Înscrierea ta la concursul Cartoonix \"{contest_name}\" a fost înregistrată.\n"
            f"Vei primi un email în momentul tragerii la sorți. Mult succes!\n\n— Cartoonix"
        ),
    }
    headers = {"accept": "application/json", "api-key": BREVO_API_KEY, "content-type": "application/json"}
    try:
        resp = requests.post(BREVO_URL, json=payload, headers=headers, timeout=20)
        if resp.status_code in (200, 201, 202):
            logger.info(f"Sent simple contest confirmation to {to_email}")
            return True
        logger.error(f"Brevo simple contest send failed {resp.status_code}: {resp.text[:300]}")
        return False
    except Exception as e:
        logger.error(f"Brevo simple contest exception: {e}")
        return False


def send_contest_confirmation(to_email: str, contest_name: str, ticket_id: str, amount_str: str | None = None) -> bool:
    """Send a simple, elegant confirmation email after a contest entry is registered."""
    if not BREVO_API_KEY:
        logger.error("BREVO_API_KEY not configured")
        return False
    payload = {
        "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
        "to": [{"email": to_email}],
        "subject": f"Înscriere confirmată — {contest_name}",
        "htmlContent": _contest_confirmation_html(contest_name, ticket_id, amount_str),
        "textContent": (
            f"Mulțumim! Înscrierea ta la concursul Cartoonix \"{contest_name}\" a fost înregistrată.\n"
            f"Cod participare: {ticket_id}\n"
            f"{('Sumă plătită: ' + amount_str + chr(10)) if amount_str else ''}"
            f"Vei primi un email în momentul tragerii la sorți. Mult succes!\n\n— Cartoonix"
        ),
    }
    headers = {"accept": "application/json", "api-key": BREVO_API_KEY, "content-type": "application/json"}
    try:
        resp = requests.post(BREVO_URL, json=payload, headers=headers, timeout=20)
        if resp.status_code in (200, 201, 202):
            logger.info(f"Sent contest confirmation to {to_email} (id={resp.json().get('messageId','?')})")
            return True
        logger.error(f"Brevo contest send failed {resp.status_code}: {resp.text[:300]}")
        return False
    except Exception as e:
        logger.error(f"Brevo contest exception: {e}")
        return False
