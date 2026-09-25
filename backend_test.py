#!/usr/bin/env python3
"""
Backend test for Cartoonix NEW features:
(A) Robust favorite removal - DELETE /api/favorites/{fav_id}
(B) Moderator chat tools - /api/mod/chat/*
(C) Role assignment + chat badge data
"""

import requests
import json
import time
from typing import Optional

# Base URL from supervisor config
BASE_URL = "https://favorite-cleanup.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
CREDS = {
    "admin": {"email": "admin@cartoonix.ro", "password": "admin1234"},
    "mod": {"email": "mod@cartoonix.ro", "password": "mod1234"},
    "founder": {"email": "founder@cartoonix.ro", "password": "founder1234"},
    "donor": {"email": "donor@cartoonix.ro", "password": "donor1234"},
    "test": {"email": "test@cartoonix.ro", "password": "test1234"},
}


def login(role: str) -> tuple[str, dict]:
    """Login and return (token, user_data)"""
    creds = CREDS[role]
    resp = requests.post(f"{BASE_URL}/auth/login", json=creds)
    assert resp.status_code == 200, f"Login failed for {role}: {resp.status_code} {resp.text}"
    data = resp.json()
    return data["token"], data["user"]


def headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_a_robust_favorites_removal():
    """
    (A) ROBUST FAVORITES REMOVAL — DELETE /api/favorites/{fav_id}:
    1. Login test user, GET /api/favorites -> should include orphan favorite
    2. DELETE /api/favorites/{id} -> 200 {ok:true, deleted:1}
    3. GET /api/favorites -> orphan is gone
    4. DELETE /api/favorites/some-random-nonexistent-id -> 200 {ok:true, deleted:0}
    """
    print("\n" + "="*80)
    print("TEST (A): ROBUST FAVORITES REMOVAL")
    print("="*80)
    
    token, user = login("test")
    test_user_id = user["id"]
    print(f"✓ Logged in as test user (id={test_user_id})")
    
    # A1: GET /api/favorites -> should include orphan favorite
    print("\nA1: GET /api/favorites (should include orphan favorite)")
    resp = requests.get(f"{BASE_URL}/favorites", headers=headers(token))
    assert resp.status_code == 200, f"GET favorites failed: {resp.status_code} {resp.text}"
    favorites = resp.json()
    print(f"   Found {len(favorites)} favorites")
    
    # Find the orphan favorite
    orphan = None
    for fav in favorites:
        if fav.get("show_id") == "orphan-old-vps-show" or fav.get("key") == "orphan-old-vps-show:0":
            orphan = fav
            break
    
    assert orphan is not None, "Orphan favorite not found! Expected show_id='orphan-old-vps-show' or key='orphan-old-vps-show:0'"
    orphan_id = orphan.get("id")
    assert orphan_id, f"Orphan favorite has no 'id' field: {orphan}"
    print(f"   ✓ Found orphan favorite: id={orphan_id}, show_id={orphan.get('show_id')}, key={orphan.get('key')}")
    
    # A2: DELETE /api/favorites/{id} -> 200 {ok:true, deleted:1}
    print(f"\nA2: DELETE /api/favorites/{orphan_id}")
    resp = requests.delete(f"{BASE_URL}/favorites/{orphan_id}", headers=headers(token))
    assert resp.status_code == 200, f"DELETE favorite failed: {resp.status_code} {resp.text}"
    result = resp.json()
    assert result.get("ok") is True, f"Expected ok=true, got {result}"
    assert result.get("deleted") == 1, f"Expected deleted=1, got {result.get('deleted')}"
    print(f"   ✓ Deleted orphan favorite: {result}")
    
    # A3: GET /api/favorites -> orphan is gone
    print("\nA3: GET /api/favorites (orphan should be gone)")
    resp = requests.get(f"{BASE_URL}/favorites", headers=headers(token))
    assert resp.status_code == 200, f"GET favorites failed: {resp.status_code} {resp.text}"
    favorites = resp.json()
    print(f"   Found {len(favorites)} favorites")
    
    # Verify orphan is gone
    for fav in favorites:
        assert fav.get("id") != orphan_id, f"Orphan favorite still exists: {fav}"
        assert fav.get("show_id") != "orphan-old-vps-show", f"Orphan favorite still exists: {fav}"
    print(f"   ✓ Orphan favorite is gone")
    
    # A4: DELETE /api/favorites/some-random-nonexistent-id -> 200 {ok:true, deleted:0}
    print("\nA4: DELETE /api/favorites/nonexistent-id (should not crash)")
    nonexistent_id = "some-random-nonexistent-id-12345"
    resp = requests.delete(f"{BASE_URL}/favorites/{nonexistent_id}", headers=headers(token))
    assert resp.status_code == 200, f"DELETE nonexistent favorite should return 200, got {resp.status_code} {resp.text}"
    result = resp.json()
    assert result.get("ok") is True, f"Expected ok=true, got {result}"
    assert result.get("deleted") == 0, f"Expected deleted=0, got {result.get('deleted')}"
    print(f"   ✓ DELETE nonexistent favorite is idempotent: {result}")
    
    print("\n✅ TEST (A) PASSED: All 4 test cases passed")
    return True


