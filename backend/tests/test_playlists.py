"""Backend tests for the PLUS-user playlist feature on Cartoonix."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nostalgia-hub-52.preview.emergentagent.com").rstrip("/")
PLUS_EMAIL = "plus@test.com"
PLUS_PASSWORD = "Test1234!"
TEST_CARTOON_ID = "7c52204d-ce33-4eb4-9b05-c9524f519a93"


@pytest.fixture(scope="module")
def plus_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": PLUS_EMAIL, "password": PLUS_PASSWORD},
                      timeout=15)
    if r.status_code != 200:
        pytest.skip(f"PLUS login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def plus_headers(plus_token):
    return {"Authorization": f"Bearer {plus_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def cartoon_episodes():
    r = requests.get(f"{BASE_URL}/api/cartoons/{TEST_CARTOON_ID}", timeout=15)
    assert r.status_code == 200, f"Cartoon GET failed: {r.text}"
    eps = r.json().get("episodes", [])
    assert len(eps) >= 2, "Test cartoon must have >=2 episodes"
    return eps


@pytest.fixture(scope="module")
def free_user_headers():
    """Register a fresh FREE user and return its headers."""
    import uuid
    suffix = uuid.uuid4().hex[:8]
    email = f"freetest_{suffix}@gmail.com"
    nickname = f"FreeTest{suffix}"
    # Register (sends code)
    reg = requests.post(f"{BASE_URL}/api/auth/register", json={
        "nickname": nickname, "email": email, "password": "Test1234!",
        "avatar_url": "/api/uploads/avatars/default.png", "subscription": "free",
        "accepted_terms": True,
    }, timeout=15)
    if reg.status_code != 200:
        pytest.skip(f"Could not register FREE user: {reg.status_code} {reg.text}")
    # Read code from Mongo via direct connection
    from pymongo import MongoClient
    mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    db = mc[os.environ.get("DB_NAME", "cartoonix")]
    pending = db.pending_registrations.find_one({"email": email})
    if not pending:
        pytest.skip("Pending registration not found")
    code = pending["code"]
    v = requests.post(f"{BASE_URL}/api/auth/verify-email",
                      json={"email": email, "code": code}, timeout=15)
    if v.status_code != 200:
        pytest.skip(f"Verify failed: {v.text}")
    tok = v.json()["access_token"]
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# Holder for IDs across tests
_state = {}


class TestPlaylistsAuth:
    def test_login_plus_user(self, plus_token):
        assert isinstance(plus_token, str) and len(plus_token) > 10

    def test_me_returns_plus_subscription(self, plus_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=plus_headers, timeout=10)
        assert r.status_code == 200
        assert r.json().get("subscription") == "plus"


class TestPlaylistsCRUD:
    def test_list_playlists_initial(self, plus_headers):
        r = requests.get(f"{BASE_URL}/api/me/playlists", headers=plus_headers, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # Each item should have items[] field
        for p in data:
            assert "items" in p, "Playlist must have items[] field"

    def test_create_playlist(self, plus_headers):
        r = requests.post(f"{BASE_URL}/api/me/playlists", headers=plus_headers,
                          json={"name": "TEST_Playlist_E2E", "description": "test"}, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_Playlist_E2E"
        assert "id" in data
        assert data["items"] == []
        _state["playlist_id"] = data["id"]

    def test_add_single_episode(self, plus_headers, cartoon_episodes):
        pid = _state["playlist_id"]
        ep = cartoon_episodes[0]
        _state["first_ep_id"] = ep["id"]
        r = requests.post(f"{BASE_URL}/api/me/playlists/{pid}/episodes",
                          headers=plus_headers,
                          json={"cartoon_id": TEST_CARTOON_ID, "episode_id": ep["id"]},
                          timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True
        assert body.get("already_added") is False

    def test_add_same_episode_returns_already_added(self, plus_headers):
        pid = _state["playlist_id"]
        ep_id = _state["first_ep_id"]
        r = requests.post(f"{BASE_URL}/api/me/playlists/{pid}/episodes",
                          headers=plus_headers,
                          json={"cartoon_id": TEST_CARTOON_ID, "episode_id": ep_id},
                          timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body.get("already_added") is True

    def test_get_playlist_resolved_items(self, plus_headers):
        pid = _state["playlist_id"]
        r = requests.get(f"{BASE_URL}/api/me/playlists/{pid}", headers=plus_headers, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert "resolved_items" in body
        assert len(body["resolved_items"]) == 1
        ri = body["resolved_items"][0]
        assert ri["episode"]["id"] == _state["first_ep_id"]
        assert ri["cartoon"]["id"] == TEST_CARTOON_ID

    def test_add_cartoon_legacy_adds_all_episodes(self, plus_headers, cartoon_episodes):
        # Create a separate playlist
        r = requests.post(f"{BASE_URL}/api/me/playlists", headers=plus_headers,
                          json={"name": "TEST_Playlist_Cartoon", "description": ""}, timeout=10)
        pid2 = r.json()["id"]
        _state["playlist_id2"] = pid2

        r = requests.post(f"{BASE_URL}/api/me/playlists/{pid2}/items",
                          headers=plus_headers,
                          json={"cartoon_id": TEST_CARTOON_ID}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert len(body["items"]) == len(cartoon_episodes)
        # Verify via GET also
        r2 = requests.get(f"{BASE_URL}/api/me/playlists/{pid2}", headers=plus_headers, timeout=10)
        assert r2.status_code == 200
        assert len(r2.json()["resolved_items"]) == len(cartoon_episodes)

    def test_reorder_playlist(self, plus_headers, cartoon_episodes):
        pid2 = _state["playlist_id2"]
        # Reverse the order
        ep_ids = [e["id"] for e in cartoon_episodes]
        reversed_ids = list(reversed(ep_ids))
        r = requests.post(f"{BASE_URL}/api/me/playlists/{pid2}/reorder",
                          headers=plus_headers,
                          json={"episode_ids": reversed_ids}, timeout=10)
        assert r.status_code == 200
        # Verify order persisted
        r2 = requests.get(f"{BASE_URL}/api/me/playlists/{pid2}", headers=plus_headers, timeout=10)
        items = r2.json()["resolved_items"]
        actual_order = [it["episode_id"] for it in items]
        assert actual_order == reversed_ids, f"Order not persisted: {actual_order} vs {reversed_ids}"

    def test_delete_single_episode(self, plus_headers, cartoon_episodes):
        pid2 = _state["playlist_id2"]
        ep_to_remove = cartoon_episodes[0]["id"]
        r = requests.delete(f"{BASE_URL}/api/me/playlists/{pid2}/episodes/{ep_to_remove}",
                            headers=plus_headers, timeout=10)
        assert r.status_code == 200
        # Verify removed
        r2 = requests.get(f"{BASE_URL}/api/me/playlists/{pid2}", headers=plus_headers, timeout=10)
        ep_ids_after = [it["episode_id"] for it in r2.json()["resolved_items"]]
        assert ep_to_remove not in ep_ids_after
        assert len(ep_ids_after) == len(cartoon_episodes) - 1

    def test_delete_playlist(self, plus_headers):
        pid = _state["playlist_id"]
        r = requests.delete(f"{BASE_URL}/api/me/playlists/{pid}",
                            headers=plus_headers, timeout=10)
        assert r.status_code == 200
        # Verify gone
        r2 = requests.get(f"{BASE_URL}/api/me/playlists/{pid}",
                          headers=plus_headers, timeout=10)
        assert r2.status_code == 404

        # Cleanup second one
        pid2 = _state.get("playlist_id2")
        if pid2:
            requests.delete(f"{BASE_URL}/api/me/playlists/{pid2}",
                            headers=plus_headers, timeout=10)


class TestPlaylistsFreeUser:
    def test_free_user_list_returns_empty(self, free_user_headers):
        r = requests.get(f"{BASE_URL}/api/me/playlists",
                         headers=free_user_headers, timeout=10)
        assert r.status_code == 200
        assert r.json() == []

    def test_free_user_create_forbidden(self, free_user_headers):
        r = requests.post(f"{BASE_URL}/api/me/playlists",
                         headers=free_user_headers,
                         json={"name": "TEST_FreeFail"}, timeout=10)
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
