# Donation Logs admin feature + Hollowmere removal + donation-flow regression tests.
# Requires seed: python /app/backend/tests/seed_donation_test_data.py seed (writes /tmp/donation_seed.json)
import os, json, csv, io, pytest, requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
SEED = json.load(open("/tmp/donation_seed.json"))
U0, U1 = SEED["users"]
PAID_SIDS = SEED["sids"][:3]
PENDING_SID = SEED["sids"][3]


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def admin():
    return _login("admin@cartoonix.ro", "TestAdmin123!")


@pytest.fixture(scope="module")
def user0():
    return _login(U0["email"], "TestPass123!")


# --- Access control
class TestAccess:
    @pytest.mark.parametrize("path", ["/admin/donations", "/admin/donations/export",
                                      f"/admin/users/{U0['id']}/nix-ledger", f"/admin/users/{U0['id']}/nix-ledger/export"])
    def test_unauth_and_nonadmin(self, path, user0):
        assert requests.get(f"{API}{path}").status_code in (401, 403)
        assert requests.get(f"{API}{path}", headers=user0).status_code == 403


# --- List donations
class TestListDonations:
    def test_list_contains_seed_and_excludes_pending(self, admin):
        r = requests.get(f"{API}/admin/donations", headers=admin, params={"per_page": 100})
        assert r.status_code == 200
        d = r.json()
        sids = [x["session_id"] for x in d["donations"]]
        for s in PAID_SIDS:
            assert s in sids
        assert PENDING_SID not in sids
        for k in ("total", "page", "pages", "per_page", "totals"):
            assert k in d
        row = next(x for x in d["donations"] if x["session_id"] == PAID_SIDS[0])
        for k in ("session_id", "user_id", "user_name", "user_email", "amount", "currency", "points",
                  "base_points", "bonus_percent", "created_at", "credited_at", "status"):
            assert k in row
        assert row["user_name"] == U0["name"] and row["user_email"] == U0["email"]
        assert row["amount"] == 50.0 and row["points"] == 55 and row["base_points"] == 50 and row["bonus_percent"] == 10.0
        assert row["currency"] == "RON" and row["status"] == "paid"
        assert row["credited_at"] == "2026-01-05T10:00:00+00:00"

    def test_sorted_desc(self, admin):
        d = requests.get(f"{API}/admin/donations", headers=admin, params={"per_page": 100}).json()
        cr = [x["credited_at"] for x in d["donations"]]
        assert cr == sorted(cr, reverse=True)

    def test_pagination(self, admin):
        d1 = requests.get(f"{API}/admin/donations", headers=admin, params={"per_page": 1, "page": 1}).json()
        d2 = requests.get(f"{API}/admin/donations", headers=admin, params={"per_page": 1, "page": 2}).json()
        assert len(d1["donations"]) == 1 and len(d2["donations"]) == 1
        assert d1["pages"] >= 3 and d1["per_page"] == 1
        assert d1["donations"][0]["session_id"] != d2["donations"][0]["session_id"]

    def test_search_by_email(self, admin):
        d = requests.get(f"{API}/admin/donations", headers=admin, params={"q": U0["email"]}).json()
        assert {x["session_id"] for x in d["donations"]} == set(PAID_SIDS[:2])
        assert d["totals"] == {"total_ron": 70.0, "total_nix": 75, "count": 2}

    def test_search_by_name(self, admin):
        d = requests.get(f"{API}/admin/donations", headers=admin, params={"q": U1["name"].lower()}).json()
        assert [x["session_id"] for x in d["donations"]] == [PAID_SIDS[2]]

    def test_search_by_session_id(self, admin):
        d = requests.get(f"{API}/admin/donations", headers=admin, params={"q": PAID_SIDS[1]}).json()
        assert [x["session_id"] for x in d["donations"]] == [PAID_SIDS[1]]

    def test_search_regex_safe(self, admin):
        r = requests.get(f"{API}/admin/donations", headers=admin, params={"q": "(.*"})
        assert r.status_code == 200

    def test_date_filter(self, admin):
        d = requests.get(f"{API}/admin/donations", headers=admin,
                         params={"date_from": "2026-01-10", "date_to": "2026-01-10", "q": "TEST_"}).json()
        assert [x["session_id"] for x in d["donations"]] == [PAID_SIDS[1]]
        d = requests.get(f"{API}/admin/donations", headers=admin, params={"date_from": "2026-01-06", "q": "cs_test_TEST_"}).json()
        assert {x["session_id"] for x in d["donations"]} == set(PAID_SIDS[1:3])
        d = requests.get(f"{API}/admin/donations", headers=admin, params={"date_to": "2026-01-05", "q": "cs_test_TEST_"}).json()
        assert [x["session_id"] for x in d["donations"]] == [PAID_SIDS[0]]