def test_b_moderator_chat_tools():
    """
    (B) MODERATOR CHAT TOOLS — /api/mod/chat/*:
    1. As mod mute test user for 10m -> 200, then test user POST /api/chat -> 403, then admin unmute
    2. As mod mute with duration '1h' -> 400 (only 5m/10m/15m allowed)
    3. As mod mute admin user -> 400 (cannot mute staff)
    4. Send message as test user, then as mod DELETE message -> 200, verify deleted:true
    5. As plain test user POST /api/mod/chat/mute -> 403 (not moderator)
    """
    print("\n" + "="*80)
    print("TEST (B): MODERATOR CHAT TOOLS")
    print("="*80)
    
    mod_token, mod_user = login("mod")
    admin_token, admin_user = login("admin")
    test_token, test_user = login("test")
    
    print(f"✓ Logged in as mod (id={mod_user['id']})")
    print(f"✓ Logged in as admin (id={admin_user['id']})")
    print(f"✓ Logged in as test (id={test_user['id']})")
    
    # B1: As mod mute test user for 10m
    print("\nB1: As mod, mute test user for 10m")
    resp = requests.post(
        f"{BASE_URL}/mod/chat/mute",
        headers=headers(mod_token),
        json={"user_id": test_user["id"], "duration": "10m"}
    )
    assert resp.status_code == 200, f"Mute failed: {resp.status_code} {resp.text}"
    result = resp.json()
    assert result.get("ok") is True, f"Expected ok=true, got {result}"
    assert "muted_until" in result, f"Expected muted_until field, got {result}"
    print(f"   ✓ Test user muted: {result}")
    
    # B1b: Test user tries to post -> 403
    print("\nB1b: Test user tries to post message (should be 403 muted)")
    resp = requests.post(
        f"{BASE_URL}/chat",
        headers=headers(test_token),
        json={"room": "global", "text": "This should fail"}
    )
    assert resp.status_code == 403, f"Expected 403 (muted), got {resp.status_code} {resp.text}"
    print(f"   ✓ Test user blocked with 403 (muted)")
    
    # B1c: Admin unmutes test user
    print("\nB1c: Admin unmutes test user")
    resp = requests.post(
        f"{BASE_URL}/admin/chat/unmute",
        headers=headers(admin_token),
        json={"user_id": test_user["id"]}
    )
    assert resp.status_code == 200, f"Unmute failed: {resp.status_code} {resp.text}"
    print(f"   ✓ Test user unmuted")
    
    # B2: As mod mute with duration '1h' -> 400
    print("\nB2: As mod, mute test user with duration '1h' (should fail - only 5m/10m/15m allowed)")
    resp = requests.post(
        f"{BASE_URL}/mod/chat/mute",
        headers=headers(mod_token),
        json={"user_id": test_user["id"], "duration": "1h"}
    )
    assert resp.status_code == 400, f"Expected 400 (invalid duration), got {resp.status_code} {resp.text}"
    print(f"   ✓ Mute with '1h' correctly rejected with 400")
    
    # B3: As mod mute admin user -> 400
    print("\nB3: As mod, mute admin user (should fail - cannot mute staff)")
    resp = requests.post(
        f"{BASE_URL}/mod/chat/mute",
        headers=headers(mod_token),
        json={"user_id": admin_user["id"], "duration": "10m"}
    )
    assert resp.status_code == 400, f"Expected 400 (cannot mute staff), got {resp.status_code} {resp.text}"
    print(f"   ✓ Mute admin correctly rejected with 400")
    
    # B4: Send message as test user, then as mod DELETE message
    print("\nB4: Send message as test user, then mod deletes it")
    resp = requests.post(
        f"{BASE_URL}/chat",
        headers=headers(test_token),
        json={"room": "global", "text": "Test message to be deleted"}
    )
    assert resp.status_code == 200, f"Send message failed: {resp.status_code} {resp.text}"
    msg = resp.json()
    msg_id = msg.get("id")
    assert msg_id, f"Message has no id: {msg}"
    print(f"   ✓ Test user sent message: id={msg_id}")
    
    # B4b: Mod deletes the message
    print(f"\nB4b: Mod deletes message {msg_id}")
    resp = requests.delete(
        f"{BASE_URL}/mod/chat/message/{msg_id}",
        headers=headers(mod_token)
    )
    assert resp.status_code == 200, f"Delete message failed: {resp.status_code} {resp.text}"
    result = resp.json()
    assert result.get("ok") is True, f"Expected ok=true, got {result}"
    print(f"   ✓ Message deleted: {result}")
    
    # B4c: Verify message is deleted (GET /api/chat)
    print("\nB4c: Verify message shows deleted:true and text=''")
    resp = requests.get(f"{BASE_URL}/chat?room=global", headers=headers(test_token))
    assert resp.status_code == 200, f"GET chat failed: {resp.status_code} {resp.text}"
    chat_data = resp.json()
    messages = chat_data.get("messages", [])
    
    deleted_msg = None
    for m in messages:
        if m.get("id") == msg_id:
            deleted_msg = m
            break
    
    assert deleted_msg is not None, f"Deleted message not found in chat: {msg_id}"
    assert deleted_msg.get("deleted") is True, f"Expected deleted=true, got {deleted_msg.get('deleted')}"
    assert deleted_msg.get("text") == "", f"Expected text='', got {deleted_msg.get('text')}"
    print(f"   ✓ Message shows deleted=true and text=''")
    
    # B5: As plain test user POST /api/mod/chat/mute -> 403
    print("\nB5: As plain test user (role=user), try to mute someone (should fail - not moderator)")
    resp = requests.post(
        f"{BASE_URL}/mod/chat/mute",
        headers=headers(test_token),
        json={"user_id": admin_user["id"], "duration": "5m"}
    )
    assert resp.status_code == 403, f"Expected 403 (not moderator), got {resp.status_code} {resp.text}"
    print(f"   ✓ Test user (role=user) correctly blocked with 403")
    
    print("\n✅ TEST (B) PASSED: All 5 test cases passed")
    return True


