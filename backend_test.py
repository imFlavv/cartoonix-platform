#!/usr/bin/env python3
"""Comprehensive backend test for Cartoonix Chat API."""
import json
import time
import requests
from typing import Optional

# Backend URL
BASE_URL = "https://platform-refresh-pro.preview.emergentagent.com/api"

# Test credentials
CREDENTIALS = {
    "admin": {"email": "test_admin@cartoonix.ro", "password": "TestAdmin#2026"},
    "plus": {"email": "test_plus@cartoonix.ro", "password": "TestPlus#2026"},
    "free": {"email": "test_free@cartoonix.ro", "password": "TestFree#2026"},
    "new": {"email": "test_new@cartoonix.ro", "password": "TestNew#2026"},
}

# Store tokens and user info
tokens = {}
users = {}

# Test results
results = {
    "passed": [],
    "failed": [],
}


def log_pass(test_name: str):
    """Log a passed test."""
    print(f"✅ PASS: {test_name}")
    results["passed"].append(test_name)


def log_fail(test_name: str, reason: str):
    """Log a failed test."""
    print(f"❌ FAIL: {test_name}")
    print(f"   Reason: {reason}")
    results["failed"].append({"test": test_name, "reason": reason})


def login(user_type: str) -> Optional[str]:
    """Login and return access token."""
    creds = CREDENTIALS[user_type]
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json=creds,
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("access_token")
            user = data.get("user")
            tokens[user_type] = token
            users[user_type] = user
            print(f"✓ Logged in as {user_type}: {user.get('nickname')} ({user.get('email')})")
            return token
        else:
            print(f"✗ Login failed for {user_type}: {resp.status_code} {resp.text}")
            return None
    except Exception as e:
        print(f"✗ Login exception for {user_type}: {e}")
        return None


