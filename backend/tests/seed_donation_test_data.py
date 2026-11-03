# Seed/cleanup TEST_ donation data for Donation Logs feature tests.
# Usage: python seed_donation_test_data.py seed | cleanup
import os, sys, json, uuid, requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
STATE = "/tmp/donation_seed.json"


def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@cartoonix.ro", "password": "TestAdmin123!"})
    r.raise_for_status()
    return r.json()["token"]


def seed():
    h = {"Authorization": f"Bearer {admin_token()}"}
    tag = uuid.uuid4().hex[:6]
    users = []
    for i, nm in enumerate(["TEST_DonorAna", "TEST_DonorBogdan"]):
        email = f"test_donor{i}_{tag}@example.com"
        r = requests.post(f"{BASE_URL}/api/admin/users", headers=h,
                          json={"email": email, "password": "TestPass123!", "name": f"{nm}_{tag}"})
        r.raise_for_status()
        users.append({"id": r.json()["user"]["id"], "email": email, "name": f"{nm}_{tag}"})
    txns = [
        (users[0], 50.0, 55, 50, 10.0, "2026-01-05T10:00:00+00:00"),
        (users[0], 20.0, 20, 20, 0.0, "2026-01-10T12:30:00+00:00"),
        (users[1], 100.0, 100, 100, 0.0, "2026-01-15T18:45:00+00:00"),
    ]
    sids, ledger_ids = [], []
    for u, amt, pts, base, bonus, ts in txns:
        sid = f"cs_test_TEST_{uuid.uuid4().hex[:16]}"
        db.payment_transactions.insert_one({
            "session_id": sid, "user_id": u["id"], "email": u["email"], "product": "cartoonix_donation",
            "amount": amt, "currency": "ron", "points": pts, "base_points": base, "bonus_percent": bonus,
            "status": "completed", "payment_status": "paid", "created_at": ts.replace(":00+", ":00+", 1), "updated_at": ts,
        })
        res = db.points_ledger.insert_one({"user_id": u["id"], "type": "donation", "points": pts, "amount": amt,
                                           "currency": "ron", "session_id": sid, "created_at": ts})
        db.users.update_one({"id": u["id"]}, {"$inc": {"points": pts}})
        sids.append(sid); ledger_ids.append(str(res.inserted_id))
    # pending donation (must NOT appear)
    psid = f"cs_test_TEST_pending_{uuid.uuid4().hex[:8]}"
    db.payment_transactions.insert_one({"session_id": psid, "user_id": users[1]["id"], "email": users[1]["email"],
                                        "product": "cartoonix_donation", "amount": 30.0, "currency": "ron", "points": 30,
                                        "status": "initiated", "payment_status": "pending",
                                        "created_at": "2026-01-16T10:00:00+00:00", "updated_at": "2026-01-16T10:00:00+00:00"})
    sids.append(psid)
    json.dump({"users": users, "sids": sids, "ledger_ids": ledger_ids}, open(STATE, "w"))
    print(json.dumps({"users": users, "sids": sids}, indent=1))


def cleanup():
    from bson import ObjectId
    st = json.load(open(STATE))
    h = {"Authorization": f"Bearer {admin_token()}"}
    db.payment_transactions.delete_many({"session_id": {"$in": st["sids"]}})
    for u in st["users"]:
        db.points_ledger.delete_many({"user_id": u["id"]})
        db.shop_purchases.delete_many({"user_id": u["id"]})
        requests.delete(f"{BASE_URL}/api/admin/users/{u['id']}", headers=h)
    print("cleaned", st)


if __name__ == "__main__":
    {"seed": seed, "cleanup": cleanup}[sys.argv[1]]()
