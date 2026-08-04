#!/usr/bin/env python3
"""
Users Schema Alignment Tests for Cartoonix
Tests the refactored user schema with UUID id, nickname, avatar_url, subscription fields
"""

import requests
import json
import re
from pymongo import MongoClient
from typing import Optional

# Backend URL from frontend/.env
BASE_URL = "https://explore-platform-6.preview.emergentagent.com/api"

# MongoDB connection (from backend/.env)
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "cartoonix"

# Credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@cartoonix.ro"
ADMIN_PASSWORD = "admin1234"
TEST_USER_EMAIL = "test@cartoonix.ro"
TEST_USER_PASSWORD = "test1234"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "total": 0
}

# MongoDB client
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]


def log_test(test_name: str, passed: bool, details: str = ""):
    """Log test result"""
    test_results["total"] += 1
    if passed:
        test_results["passed"].append(test_name)
        print(f"✅ {test_name}")
        if details:
            print(f"   {details}")
    else:
        test_results["failed"].append(test_name)
        print(f"❌ {test_name}")
        if details:
            print(f"   {details}")


def is_uuid(value: str) -> bool:
    """Check if string is a valid UUID (36 chars with dashes)"""
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(uuid_pattern, value, re.IGNORECASE))


def login_user(email: str, password: str) -> Optional[dict]:
    """Login user and return token + user data"""
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": password
        }, timeout=10)
        if resp.status_code == 200:
            return resp.json()
        else:
            print(f"   Login failed: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"   Login error: {e}")
        return None


def get_user_from_db(email: str) -> Optional[dict]:
    """Get user document from MongoDB"""
    try:
        return db.users.find_one({"email": email})
    except Exception as e:
        print(f"   DB query error: {e}")
        return None


# ============================================================================
# TEST 1: Login for both users - verify UUID id, role, plus field
# ============================================================================

print("\n" + "="*80)
print("TEST 1: POST /api/auth/login - Verify UUID id, role, plus field")
print("="*80 + "\n")

# Test 1a: Admin login
print("1a: Login as admin@cartoonix.ro")
admin_login = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
if admin_login and "token" in admin_login and "user" in admin_login:
    admin_token = admin_login["token"]
    admin_user = admin_login["user"]
    
    # Check id is UUID
    user_id = admin_user.get("id", "")
    if is_uuid(user_id):
        log_test("1a: Admin user.id is UUID", True, f"id={user_id}")
    else:
        log_test("1a: Admin user.id is UUID", False, f"id={user_id} (not UUID format)")
    
    # Check role
    role = admin_user.get("role", "")
    if role == "admin":
        log_test("1a: Admin user.role == 'admin'", True)
    else:
        log_test("1a: Admin user.role == 'admin'", False, f"role={role}")
    
    # Check plus
    plus = admin_user.get("plus")
    if plus == True:
        log_test("1a: Admin user.plus == true", True)
    else:
        log_test("1a: Admin user.plus == true", False, f"plus={plus}")
else:
    log_test("1a: Admin login", False, "Login failed")
    admin_token = None

# Test 1b: Test user login
print("\n1b: Login as test@cartoonix.ro")
test_login = login_user(TEST_USER_EMAIL, TEST_USER_PASSWORD)
if test_login and "token" in test_login and "user" in test_login:
    test_token = test_login["token"]
    test_user = test_login["user"]
    
    # Check id is UUID
    user_id = test_user.get("id", "")
    if is_uuid(user_id):
        log_test("1b: Test user.id is UUID", True, f"id={user_id}")
        test_user_id = user_id  # Store for later tests
    else:
        log_test("1b: Test user.id is UUID", False, f"id={user_id} (not UUID format)")
        test_user_id = None
    
    # Check role
    role = test_user.get("role", "")
    if role == "user":
        log_test("1b: Test user.role == 'user'", True)
    else:
        log_test("1b: Test user.role == 'user'", False, f"role={role}")
    
    # Check plus
    plus = test_user.get("plus")
    if plus == False:
        log_test("1b: Test user.plus == false", True)
    else:
        log_test("1b: Test user.plus == false", False, f"plus={plus}")
else:
    log_test("1b: Test user login", False, "Login failed")
    test_token = None
    test_user_id = None


# ============================================================================
# TEST 2: GET /api/auth/me - Verify UUID id
# ============================================================================

print("\n" + "="*80)
print("TEST 2: GET /api/auth/me - Verify UUID id")
print("="*80 + "\n")

# Test 2a: Admin /me
if admin_token:
    print("2a: GET /api/auth/me as admin")
    try:
        resp = requests.get(f"{BASE_URL}/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        if resp.status_code == 200:
            me_user = resp.json()
            user_id = me_user.get("id", "")
            if is_uuid(user_id):
                log_test("2a: Admin /me returns UUID id", True, f"id={user_id}")
            else:
                log_test("2a: Admin /me returns UUID id", False, f"id={user_id}")
        else:
            log_test("2a: Admin /me returns UUID id", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("2a: Admin /me returns UUID id", False, f"Error: {e}")

# Test 2b: Test user /me
if test_token:
    print("\n2b: GET /api/auth/me as test user")
    try:
        resp = requests.get(f"{BASE_URL}/auth/me",
            headers={"Authorization": f"Bearer {test_token}"},
            timeout=10
        )
        if resp.status_code == 200:
            me_user = resp.json()
            user_id = me_user.get("id", "")
            if is_uuid(user_id):
                log_test("2b: Test user /me returns UUID id", True, f"id={user_id}")
            else:
                log_test("2b: Test user /me returns UUID id", False, f"id={user_id}")
        else:
            log_test("2b: Test user /me returns UUID id", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("2b: Test user /me returns UUID id", False, f"Error: {e}")


# ============================================================================
# TEST 3: PUT /api/auth/profile - Verify DB field is `nickname`
# ============================================================================

print("\n" + "="*80)
print("TEST 3: PUT /api/auth/profile - Verify DB field is `nickname`")
print("="*80 + "\n")

if test_token:
    print("3: PUT /api/auth/profile {name:'Nume Nou'} as test user")
    
    # Get original nickname from DB
    original_user = get_user_from_db(TEST_USER_EMAIL)
    original_nickname = original_user.get("nickname", "") if original_user else ""
    print(f"   Original nickname in DB: {original_nickname}")
    
    # Update profile
    try:
        resp = requests.put(f"{BASE_URL}/auth/profile",
            json={"name": "Nume Nou"},
            headers={"Authorization": f"Bearer {test_token}"},
            timeout=10
        )
        if resp.status_code == 200:
            log_test("3a: Profile update returns 200", True)
            
            # Verify in MongoDB that `nickname` field was updated
            updated_user = get_user_from_db(TEST_USER_EMAIL)
            if updated_user:
                nickname = updated_user.get("nickname", "")
                name_field = updated_user.get("name", None)
                
                if nickname == "Nume Nou":
                    log_test("3b: DB field `nickname` == 'Nume Nou'", True)
                else:
                    log_test("3b: DB field `nickname` == 'Nume Nou'", False, f"nickname={nickname}")
                
                # Verify that `name` field does NOT exist (should be `nickname` only)
                if name_field is None:
                    log_test("3c: DB does NOT have `name` field (uses `nickname`)", True)
                else:
                    log_test("3c: DB does NOT have `name` field (uses `nickname`)", False, f"name field exists: {name_field}")
            else:
                log_test("3b: DB field `nickname` == 'Nume Nou'", False, "Could not query DB")
        else:
            log_test("3a: Profile update returns 200", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("3a: Profile update returns 200", False, f"Error: {e}")


# ============================================================================
# TEST 4: PUT /api/auth/avatar - Verify DB field is `avatar_url`, test premium
# ============================================================================

print("\n" + "="*80)
print("TEST 4: PUT /api/auth/avatar - Verify DB field is `avatar_url`")
print("="*80 + "\n")

if test_token:
    # Test 4a: Non-premium avatar
    print("4a: PUT /api/auth/avatar with non-premium avatar as test user")
    non_premium_avatar = "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Test"
    
    try:
        resp = requests.put(f"{BASE_URL}/auth/avatar",
            json={"avatar": non_premium_avatar},
            headers={"Authorization": f"Bearer {test_token}"},
            timeout=10
        )
        if resp.status_code == 200:
            log_test("4a: Non-premium avatar update returns 200", True)
            
            # Verify in MongoDB that `avatar_url` field was updated
            updated_user = get_user_from_db(TEST_USER_EMAIL)
            if updated_user:
                avatar_url = updated_user.get("avatar_url", "")
                avatar_field = updated_user.get("avatar", None)
                
                if avatar_url == non_premium_avatar:
                    log_test("4b: DB field `avatar_url` updated correctly", True, f"avatar_url={avatar_url[:50]}...")
                else:
                    log_test("4b: DB field `avatar_url` updated correctly", False, f"avatar_url={avatar_url}")
                
                # Verify that `avatar` field does NOT exist (should be `avatar_url` only)
                if avatar_field is None:
                    log_test("4c: DB does NOT have `avatar` field (uses `avatar_url`)", True)
                else:
                    log_test("4c: DB does NOT have `avatar` field (uses `avatar_url`)", False, f"avatar field exists: {avatar_field}")
            else:
                log_test("4b: DB field `avatar_url` updated correctly", False, "Could not query DB")
        else:
            log_test("4a: Non-premium avatar update returns 200", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("4a: Non-premium avatar update returns 200", False, f"Error: {e}")
    
    # Test 4d: Premium avatar as free user
    print("\n4d: PUT /api/auth/avatar with premium avatar as test user (free)")
    premium_avatar = "https://api.dicebear.com/9.x/lorelei/svg?seed=Aurora&backgroundColor=b6e3f4"
    
    try:
        resp = requests.put(f"{BASE_URL}/auth/avatar",
            json={"avatar": premium_avatar},
            headers={"Authorization": f"Bearer {test_token}"},
            timeout=10
        )
        if resp.status_code == 403:
            detail = resp.json().get("detail", "")
            log_test("4d: Premium avatar as free user returns 403", True, f"Detail: {detail}")
        else:
            log_test("4d: Premium avatar as free user returns 403", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("4d: Premium avatar as free user returns 403", False, f"Error: {e}")


# ============================================================================
# TEST 5: Admin users endpoint - Verify subscription field
# ============================================================================

print("\n" + "="*80)
print("TEST 5: GET /api/admin/users and PUT /api/admin/users/{id}")
print("="*80 + "\n")

if admin_token and test_user_id:
    # Test 5a: GET /api/admin/users
    print("5a: GET /api/admin/users as admin")
    try:
        resp = requests.get(f"{BASE_URL}/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        if resp.status_code == 200:
            users = resp.json()
            # Find test user by email
            test_user_in_list = None
            for u in users:
                if u.get("email") == TEST_USER_EMAIL:
                    test_user_in_list = u
                    break
            
            if test_user_in_list:
                found_id = test_user_in_list.get("id", "")
                if is_uuid(found_id):
                    log_test("5a: Admin users list contains test user with UUID id", True, f"id={found_id}")
                    test_user_id = found_id  # Update with the correct ID
                else:
                    log_test("5a: Admin users list contains test user with UUID id", False, f"id={found_id}")
            else:
                log_test("5a: Admin users list contains test user with UUID id", False, "Test user not found in list")
        else:
            log_test("5a: Admin users list contains test user with UUID id", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("5a: Admin users list contains test user with UUID id", False, f"Error: {e}")
    
    # Test 5b: PUT /api/admin/users/{id} to set plus=true
    print(f"\n5b: PUT /api/admin/users/{test_user_id} with plus=true")
    try:
        resp = requests.put(f"{BASE_URL}/admin/users/{test_user_id}",
            json={"plus": True},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        if resp.status_code == 200:
            log_test("5b: Update user plus=true returns 200", True)
            
            # Verify in MongoDB that `subscription` field == "plus"
            updated_user = get_user_from_db(TEST_USER_EMAIL)
            if updated_user:
                subscription = updated_user.get("subscription", "")
                if subscription == "plus":
                    log_test("5c: DB field `subscription` == 'plus'", True)
                else:
                    log_test("5c: DB field `subscription` == 'plus'", False, f"subscription={subscription}")
            else:
                log_test("5c: DB field `subscription` == 'plus'", False, "Could not query DB")
        else:
            log_test("5b: Update user plus=true returns 200", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("5b: Update user plus=true returns 200", False, f"Error: {e}")
    
    # Test 5d: PUT /api/admin/users/{id} to set plus=false
    print(f"\n5d: PUT /api/admin/users/{test_user_id} with plus=false")
    try:
        resp = requests.put(f"{BASE_URL}/admin/users/{test_user_id}",
            json={"plus": False},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        if resp.status_code == 200:
            log_test("5d: Update user plus=false returns 200", True)
            
            # Verify in MongoDB that `subscription` field == "free"
            updated_user = get_user_from_db(TEST_USER_EMAIL)
            if updated_user:
                subscription = updated_user.get("subscription", "")
                if subscription == "free":
                    log_test("5e: DB field `subscription` == 'free'", True)
                else:
                    log_test("5e: DB field `subscription` == 'free'", False, f"subscription={subscription}")
            else:
                log_test("5e: DB field `subscription` == 'free'", False, "Could not query DB")
        else:
            log_test("5d: Update user plus=false returns 200", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("5d: Update user plus=false returns 200", False, f"Error: {e}")


# ============================================================================
# TEST 6: Presence endpoint - Verify last_active and presence_seconds
# ============================================================================

print("\n" + "="*80)
print("TEST 6: POST /api/presence and GET /api/presence/online")
print("="*80 + "\n")

if test_token:
    # Test 6a: POST /api/presence
    print("6a: POST /api/presence as test user")
    try:
        resp = requests.post(f"{BASE_URL}/presence",
            headers={"Authorization": f"Bearer {test_token}"},
            timeout=10
        )
        if resp.status_code == 200:
            log_test("6a: Presence heartbeat returns 200", True)
            
            # Verify in MongoDB that `last_active` and `presence_seconds` are set
            updated_user = get_user_from_db(TEST_USER_EMAIL)
            if updated_user:
                last_active = updated_user.get("last_active")
                presence_seconds = updated_user.get("presence_seconds")
                
                if last_active:
                    log_test("6b: DB field `last_active` is set", True, f"last_active={last_active}")
                else:
                    log_test("6b: DB field `last_active` is set", False, "last_active is None")
                
                if presence_seconds is not None and isinstance(presence_seconds, (int, float)):
                    log_test("6c: DB field `presence_seconds` is numeric", True, f"presence_seconds={presence_seconds}")
                else:
                    log_test("6c: DB field `presence_seconds` is numeric", False, f"presence_seconds={presence_seconds}")
            else:
                log_test("6b: DB field `last_active` is set", False, "Could not query DB")
        else:
            log_test("6a: Presence heartbeat returns 200", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("6a: Presence heartbeat returns 200", False, f"Error: {e}")
    
    # Test 6d: GET /api/presence/online
    print("\n6d: GET /api/presence/online")
    try:
        resp = requests.get(f"{BASE_URL}/presence/online", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            online = data.get("online", 0)
            if online >= 1:
                log_test("6d: Online count >= 1", True, f"online={online}")
            else:
                log_test("6d: Online count >= 1", False, f"online={online}")
        else:
            log_test("6d: Online count >= 1", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("6d: Online count >= 1", False, f"Error: {e}")


# ============================================================================
# TEST 7: Payments guard - Verify subscription=plus guard
# ============================================================================

print("\n" + "="*80)
print("TEST 7: POST /api/payments/checkout - Verify subscription guard")
print("="*80 + "\n")

# Test 7a: Test user (free) can create checkout
if test_token:
    print("7a: POST /api/payments/checkout as test user (subscription=free)")
    try:
        resp = requests.post(f"{BASE_URL}/payments/checkout",
            json={"origin_url": "https://example.com"},
            headers={"Authorization": f"Bearer {test_token}"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            checkout_url = data.get("checkout_url", "")
            if checkout_url:
                log_test("7a: Free user can create checkout (200 with checkout_url)", True)
            else:
                log_test("7a: Free user can create checkout (200 with checkout_url)", False, "No checkout_url")
        else:
            log_test("7a: Free user can create checkout (200 with checkout_url)", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("7a: Free user can create checkout (200 with checkout_url)", False, f"Error: {e}")

# Test 7b: Admin (subscription=plus) cannot create checkout
if admin_token:
    print("\n7b: POST /api/payments/checkout as admin (subscription=plus)")
    try:
        resp = requests.post(f"{BASE_URL}/payments/checkout",
            json={"origin_url": "https://example.com"},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        if resp.status_code == 400:
            data = resp.json()
            detail = data.get("detail", "")
            if "Ai deja Cartoonix PLUS activ" in detail:
                log_test("7b: Plus user checkout returns 400 with correct message", True, f"Detail: {detail}")
            else:
                log_test("7b: Plus user checkout returns 400 with correct message", False, f"Wrong detail: {detail}")
        else:
            log_test("7b: Plus user checkout returns 400 with correct message", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("7b: Plus user checkout returns 400 with correct message", False, f"Error: {e}")


# ============================================================================
# RESTORE TEST USER STATE
# ============================================================================

print("\n" + "="*80)
print("CLEANUP: Restore test user state")
print("="*80 + "\n")

if admin_token and test_user_id:
    # Restore subscription to free
    print("Restoring test user subscription to 'free'...")
    try:
        resp = requests.put(f"{BASE_URL}/admin/users/{test_user_id}",
            json={"plus": False},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        if resp.status_code == 200:
            print("✓ Test user subscription restored to 'free'")
        else:
            print(f"⚠ Could not restore subscription: {resp.status_code}")
    except Exception as e:
        print(f"⚠ Error restoring subscription: {e}")
    
    # Restore nickname to "Cont Test"
    print("Restoring test user nickname to 'Cont Test'...")
    try:
        # Login as test user to get token
        test_login_restore = login_user(TEST_USER_EMAIL, TEST_USER_PASSWORD)
        if test_login_restore and "token" in test_login_restore:
            restore_token = test_login_restore["token"]
            resp = requests.put(f"{BASE_URL}/auth/profile",
                json={"name": "Cont Test"},
                headers={"Authorization": f"Bearer {restore_token}"},
                timeout=10
            )
            if resp.status_code == 200:
                print("✓ Test user nickname restored to 'Cont Test'")
            else:
                print(f"⚠ Could not restore nickname: {resp.status_code}")
    except Exception as e:
        print(f"⚠ Error restoring nickname: {e}")


# ============================================================================
# SUMMARY
# ============================================================================

print("\n" + "="*80)
print("TEST SUMMARY")
print("="*80)
print(f"\nTotal tests: {test_results['total']}")
print(f"Passed: {len(test_results['passed'])} ✅")
print(f"Failed: {len(test_results['failed'])} ❌")

if test_results['failed']:
    print("\n❌ FAILED TESTS:")
    for test in test_results['failed']:
        print(f"  - {test}")

if len(test_results['passed']) == test_results['total']:
    print("\n🎉 ALL SCHEMA ALIGNMENT TESTS PASSED!")
    exit(0)
else:
    print(f"\n⚠️  {len(test_results['failed'])} test(s) failed")
    exit(1)