def test_chat_state():
    """Test GET /api/chat/state for all users."""
    print("\n=== Testing GET /api/chat/state ===")
    
    # Test admin
    test_name = "chat/state - admin"
    try:
        resp = requests.get(
            f"{BASE_URL}/chat/state",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            settings = data.get("settings", {})
            you = data.get("you", {})
            
            if not settings:
                log_fail(test_name, "settings missing")
            elif you.get("role") != "admin":
                log_fail(test_name, f"role should be admin, got {you.get('role')}")
            elif not you.get("can_send"):
                log_fail(test_name, "admin should have can_send=true")
            else:
                log_pass(test_name)
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test plus user
    test_name = "chat/state - plus user"
    try:
        resp = requests.get(
            f"{BASE_URL}/chat/state",
            headers={"Authorization": f"Bearer {tokens['plus']}"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            you = data.get("you", {})
            
            if you.get("plan") != "plus":
                log_fail(test_name, f"plan should be plus, got {you.get('plan')}")
            elif not you.get("can_send"):
                log_fail(test_name, "plus user should have can_send=true")
            elif you.get("restricted_new_user"):
                log_fail(test_name, "plus user (30d old) should not be restricted")
            else:
                log_pass(test_name)
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test free user
    test_name = "chat/state - free user"
    try:
        resp = requests.get(
            f"{BASE_URL}/chat/state",
            headers={"Authorization": f"Bearer {tokens['free']}"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            you = data.get("you", {})
            
            if not you.get("can_send"):
                log_fail(test_name, "free user (10d old) should have can_send=true")
            elif you.get("restricted_new_user"):
                log_fail(test_name, "free user (10d old) should not be restricted")
            else:
                log_pass(test_name)
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test new user
    test_name = "chat/state - new user (restricted)"
    try:
        resp = requests.get(
            f"{BASE_URL}/chat/state",
            headers={"Authorization": f"Bearer {tokens['new']}"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            you = data.get("you", {})
            
            if you.get("can_send"):
                log_fail(test_name, "new user (0d old) should have can_send=false")
            elif not you.get("restricted_new_user"):
                log_fail(test_name, "new user should have restricted_new_user=true")
            elif not you.get("restricted_until"):
                log_fail(test_name, "new user should have restricted_until")
            else:
                log_pass(test_name)
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")


def test_send_message():
    """Test POST /api/chat/send with various scenarios."""
    print("\n=== Testing POST /api/chat/send ===")
    
    # Test 1: Free user sends message successfully
    test_name = "chat/send - free user success"
    try:
        resp = requests.post(
            f"{BASE_URL}/chat/send",
            headers={"Authorization": f"Bearer {tokens['free']}"},
            json={"room": "global", "content": "Salut! Acesta este un test."},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            msg = data.get("message", {})
            if not msg.get("nickname"):
                log_fail(test_name, "message missing nickname")
            elif not msg.get("avatar_url"):
                log_fail(test_name, "message missing avatar_url")
            elif msg.get("plan") != "free":
                log_fail(test_name, f"plan should be free, got {msg.get('plan')}")
            else:
                log_pass(test_name)
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 2: Immediate retry should hit cooldown
    test_name = "chat/send - cooldown enforcement"
    try:
        resp = requests.post(
            f"{BASE_URL}/chat/send",
            headers={"Authorization": f"Bearer {tokens['free']}"},
            json={"room": "global", "content": "Mesaj imediat după primul."},
            timeout=10
        )
        if resp.status_code == 429:
            log_pass(test_name)
        else:
            log_fail(test_name, f"expected 429, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 3: New user should be blocked
    test_name = "chat/send - new user blocked (3 day restriction)"
    try:
        resp = requests.post(
            f"{BASE_URL}/chat/send",
            headers={"Authorization": f"Bearer {tokens['new']}"},
            json={"room": "global", "content": "Mesaj de la utilizator nou."},
            timeout=10
        )
        if resp.status_code == 403:
            text = resp.text.lower()
            if "3" in text or "zile" in text or "zile" in resp.json().get("detail", "").lower():
                log_pass(test_name)
            else:
                log_fail(test_name, f"403 but message doesn't mention 3 days: {resp.text}")
        else:
            log_fail(test_name, f"expected 403, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 4: Plus user posting to plus room
    test_name = "chat/send - plus user to plus room"
    try:
        resp = requests.post(
            f"{BASE_URL}/chat/send",
            headers={"Authorization": f"Bearer {tokens['plus']}"},
            json={"room": "plus", "content": "Mesaj în camera PLUS."},
            timeout=10
        )
        if resp.status_code == 200:
            log_pass(test_name)
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Wait for cooldown before next test
    print("⏳ Waiting 6s for cooldown...")
    time.sleep(6)
    
    # Test 5: Free user posting to plus room should fail
    test_name = "chat/send - free user to plus room blocked"
    try:
        resp = requests.post(
            f"{BASE_URL}/chat/send",
            headers={"Authorization": f"Bearer {tokens['free']}"},
            json={"room": "plus", "content": "Încerc să intru în PLUS."},
            timeout=10
        )
        if resp.status_code == 403:
            text = resp.text.lower()
            if "plus" in text:
                log_pass(test_name)
            else:
                log_fail(test_name, f"403 but message doesn't mention PLUS: {resp.text}")
        else:
            log_fail(test_name, f"expected 403, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 6: Link blocking
    test_name = "chat/send - link blocking"
    try:
        resp = requests.post(
            f"{BASE_URL}/chat/send",
            headers={"Authorization": f"Bearer {tokens['free']}"},
            json={"room": "global", "content": "Vezi pe http://example.com"},
            timeout=10
        )
        if resp.status_code == 400:
            log_pass(test_name)
        else:
            log_fail(test_name, f"expected 400, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Wait for cooldown
    print("⏳ Waiting 6s for cooldown...")
    time.sleep(6)
    
    # Test 7: Profanity censoring
    test_name = "chat/send - profanity censored"
    try:
        resp = requests.post(
            f"{BASE_URL}/chat/send",
            headers={"Authorization": f"Bearer {tokens['free']}"},
            json={"room": "global", "content": "ESTI UN BOU MARE"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            msg = data.get("message", {})
            content = msg.get("content", "")
            # Should be censored (bou -> b** or similar)
            if "***" in content or "b***" in content.lower() or msg.get("censored"):
                log_pass(test_name)
            else:
                log_fail(test_name, f"content not censored: {content}")
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 8: Duplicate spam (send same message 3 times)
    test_name = "chat/send - duplicate spam detection"
    try:
        # Wait for cooldown
        print("⏳ Waiting 6s for cooldown...")
        time.sleep(6)
        
        # Send first
        resp1 = requests.post(
            f"{BASE_URL}/chat/send",
            headers={"Authorization": f"Bearer {tokens['free']}"},
            json={"room": "global", "content": "Mesaj identic pentru test spam"},
            timeout=10
        )
        
        # Wait and send second
        print("⏳ Waiting 6s for cooldown...")
        time.sleep(6)
        resp2 = requests.post(
            f"{BASE_URL}/chat/send",
            headers={"Authorization": f"Bearer {tokens['free']}"},
            json={"room": "global", "content": "Mesaj identic pentru test spam"},
            timeout=10
        )
        
        # Wait and send third (should be blocked)
        print("⏳ Waiting 6s for cooldown...")
        time.sleep(6)
        resp3 = requests.post(
            f"{BASE_URL}/chat/send",
            headers={"Authorization": f"Bearer {tokens['free']}"},
            json={"room": "global", "content": "Mesaj identic pentru test spam"},
            timeout=10
        )
        
        if resp1.status_code == 200 and resp2.status_code == 200 and resp3.status_code == 429:
            log_pass(test_name)
        else:
            log_fail(test_name, f"expected 200,200,429 got {resp1.status_code},{resp2.status_code},{resp3.status_code}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")


def test_get_messages():
    """Test GET /api/chat/messages."""
    print("\n=== Testing GET /api/chat/messages ===")
    
    # Test 1: Free user gets global messages
    test_name = "chat/messages - free user global room"
    try:
        resp = requests.get(
            f"{BASE_URL}/chat/messages?room=global",
            headers={"Authorization": f"Bearer {tokens['free']}"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("items", [])
            if isinstance(items, list):
                log_pass(test_name)
            else:
                log_fail(test_name, "items should be a list")
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 2: Free user accessing plus room should fail
    test_name = "chat/messages - free user plus room blocked"
    try:
        resp = requests.get(
            f"{BASE_URL}/chat/messages?room=plus",
            headers={"Authorization": f"Bearer {tokens['free']}"},
            timeout=10
        )
        if resp.status_code == 403:
            log_pass(test_name)
        else:
            log_fail(test_name, f"expected 403, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 3: Plus user accessing plus room
    test_name = "chat/messages - plus user plus room"
    try:
        resp = requests.get(
            f"{BASE_URL}/chat/messages?room=plus",
            headers={"Authorization": f"Bearer {tokens['plus']}"},
            timeout=10
        )
        if resp.status_code == 200:
            log_pass(test_name)
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")


def test_heartbeat_presence():
    """Test POST /api/chat/heartbeat and GET /api/chat/presence."""
    print("\n=== Testing heartbeat and presence ===")
    
    # Test heartbeat
    test_name = "chat/heartbeat - success"
    try:
        resp = requests.post(
            f"{BASE_URL}/chat/heartbeat",
            headers={"Authorization": f"Bearer {tokens['free']}"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                log_pass(test_name)
            else:
                log_fail(test_name, "success should be true")
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test presence
    test_name = "chat/presence - online count"
    try:
        resp = requests.get(
            f"{BASE_URL}/chat/presence",
            headers={"Authorization": f"Bearer {tokens['free']}"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            online_total = data.get("online_total", 0)
            if online_total >= 1:
                log_pass(test_name)
            else:
                log_fail(test_name, f"online_total should be >= 1, got {online_total}")
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")


def test_admin_endpoints():
    """Test admin endpoints."""
    print("\n=== Testing admin endpoints ===")
    
    # Test 1: Admin state
    test_name = "chat/admin/state - success"
    try:
        resp = requests.get(
            f"{BASE_URL}/chat/admin/state",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if "settings" in data and "stats" in data:
                log_pass(test_name)
            else:
                log_fail(test_name, "missing settings or stats")
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 2: Admin messages
    test_name = "chat/admin/messages - global room"
    try:
        resp = requests.get(
            f"{BASE_URL}/chat/admin/messages?room=global",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
            timeout=10
        )
        if resp.status_code == 200:
            log_pass(test_name)
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 3: Disable chat messages
    test_name = "chat/admin/settings - disable messages"
    try:
        resp = requests.patch(
            f"{BASE_URL}/chat/admin/settings",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
            json={"chat_messages_enabled": False},
            timeout=10
        )
        if resp.status_code == 200:
            # Try to send as free user (should fail)
            time.sleep(1)
            resp2 = requests.post(
                f"{BASE_URL}/chat/send",
                headers={"Authorization": f"Bearer {tokens['free']}"},
                json={"room": "global", "content": "Test când chat-ul e oprit"},
                timeout=10
            )
            if resp2.status_code == 403:
                # Re-enable
                resp3 = requests.patch(
                    f"{BASE_URL}/chat/admin/settings",
                    headers={"Authorization": f"Bearer {tokens['admin']}"},
                    json={"chat_messages_enabled": True},
                    timeout=10
                )
                if resp3.status_code == 200:
                    log_pass(test_name)
                else:
                    log_fail(test_name, f"failed to re-enable: {resp3.status_code}")
            else:
                log_fail(test_name, f"send should fail with 403, got {resp2.status_code}")
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 4: Mute user
    test_name = "chat/admin/moderate - mute_5m"
    try:
        free_user_id = users['free'].get('id')
        resp = requests.post(
            f"{BASE_URL}/chat/admin/moderate",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
            json={"user_id": free_user_id, "action": "mute_5m", "reason": "Test mute"},
            timeout=10
        )
        if resp.status_code == 200:
            # Try to send as free user (should fail)
            time.sleep(1)
            resp2 = requests.post(
                f"{BASE_URL}/chat/send",
                headers={"Authorization": f"Bearer {tokens['free']}"},
                json={"room": "global", "content": "Test când sunt muted"},
                timeout=10
            )
            if resp2.status_code == 403:
                text = resp2.text.lower()
                if "silențiat" in text or "silentiat" in text or "mute" in text:
                    # Unmute
                    resp3 = requests.post(
                        f"{BASE_URL}/chat/admin/moderate",
                        headers={"Authorization": f"Bearer {tokens['admin']}"},
                        json={"user_id": free_user_id, "action": "unmute"},
                        timeout=10
                    )
                    if resp3.status_code == 200:
                        log_pass(test_name)
                    else:
                        log_fail(test_name, f"failed to unmute: {resp3.status_code}")
                else:
                    log_fail(test_name, f"403 but message doesn't mention mute: {resp2.text}")
            else:
                log_fail(test_name, f"send should fail with 403, got {resp2.status_code}")
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 5: Admin cannot ban self
    test_name = "chat/admin/moderate - cannot ban self"
    try:
        admin_user_id = users['admin'].get('id')
        resp = requests.post(
            f"{BASE_URL}/chat/admin/moderate",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
            json={"user_id": admin_user_id, "action": "ban"},
            timeout=10
        )
        if resp.status_code == 400:
            log_pass(test_name)
        else:
            log_fail(test_name, f"expected 400, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 6: Get a message ID and test delete + pin
    test_name = "chat/admin/messages - delete and pin"
    try:
        # First, send a message as admin to get an ID
        resp = requests.post(
            f"{BASE_URL}/chat/send",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
            json={"room": "global", "content": "Mesaj pentru test delete/pin"},
            timeout=10
        )
        if resp.status_code == 200:
            msg_id = resp.json().get("message", {}).get("id")
            
            # Pin it
            resp2 = requests.post(
                f"{BASE_URL}/chat/admin/pin",
                headers={"Authorization": f"Bearer {tokens['admin']}"},
                json={"message_id": msg_id},
                timeout=10
            )
            if resp2.status_code == 200:
                # Check state has pinned message
                resp3 = requests.get(
                    f"{BASE_URL}/chat/state",
                    headers={"Authorization": f"Bearer {tokens['admin']}"},
                    timeout=10
                )
                if resp3.status_code == 200:
                    pinned = resp3.json().get("settings", {}).get("chat_pinned_message")
                    if pinned and pinned.get("message_id") == msg_id:
                        # Unpin
                        resp4 = requests.post(
                            f"{BASE_URL}/chat/admin/pin",
                            headers={"Authorization": f"Bearer {tokens['admin']}"},
                            json={"message_id": None},
                            timeout=10
                        )
                        if resp4.status_code == 200:
                            # Delete message
                            resp5 = requests.delete(
                                f"{BASE_URL}/chat/admin/messages/{msg_id}",
                                headers={"Authorization": f"Bearer {tokens['admin']}"},
                                timeout=10
                            )
                            if resp5.status_code == 200:
                                log_pass(test_name)
                            else:
                                log_fail(test_name, f"delete failed: {resp5.status_code}")
                        else:
                            log_fail(test_name, f"unpin failed: {resp4.status_code}")
                    else:
                        log_fail(test_name, f"pinned message not found in state")
                else:
                    log_fail(test_name, f"state check failed: {resp3.status_code}")
            else:
                log_fail(test_name, f"pin failed: {resp2.status_code}")
        else:
            log_fail(test_name, f"send failed: {resp.status_code}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 7: Sanctions list
    test_name = "chat/admin/sanctions - list"
    try:
        resp = requests.get(
            f"{BASE_URL}/chat/admin/sanctions",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data:
                log_pass(test_name)
            else:
                log_fail(test_name, "missing items")
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 8: User history
    test_name = "chat/admin/users/{id}/history"
    try:
        free_user_id = users['free'].get('id')
        resp = requests.get(
            f"{BASE_URL}/chat/admin/users/{free_user_id}/history",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if "user" in data and "messages" in data:
                log_pass(test_name)
            else:
                log_fail(test_name, "missing user or messages")
        else:
            log_fail(test_name, f"status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")


def test_authorization():
    """Test authorization checks."""
    print("\n=== Testing authorization ===")
    
    # Test 1: No token
    test_name = "chat/state - no token (401)"
    try:
        resp = requests.get(f"{BASE_URL}/chat/state", timeout=10)
        if resp.status_code == 401:
            log_pass(test_name)
        else:
            log_fail(test_name, f"expected 401, got {resp.status_code}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 2: Free user accessing admin endpoint
    test_name = "chat/admin/state - free user (403)"
    try:
        resp = requests.get(
            f"{BASE_URL}/chat/admin/state",
            headers={"Authorization": f"Bearer {tokens['free']}"},
            timeout=10
        )
        if resp.status_code == 403:
            log_pass(test_name)
        else:
            log_fail(test_name, f"expected 403, got {resp.status_code}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")
    
    # Test 3: Plus user accessing admin settings
    test_name = "chat/admin/settings - plus user (403)"
    try:
        resp = requests.patch(
            f"{BASE_URL}/chat/admin/settings",
            headers={"Authorization": f"Bearer {tokens['plus']}"},
            json={"chat_slow_mode_seconds": 10},
            timeout=10
        )
        if resp.status_code == 403:
            log_pass(test_name)
        else:
            log_fail(test_name, f"expected 403, got {resp.status_code}")
    except Exception as e:
        log_fail(test_name, f"exception: {e}")


def print_summary():
    """Print test summary."""
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    total = len(results["passed"]) + len(results["failed"])
    passed = len(results["passed"])
    failed = len(results["failed"])
    
    print(f"\nTotal tests: {total}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    
    if results["failed"]:
        print("\n" + "="*60)
        print("FAILED TESTS:")
        print("="*60)
        for fail in results["failed"]:
            print(f"\n❌ {fail['test']}")
            print(f"   {fail['reason']}")
    
    print("\n" + "="*60)


def main():
    """Main test runner."""
    print("="*60)
    print("CARTOONIX CHAT BACKEND TEST")
    print("="*60)
    print(f"Backend URL: {BASE_URL}")
    
    # Login all users
    print("\n=== Logging in test users ===")
    for user_type in ["admin", "plus", "free", "new"]:
        if not login(user_type):
            print(f"⚠️  Failed to login {user_type}, some tests will be skipped")
            return
    
    # Run tests
    test_chat_state()
    test_send_message()
    test_get_messages()
    test_heartbeat_presence()
    test_admin_endpoints()
    test_authorization()
    
    # Print summary
    print_summary()


if __name__ == "__main__":
    main()
