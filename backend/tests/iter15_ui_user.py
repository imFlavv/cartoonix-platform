# Helper: create/delete TEST_ non-PLUS user for UI testing (prints id + minted token)
import sys, uuid, requests
from datetime import datetime, timedelta, timezone
import jwt
from dotenv import dotenv_values
from pymongo import MongoClient

ENV = dotenv_values("/app/backend/.env")
BASE = dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"].rstrip("/")
db = MongoClient(ENV["MONGO_URL"])[ENV["DB_NAME"]]

if sys.argv[1] == "create":
    a = requests.post(f"{BASE}/api/auth/login", json={"email": "admin@cartoonix.ro", "password": "TestAdmin123!"}).json()["token"]
    email = f"test_iter15ui_{uuid.uuid4().hex[:6]}@example.com"
    u = requests.post(f"{BASE}/api/admin/users", headers={"Authorization": f"Bearer {a}"},
                      json={"email": email, "password": "TestUser123!", "name": "TEST_ui15", "plus": False}).json()["user"]
    tok = jwt.encode({"sub": u["id"], "email": email, "type": "access",
                      "exp": datetime.now(timezone.utc) + timedelta(hours=3)}, ENV["JWT_SECRET"], algorithm="HS256")
    print(u["id"]); print(tok); print(a)
else:
    uid = sys.argv[2]
    print(db.payment_transactions.delete_many({"user_id": uid}).deleted_count, db.users.delete_one({"id": uid}).deleted_count)
