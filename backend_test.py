#!/usr/bin/env python3
"""
Backend API tests for Cartoonix Chat Moderator Role feature.

Tests the new moderator role functionality:
- Admin promote/demote moderators
- Moderator mute/unmute actions
- Moderator audit logs
- Chat message is_moderator field
"""
import requests
import sys
import time

# Base URL from frontend/.env
BASE_URL = "https://stream-player-63.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "test_admin@cartoonix.ro"
ADMIN_PASSWORD = "TestAdmin#2026"

FREE_EMAIL = "test_free@cartoonix.ro"
FREE_PASSWORD = "TestFree#2026"

NEW_EMAIL = "test_new@cartoonix.ro"
NEW_PASSWORD = "TestNew#2026"

PLUS_EMAIL = "test_plus@cartoonix.ro"
PLUS_PASSWORD = "TestPlus#2026"


def login(email: str, password: str) -> tuple[str, dict]:
    """Login and return (token, user_dict)."""
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
        timeout=10,
    )
    if resp.status_code != 200:
        print(f"❌ Login failed for {email}: {resp.status_code} {resp.text}")
        sys.exit(1)
    data = resp.json()
    return data["access_token"], data["user"]


def get_user_info(token: str) -> dict:
    """Get current user info via /auth/me."""
    resp = requests.get(
        f"{BASE_URL}/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    if resp.status_code != 200:
        print(f"❌ GET /auth/me failed: {resp.status_code} {resp.text}")
        sys.exit(1)
    return resp.json()


def get_notifications(token: str) -> list:
    """Get user notifications."""
    resp = requests.get(
        f"{BASE_URL}/notifications",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    if resp.status_code != 200:
        print(f"❌ GET /notifications failed: {resp.status_code} {resp.text}")
        return []
    data = resp.json()
    return data.get("items", [])


def main():
    print("=" * 80)
    print("BACKEND TEST: Chat Moderator Role")
    print("=" * 80)
    
    # Login all test users
    print("\n[Setup] Logging in test users...")
    admin_token, admin_user = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    free_token, free_user = login(FREE_EMAIL, FREE_PASSWORD)
    new_token, new_user = login(NEW_EMAIL, NEW_PASSWORD)
    plus_token, plus_user = login(PLUS_EMAIL, PLUS_PASSWORD)
    
    free_id = free_user["id"]
    new_id = new_user["id"]
    admin_id = admin_user["id"]
    
    print(f"✅ Admin: {admin_user['nickname']} (id={admin_id[:8]}...)")
    print(f"✅ Free: {free_user['nickname']} (id={free_id[:8]}...)")
    print(f"✅ New: {new_user['nickname']} (id={new_id[:8]}...)")
    print(f"✅ Plus: {plus_user['nickname']} (id={plus_user['id'][:8]}...)")
    
    passed = 0
    failed = 0
    
    # ========================================================================
    # TEST 1: Permissions on promote (non-admin → 403, no token → 401/403)
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST 1: Permissions on promote endpoint")
    print("=" * 80)
    
    # 1a: Non-admin token (test_new) → 403
    print("\n[1a] POST /admin/moderators/{free_id}/promote with non-admin token (test_new)...")
    resp = requests.post(
        f"{BASE_URL}/admin/moderators/{free_id}/promote",
        headers={"Authorization": f"Bearer {new_token}"},
        timeout=10,
    )
    if resp.status_code == 403:
        print(f"✅ PASS: Non-admin returns 403 (detail: {resp.json().get('detail', '')})")
        passed += 1
    else:
        print(f"❌ FAIL: Expected 403, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # 1b: No token → 401
    print("\n[1b] POST /admin/moderators/{free_id}/promote with no token...")
    resp = requests.post(
        f"{BASE_URL}/admin/moderators/{free_id}/promote",
        timeout=10,
    )
    if resp.status_code in (401, 403):
        print(f"✅ PASS: No token returns {resp.status_code} (detail: {resp.json().get('detail', '')})")
        passed += 1
    else:
        print(f"❌ FAIL: Expected 401/403, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # ========================================================================
    # TEST 2: Promote flow (admin promotes test_free)
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST 2: Promote flow (admin promotes test_free)")
    print("=" * 80)
    
    # 2a: Get test_free id (already have it from login)
    print(f"\n[2a] test_free id: {free_id}")
    
    # 2b: POST /admin/moderators/{free_id}/promote as admin → 200
    print(f"\n[2b] POST /admin/moderators/{free_id}/promote as admin...")
    resp = requests.post(
        f"{BASE_URL}/admin/moderators/{free_id}/promote",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    if resp.status_code == 200:
        data = resp.json()
        if data.get("success") and data.get("moderator", {}).get("is_moderator") is True:
            print(f"✅ PASS: Promote returns 200, is_moderator=true")
            print(f"   Moderator: {data['moderator']['nickname']}, since={data['moderator'].get('moderator_since', 'N/A')[:19]}")
            passed += 1
        else:
            print(f"❌ FAIL: Response missing success or is_moderator: {data}")
            failed += 1
    else:
        print(f"❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # 2c: Re-login test_free and GET /auth/me → is_moderator==true
    print("\n[2c] Re-login test_free and GET /auth/me...")
    free_token, free_user = login(FREE_EMAIL, FREE_PASSWORD)
    if free_user.get("is_moderator") is True:
        print(f"✅ PASS: GET /auth/me returns is_moderator=true for test_free")
        passed += 1
    else:
        print(f"❌ FAIL: is_moderator={free_user.get('is_moderator')} (expected True)")
        failed += 1
    
    # 2d: GET /notifications as test_free → notification exists
    print("\n[2d] GET /notifications as test_free...")
    time.sleep(0.5)  # Brief delay for notification to be inserted
    notifications = get_notifications(free_token)
    promo_notif = [n for n in notifications if "Moderator" in n.get("title", "")]
    if promo_notif:
        print(f"✅ PASS: Notification found: '{promo_notif[0]['title']}'")
        passed += 1
    else:
        print(f"❌ FAIL: No moderator promotion notification found (total notifications: {len(notifications)})")
        failed += 1
    
    # ========================================================================
    # TEST 3: Promote idempotency (promote again → 400)
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST 3: Promote idempotency (promote already-moderator → 400)")
    print("=" * 80)
    
    print(f"\n[3] POST /admin/moderators/{free_id}/promote again...")
    resp = requests.post(
        f"{BASE_URL}/admin/moderators/{free_id}/promote",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    if resp.status_code == 400:
        print(f"✅ PASS: Promote idempotency returns 400 (detail: {resp.json().get('detail', '')})")
        passed += 1
    else:
        print(f"❌ FAIL: Expected 400, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # ========================================================================
    # TEST 4: Moderator mute (test_free mutes test_new with mute_5m)
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST 4: Moderator mute (test_free mutes test_new with mute_5m)")
    print("=" * 80)
    
    print(f"\n[4] POST /chat/mod/moderate as test_free (moderator)...")
    resp = requests.post(
        f"{BASE_URL}/chat/mod/moderate",
        headers={"Authorization": f"Bearer {free_token}"},
        json={"user_id": new_id, "action": "mute_5m"},
        timeout=10,
    )
    if resp.status_code == 200:
        data = resp.json()
        if data.get("success") and data.get("active", {}).get("type") == "mute":
            print(f"✅ PASS: Moderator mute returns 200, active.type='mute'")
            print(f"   Until: {data['active'].get('until', 'N/A')[:19]}")
            passed += 1
        else:
            print(f"❌ FAIL: Response missing success or active.type: {data}")
            failed += 1
    else:
        print(f"❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # ========================================================================
    # TEST 5: Moderator restrictions
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST 5: Moderator restrictions")
    print("=" * 80)
    
    # 5a: Mute self → 400
    print(f"\n[5a] POST /chat/mod/moderate (test_free mutes self)...")
    resp = requests.post(
        f"{BASE_URL}/chat/mod/moderate",
        headers={"Authorization": f"Bearer {free_token}"},
        json={"user_id": free_id, "action": "mute_5m"},
        timeout=10,
    )
    if resp.status_code == 400:
        print(f"✅ PASS: Mute self returns 400 (detail: {resp.json().get('detail', '')})")
        passed += 1
    else:
        print(f"❌ FAIL: Expected 400, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # 5b: Mute admin → 400
    print(f"\n[5b] POST /chat/mod/moderate (test_free mutes admin)...")
    resp = requests.post(
        f"{BASE_URL}/chat/mod/moderate",
        headers={"Authorization": f"Bearer {free_token}"},
        json={"user_id": admin_id, "action": "mute_5m"},
        timeout=10,
    )
    if resp.status_code == 400:
        print(f"✅ PASS: Mute admin returns 400 (detail: {resp.json().get('detail', '')})")
        passed += 1
    else:
        print(f"❌ FAIL: Expected 400, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # 5c: Action "ban" → 403
    print(f"\n[5c] POST /chat/mod/moderate (test_free action='ban')...")
    resp = requests.post(
        f"{BASE_URL}/chat/mod/moderate",
        headers={"Authorization": f"Bearer {free_token}"},
        json={"user_id": new_id, "action": "ban"},
        timeout=10,
    )
    if resp.status_code == 403:
        print(f"✅ PASS: Action 'ban' returns 403 (detail: {resp.json().get('detail', '')})")
        passed += 1
    else:
        print(f"❌ FAIL: Expected 403, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # 5d: Action "mute_perm" → 403
    print(f"\n[5d] POST /chat/mod/moderate (test_free action='mute_perm')...")
    resp = requests.post(
        f"{BASE_URL}/chat/mod/moderate",
        headers={"Authorization": f"Bearer {free_token}"},
        json={"user_id": new_id, "action": "mute_perm"},
        timeout=10,
    )
    if resp.status_code == 403:
        print(f"✅ PASS: Action 'mute_perm' returns 403 (detail: {resp.json().get('detail', '')})")
        passed += 1
    else:
        print(f"❌ FAIL: Expected 403, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # ========================================================================
    # TEST 6: Non-moderator blocked
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST 6: Non-moderator blocked (test_new tries to moderate)")
    print("=" * 80)
    
    print(f"\n[6] POST /chat/mod/moderate as test_new (not a moderator)...")
    resp = requests.post(
        f"{BASE_URL}/chat/mod/moderate",
        headers={"Authorization": f"Bearer {new_token}"},
        json={"user_id": free_id, "action": "mute_5m"},
        timeout=10,
    )
    if resp.status_code == 403:
        print(f"✅ PASS: Non-moderator returns 403 (detail: {resp.json().get('detail', '')})")
        passed += 1
    else:
        print(f"❌ FAIL: Expected 403, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # ========================================================================
    # TEST 7: Unmute (test_free unmutes test_new)
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST 7: Unmute (test_free unmutes test_new)")
    print("=" * 80)
    
    print(f"\n[7] POST /chat/mod/moderate (test_free unmutes test_new)...")
    resp = requests.post(
        f"{BASE_URL}/chat/mod/moderate",
        headers={"Authorization": f"Bearer {free_token}"},
        json={"user_id": new_id, "action": "unmute"},
        timeout=10,
    )
    if resp.status_code == 200:
        data = resp.json()
        if data.get("success") and data.get("active") is None:
            print(f"✅ PASS: Unmute returns 200, active=null")
            passed += 1
        else:
            print(f"❌ FAIL: Expected active=null, got: {data}")
            failed += 1
    else:
        print(f"❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # ========================================================================
    # TEST 8: Mod logs (admin gets logs, non-admin → 403)
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST 8: Mod logs (admin gets logs, non-admin → 403)")
    print("=" * 80)
    
    # 8a: Admin GET /chat/admin/mod-logs → 200 with items
    print(f"\n[8a] GET /chat/admin/mod-logs as admin...")
    resp = requests.get(
        f"{BASE_URL}/chat/admin/mod-logs",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    if resp.status_code == 200:
        data = resp.json()
        items = data.get("items", [])
        # Check for recent mute and unmute actions on NewUser by FreeUser
        recent_logs = [
            log for log in items
            if log.get("target_nickname") == new_user["nickname"]
            and log.get("moderator_nickname") == free_user["nickname"]
        ]
        if len(recent_logs) >= 2:  # Should have mute and unmute
            print(f"✅ PASS: Mod logs returns 200 with {len(items)} items")
            print(f"   Recent actions on {new_user['nickname']} by {free_user['nickname']}: {len(recent_logs)}")
            for log in recent_logs[:2]:
                print(f"   - {log.get('action')}: {log.get('duration', 'N/A')} (reason: {log.get('reason', 'N/A')})")
            passed += 1
        else:
            print(f"❌ FAIL: Expected at least 2 recent logs, found {len(recent_logs)}")
            print(f"   Total logs: {len(items)}")
            failed += 1
    else:
        print(f"❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # 8b: Non-admin GET /chat/admin/mod-logs → 403
    print(f"\n[8b] GET /chat/admin/mod-logs as test_new (non-admin)...")
    resp = requests.get(
        f"{BASE_URL}/chat/admin/mod-logs",
        headers={"Authorization": f"Bearer {new_token}"},
        timeout=10,
    )
    if resp.status_code == 403:
        print(f"✅ PASS: Non-admin returns 403 (detail: {resp.json().get('detail', '')})")
        passed += 1
    else:
        print(f"❌ FAIL: Expected 403, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # ========================================================================
    # TEST 9: Chat message includes is_moderator
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST 9: Chat message includes is_moderator field")
    print("=" * 80)
    
    print(f"\n[9] POST /chat/send as test_free (moderator)...")
    import random
    random_suffix = random.randint(1000, 9999)
    resp = requests.post(
        f"{BASE_URL}/chat/send",
        headers={"Authorization": f"Bearer {free_token}"},
        json={"room": "global", "content": f"Salut, sunt moderator! {random_suffix}"},
        timeout=10,
    )
    if resp.status_code == 200:
        data = resp.json()
        message = data.get("message", {})
        if message.get("is_moderator") is True:
            print(f"✅ PASS: Chat message has is_moderator=true")
            print(f"   Message: '{message.get('content', '')[:50]}...'")
            passed += 1
        else:
            print(f"❌ FAIL: is_moderator={message.get('is_moderator')} (expected True)")
            failed += 1
    else:
        print(f"❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # ========================================================================
    # TEST 10: Demote (admin demotes test_free)
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST 10: Demote (admin demotes test_free)")
    print("=" * 80)
    
    # 10a: POST /admin/moderators/{free_id}/demote as admin → 200
    print(f"\n[10a] POST /admin/moderators/{free_id}/demote as admin...")
    resp = requests.post(
        f"{BASE_URL}/admin/moderators/{free_id}/demote",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    if resp.status_code == 200:
        data = resp.json()
        if data.get("success"):
            print(f"✅ PASS: Demote returns 200, success=true")
            passed += 1
        else:
            print(f"❌ FAIL: Response missing success: {data}")
            failed += 1
    else:
        print(f"❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # 10b: Re-login test_free and GET /auth/me → is_moderator==false
    print(f"\n[10b] Re-login test_free and GET /auth/me...")
    free_token, free_user = login(FREE_EMAIL, FREE_PASSWORD)
    if free_user.get("is_moderator") is False:
        print(f"✅ PASS: GET /auth/me returns is_moderator=false for test_free")
        passed += 1
    else:
        print(f"❌ FAIL: is_moderator={free_user.get('is_moderator')} (expected False)")
        failed += 1
    
    # 10c: GET /admin/moderators → test_free not in list
    print(f"\n[10c] GET /admin/moderators (verify test_free not listed)...")
    resp = requests.get(
        f"{BASE_URL}/admin/moderators",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    if resp.status_code == 200:
        data = resp.json()
        items = data.get("items", [])
        free_in_list = any(m.get("id") == free_id for m in items)
        if not free_in_list:
            print(f"✅ PASS: test_free not in moderators list (total moderators: {len(items)})")
            passed += 1
        else:
            print(f"❌ FAIL: test_free still in moderators list")
            failed += 1
    else:
        print(f"❌ FAIL: Expected 200, got {resp.status_code}: {resp.text}")
        failed += 1
    
    # ========================================================================
    # FINAL CLEANUP VERIFICATION
    # ========================================================================
    print("\n" + "=" * 80)
    print("FINAL CLEANUP VERIFICATION")
    print("=" * 80)
    
    print(f"\n[Cleanup] Verifying test_free is demoted (is_moderator=false)...")
    free_info = get_user_info(free_token)
    if free_info.get("is_moderator") is False:
        print(f"✅ CLEANUP OK: test_free.is_moderator=false")
    else:
        print(f"⚠️  CLEANUP WARNING: test_free.is_moderator={free_info.get('is_moderator')}")
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    total = passed + failed
    print(f"\nTotal tests: {total}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"Success rate: {passed}/{total} ({100*passed//total if total > 0 else 0}%)")
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {failed} TEST(S) FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
