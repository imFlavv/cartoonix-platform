#!/usr/bin/env python3
"""
Comprehensive backend API tests for Cartoonix
Tests password change endpoint, admin chat commands, support tickets, and playlist limits
"""

import requests
import json
import random
import string
from typing import Optional

# Backend URL from frontend/.env
BASE_URL = "https://explore-platform-6.preview.emergentagent.com/api"

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
# C) STRIPE PAYMENT TESTS (Cartoonix PLUS lifetime)
# ============================================================================

print("\n" + "="*80)
print("C) STRIPE PAYMENT TESTS (Cartoonix PLUS lifetime)")
print("="*80 + "\n")

# C1: Login as test user and create checkout session
print("C1: Login as test user and POST /api/payments/checkout")
test_user_data = login_user(TEST_USER_EMAIL, TEST_USER_PASSWORD)
if test_user_data and "token" in test_user_data:
    test_user_token = test_user_data["token"]
    test_user_info = test_user_data.get("user", {})
    log_test("C1a: Test user login", True, f"Email: {TEST_USER_EMAIL}, plus={test_user_info.get('plus')}")
    
    # Create checkout session
    print("   Creating checkout session...")
    try:
        resp = requests.post(f"{BASE_URL}/payments/checkout",
            json={"origin_url": "https://example.com"},
            headers={"Authorization": f"Bearer {test_user_token}"},
            timeout=10
        )
        print(f"   Response status: {resp.status_code}")
        print(f"   Response body: {resp.text[:500]}")
        
        if resp.status_code == 200:
            data = resp.json()
            checkout_url = data.get("checkout_url", "")
            session_id = data.get("session_id", "")
            
            # Check if checkout_url is a real Stripe URL
            if "stripe.com" in checkout_url and session_id:
                log_test("C1b: Checkout session created with real Stripe URL", True, 
                        f"URL domain: {checkout_url.split('/')[2] if '/' in checkout_url else 'N/A'}, session_id: {session_id[:20]}...")
                
                # Store session_id for next test
                test_session_id = session_id
            else:
                log_test("C1b: Checkout session created with real Stripe URL", False,
                        f"checkout_url={checkout_url}, session_id={session_id}")
                test_session_id = None
        else:
            log_test("C1b: Checkout session created with real Stripe URL", False,
                    f"Status {resp.status_code}: {resp.text}")
            test_session_id = None
    except Exception as e:
        log_test("C1b: Checkout session created with real Stripe URL", False, f"Error: {e}")
        test_session_id = None
else:
    log_test("C1a: Test user login", False, "Could not login as test user")
    test_user_token = None
    test_session_id = None

