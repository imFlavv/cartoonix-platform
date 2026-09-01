"""Cartoonix Cinema — backend tests (halls, seats, PLUS gating, tickets, chat, admin)."""
import os
import re
import time

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@cartoonix.ro", "password": "admin1234"}
FREE = {"email": "test@cartoonix.ro", "password": "test1234"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Login failed for {creds['email']}: {r.status_code} {r.text[:300]}")
    data = r.json()
    assert "token" in data and data["token"]
    return data["token"], data["user"]


@pytest.fixture(scope="session")
def admin_client():
    token, user = _login(ADMIN)
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    s.user = user
    return s


@pytest.fixture(scope="session")
def free_client():
    token, user = _login(FREE)
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    s.user = user
    return s


@pytest.fixture(scope="module", autouse=True)
def reset_hall_state():
    """Ensure Sala 1 is open + empty before and after the module."""
    token, _ = _login(ADMIN)
    h = {"Authorization": f"Bearer {token}"}
    requests.post(f"{API}/admin/cinema/1", json={"status": "open"}, headers=h, timeout=30)
    requests.post(f"{API}/admin/cinema/1/clear-seats", headers=h, timeout=30)
    yield
    requests.post(f"{API}/admin/cinema/1", json={"status": "open", "lights": "on"}, headers=h, timeout=30)
    requests.post(f"{API}/admin/cinema/1/clear-seats", headers=h, timeout=30)


# ---------------------------------------------------------------- halls listing
class TestCinemaList:
    def test_list_halls(self, free_client):
        r = free_client.get(f"{API}/cinema")
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        halls = data["halls"]
        assert len(halls) == 2
        by_id = {h["hall"]: h for h in halls}
        assert by_id[1]["status"] == "open"
        assert by_id[2]["status"] == "closed"
        for h in halls:
            assert h["capacity"] == 96
            assert isinstance(h["occupied"], int)
            assert h["name"] == f"Sala {h['hall']}"
        assert data["is_plus"] is False

    def test_list_requires_auth(self):
        r = requests.get(f"{API}/cinema", timeout=30)
        assert r.status_code in (401, 403), r.status_code

    def test_invalid_hall_404(self, free_client):
        r = free_client.get(f"{API}/cinema/9")
        assert r.status_code == 404

    def test_hall_state_shape(self, free_client):
        r = free_client.get(f"{API}/cinema/1")
        assert r.status_code == 200
        d = r.json()
        for k in ("hall", "name", "status", "lights", "rows", "cols", "plus_rows", "seats", "my_seat", "occupied", "capacity", "is_plus"):
            assert k in d, f"missing {k}"
        assert d["plus_rows"] == 4
        # open hall exposes preshow ads + donors
        assert "ads" in d and "donors" in d


# ------------------------------------------------------- seat picking / gating
class TestSeatPicking:
    def test_free_user_golden_seat_rejected(self, free_client):
        for seat in ("R0C0", "R3C11"):
            r = free_client.post(f"{API}/cinema/1/seat", json={"seat_id": seat})
            assert r.status_code == 403, f"{seat} -> {r.status_code} {r.text[:200]}"
            assert "PLUS" in r.json().get("detail", "")

    def test_free_user_normal_seat_ok_and_ticket(self, free_client):
        r = free_client.post(f"{API}/cinema/1/seat", json={"seat_id": "R5C3"})
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["ok"] is True and d["seat_id"] == "R5C3"
        t = d["ticket"]
        assert t["hall_name"] == "Sala 1"
        assert t["seat_label"] == "Rândul F, Locul 4"
        assert re.match(r"^CX-1-[0-9A-F]{6}$", t["code"]), t["code"]
        assert "_id" not in t
        # persisted in state
        st = free_client.get(f"{API}/cinema/1").json()
        assert st["my_seat"] == "R5C3"
        mine = [s for s in st["seats"] if s["seat_id"] == "R5C3"][0]
        assert mine["mine"] is True
        assert mine["nickname"]

    def test_move_seat_frees_old(self, free_client):
        r = free_client.post(f"{API}/cinema/1/seat", json={"seat_id": "R6C7"})
        assert r.status_code == 200, r.text[:300]
        st = free_client.get(f"{API}/cinema/1").json()
        assert st["my_seat"] == "R6C7"
        ids = [s["seat_id"] for s in st["seats"]]
        assert "R5C3" not in ids, f"old seat not freed: {ids}"
        assert ids.count("R6C7") == 1

    def test_plus_user_can_pick_golden(self, admin_client):
        r = admin_client.post(f"{API}/cinema/1/seat", json={"seat_id": "R0C0"})
        assert r.status_code == 200, r.text[:300]
        st = admin_client.get(f"{API}/cinema/1").json()
        assert st["my_seat"] == "R0C0"
        assert st["is_plus"] is True

    def test_seat_taken_by_other_409(self, free_client):
        r = free_client.post(f"{API}/cinema/1/seat", json={"seat_id": "R0C0"})
        # golden row -> free user gets 403 first; use admin's normal seat instead
        assert r.status_code == 403
        # admin takes a normal seat, free user tries same
        token, _ = _login(ADMIN)
        h = {"Authorization": f"Bearer {token}"}
        r2 = requests.post(f"{API}/cinema/1/seat", json={"seat_id": "R7C0"}, headers=h, timeout=30)
        assert r2.status_code == 200, r2.text[:300]
        r3 = free_client.post(f"{API}/cinema/1/seat", json={"seat_id": "R7C0"})
        assert r3.status_code == 409, f"{r3.status_code} {r3.text[:200]}"

    def test_nickname_visible_to_others(self, free_client):
        st = free_client.get(f"{API}/cinema/1").json()
        others = [s for s in st["seats"] if not s["mine"]]
        assert others, "expected another user's seat"
        assert others[0]["nickname"], "reserved seat missing nickname"

    def test_invalid_and_out_of_range_seats(self, admin_client):
        assert admin_client.post(f"{API}/cinema/1/seat", json={"seat_id": "XYZ"}).status_code == 400
        assert admin_client.post(f"{API}/cinema/1/seat", json={"seat_id": "R99C1"}).status_code == 400
        assert admin_client.post(f"{API}/cinema/1/seat", json={"seat_id": "R1C99"}).status_code == 400

    def test_closed_hall_rejects_seat(self, admin_client):
        r = admin_client.post(f"{API}/cinema/2/seat", json={"seat_id": "R5C5"})
        assert r.status_code == 400, r.text[:200]

    def test_heartbeat_and_leave(self, free_client):
        assert free_client.post(f"{API}/cinema/1/heartbeat").json()["ok"] is True
        assert free_client.post(f"{API}/cinema/1/leave").json()["ok"] is True
        st = free_client.get(f"{API}/cinema/1").json()
        assert st["my_seat"] is None
        assert free_client.post(f"{API}/cinema/1/heartbeat").json()["ok"] is False
        # re-take a seat for later ticket tests
        assert free_client.post(f"{API}/cinema/1/seat", json={"seat_id": "R5C3"}).status_code == 200


# ---------------------------------------------------------------------- tickets
class TestTickets:
    def test_tickets_listing(self, free_client):
        r = free_client.get(f"{API}/cinema/tickets")
        assert r.status_code == 200, r.text[:300]
        tickets = r.json()
        assert isinstance(tickets, list) and tickets
        t = tickets[0]
        assert t["hall_name"] == "Sala 1"
        assert t["seat_label"].startswith("Rândul")
        assert re.match(r"^CX-1-[0-9A-F]{6}$", t["code"])
        assert t["movie_title"]
        assert "date" in t
        assert "_id" not in t

    def test_tickets_require_auth(self):
        assert requests.get(f"{API}/cinema/tickets", timeout=30).status_code in (401, 403)


# ------------------------------------------------------------------------ chat
class TestCinemaChat:
    def test_post_and_get(self, free_client):
        text = f"TEST_cinema_{int(time.time())}"
        r = free_client.post(f"{API}/cinema/1/chat", json={"text": text})
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["text"] == text and d["hall"] == 1
        assert "name" in d and "plus" in d and "donor" in d and "id" in d
        msgs = free_client.get(f"{API}/cinema/1/chat").json()
        assert any(m["text"] == text for m in msgs)
        assert all("_id" not in m for m in msgs)

    def test_chat_validation(self, free_client):
        assert free_client.post(f"{API}/cinema/1/chat", json={"text": ""}).status_code == 422
        assert free_client.post(f"{API}/cinema/1/chat", json={"text": "x" * 201}).status_code == 422

    def test_chat_invalid_hall(self, free_client):
        assert free_client.post(f"{API}/cinema/9/chat", json={"text": "hi"}).status_code == 404


# ----------------------------------------------------------------------- admin
class TestCinemaAdmin:
    def test_admin_get_requires_admin(self, free_client):
        assert free_client.get(f"{API}/admin/cinema").status_code == 403

    def test_admin_get(self, admin_client):
        r = admin_client.get(f"{API}/admin/cinema")
        assert r.status_code == 200, r.text[:300]
        halls = r.json()
        assert len(halls) == 2
        assert all("_id" not in h for h in halls)
        assert all("occupied" in h for h in halls)

    def test_lights_toggle(self, admin_client, free_client):
        r = admin_client.post(f"{API}/admin/cinema/1", json={"lights": "off"})
        assert r.status_code == 200 and r.json()["lights"] == "off"
        assert free_client.get(f"{API}/cinema/1").json()["lights"] == "off"
        r = admin_client.post(f"{API}/admin/cinema/1", json={"lights": "on"})
        assert r.json()["lights"] == "on"
        assert free_client.get(f"{API}/cinema/1").json()["lights"] == "on"

    def test_movie_ads_layout(self, admin_client, free_client):
        r = admin_client.post(f"{API}/admin/cinema/1", json={
            "movie_url": "https://example.com/film.mp4", "movie_title": "TEST_Film"})
        assert r.status_code == 200
        d = r.json()
        assert d["movie_url"] == "https://example.com/film.mp4" and d["movie_title"] == "TEST_Film"

        r = admin_client.post(f"{API}/admin/cinema/1", json={"ads": [
            {"url": "https://example.com/ad1.mp4", "title": "Ad1"}, {"url": "", "title": "bad"}]})
        assert r.status_code == 200
        ads = r.json()["ads"]
        assert len(ads) == 1 and ads[0]["title"] == "Ad1"
        assert free_client.get(f"{API}/cinema/1").json()["ads"][0]["url"].endswith("ad1.mp4")

        r = admin_client.post(f"{API}/admin/cinema/1", json={"rows": 9, "cols": 12, "plus_rows": 3})
        assert r.status_code == 200
        d = r.json()
        assert (d["rows"], d["cols"], d["plus_rows"]) == (9, 12, 3)
        # revert layout
        r = admin_client.post(f"{API}/admin/cinema/1", json={"rows": 8, "cols": 12, "plus_rows": 4})
        assert r.json()["plus_rows"] == 4

    def test_live_transition_and_position(self, admin_client, free_client):
        r = admin_client.post(f"{API}/admin/cinema/1", json={"status": "live"})
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "live" and d["started_at"]
        time.sleep(2)
        st = free_client.get(f"{API}/cinema/1").json()
        assert st["status"] == "live"
        assert st.get("position_sec", 0) >= 1, st.get("position_sec")
        # locked: no new seat picking while live
        r2 = free_client.post(f"{API}/cinema/1/seat", json={"seat_id": "R6C1"})
        assert r2.status_code == 400

    def test_ended_and_reopen_clears_started_at(self, admin_client):
        assert admin_client.post(f"{API}/admin/cinema/1", json={"status": "ended"}).json()["status"] == "ended"
        d = admin_client.post(f"{API}/admin/cinema/1", json={"status": "open"}).json()
        assert d["status"] == "open" and d["started_at"] is None

    def test_invalid_status_ignored(self, admin_client):
        d = admin_client.post(f"{API}/admin/cinema/1", json={"status": "bogus"}).json()
        assert d["status"] == "open"

    def test_clear_seats(self, admin_client):
        admin_client.post(f"{API}/cinema/1/seat", json={"seat_id": "R0C5"})
        r = admin_client.post(f"{API}/admin/cinema/1/clear-seats")
        assert r.status_code == 200 and r.json()["ok"] is True
        st = admin_client.get(f"{API}/cinema/1").json()
        assert st["seats"] == [] and st["my_seat"] is None and st["occupied"] == 0

    def test_hall2_stays_closed(self, admin_client):
        halls = {h["hall"]: h for h in admin_client.get(f"{API}/admin/cinema").json()}
        assert halls[2]["status"] == "closed"

    def test_admin_invalid_hall(self, admin_client):
        assert admin_client.post(f"{API}/admin/cinema/9", json={"lights": "on"}).status_code == 404