def test_c_role_assignment_and_chat_badges():
    """
    (C) ROLE ASSIGNMENT + CHAT BADGE DATA:
    1. As admin PUT /api/admin/users/{test uuid} {role:'moderator'} -> 200, then set back to 'user'
    2. PUT /api/admin/users/{test uuid} {role:'bogus'} -> 400
    3. Have founder/mod/donor each send a chat message, then GET /api/chat -> verify role and donor flag
    """
    print("\n" + "="*80)
    print("TEST (C): ROLE ASSIGNMENT + CHAT BADGE DATA")
    print("="*80)
    
    admin_token, admin_user = login("admin")
    test_token, test_user = login("test")
    mod_token, mod_user = login("mod")
    founder_token, founder_user = login("founder")
    donor_token, donor_user = login("donor")
    
    print(f"✓ Logged in as admin (id={admin_user['id']})")
    print(f"✓ Logged in as test (id={test_user['id']})")
    print(f"✓ Logged in as mod (id={mod_user['id']})")
    print(f"✓ Logged in as founder (id={founder_user['id']})")
    print(f"✓ Logged in as donor (id={donor_user['id']})")
    
    # C1: As admin PUT /api/admin/users/{test uuid} {role:'moderator'}
    print(f"\nC1: As admin, set test user role to 'moderator'")
    resp = requests.put(
        f"{BASE_URL}/admin/users/{test_user['id']}",
        headers=headers(admin_token),
        json={"role": "moderator"}
    )
    assert resp.status_code == 200, f"Update role failed: {resp.status_code} {resp.text}"
    result = resp.json()
    assert result.get("role") == "moderator", f"Expected role='moderator', got {result.get('role')}"
    print(f"   ✓ Test user role updated to 'moderator': {result.get('role')}")
    
    # C1b: Set role back to 'user'
    print(f"\nC1b: Set test user role back to 'user'")
    resp = requests.put(
        f"{BASE_URL}/admin/users/{test_user['id']}",
        headers=headers(admin_token),
        json={"role": "user"}
    )
    assert resp.status_code == 200, f"Update role failed: {resp.status_code} {resp.text}"
    result = resp.json()
    assert result.get("role") == "user", f"Expected role='user', got {result.get('role')}"
    print(f"   ✓ Test user role restored to 'user': {result.get('role')}")
    
    # C2: PUT with role:'bogus' -> 400
    print(f"\nC2: As admin, set test user role to 'bogus' (should fail - invalid role)")
    resp = requests.put(
        f"{BASE_URL}/admin/users/{test_user['id']}",
        headers=headers(admin_token),
        json={"role": "bogus"}
    )
    assert resp.status_code == 400, f"Expected 400 (invalid role), got {resp.status_code} {resp.text}"
    print(f"   ✓ Invalid role 'bogus' correctly rejected with 400")
    
    # C3: Have founder/mod/donor each send a chat message
    print(f"\nC3: Have founder, mod, and donor each send a chat message")
    
    # Founder sends message
    resp = requests.post(
        f"{BASE_URL}/chat",
        headers=headers(founder_token),
        json={"room": "global", "text": "Message from founder"}
    )
    assert resp.status_code == 200, f"Founder send message failed: {resp.status_code} {resp.text}"
    founder_msg = resp.json()
    founder_msg_id = founder_msg.get("id")
    print(f"   ✓ Founder sent message: id={founder_msg_id}")
    
    # Mod sends message
    resp = requests.post(
        f"{BASE_URL}/chat",
        headers=headers(mod_token),
        json={"room": "global", "text": "Message from mod"}
    )
    assert resp.status_code == 200, f"Mod send message failed: {resp.status_code} {resp.text}"
    mod_msg = resp.json()
    mod_msg_id = mod_msg.get("id")
    print(f"   ✓ Mod sent message: id={mod_msg_id}")
    
    # Donor sends message
    resp = requests.post(
        f"{BASE_URL}/chat",
        headers=headers(donor_token),
        json={"room": "global", "text": "Message from donor"}
    )
    assert resp.status_code == 200, f"Donor send message failed: {resp.status_code} {resp.text}"
    donor_msg = resp.json()
    donor_msg_id = donor_msg.get("id")
    print(f"   ✓ Donor sent message: id={donor_msg_id}")
    
    # C3b: GET /api/chat and verify role and donor flag
    print(f"\nC3b: GET /api/chat and verify role and donor flag for each message")
    resp = requests.get(f"{BASE_URL}/chat?room=global", headers=headers(admin_token))
    assert resp.status_code == 200, f"GET chat failed: {resp.status_code} {resp.text}"
    chat_data = resp.json()
    messages = chat_data.get("messages", [])
    
    # Find the messages we just sent
    founder_chat_msg = None
    mod_chat_msg = None
    donor_chat_msg = None
    
    for m in messages:
        if m.get("id") == founder_msg_id:
            founder_chat_msg = m
        elif m.get("id") == mod_msg_id:
            mod_chat_msg = m
        elif m.get("id") == donor_msg_id:
            donor_chat_msg = m
    
    # Verify founder message
    assert founder_chat_msg is not None, f"Founder message not found: {founder_msg_id}"
    assert founder_chat_msg.get("role") == "founder", f"Expected role='founder', got {founder_chat_msg.get('role')}"
    assert "sender_msg_count" in founder_chat_msg, f"Expected sender_msg_count field in founder message"
    print(f"   ✓ Founder message has role='founder', sender_msg_count={founder_chat_msg.get('sender_msg_count')}")
    
    # Verify mod message
    assert mod_chat_msg is not None, f"Mod message not found: {mod_msg_id}"
    assert mod_chat_msg.get("role") == "moderator", f"Expected role='moderator', got {mod_chat_msg.get('role')}"
    assert "sender_msg_count" in mod_chat_msg, f"Expected sender_msg_count field in mod message"
    print(f"   ✓ Mod message has role='moderator', sender_msg_count={mod_chat_msg.get('sender_msg_count')}")
    
    # Verify donor message
    assert donor_chat_msg is not None, f"Donor message not found: {donor_msg_id}"
    assert donor_chat_msg.get("role") == "user", f"Expected role='user', got {donor_chat_msg.get('role')}"
    assert donor_chat_msg.get("donor") is True, f"Expected donor=true, got {donor_chat_msg.get('donor')}"
    assert "sender_msg_count" in donor_chat_msg, f"Expected sender_msg_count field in donor message"
    print(f"   ✓ Donor message has role='user', donor=true, sender_msg_count={donor_chat_msg.get('sender_msg_count')}")
    
    print("\n✅ TEST (C) PASSED: All 3 test cases passed")
    return True


