"""Shop backend tests: products, checkout, orders, reviews, admin."""
import io
import os
import uuid

import pytest
import requests
from pymongo import MongoClient

BASE_URL = "http://localhost:8001"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "test_admin@cartoonix.ro"
ADMIN_PASSWORD = "TestAdmin#2026"
USER_EMAIL = "test_plus@cartoonix.ro"
USER_PASSWORD = "TestPlus#2026"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "cartoonix")


@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=10)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    return data["access_token"], data["user"]


@pytest.fixture(scope="session")
def admin_auth():
    token, user = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    return {"token": token, "user": user, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="session")
def user_auth():
    token, user = _login(USER_EMAIL, USER_PASSWORD)
    return {"token": token, "user": user, "headers": {"Authorization": f"Bearer {token}"}}


# ---------- PUBLIC ----------
class TestShopPublic:
    def test_shop_config(self):
        r = requests.get(f"{API}/shop/config", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "shipping_cost" in data
        assert "free_shipping_threshold" in data
        assert isinstance(data.get("categories"), list)
        assert data["shipping_cost"] >= 0
        assert data["free_shipping_threshold"] >= 0

    def test_list_products(self):
        r = requests.get(f"{API}/shop/products", timeout=10)
        assert r.status_code == 200
        products = r.json()
        assert isinstance(products, list)
        assert len(products) >= 6, f"Expected >=6 seeded products, got {len(products)}"
        for p in products:
            assert "id" in p and "name" in p and "price" in p
            assert p.get("active") is True
            assert "_id" not in p

    def test_list_products_category_filter(self):
        cats = requests.get(f"{API}/shop/config", timeout=10).json()["categories"]
        if not cats:
            pytest.skip("no categories")
        cat = cats[0]
        r = requests.get(f"{API}/shop/products", params={"category": cat}, timeout=10)
        assert r.status_code == 200
        for p in r.json():
            assert p["category"] == cat

    def test_list_products_sort_price_asc(self):
        r = requests.get(f"{API}/shop/products", params={"sort": "price_asc"}, timeout=10)
        assert r.status_code == 200
        prices = [p["price"] for p in r.json()]
        assert prices == sorted(prices)

    def test_list_products_sort_price_desc(self):
        r = requests.get(f"{API}/shop/products", params={"sort": "price_desc"}, timeout=10)
        assert r.status_code == 200
        prices = [p["price"] for p in r.json()]
        assert prices == sorted(prices, reverse=True)

    def test_list_products_search(self):
        products = requests.get(f"{API}/shop/products", timeout=10).json()
        if not products:
            pytest.skip("no products")
        term = products[0]["name"].split()[0]
        r = requests.get(f"{API}/shop/products", params={"search": term}, timeout=10)
        assert r.status_code == 200
        for p in r.json():
            assert term.lower() in p["name"].lower()

    def test_get_single_product(self):
        products = requests.get(f"{API}/shop/products", timeout=10).json()
        pid = products[0]["id"]
        r = requests.get(f"{API}/shop/products/{pid}", timeout=10)
        assert r.status_code == 200
        assert r.json()["id"] == pid

    def test_get_product_404(self):
        r = requests.get(f"{API}/shop/products/{uuid.uuid4()}", timeout=10)
        assert r.status_code == 404


# ---------- CHECKOUT ----------
class TestCheckout:
    def test_checkout_requires_auth(self):
        r = requests.post(f"{API}/shop/checkout", json={
            "items": [{"product_id": "x", "qty": 1}],
            "shipping": {"full_name": "aaa", "phone": "0700000000", "address": "str test 1",
                         "city": "Buc", "county": "B"},
            "origin_url": "http://localhost:3000"
        }, timeout=10)
        assert r.status_code in (401, 403)

    def test_checkout_success_free_shipping(self, user_auth, mongo_db):
        # Pick products to exceed threshold to test free shipping
        products = requests.get(f"{API}/shop/products", params={"sort": "price_desc"}, timeout=10).json()
        # pick top product; qty enough to exceed 200
        p = products[0]
        qty = max(1, int(200 // p["price"]) + 1)
        payload = {
            "items": [{"product_id": p["id"], "qty": qty}],
            "shipping": {
                "full_name": "Test User", "phone": "0700111222",
                "address": "Str Testarea 1", "city": "Bucuresti",
                "county": "Bucuresti", "postal_code": "010101", "notes": "TEST"
            },
            "origin_url": "http://localhost:3000",
        }
        r = requests.post(f"{API}/shop/checkout", json=payload, headers=user_auth["headers"], timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("url", "").startswith("https://") and "stripe" in body["url"].lower()
        assert "session_id" in body and "order_id" in body

        # verify persistence
        order = mongo_db.shop_orders.find_one({"id": body["order_id"]})
        assert order is not None
        assert order["status"] == "pending_payment"
        assert order["payment_status"] == "pending"
        assert order["shipping_cost"] == 0.0, f"Should be free shipping, got {order['shipping_cost']}"
        assert order["subtotal"] >= 200
        assert order["total"] == round(order["subtotal"] + order["shipping_cost"], 2)

        txn = mongo_db.payment_transactions.find_one({"session_id": body["session_id"]})
        assert txn is not None
        assert txn["payment_status"] == "pending"

        # status endpoint (do not fully pay). Known bug: emergentintegrations
        # get_checkout_status may fail with pydantic dict_type on metadata.
        r2 = requests.get(f"{API}/shop/checkout/status/{body['session_id']}",
                          headers=user_auth["headers"], timeout=15)
        if r2.status_code == 500:
            pytest.xfail("Known bug: emergentintegrations get_checkout_status "
                         "returns 500 due to StripeObject metadata pydantic validation")
        assert r2.status_code == 200, r2.text
        d = r2.json()
        assert "status" in d and "payment_status" in d

    def test_checkout_paid_shipping(self, user_auth, mongo_db):
        products = requests.get(f"{API}/shop/products", params={"sort": "price_asc"}, timeout=10).json()
        p = next((x for x in products if x["price"] < 50), products[0])
        payload = {
            "items": [{"product_id": p["id"], "qty": 1}],
            "shipping": {
                "full_name": "Test User", "phone": "0700111222",
                "address": "Str T 1", "city": "Cluj", "county": "Cluj"
            },
            "origin_url": "http://localhost:3000",
        }
        r = requests.post(f"{API}/shop/checkout", json=payload, headers=user_auth["headers"], timeout=30)
        assert r.status_code == 200, r.text
        order = mongo_db.shop_orders.find_one({"id": r.json()["order_id"]})
        cfg = requests.get(f"{API}/shop/config", timeout=10).json()
        # if subtotal < threshold shipping should be non-zero
        if order["subtotal"] < cfg["free_shipping_threshold"]:
            assert order["shipping_cost"] == cfg["shipping_cost"]

    def test_checkout_stock_insufficient(self, admin_auth, user_auth, mongo_db):
        # Create a temp low-stock product as admin
        create = requests.post(f"{API}/shop/admin/products", json={
            "name": "TEST_low_stock_product",
            "description": "test",
            "price": 10.0,
            "category": "Diverse",
            "stock_enabled": True,
            "stock": 2,
            "active": True,
        }, headers=admin_auth["headers"], timeout=10)
        assert create.status_code == 200, create.text
        pid = create.json()["id"]
        try:
            r = requests.post(f"{API}/shop/checkout", json={
                "items": [{"product_id": pid, "qty": 5}],
                "shipping": {"full_name": "Test Name", "phone": "0700000000",
                             "address": "test address 1", "city": "Buc", "county": "Buc"},
                "origin_url": "http://localhost:3000",
            }, headers=user_auth["headers"], timeout=15)
            assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
        finally:
            requests.delete(f"{API}/shop/admin/products/{pid}", headers=admin_auth["headers"], timeout=10)


# ---------- ORDERS ----------
class TestOrders:
    def test_my_orders(self, user_auth):
        r = requests.get(f"{API}/shop/orders/my", headers=user_auth["headers"], timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_my_orders_requires_auth(self):
        r = requests.get(f"{API}/shop/orders/my", timeout=10)
        assert r.status_code in (401, 403)


# ---------- REVIEWS ----------
class TestReviews:
    def test_review_gating_no_purchase(self, user_auth):
        products = requests.get(f"{API}/shop/products", timeout=10).json()
        # find product user has NOT purchased - use a fresh product
        # Attempt review; if user has paid order this will fail, so use a random product
        for p in products:
            elig = requests.get(f"{API}/shop/reviews/eligibility/{p['id']}",
                                headers=user_auth["headers"], timeout=10).json()
            if not elig.get("purchased"):
                r = requests.post(f"{API}/shop/products/{p['id']}/reviews",
                                  json={"rating": 5, "comment": "TEST"},
                                  headers=user_auth["headers"], timeout=10)
                assert r.status_code == 403, r.text
                return
        pytest.skip("all products purchased already by test user")

    def test_review_positive_path(self, admin_auth, user_auth, mongo_db):
        # Create a fresh product, insert a paid order in mongo, then review it.
        create = requests.post(f"{API}/shop/admin/products", json={
            "name": "TEST_review_product",
            "description": "for review test",
            "price": 25.0,
            "category": "Diverse",
            "stock_enabled": False,
            "stock": 0,
            "active": True,
        }, headers=admin_auth["headers"], timeout=10)
        assert create.status_code == 200
        pid = create.json()["id"]

        user_id = user_auth["user"]["id"]
        order_id = str(uuid.uuid4())
        mongo_db.shop_orders.insert_one({
            "id": order_id,
            "order_number": "CX-TESTRV",
            "user_id": user_id,
            "user_email": user_auth["user"]["email"],
            "items": [{"product_id": pid, "name": "TEST_review_product", "price": 25.0, "qty": 1, "image": ""}],
            "subtotal": 25.0,
            "shipping_cost": 0.0,
            "total": 25.0,
            "currency": "RON",
            "status": "paid",
            "payment_status": "paid",
            "shipping": {"full_name": "T", "phone": "0700000000",
                         "address": "test", "city": "B", "county": "B"},
            "session_id": "TEST_SESSION",
            "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-01T00:00:00+00:00",
        })
        try:
            # eligibility
            elig = requests.get(f"{API}/shop/reviews/eligibility/{pid}",
                                headers=user_auth["headers"], timeout=10).json()
            assert elig["purchased"] is True
            assert elig["can_review"] is True

            # post review
            r = requests.post(f"{API}/shop/products/{pid}/reviews",
                              json={"rating": 4, "comment": "TEST review OK"},
                              headers=user_auth["headers"], timeout=10)
            assert r.status_code == 200, r.text
            rev = r.json()
            assert rev["rating"] == 4

            # duplicate -> 409
            r2 = requests.post(f"{API}/shop/products/{pid}/reviews",
                               json={"rating": 5, "comment": "dup"},
                               headers=user_auth["headers"], timeout=10)
            assert r2.status_code == 409

            # product rating aggregates
            prod = requests.get(f"{API}/shop/products/{pid}", timeout=10).json()
            assert prod["rating_count"] == 1
            assert abs(prod["rating_avg"] - 4.0) < 0.01

            # eligibility now can_review False (already reviewed)
            elig2 = requests.get(f"{API}/shop/reviews/eligibility/{pid}",
                                 headers=user_auth["headers"], timeout=10).json()
            assert elig2["already_reviewed"] is True
            assert elig2["can_review"] is False
        finally:
            mongo_db.shop_orders.delete_one({"id": order_id})
            mongo_db.shop_reviews.delete_many({"product_id": pid})
            requests.delete(f"{API}/shop/admin/products/{pid}", headers=admin_auth["headers"], timeout=10)


# ---------- ADMIN ----------
class TestAdminAccess:
    def test_admin_products_forbidden_for_user(self, user_auth):
        r = requests.get(f"{API}/shop/admin/products", headers=user_auth["headers"], timeout=10)
        assert r.status_code == 403

    def test_admin_orders_forbidden_for_user(self, user_auth):
        r = requests.get(f"{API}/shop/admin/orders", headers=user_auth["headers"], timeout=10)
        assert r.status_code == 403

    def test_admin_settings_forbidden_for_user(self, user_auth):
        r = requests.get(f"{API}/shop/admin/settings", headers=user_auth["headers"], timeout=10)
        assert r.status_code == 403

    def test_admin_stats_forbidden_for_user(self, user_auth):
        r = requests.get(f"{API}/shop/admin/stats", headers=user_auth["headers"], timeout=10)
        assert r.status_code == 403


class TestAdminProducts:
    def test_admin_product_crud(self, admin_auth):
        # CREATE
        r = requests.post(f"{API}/shop/admin/products", json={
            "name": "TEST_crud_product",
            "description": "desc",
            "price": 99.99,
            "category": "Figurine 3D",
            "stock_enabled": True,
            "stock": 10,
            "active": True,
            "badge": "TEST",
        }, headers=admin_auth["headers"], timeout=10)
        assert r.status_code == 200, r.text
        p = r.json()
        pid = p["id"]
        assert p["stock_enabled"] is True
        assert p["stock"] == 10

        # GET (public)
        rget = requests.get(f"{API}/shop/products/{pid}", timeout=10)
        assert rget.status_code == 200
        assert rget.json()["name"] == "TEST_crud_product"

        # UPDATE (toggle stock_enabled off + price change)
        u = requests.put(f"{API}/shop/admin/products/{pid}", json={
            "price": 49.99,
            "stock_enabled": False,
        }, headers=admin_auth["headers"], timeout=10)
        assert u.status_code == 200
        assert u.json()["price"] == 49.99
        assert u.json()["stock_enabled"] is False

        # verify persistence
        again = requests.get(f"{API}/shop/products/{pid}", timeout=10).json()
        assert again["price"] == 49.99
        assert again["stock_enabled"] is False

        # DELETE
        d = requests.delete(f"{API}/shop/admin/products/{pid}", headers=admin_auth["headers"], timeout=10)
        assert d.status_code == 200
        assert d.json().get("deleted") is True

        # verify gone
        g = requests.get(f"{API}/shop/products/{pid}", timeout=10)
        assert g.status_code == 404

    def test_admin_upload_image(self, admin_auth):
        img_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
        files = {"file": ("test.png", io.BytesIO(img_bytes), "image/png")}
        r = requests.post(f"{API}/shop/admin/upload", files=files,
                          headers={"Authorization": admin_auth["headers"]["Authorization"]}, timeout=15)
        assert r.status_code == 200, r.text
        url = r.json().get("url", "")
        assert url.startswith("/api/uploads/shop/")


class TestAdminOrders:
    def test_admin_list_orders(self, admin_auth):
        r = requests.get(f"{API}/shop/admin/orders", headers=admin_auth["headers"], timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_list_orders_filter(self, admin_auth):
        r = requests.get(f"{API}/shop/admin/orders", params={"status": "pending_payment"},
                         headers=admin_auth["headers"], timeout=10)
        assert r.status_code == 200
        for o in r.json():
            assert o["status"] == "pending_payment"

    def test_admin_update_order_status(self, admin_auth, user_auth, mongo_db):
        # Create a pending order for the user via checkout
        products = requests.get(f"{API}/shop/products", timeout=10).json()
        p = products[0]
        r = requests.post(f"{API}/shop/checkout", json={
            "items": [{"product_id": p["id"], "qty": 1}],
            "shipping": {"full_name": "Test Name", "phone": "0700000000",
                         "address": "adresa test", "city": "Buc", "county": "Buc"},
            "origin_url": "http://localhost:3000",
        }, headers=user_auth["headers"], timeout=30)
        assert r.status_code == 200
        oid = r.json()["order_id"]
        try:
            u = requests.put(f"{API}/shop/admin/orders/{oid}/status",
                             json={"status": "processing"},
                             headers=admin_auth["headers"], timeout=10)
            assert u.status_code == 200
            assert u.json()["status"] == "processing"
        finally:
            mongo_db.shop_orders.delete_one({"id": oid})


class TestAdminReviews:
    def test_admin_list_reviews(self, admin_auth):
        r = requests.get(f"{API}/shop/admin/reviews", headers=admin_auth["headers"], timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestAdminSettings:
    def test_admin_get_and_update_settings(self, admin_auth):
        r = requests.get(f"{API}/shop/admin/settings", headers=admin_auth["headers"], timeout=10)
        assert r.status_code == 200
        original = r.json()

        # Update
        new_ship = 24.5
        new_thr = 210.0
        u = requests.put(f"{API}/shop/admin/settings",
                         json={"shipping_cost": new_ship, "free_shipping_threshold": new_thr},
                         headers=admin_auth["headers"], timeout=10)
        assert u.status_code == 200
        assert u.json()["shipping_cost"] == new_ship
        assert u.json()["free_shipping_threshold"] == new_thr

        # Verify via public config
        cfg = requests.get(f"{API}/shop/config", timeout=10).json()
        assert cfg["shipping_cost"] == new_ship
        assert cfg["free_shipping_threshold"] == new_thr

        # Restore
        requests.put(f"{API}/shop/admin/settings",
                     json={"shipping_cost": original["shipping_cost"],
                           "free_shipping_threshold": original["free_shipping_threshold"]},
                     headers=admin_auth["headers"], timeout=10)


class TestAdminStats:
    def test_admin_stats(self, admin_auth):
        r = requests.get(f"{API}/shop/admin/stats", headers=admin_auth["headers"], timeout=10)
        assert r.status_code == 200
        data = r.json()
        for k in ("revenue", "paid_orders", "orders_by_status", "products_count", "reviews_count"):
            assert k in data