# C2: GET /api/payments/status/{session_id} without auth
if test_session_id:
    print("\nC2: GET /api/payments/status/{session_id} without auth header")
    try:
        resp = requests.get(f"{BASE_URL}/payments/status/{test_session_id}", timeout=10)
        print(f"   Response status: {resp.status_code}")
        print(f"   Response body: {resp.text}")
        
        if resp.status_code == 200:
            data = resp.json()
            payment_status = data.get("payment_status", "")
            status = data.get("status", "")
            
            if payment_status == "pending":
                log_test("C2: Payment status endpoint returns pending", True,
                        f"status={status}, payment_status={payment_status}")
            else:
                log_test("C2: Payment status endpoint returns pending", False,
                        f"Expected payment_status='pending', got '{payment_status}'")
        else:
            log_test("C2: Payment status endpoint returns pending", False,
                    f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("C2: Payment status endpoint returns pending", False, f"Error: {e}")
else:
    print("\nC2: Skipping payment status test (no session_id from C1)")

# C3: Admin user (already plus=true) tries to checkout
print("\nC3: Admin user (plus=true) POST /api/payments/checkout")
admin_data_c3 = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
if admin_data_c3 and "token" in admin_data_c3:
    admin_token_c3 = admin_data_c3["token"]
    admin_info = admin_data_c3.get("user", {})
    print(f"   Admin plus status: {admin_info.get('plus')}")
    
    try:
        resp = requests.post(f"{BASE_URL}/payments/checkout",
            json={"origin_url": "https://example.com"},
            headers={"Authorization": f"Bearer {admin_token_c3}"},
            timeout=10
        )
        print(f"   Response status: {resp.status_code}")
        print(f"   Response body: {resp.text}")
        
        if resp.status_code == 400:
            data = resp.json()
            detail = data.get("detail", "")
            if "Ai deja Cartoonix PLUS activ" in detail:
                log_test("C3: Admin (plus=true) checkout → 400 with correct message", True,
                        f"Detail: {detail}")
            else:
                log_test("C3: Admin (plus=true) checkout → 400 with correct message", False,
                        f"Wrong detail: {detail}")
        else:
            log_test("C3: Admin (plus=true) checkout → 400 with correct message", False,
                    f"Expected 400, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("C3: Admin (plus=true) checkout → 400 with correct message", False, f"Error: {e}")
else:
    log_test("C3: Admin (plus=true) checkout → 400 with correct message", False, "Could not login as admin")

# C4: POST /api/payments/checkout without auth
print("\nC4: POST /api/payments/checkout without auth header")
try:
    resp = requests.post(f"{BASE_URL}/payments/checkout",
        json={"origin_url": "https://example.com"},
        timeout=10
    )
    print(f"   Response status: {resp.status_code}")
    print(f"   Response body: {resp.text}")
    
    if resp.status_code in [401, 403]:
        log_test("C4: Checkout without auth → 401/403", True, f"Status: {resp.status_code}")
    else:
        log_test("C4: Checkout without auth → 401/403", False,
                f"Expected 401/403, got {resp.status_code}: {resp.text}")
except Exception as e:
    log_test("C4: Checkout without auth → 401/403", False, f"Error: {e}")


# ============================================================================
# D) SUPPORT TICKETS TESTS
# ============================================================================

print("\n" + "="*80)
print("D) SUPPORT TICKETS TESTS")
print("="*80 + "\n")

# Valid small base64 image for testing
VALID_IMAGE_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

# D1: Test user creates a ticket with attachment
print("D1: Test user POST /api/tickets with subject, message, and attachment")
test_user_data_d = login_user(TEST_USER_EMAIL, TEST_USER_PASSWORD)
if test_user_data_d and "token" in test_user_data_d:
    test_token_d = test_user_data_d["token"]
    test_user_id = test_user_data_d.get("user", {}).get("id", "")
    
    try:
        resp = requests.post(f"{BASE_URL}/tickets",
            json={
                "subject": "Test subiect",
                "message": "Am o problema cu un episod",
                "attachment": VALID_IMAGE_DATA_URL
            },
            headers={"Authorization": f"Bearer {test_token_d}"},
            timeout=10
        )
        print(f"   Response status: {resp.status_code}")
        print(f"   Response body: {resp.text[:300]}")
        
        if resp.status_code == 200:
            ticket_data = resp.json()
            ticket_id = ticket_data.get("id", "")
            status = ticket_data.get("status", "")
            subject = ticket_data.get("subject", "")
            message = ticket_data.get("message", "")
            attachment = ticket_data.get("attachment", "")
            replies = ticket_data.get("replies", [])
            
            # Check if ticket has UUID id, status=open, correct fields
            if (len(ticket_id) == 36 and "-" in ticket_id and 
                status == "open" and 
                subject == "Test subiect" and
                message == "Am o problema cu un episod" and
                attachment and attachment.startswith("data:image/") and
                isinstance(replies, list) and len(replies) == 0):
                log_test("D1: Create ticket with attachment → 200 with correct fields", True,
                        f"ticket_id={ticket_id[:20]}..., status={status}")
                test_ticket_id = ticket_id
            else:
                log_test("D1: Create ticket with attachment → 200 with correct fields", False,
                        f"id={ticket_id}, status={status}, attachment={bool(attachment)}, replies={len(replies)}")
                test_ticket_id = ticket_id if ticket_id else None
        else:
            log_test("D1: Create ticket with attachment → 200 with correct fields", False,
                    f"Status {resp.status_code}: {resp.text}")
            test_ticket_id = None
    except Exception as e:
        log_test("D1: Create ticket with attachment → 200 with correct fields", False, f"Error: {e}")
        test_ticket_id = None
else:
    log_test("D1: Create ticket with attachment → 200 with correct fields", False, "Could not login as test user")
    test_token_d = None
    test_ticket_id = None

# D2: Test user tries to create another ticket while one is open
if test_token_d and test_ticket_id:
    print("\nD2: Test user POST /api/tickets again (should fail with 400)")
    try:
        resp = requests.post(f"{BASE_URL}/tickets",
            json={
                "subject": "Second ticket",
                "message": "Another issue",
                "attachment": None
            },
            headers={"Authorization": f"Bearer {test_token_d}"},
            timeout=10
        )
        print(f"   Response status: {resp.status_code}")
        print(f"   Response body: {resp.text}")
        
        if resp.status_code == 400:
            data = resp.json()
            detail = data.get("detail", "")
            if "deja o solicitare deschisă" in detail:
                log_test("D2: Second ticket while one open → 400 with correct message", True,
                        f"Detail: {detail}")
            else:
                log_test("D2: Second ticket while one open → 400 with correct message", False,
                        f"Wrong detail: {detail}")
        else:
            log_test("D2: Second ticket while one open → 400 with correct message", False,
                    f"Expected 400, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("D2: Second ticket while one open → 400 with correct message", False, f"Error: {e}")
else:
    print("\nD2: Skipping (no ticket created in D1)")

# D3: Test user GET /api/tickets/my
if test_token_d and test_ticket_id:
    print("\nD3: Test user GET /api/tickets/my")
    try:
        resp = requests.get(f"{BASE_URL}/tickets/my",
            headers={"Authorization": f"Bearer {test_token_d}"},
            timeout=10
        )
        print(f"   Response status: {resp.status_code}")
        
        if resp.status_code == 200:
            tickets = resp.json()
            if isinstance(tickets, list):
                found = any(t.get("id") == test_ticket_id for t in tickets)
                if found:
                    log_test("D3: GET /api/tickets/my returns created ticket", True,
                            f"Found ticket {test_ticket_id[:20]}... in list of {len(tickets)} tickets")
                else:
                    log_test("D3: GET /api/tickets/my returns created ticket", False,
                            f"Ticket {test_ticket_id} not found in list")
            else:
                log_test("D3: GET /api/tickets/my returns created ticket", False,
                        f"Response is not a list: {tickets}")
        else:
            log_test("D3: GET /api/tickets/my returns created ticket", False,
                    f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("D3: GET /api/tickets/my returns created ticket", False, f"Error: {e}")
else:
    print("\nD3: Skipping (no ticket created in D1)")

# D4: Test user replies to their ticket
if test_token_d and test_ticket_id:
    print("\nD4: Test user POST /api/tickets/{id}/reply")
    try:
        resp = requests.post(f"{BASE_URL}/tickets/{test_ticket_id}/reply",
            json={"text": "Detalii suplimentare"},
            headers={"Authorization": f"Bearer {test_token_d}"},
            timeout=10
        )
        print(f"   Response status: {resp.status_code}")
        
        if resp.status_code == 200:
            ticket_data = resp.json()
            replies = ticket_data.get("replies", [])
            if isinstance(replies, list) and len(replies) > 0:
                last_reply = replies[-1]
                if (last_reply.get("from") == "user" and 
                    last_reply.get("text") == "Detalii suplimentare"):
                    log_test("D4: User reply to ticket → 200 with reply from='user'", True,
                            f"Reply added: {last_reply.get('text')}")
                else:
                    log_test("D4: User reply to ticket → 200 with reply from='user'", False,
                            f"Reply: {last_reply}")
            else:
                log_test("D4: User reply to ticket → 200 with reply from='user'", False,
                        f"No replies found: {replies}")
        else:
            log_test("D4: User reply to ticket → 200 with reply from='user'", False,
                    f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("D4: User reply to ticket → 200 with reply from='user'", False, f"Error: {e}")
else:
    print("\nD4: Skipping (no ticket created in D1)")

# D5: Admin lists tickets
print("\nD5: Admin GET /api/admin/tickets")
admin_data_d = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
if admin_data_d and "token" in admin_data_d:
    admin_token_d = admin_data_d["token"]
    
    try:
        resp = requests.get(f"{BASE_URL}/admin/tickets",
            headers={"Authorization": f"Bearer {admin_token_d}"},
            timeout=10
        )
        print(f"   Response status: {resp.status_code}")
        
        if resp.status_code == 200:
            tickets = resp.json()
            if isinstance(tickets, list):
                found = any(t.get("id") == test_ticket_id for t in tickets) if test_ticket_id else len(tickets) >= 0
                if found or not test_ticket_id:
                    log_test("D5a: Admin GET /api/admin/tickets → 200 with list", True,
                            f"Found {len(tickets)} tickets")
                else:
                    log_test("D5a: Admin GET /api/admin/tickets → 200 with list", False,
                            f"Ticket {test_ticket_id} not found")
            else:
                log_test("D5a: Admin GET /api/admin/tickets → 200 with list", False,
                        f"Response is not a list")
        else:
            log_test("D5a: Admin GET /api/admin/tickets → 200 with list", False,
                    f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("D5a: Admin GET /api/admin/tickets → 200 with list", False, f"Error: {e}")
    
    # D5b: Admin replies to ticket
    if test_ticket_id:
        print("\nD5b: Admin POST /api/admin/tickets/{id}/reply")
        try:
            resp = requests.post(f"{BASE_URL}/admin/tickets/{test_ticket_id}/reply",
                json={"text": "Salut, verificăm"},
                headers={"Authorization": f"Bearer {admin_token_d}"},
                timeout=10
            )
            print(f"   Response status: {resp.status_code}")
            
            if resp.status_code == 200:
                ticket_data = resp.json()
                replies = ticket_data.get("replies", [])
                status = ticket_data.get("status", "")
                
                # Find admin reply
                admin_reply = None
                for r in replies:
                    if r.get("from") == "admin" and r.get("text") == "Salut, verificăm":
                        admin_reply = r
                        break
                
                if admin_reply and status == "in_progress":
                    log_test("D5b: Admin reply → 200, reply from='admin', status auto-changed to 'in_progress'", True,
                            f"Status: {status}, admin reply added")
                else:
                    log_test("D5b: Admin reply → 200, reply from='admin', status auto-changed to 'in_progress'", False,
                            f"Status: {status}, admin_reply: {bool(admin_reply)}")
            else:
                log_test("D5b: Admin reply → 200, reply from='admin', status auto-changed to 'in_progress'", False,
                        f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("D5b: Admin reply → 200, reply from='admin', status auto-changed to 'in_progress'", False, f"Error: {e}")
    
    # D5c: Admin updates ticket status to resolved
    if test_ticket_id:
        print("\nD5c: Admin PUT /api/admin/tickets/{id}/status to 'resolved'")
        try:
            resp = requests.put(f"{BASE_URL}/admin/tickets/{test_ticket_id}/status",
                json={"status": "resolved"},
                headers={"Authorization": f"Bearer {admin_token_d}"},
                timeout=10
            )
            print(f"   Response status: {resp.status_code}")
            
            if resp.status_code == 200:
                ticket_data = resp.json()
                status = ticket_data.get("status", "")
                if status == "resolved":
                    log_test("D5c: Admin update status to 'resolved' → 200", True,
                            f"Status: {status}")
                else:
                    log_test("D5c: Admin update status to 'resolved' → 200", False,
                            f"Status: {status}")
            else:
                log_test("D5c: Admin update status to 'resolved' → 200", False,
                        f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("D5c: Admin update status to 'resolved' → 200", False, f"Error: {e}")
    
    # D5d: Admin tries to update status to invalid value
    if test_ticket_id:
        print("\nD5d: Admin PUT /api/admin/tickets/{id}/status with invalid status 'foo'")
        try:
            resp = requests.put(f"{BASE_URL}/admin/tickets/{test_ticket_id}/status",
                json={"status": "foo"},
                headers={"Authorization": f"Bearer {admin_token_d}"},
                timeout=10
            )
            print(f"   Response status: {resp.status_code}")
            
            if resp.status_code == 400:
                log_test("D5d: Admin update status to invalid 'foo' → 400", True,
                        f"Correctly rejected invalid status")
            else:
                log_test("D5d: Admin update status to invalid 'foo' → 400", False,
                        f"Expected 400, got {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("D5d: Admin update status to invalid 'foo' → 400", False, f"Error: {e}")
else:
    log_test("D5a: Admin GET /api/admin/tickets → 200 with list", False, "Could not login as admin")
    admin_token_d = None

# D6: After ticket is resolved, test user can create a new ticket
if test_token_d and test_ticket_id:
    print("\nD6: Test user POST /api/tickets (new one after resolved)")
    try:
        resp = requests.post(f"{BASE_URL}/tickets",
            json={
                "subject": "New ticket after resolved",
                "message": "This should work now",
                "attachment": None
            },
            headers={"Authorization": f"Bearer {test_token_d}"},
            timeout=10
        )
        print(f"   Response status: {resp.status_code}")
        
        if resp.status_code == 200:
            ticket_data = resp.json()
            new_ticket_id = ticket_data.get("id", "")
            log_test("D6: Create new ticket after resolved → 200", True,
                    f"New ticket_id={new_ticket_id[:20]}...")
            second_ticket_id = new_ticket_id
        else:
            log_test("D6: Create new ticket after resolved → 200", False,
                    f"Status {resp.status_code}: {resp.text}")
            second_ticket_id = None
    except Exception as e:
        log_test("D6: Create new ticket after resolved → 200", False, f"Error: {e}")
        second_ticket_id = None
else:
    print("\nD6: Skipping (no resolved ticket)")
    second_ticket_id = None

# D7: Attachment validation - invalid attachment
if test_token_d:
    # First resolve the second ticket if it exists
    if second_ticket_id and admin_token_d:
        print("\n   Resolving second ticket for D7 test...")
        try:
            requests.put(f"{BASE_URL}/admin/tickets/{second_ticket_id}/status",
                json={"status": "resolved"},
                headers={"Authorization": f"Bearer {admin_token_d}"},
                timeout=10
            )
        except:
            pass
    
    print("\nD7: Test user POST /api/tickets with invalid attachment")
    try:
        resp = requests.post(f"{BASE_URL}/tickets",
            json={
                "subject": "Test invalid attachment",
                "message": "Testing attachment validation",
                "attachment": "notanimage"
            },
            headers={"Authorization": f"Bearer {test_token_d}"},
            timeout=10
        )
        print(f"   Response status: {resp.status_code}")
        print(f"   Response body: {resp.text}")
        
        if resp.status_code == 400:
            data = resp.json()
            detail = data.get("detail", "")
            if "imagine" in detail.lower():
                log_test("D7: Invalid attachment → 400 with 'imagine' in detail", True,
                        f"Detail: {detail}")
                # Resolve this ticket for cleanup
                if admin_token_d:
                    try:
                        # Get the ticket ID first
                        resp_tickets = requests.get(f"{BASE_URL}/tickets/my",
                            headers={"Authorization": f"Bearer {test_token_d}"},
                            timeout=10
                        )
                        if resp_tickets.status_code == 200:
                            tickets = resp_tickets.json()
                            for t in tickets:
                                if t.get("status") != "resolved":
                                    requests.put(f"{BASE_URL}/admin/tickets/{t['id']}/status",
                                        json={"status": "resolved"},
                                        headers={"Authorization": f"Bearer {admin_token_d}"},
                                        timeout=10
                                    )
                    except:
                        pass
            else:
                log_test("D7: Invalid attachment → 400 with 'imagine' in detail", False,
                        f"Wrong detail: {detail}")
        else:
            log_test("D7: Invalid attachment → 400 with 'imagine' in detail", False,
                    f"Expected 400, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("D7: Invalid attachment → 400 with 'imagine' in detail", False, f"Error: {e}")
else:
    print("\nD7: Skipping (no test user token)")

# D8: Auth tests for tickets
print("\nD8a: POST /api/tickets without token → 401")
try:
    resp = requests.post(f"{BASE_URL}/tickets",
        json={
            "subject": "No auth",
            "message": "Should fail"
        },
        timeout=10
    )
    print(f"   Response status: {resp.status_code}")
    
    if resp.status_code == 401:
        log_test("D8a: POST /api/tickets without auth → 401", True)
    else:
        log_test("D8a: POST /api/tickets without auth → 401", False,
                f"Expected 401, got {resp.status_code}")
except Exception as e:
    log_test("D8a: POST /api/tickets without auth → 401", False, f"Error: {e}")

print("\nD8b: GET /api/admin/tickets as non-admin → 403")
if test_token_d:
    try:
        resp = requests.get(f"{BASE_URL}/admin/tickets",
            headers={"Authorization": f"Bearer {test_token_d}"},
            timeout=10
        )
        print(f"   Response status: {resp.status_code}")
        
        if resp.status_code == 403:
            log_test("D8b: GET /api/admin/tickets as non-admin → 403", True)
        else:
            log_test("D8b: GET /api/admin/tickets as non-admin → 403", False,
                    f"Expected 403, got {resp.status_code}")
    except Exception as e:
        log_test("D8b: GET /api/admin/tickets as non-admin → 403", False, f"Error: {e}")
else:
    print("   Skipping (no test user token)")


# ============================================================================
# E) PLAYLIST LIMIT TESTS
# ============================================================================

print("\n" + "="*80)
print("E) PLAYLIST LIMIT TESTS")
print("="*80 + "\n")

# E1: Test user (FREE) creates first playlist
print("E1: Test user (FREE) POST /api/playlists first time")
if test_token_d:
    try:
        resp = requests.post(f"{BASE_URL}/playlists",
            json={"name": "Lista mea"},
            headers={"Authorization": f"Bearer {test_token_d}"},
            timeout=10
        )
        print(f"   Response status: {resp.status_code}")
        print(f"   Response body: {resp.text[:200]}")
        
        if resp.status_code == 200:
            playlist_data = resp.json()
            playlist_id = playlist_data.get("id", "")
            name = playlist_data.get("name", "")
            if name == "Lista mea":
                log_test("E1: FREE user create first playlist → 200", True,
                        f"playlist_id={playlist_id}")
                test_playlist_id = playlist_id
            else:
                log_test("E1: FREE user create first playlist → 200", False,
                        f"Wrong name: {name}")
                test_playlist_id = None
        else:
            log_test("E1: FREE user create first playlist → 200", False,
                    f"Status {resp.status_code}: {resp.text}")
            test_playlist_id = None
    except Exception as e:
        log_test("E1: FREE user create first playlist → 200", False, f"Error: {e}")
        test_playlist_id = None
else:
    print("   Skipping (no test user token)")
    test_playlist_id = None

# E2: Test user (FREE) tries to create second playlist
if test_token_d and test_playlist_id:
    print("\nE2: Test user (FREE) POST /api/playlists second time → 403")
    try:
        resp = requests.post(f"{BASE_URL}/playlists",
            json={"name": "A doua"},
            headers={"Authorization": f"Bearer {test_token_d}"},
            timeout=10
        )
        print(f"   Response status: {resp.status_code}")
        print(f"   Response body: {resp.text}")
        
        if resp.status_code == 403:
            data = resp.json()
            detail = data.get("detail", "")
            if "un singur playlist" in detail:
                log_test("E2: FREE user create second playlist → 403 with correct message", True,
                        f"Detail: {detail}")
            else:
                log_test("E2: FREE user create second playlist → 403 with correct message", False,
                        f"Wrong detail: {detail}")
        else:
            log_test("E2: FREE user create second playlist → 403 with correct message", False,
                    f"Expected 403, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("E2: FREE user create second playlist → 403 with correct message", False, f"Error: {e}")
else:
    print("\nE2: Skipping (no first playlist created)")

# E3: Admin (PLUS) creates multiple playlists
print("\nE3: Admin (PLUS) POST /api/playlists twice → both 200")
if admin_token_d:
    admin_playlist_ids = []
    
    # First playlist
    try:
        resp = requests.post(f"{BASE_URL}/playlists",
            json={"name": "Admin Playlist 1"},
            headers={"Authorization": f"Bearer {admin_token_d}"},
            timeout=10
        )
        print(f"   First playlist response status: {resp.status_code}")
        
        if resp.status_code == 200:
            playlist_data = resp.json()
            playlist_id = playlist_data.get("id", "")
            admin_playlist_ids.append(playlist_id)
            log_test("E3a: PLUS user create first playlist → 200", True,
                    f"playlist_id={playlist_id}")
        else:
            log_test("E3a: PLUS user create first playlist → 200", False,
                    f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("E3a: PLUS user create first playlist → 200", False, f"Error: {e}")
    
    # Second playlist
    try:
        resp = requests.post(f"{BASE_URL}/playlists",
            json={"name": "Admin Playlist 2"},
            headers={"Authorization": f"Bearer {admin_token_d}"},
            timeout=10
        )
        print(f"   Second playlist response status: {resp.status_code}")
        
        if resp.status_code == 200:
            playlist_data = resp.json()
            playlist_id = playlist_data.get("id", "")
            admin_playlist_ids.append(playlist_id)
            log_test("E3b: PLUS user create second playlist → 200 (unlimited)", True,
                    f"playlist_id={playlist_id}")
        else:
            log_test("E3b: PLUS user create second playlist → 200 (unlimited)", False,
                    f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("E3b: PLUS user create second playlist → 200 (unlimited)", False, f"Error: {e}")
    
    # Cleanup admin playlists
    print("\n   Cleaning up admin playlists...")
    for pid in admin_playlist_ids:
        try:
            requests.delete(f"{BASE_URL}/playlists/{pid}",
                headers={"Authorization": f"Bearer {admin_token_d}"},
                timeout=10
            )
        except:
            pass
else:
    print("   Skipping (no admin token)")

# Cleanup test user playlist
if test_token_d and test_playlist_id:
    print("\n   Cleaning up test user playlist...")
    try:
        resp = requests.delete(f"{BASE_URL}/playlists/{test_playlist_id}",
            headers={"Authorization": f"Bearer {test_token_d}"},
            timeout=10
        )
        if resp.status_code == 200:
            print(f"   ✓ Deleted playlist {test_playlist_id}")
    except Exception as e:
        print(f"   ⚠ Error deleting playlist: {e}")


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
