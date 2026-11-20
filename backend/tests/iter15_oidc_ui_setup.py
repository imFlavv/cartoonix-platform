# Helper for OIDC UI E2E: create/cleanup TEST_ client + TEST_ non-PLUS user; build authorize URLs.
import base64, hashlib, json, secrets, subprocess, sys, uuid
from datetime import datetime, timezone
from urllib.parse import urlencode
import bcrypt
from dotenv import dotenv_values
from pymongo import MongoClient

ENV = dotenv_values("/app/backend/.env")
BASE = dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"].rstrip("/")
db = MongoClient(ENV["MONGO_URL"])[ENV["DB_NAME"]]
CID = "TEST_ui_land"
REDIRECT = "https://example.com/cartoonix/callback"

if sys.argv[1] == "create":
    db.oidc_clients.delete_one({"client_id": CID})
    subprocess.run([sys.executable, "scripts/oidc_clients.py", "create", "--client-id", CID, "--name", "Cartoonix Land",
                    "--redirect-uri", REDIRECT], cwd="/app/backend", check=True, capture_output=True)
    uid = str(uuid.uuid4())
    email = f"test_oidcui_{uuid.uuid4().hex[:6]}@example.com"
    db.users.insert_one({"id": uid, "email": email, "nickname": "TEST_Jucator", "name": "TEST_Jucator", "role": "user",
                         "status": "active", "password_hash": bcrypt.hashpw(b"TestPass123!", bcrypt.gensalt()).decode(),
                         "created_at": datetime.now(timezone.utc).isoformat()})
    print(json.dumps({"uid": uid, "email": email}))
elif sys.argv[1] == "url":
    v = secrets.token_urlsafe(48)
    ch = base64.urlsafe_b64encode(hashlib.sha256(v.encode()).digest()).rstrip(b"=").decode()
    print(urlencode({"response_type": "code", "client_id": CID, "redirect_uri": REDIRECT, "scope": "openid profile",
                     "state": "st_" + secrets.token_hex(6), "nonce": secrets.token_hex(8),
                     "code_challenge": ch, "code_challenge_method": "S256"}))
else:
    uid = sys.argv[2]
    print(db.oidc_codes.delete_many({"client_id": CID}).deleted_count,
          db.oidc_access_tokens.delete_many({"client_id": CID}).deleted_count,
          db.oidc_clients.delete_one({"client_id": CID}).deleted_count,
          db.users.delete_one({"id": uid}).deleted_count)
