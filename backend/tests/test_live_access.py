# Live TV access for all registered users (not only PLUS), guests get 401
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
USER = {"email": "test_liveuser@example.com", "password": "TestUser123!"}
ADMIN = {"email": "admin@cartoonix.ro", "password": "TestAdmin123!"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code} {r.text[:200]}")
    return r.json()


@pytest.fixture(scope="module")
def user_hdr():
    d = _login(USER)
    assert not d["user"].get("plus")
    return {"Authorization": f"Bearer {d['token']}"}


@pytest.fixture(scope="module")
def admin_hdr():
    return {"Authorization": f"Bearer {_login(ADMIN)['token']}"}


class TestLiveNonPlus:
    def test_channels(self, user_hdr):
        r = requests.get(f"{BASE_URL}/api/live/channels", headers=user_hdr, timeout=60)
        assert r.status_code == 200, r.text
        chans = r.json()["channels"]
        assert chans[0]["key"]
        assert not any(c["key"] == "halloween" for c in chans)

    def test_now(self, user_hdr):
        r = requests.get(f"{BASE_URL}/api/live/now", headers=user_hdr, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "current" in d and "next" in d

    def test_playlist(self, user_hdr):
        r = requests.get(f"{BASE_URL}/api/live/playlist?count=5", headers=user_hdr, timeout=60)
        assert r.status_code == 200, r.text
        assert "items" in r.json()

    def test_report_duration(self, user_hdr):
        # out_of_range value -> no DB write, just verify not 403
        r = requests.post(f"{BASE_URL}/api/live/report_duration", headers=user_hdr,
                          json={"show_id": "TEST_x", "episode_number": 1, "duration": 1}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is False


class TestLiveAdmin:
    def test_channels_admin(self, admin_hdr):
        r = requests.get(f"{BASE_URL}/api/live/channels", headers=admin_hdr, timeout=60)
        assert r.status_code == 200


class TestLiveGuest:
    @pytest.mark.parametrize("path", ["/api/live/channels", "/api/live/now", "/api/live/playlist"])
    def test_unauth_get(self, path):
        r = requests.get(f"{BASE_URL}{path}", timeout=30)
        assert r.status_code == 401

    def test_unauth_report(self):
        r = requests.post(f"{BASE_URL}/api/live/report_duration",
                          json={"show_id": "x", "episode_number": 1, "duration": 100}, timeout=30)
        assert r.status_code == 401
