"""
Cartoonix Core POC Script

Tests 3 critical integrations in isolation:
1. Brevo email - send a 6-digit verification code email
2. Gemini Nano Banana - generate a cartoon-style avatar image
3. Local video upload/serve - basic file storage flow

Run: python poc_core.py
"""
import os
import sys
import asyncio
import base64
import random
import string
import traceback
from pathlib import Path
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "no-reply@cartoonix.ro")
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")

# Use a test recipient. Brevo allows sending to verified addresses in dev.
# We use a maildrop-style throwaway address to verify the API call works.
TEST_RECIPIENT_EMAIL = "cartoonix.poc.test@yopmail.com"
TEST_RECIPIENT_NAME = "POC Tester"


def gen_code(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))


def build_email_html(code: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0b0a1a;font-family:'Segoe UI',sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#121029;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#ff6a00,#ff007f,#7a00ff);padding:32px;text-align:center;color:#fff;">
          <h1 style="margin:0;font-size:32px;letter-spacing:1px;">Cartoonix</h1>
          <p style="margin:8px 0 0;opacity:0.9;">Verify your email</p>
        </div>
        <div style="padding:32px;color:#e9e7ff;text-align:center;">
          <p style="font-size:16px;">Welcome to Cartoonix! Use the code below to verify your email:</p>
          <div style="display:inline-block;background:#1d1a3a;border:2px dashed #ff6a00;padding:18px 28px;border-radius:12px;margin:20px 0;">
            <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#ffd166;font-family:monospace;">{code}</span>
          </div>
          <p style="font-size:13px;opacity:0.7;">This code expires in 15 minutes.</p>
        </div>
        <div style="background:#0e0c22;padding:18px;text-align:center;color:#9893c2;font-size:12px;">
          &copy; 2026 Cartoonix - Stream the classics.
        </div>
      </div>
    </body>
    </html>
    """


def test_brevo() -> bool:
    print("\n[1/3] Testing Brevo email integration...")
    try:
        import requests
        code = gen_code()
        payload = {
            "sender": {"name": "Cartoonix", "email": BREVO_SENDER_EMAIL},
            "to": [{"email": TEST_RECIPIENT_EMAIL, "name": TEST_RECIPIENT_NAME}],
            "subject": f"Cartoonix Verification Code: {code}",
            "htmlContent": build_email_html(code),
            "textContent": f"Your Cartoonix verification code is: {code}",
        }
        headers = {
            "accept": "application/json",
            "api-key": BREVO_API_KEY,
            "content-type": "application/json",
        }
        resp = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers=headers,
            timeout=30,
        )
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:300]}")
        if resp.status_code in (200, 201):
            print(f"  Sent verification code: {code}")
            print("BREVO_OK")
            return True
        else:
            print("BREVO_FAIL")
            return False
    except Exception as e:
        print(f"  Exception: {e}")
        traceback.print_exc()
        print("BREVO_FAIL")
        return False


async def test_gemini_avatar() -> bool:
    print("\n[2/3] Testing Gemini Nano Banana avatar generation...")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id="poc-avatar-session",
            system_message="You are an expert cartoon avatar generator. Generate fun, vibrant cartoon avatars."
        )
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

        prompt = (
            "A fun cartoon-style avatar portrait of a cheerful character with bright colorful retro 90s cartoon aesthetic, "
            "clean line art, bold colors, friendly smile, head and shoulders, centered on a vibrant flat color background. "
            "Square 1:1 image, polished, suitable for a user profile avatar."
        )
        msg = UserMessage(text=prompt)
        text, images = await chat.send_message_multimodal_response(msg)

        print(f"  Text response (truncated): {str(text)[:150]}")
        if images and len(images) > 0:
            out_dir = ROOT_DIR / "poc_outputs"
            out_dir.mkdir(exist_ok=True)
            img = images[0]
            mime = img.get('mime_type', 'image/png')
            ext = 'png' if 'png' in mime else 'jpg'
            data = img['data']
            # data may already be bytes-like base64 string
            try:
                image_bytes = base64.b64decode(data)
            except Exception:
                image_bytes = data if isinstance(data, (bytes, bytearray)) else str(data).encode()
            out_path = out_dir / f"poc_avatar.{ext}"
            with open(out_path, "wb") as f:
                f.write(image_bytes)
            print(f"  Saved avatar to: {out_path} ({len(image_bytes)} bytes)")
            print("AVATAR_OK")
            return True
        else:
            print("  No images returned")
            print("AVATAR_FAIL")
            return False
    except Exception as e:
        print(f"  Exception: {e}")
        traceback.print_exc()
        print("AVATAR_FAIL")
        return False


def test_upload_storage() -> bool:
    print("\n[3/3] Testing local upload/storage flow...")
    try:
        upload_dir = ROOT_DIR / "uploads" / "videos"
        upload_dir.mkdir(parents=True, exist_ok=True)
        # Write a small dummy MP4 (placeholder bytes)
        fname = f"poc_video_{int(datetime.now().timestamp())}.mp4"
        fpath = upload_dir / fname
        with open(fpath, "wb") as f:
            # Minimal MP4-ish header bytes for test
            f.write(b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1024)
        public_url = f"/uploads/videos/{fname}"
        print(f"  Saved to: {fpath} ({fpath.stat().st_size} bytes)")
        print(f"  Public URL path: {public_url}")
        if fpath.exists() and fpath.stat().st_size > 0:
            print("UPLOAD_OK")
            return True
        else:
            print("UPLOAD_FAIL")
            return False
    except Exception as e:
        print(f"  Exception: {e}")
        traceback.print_exc()
        print("UPLOAD_FAIL")
        return False


async def main():
    print("=" * 70)
    print("Cartoonix Core POC")
    print("=" * 70)
    print(f"BREVO_API_KEY present: {bool(BREVO_API_KEY)}")
    print(f"EMERGENT_LLM_KEY present: {bool(EMERGENT_LLM_KEY)}")
    print(f"Sender: {BREVO_SENDER_EMAIL}")

    results = {}
    results['brevo'] = test_brevo()
    results['avatar'] = await test_gemini_avatar()
    results['upload'] = test_upload_storage()

    print("\n" + "=" * 70)
    print("POC RESULTS SUMMARY")
    print("=" * 70)
    for k, v in results.items():
        print(f"  {k.upper():10}: {'PASS' if v else 'FAIL'}")
    print("=" * 70)
    all_pass = all(results.values())
    print("ALL_PASS" if all_pass else "SOME_FAIL")
    return 0 if all_pass else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