# --- CSV export
class TestExport:
    def test_export_csv(self, admin):
        r = requests.get(f"{API}/admin/donations/export", headers=admin, params={"q": U0["email"]})
        assert r.status_code == 200
        assert "text/csv" in r.headers["content-type"]
        assert "attachment" in r.headers["content-disposition"]
        assert r.content.startswith(b"\xef\xbb\xbf")
        rows = list(csv.reader(io.StringIO(r.content.decode("utf-8-sig"))))
        assert rows[0] == ["Data creditare NIX", "Data inițiere plată", "Donator", "Email", "Suma (RON)",
                           "NIX creditat", "NIX de bază", "Bonus %", "ID tranzacție Stripe", "Stare"]
        assert len(rows) == 3
        assert {rows[1][8], rows[2][8]} == set(PAID_SIDS[:2])

    def test_export_date_filter(self, admin):
        r = requests.get(f"{API}/admin/donations/export", headers=admin,
                         params={"date_from": "2026-01-15", "date_to": "2026-01-15", "q": "cs_test_TEST_"})
        rows = list(csv.reader(io.StringIO(r.content.decode("utf-8-sig"))))
        assert len(rows) == 2 and rows[1][8] == PAID_SIDS[2]


# --- Per-user ledger (credit + debit)
class TestLedger:
    def test_shop_debit_then_ledger(self, admin, user0):
        r = requests.post(f"{API}/shop/purchase", headers=user0, json={"item_id": "key_1"})
        assert r.status_code == 200, r.text
        r = requests.get(f"{API}/admin/users/{U0['id']}/nix-ledger", headers=admin)
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == U0["email"]
        assert d["user"]["points"] == sum(e["points"] for e in d["ledger"])  # balance matches ledger
        assert d["donations_total_ron"] == 70.0 and d["donations_total_nix"] == 75
        types = [e["type"] for e in d["ledger"]]
        assert types.count("donation") == 2 and "shop" in types
        shop = next(e for e in d["ledger"] if e["type"] == "shop")
        assert shop["points"] == -20 and "Mystery Box Key" in shop["description"]
        don = next(e for e in d["ledger"] if e["type"] == "donation")
        assert don["description"].startswith("Donație")
        assert "\"_id\"" not in json.dumps(d)

    def test_ledger_404(self, admin):
        assert requests.get(f"{API}/admin/users/nonexistent-xyz/nix-ledger", headers=admin).status_code == 404

    def test_ledger_export(self, admin):
        r = requests.get(f"{API}/admin/users/{U0['id']}/nix-ledger/export", headers=admin)
        assert r.status_code == 200 and "text/csv" in r.headers["content-type"]
        assert "attachment" in r.headers["content-disposition"]
        rows = list(csv.reader(io.StringIO(r.content.decode("utf-8-sig"))))
        assert rows[0] == ["Data", "Tip", "Descriere", "NIX (+/-)"]
        assert len(rows) >= 4


# --- Regression
class TestRegression:
    def test_hollowmere_gone(self):
        assert requests.get(f"{API}/hollowmere/state").status_code == 404

    def test_points_me(self, user0):
        r = requests.get(f"{API}/points/me", headers=user0)
        assert r.status_code == 200
        d = r.json()
        assert d["points"] == sum(h["points"] for h in d["history"]) and any(h["type"] == "donation" for h in d["history"])

    def test_donate_validation(self, user0):
        r = requests.post(f"{API}/payments/donate", headers=user0, json={"amount": 1, "origin_url": BASE_URL})
        assert r.status_code == 400

    def test_donate_creates_session(self, user0):
        r = requests.post(f"{API}/payments/donate", headers=user0, json={"amount": 10, "origin_url": BASE_URL})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["checkout_url"].startswith("http") and d["session_id"]
        SEED["sids"].append(d["session_id"])
        json.dump(SEED, open("/tmp/donation_seed.json", "w"))

    def test_admin_tabs_endpoints(self, admin):
        for p in ["/admin/users", "/admin/settings/donation-bonus"]:
            r = requests.get(f"{API}{p}", headers=admin)
            assert r.status_code in (200, 405), (p, r.status_code)