def cleanup():
    """Cleanup: unmute/unban test user, delete test messages"""
    print("\n" + "="*80)
    print("CLEANUP")
    print("="*80)
    
    admin_token, admin_user = login("admin")
    test_token, test_user = login("test")
    
    # Unmute test user
    print("\nUnmuting test user...")
    resp = requests.post(
        f"{BASE_URL}/admin/chat/unmute",
        headers=headers(admin_token),
        json={"user_id": test_user["id"]}
    )
    if resp.status_code == 200:
        print("   ✓ Test user unmuted")
    else:
        print(f"   ⚠ Unmute failed (may already be unmuted): {resp.status_code}")
    
    # Unban test user
    print("\nUnbanning test user...")
    resp = requests.post(
        f"{BASE_URL}/admin/chat/unban",
        headers=headers(admin_token),
        json={"user_id": test_user["id"]}
    )
    if resp.status_code == 200:
        print("   ✓ Test user unbanned")
    else:
        print(f"   ⚠ Unban failed (may already be unbanned): {resp.status_code}")
    
    # Delete test messages (soft-delete all messages from this test run)
    print("\nDeleting test messages...")
    resp = requests.get(f"{BASE_URL}/chat?room=global&limit=50", headers=headers(admin_token))
    if resp.status_code == 200:
        chat_data = resp.json()
        messages = chat_data.get("messages", [])
        test_texts = [
            "Message from founder",
            "Message from mod",
            "Message from donor",
            "Test message to be deleted"
        ]
        deleted_count = 0
        for m in messages:
            if m.get("text") in test_texts and not m.get("deleted"):
                msg_id = m.get("id")
                resp = requests.delete(
                    f"{BASE_URL}/admin/chat/message/{msg_id}",
                    headers=headers(admin_token)
                )
                if resp.status_code == 200:
                    deleted_count += 1
        print(f"   ✓ Deleted {deleted_count} test messages")
    
    print("\n✅ CLEANUP COMPLETE")


def main():
    print("="*80)
    print("CARTOONIX BACKEND TESTING - NEW FEATURES")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Testing 3 features:")
    print("  (A) Robust favorite removal")
    print("  (B) Moderator chat tools")
    print("  (C) Role assignment + chat badge data")
    print("="*80)
    
    try:
        # Run all tests
        test_a_robust_favorites_removal()
        test_b_moderator_chat_tools()
        test_c_role_assignment_and_chat_badges()
        
        # Cleanup
        cleanup()
        
        print("\n" + "="*80)
        print("✅ ALL TESTS PASSED (3/3)")
        print("="*80)
        return True
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
