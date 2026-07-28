#!/usr/bin/env python3
"""
Comprehensive backend API tests for Cartoonix
Tests password change endpoint and admin chat commands
"""

import requests
import json
import random
import string
from typing import Optional

# Backend URL from frontend/.env
BASE_URL = "https://cartoon-redesign.preview.emergentagent.com/api"

# Admin credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@cartoonix.app"
ADMIN_PASSWORD = "Admin1234!"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "total": 0
}


def random_email():
    """Generate random email for test users"""
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_{rand}@example.com"


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


def register_user(email: str, password: str, name: str = "Test User") -> Optional[dict]:
    """Register a new user and return token + user data"""
    try:
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "email": email,
            "password": password,
            "name": name,
            "avatar": ""
        }, timeout=10)
        if resp.status_code == 200:
            return resp.json()
        else:
            print(f"   Registration failed: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"   Registration error: {e}")
        return None


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
            return None
    except Exception as e:
        print(f"   Login error: {e}")
        return None


def change_password(token: str, current_password: str, new_password: str) -> tuple[int, dict]:
    """Change password and return status code + response"""
    try:
        resp = requests.put(f"{BASE_URL}/auth/password", 
            json={
                "current_password": current_password,
                "new_password": new_password
            },
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        return resp.status_code, resp.json() if resp.status_code != 422 else resp.text
    except Exception as e:
        print(f"   Change password error: {e}")
        return 0, {}


def post_chat_message(token: str, text: str, room: str = "global") -> Optional[dict]:
    """Post a chat message and return the response"""
    try:
        resp = requests.post(f"{BASE_URL}/chat",
            json={"text": text, "room": room},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        if resp.status_code == 200:
            return resp.json()
        else:
            print(f"   Chat post failed: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"   Chat post error: {e}")
        return None


def get_chat_messages(token: str, room: str = "global") -> Optional[list]:
    """Get chat messages"""
    try:
        resp = requests.get(f"{BASE_URL}/chat",
            params={"room": room},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        if resp.status_code == 200:
            return resp.json()
        else:
            print(f"   Chat get failed: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"   Chat get error: {e}")
        return None


# ============================================================================
# A) PASSWORD CHANGE ENDPOINT TESTS
# ============================================================================

print("\n" + "="*80)
print("A) PASSWORD CHANGE ENDPOINT TESTS")
print("="*80 + "\n")

# First, ensure maintenance mode is disabled
print("Checking maintenance mode...")
try:
    # Login as admin first
    admin_login = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
    if admin_login and "token" in admin_login:
        temp_admin_token = admin_login["token"]
        resp = requests.post(f"{BASE_URL}/admin/maintenance",
            json={"enabled": False},
            headers={"Authorization": f"Bearer {temp_admin_token}"},
            timeout=10
        )
        if resp.status_code == 200:
            print("✓ Maintenance mode disabled for testing\n")
        else:
            print(f"⚠ Could not disable maintenance mode: {resp.status_code}\n")
except Exception as e:
    print(f"⚠ Error checking maintenance mode: {e}\n")

# A1: Register a fresh regular user
print("A1: Register fresh user with password 'OldPass1'")
test_email = random_email()
test_password_old = "OldPass1"
test_password_new = "NewPass9"

user_data = register_user(test_email, test_password_old, "Password Test User")
if user_data and "token" in user_data:
    user_token = user_data["token"]
    log_test("A1: Register fresh user", True, f"Email: {test_email}")
else:
    log_test("A1: Register fresh user", False, "Registration failed")
    user_token = None

# A2: Wrong current password
if user_token:
    print("\nA2: Call PUT /api/auth/password with wrong current password")
    status, response = change_password(user_token, "WrongPassword123", "NewPass9")
    if status == 400:
        try:
            detail = response.get("detail", "") if isinstance(response, dict) else ""
            if "Parola actuală este incorectă" in detail:
                log_test("A2: Wrong current password → 400", True, f"Detail: {detail}")
            else:
                log_test("A2: Wrong current password → 400", False, f"Wrong detail message: {detail}")
        except:
            log_test("A2: Wrong current password → 400", False, f"Response: {response}")
    else:
        log_test("A2: Wrong current password → 400", False, f"Got status {status} instead of 400")

# A3: Current == new password
if user_token:
    print("\nA3: Call PUT /api/auth/password with current == new")
    status, response = change_password(user_token, test_password_old, test_password_old)
    if status == 400:
        try:
            detail = response.get("detail", "") if isinstance(response, dict) else ""
            if "diferită de cea actuală" in detail:
                log_test("A3: Current == new → 400", True, f"Detail: {detail}")
            else:
                log_test("A3: Current == new → 400", False, f"Wrong detail message: {detail}")
        except:
            log_test("A3: Current == new → 400", False, f"Response: {response}")
    else:
        log_test("A3: Current == new → 400", False, f"Got status {status} instead of 400")

# A4: New password too short
if user_token:
    print("\nA4: Call PUT /api/auth/password with new_password too short")
    status, response = change_password(user_token, test_password_old, "abc")
    if status == 422:
        log_test("A4: Too short password → 422", True, "Pydantic validation triggered")
    else:
        log_test("A4: Too short password → 422", False, f"Got status {status} instead of 422, response: {response}")

# A5: Successful password change and verify login
if user_token:
    print("\nA5: Call PUT /api/auth/password with correct current and valid new password")
    status, response = change_password(user_token, test_password_old, test_password_new)
    if status == 200 and isinstance(response, dict) and response.get("ok") == True:
        log_test("A5a: Password change successful → {ok:true}", True)
        
        # Verify login with new password
        print("   Verifying login with new password...")
        print(f"   Email: {test_email}, New password: {test_password_new}")
        login_result = login_user(test_email, test_password_new)
        if login_result and "token" in login_result:
            log_test("A5b: Login with new password works", True)
        else:
            print(f"   Login result: {login_result}")
            # Try to get more details
            try:
                resp = requests.post(f"{BASE_URL}/auth/login", json={
                    "email": test_email,
                    "password": test_password_new
                }, timeout=10)
                print(f"   Login response status: {resp.status_code}")
                print(f"   Login response body: {resp.text}")
            except Exception as e:
                print(f"   Debug login error: {e}")
            log_test("A5b: Login with new password works", False, "Login failed with new password")
        
        # Verify old password fails
        print("   Verifying old password fails...")
        old_login = login_user(test_email, test_password_old)
        if old_login is None or "token" not in old_login:
            log_test("A5c: Login with old password fails", True)
        else:
            log_test("A5c: Login with old password fails", False, "Old password still works!")
    else:
        log_test("A5a: Password change successful → {ok:true}", False, f"Status: {status}, Response: {response}")


# ============================================================================
# B) ADMIN CHAT COMMANDS TESTS
# ============================================================================

print("\n" + "="*80)
print("B) ADMIN CHAT COMMANDS TESTS")
print("="*80 + "\n")

# Login as admin
print("Logging in as admin...")
admin_data = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
if admin_data and "token" in admin_data:
    admin_token = admin_data["token"]
    log_test("Admin login", True, f"Admin: {ADMIN_EMAIL}")
    
    # Disable maintenance mode for testing
    print("Disabling maintenance mode for testing...")
    try:
        resp = requests.post(f"{BASE_URL}/admin/maintenance",
            json={"enabled": False},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        if resp.status_code == 200:
            print("   ✓ Maintenance mode disabled")
        else:
            print(f"   ⚠ Could not disable maintenance mode: {resp.status_code}")
    except Exception as e:
        print(f"   ⚠ Error disabling maintenance mode: {e}")
else:
    log_test("Admin login", False, "Could not login as admin")
    admin_token = None

# Create a regular user for testing
print("\nCreating regular user for command tests...")
regular_email = random_email()
regular_data = register_user(regular_email, "RegularPass1", "Regular User")
if regular_data and "token" in regular_data:
    regular_token = regular_data["token"]
    log_test("Regular user creation", True, f"Email: {regular_email}")
else:
    log_test("Regular user creation", False)
    regular_token = None

# B1: Regular user posts /important → command should be null
if regular_token:
    print("\nB1: Regular user posts /important hi")
    msg = post_chat_message(regular_token, "/important hi", "global")
    if msg:
        command = msg.get("command")
        text = msg.get("text")
        if command is None and text == "/important hi":
            log_test("B1: Regular user /important → command=null, text literal", True, f"Text: {text}")
        else:
            log_test("B1: Regular user /important → command=null, text literal", False, 
                    f"command={command}, text={text}")
    else:
        log_test("B1: Regular user /important → command=null, text literal", False, "Message post failed")

# B2: Admin posts /important Breaking!
if admin_token:
    print("\nB2: Admin posts /important Breaking!")
    msg = post_chat_message(admin_token, "/important Breaking!", "global")
    if msg:
        command = msg.get("command")
        text = msg.get("text")
        if command == "important" and text == "Breaking!":
            log_test("B2: Admin /important → command='important', text='Breaking!'", True)
        else:
            log_test("B2: Admin /important → command='important', text='Breaking!'", False,
                    f"command={command}, text={text}")
    else:
        log_test("B2: Admin /important → command='important', text='Breaking!'", False, "Message post failed")

# B3: Test all admin commands
if admin_token:
    print("\nB3: Test /announce, /warn, /success, /info commands")
    commands_to_test = [
        ("announce", "System announcement"),
        ("warn", "Warning message"),
        ("success", "Success notification"),
        ("info", "Information update")
    ]
    
    all_passed = True
    for cmd, body in commands_to_test:
        msg = post_chat_message(admin_token, f"/{cmd} {body}", "global")
        if msg:
            returned_cmd = msg.get("command")
            returned_text = msg.get("text")
            if returned_cmd == cmd and returned_text == body:
                print(f"   ✓ /{cmd} → command='{cmd}', text='{body}'")
            else:
                print(f"   ✗ /{cmd} → command={returned_cmd}, text={returned_text}")
                all_passed = False
        else:
            print(f"   ✗ /{cmd} → message post failed")
            all_passed = False
    
    log_test("B3: All admin commands work correctly", all_passed)

# B4: Admin posts unknown command
if admin_token:
    print("\nB4: Admin posts /unknown foo")
    msg = post_chat_message(admin_token, "/unknown foo", "global")
    if msg:
        command = msg.get("command")
        if command is None:
            log_test("B4: Admin /unknown → command=null", True)
        else:
            log_test("B4: Admin /unknown → command=null", False, f"command={command}")
    else:
        log_test("B4: Admin /unknown → command=null", False, "Message post failed")

# B5: Admin posts command with no body
if admin_token:
    print("\nB5: Admin posts /important (no body)")
    msg = post_chat_message(admin_token, "/important", "global")
    if msg:
        command = msg.get("command")
        if command is None:
            log_test("B5: Admin /important (no body) → command=null", True)
        else:
            log_test("B5: Admin /important (no body) → command=null", False, f"command={command}")
    else:
        log_test("B5: Admin /important (no body) → command=null", False, "Message post failed")

# B6: Admin posts command with mixed case and spaces
if admin_token:
    print("\nB6: Admin posts '  /IMPORTANT   Mixed Case  '")
    msg = post_chat_message(admin_token, "  /IMPORTANT   Mixed Case  ", "global")
    if msg:
        command = msg.get("command")
        text = msg.get("text")
        if command == "important" and text == "Mixed Case":
            log_test("B6: Admin /IMPORTANT (mixed case) → command='important', text='Mixed Case'", True)
        else:
            log_test("B6: Admin /IMPORTANT (mixed case) → command='important', text='Mixed Case'", False,
                    f"command={command}, text={text}")
    else:
        log_test("B6: Admin /IMPORTANT (mixed case) → command='important', text='Mixed Case'", False, "Message post failed")

# B7: GET /api/chat returns messages with command field
if admin_token:
    print("\nB7: GET /api/chat?room=global with admin token")
    messages = get_chat_messages(admin_token, "global")
    if messages:
        important_msgs = [m for m in messages if m.get("command") == "important"]
        if len(important_msgs) > 0:
            log_test("B7: GET /api/chat returns message with command='important'", True,
                    f"Found {len(important_msgs)} important message(s)")
        else:
            log_test("B7: GET /api/chat returns message with command='important'", False,
                    "No messages with command='important' found")
    else:
        log_test("B7: GET /api/chat returns message with command='important'", False, "Failed to get messages")


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
    print("\n🎉 ALL TESTS PASSED!")
    exit(0)
else:
    print(f"\n⚠️  {len(test_results['failed'])} test(s) failed")
    exit(1)
