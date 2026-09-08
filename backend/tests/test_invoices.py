"""Test /api/invoices endpoint for Cartoonix PLUS invoices"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://admin-episode-sorter.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def plus_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": "test@cartoonix.ro", "password": "test1234"}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def test_invoices_unauthenticated():
    r = requests.get(f"{BASE_URL}/api/invoices", timeout=20)
    assert r.status_code in (401, 403)


def test_invoices_shape_and_data(plus_token):
    r = requests.get(f"{BASE_URL}/api/invoices",
                     headers={"Authorization": f"Bearer {plus_token}"}, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    # Seller assertions
    seller = data["seller"]
    assert seller["name"] == "PIXELVERSE SRL"
    assert seller["cui"] == "55447970"
    assert seller["reg_com"] == "J2026050461000"
    assert seller["county"] == "București"
    assert seller["city"] == "Sectorul 1"
    assert "Dinicu Golescu" in seller["address"]
    # Buyer
    assert data["buyer"]["email"] == "test@cartoonix.ro"
    # Invoices
    invs = data["invoices"]
    assert isinstance(invs, list) and len(invs) >= 1
    for inv in invs:
        assert inv["amount"] == 50 or float(inv["amount"]) == 50.0
        assert inv["currency"] == "RON"
        assert inv["status"] == "Plătită"
        assert inv["number"].startswith("CTX-") and len(inv["number"]) >= 12
