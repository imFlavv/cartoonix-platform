#!/usr/bin/env python3
"""
Backend API Testing Suite for Cartoonix - Admin Notifications
Tests POST /api/admin/notifications endpoint with focus on:
- Auth/permission checks
- Validation
- Single user sends (inline)
- Broadcast sends (background task with batching)
- Edge cases
"""
import os
import sys
import requests
import json
import time
from typing import Optional, Dict

# Backend URL from environment
BACKEND_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://user-dashboard-138.preview.emergentagent.com")
API_BASE = f"{BACKEND_URL}/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "test_admin@cartoonix.ro"
ADMIN_PASSWORD = "TestAdmin#2026"
PLUS_EMAIL = "test_plus@cartoonix.ro"
PLUS_PASSWORD = "TestPlus#2026"
FREE_EMAIL = "test_free@cartoonix.ro"
FREE_PASSWORD = "TestFree#2026"

# Color codes for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

def log_test(test_num: int, description: str):
    """Log test case header"""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}Test {test_num}: {description}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")

def log_pass(message: str):
    """Log success message"""
    print(f"{GREEN}✅ PASS: {message}{RESET}")

def log_fail(message: str):
    """Log failure message"""
    print(f"{RED}❌ FAIL: {message}{RESET}")

def log_info(message: str):
    """Log info message"""
    print(f"{YELLOW}ℹ️  INFO: {message}{RESET}")

def log_detail(key: str, value):
    """Log detail with key-value"""
    print(f"   {key}: {value}")

class TestResults:
    """Track test results"""
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.failures = []
    
    def add_pass(self, test_name: str):
        self.passed += 1
        log_pass(test_name)
    
    def add_fail(self, test_name: str, reason: str):
        self.failed += 1
        self.failures.append(f"{test_name}: {reason}")
        log_fail(f"{test_name} - {reason}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{BLUE}{'='*80}{RESET}")
        print(f"{BLUE}TEST SUMMARY{RESET}")
        print(f"{BLUE}{'='*80}{RESET}")
        print(f"Total Tests: {total}")
        print(f"{GREEN}Passed: {self.passed}{RESET}")
        print(f"{RED}Failed: {self.failed}{RESET}")
        if self.failures:
            print(f"\n{RED}Failed Tests:{RESET}")
            for failure in self.failures:
                print(f"  - {failure}")
        print(f"{BLUE}{'='*80}{RESET}\n")
        return self.failed == 0

results = TestResults()

def login(email: str, password: str) -> Optional[Dict]:
    """Login and return token + user data"""
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={"email": email, "password": password},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            return {
                "token": data.get("access_token"),
                "user": data.get("user")
            }
        else:
            log_fail(f"Login failed for {email}: HTTP {response.status_code}")
            return None
    except Exception as e:
        log_fail(f"Login exception for {email}: {str(e)}")
        return None

def test_1_auth_permission():
    """Test 1: Auth/permission checks - non-admin and no token"""
    log_test(1, "Auth/Permission - POST /api/admin/notifications with non-admin and no token")
    
    # Test 1a: Non-admin token (test_free)
    log_info("Test 1a: POST with non-admin token (test_free)")
    free_auth = login(FREE_EMAIL, FREE_PASSWORD)
    
    if not free_auth or not free_auth.get("token"):
        results.add_fail("Test 1a setup", "Failed to login as test_free")
        return
    
    try:
        response = requests.post(
            f"{API_BASE}/admin/notifications",
            headers={"Authorization": f"Bearer {free_auth['token']}"},
            json={
                "target": "all",
                "title": "Test notification",
                "body": "This should fail"
            },
            timeout=10
        )
        
        log_detail("Status Code", response.status_code)
        
        if response.status_code == 403:
            results.add_pass("Non-admin token returns HTTP 403")
        else:
            results.add_fail("Non-admin token", f"Expected HTTP 403, got {response.status_code}")
            log_detail("Response", response.text[:200])
    
    except Exception as e:
        results.add_fail("Test 1a", f"Request exception: {str(e)}")
    
    # Test 1b: No token
    log_info("Test 1b: POST with no Authorization header")
    
    try:
        response = requests.post(
            f"{API_BASE}/admin/notifications",
            json={
                "target": "all",
                "title": "Test notification",
                "body": "This should fail"
            },
            timeout=10
        )
        
        log_detail("Status Code", response.status_code)
        
        if response.status_code in [401, 403]:
            results.add_pass(f"No token returns HTTP {response.status_code} (401 or 403)")
        else:
            results.add_fail("No token", f"Expected HTTP 401 or 403, got {response.status_code}")
            log_detail("Response", response.text[:200])
    
    except Exception as e:
        results.add_fail("Test 1b", f"Request exception: {str(e)}")

def test_2_validation(admin_token: str):
    """Test 2: Validation - target=user without user_id"""
    log_test(2, "Validation - POST target=user without user_id should return 400")
    
    if not admin_token:
        results.add_fail("Test 2 setup", "No admin token available")
        return
    
    try:
        response = requests.post(
            f"{API_BASE}/admin/notifications",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "target": "user",
                "title": "Test single",
                "body": "Missing user_id"
            },
            timeout=10
        )
        
        log_detail("Status Code", response.status_code)
        
        if response.status_code == 400:
            results.add_pass("Missing user_id returns HTTP 400")
            log_detail("Response", response.text[:200])
        else:
            results.add_fail("Validation", f"Expected HTTP 400, got {response.status_code}")
            log_detail("Response", response.text[:200])
    
    except Exception as e:
        results.add_fail("Test 2", f"Request exception: {str(e)}")

def test_3_single_user(admin_token: str):
    """Test 3: Single user send - inline, sent=1, queued=false"""
    log_test(3, "Single user send - target=user with valid user_id")
    
    if not admin_token:
        results.add_fail("Test 3 setup", "No admin token available")
        return
    
    # Step 1: Get test_plus user id
    log_info("Step 1: Login as test_plus and get user id")
    plus_auth = login(PLUS_EMAIL, PLUS_PASSWORD)
    
    if not plus_auth or not plus_auth.get("token"):
        results.add_fail("Test 3 setup", "Failed to login as test_plus")
        return
    
    try:
        response = requests.get(
            f"{API_BASE}/auth/me",
            headers={"Authorization": f"Bearer {plus_auth['token']}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail("Test 3 setup", f"Failed to get test_plus user: HTTP {response.status_code}")
            return
        
        plus_user = response.json()
        plus_user_id = plus_user.get("id")
        
        if not plus_user_id:
            results.add_fail("Test 3 setup", "test_plus user has no 'id' field")
            return
        
        log_detail("test_plus user_id", plus_user_id)
        results.add_pass(f"Got test_plus user_id: {plus_user_id}")
    
    except Exception as e:
        results.add_fail("Test 3 setup", f"Exception getting user: {str(e)}")
        return
    
    # Step 2: Send notification as admin to test_plus
    log_info("Step 2: Send notification as admin to test_plus user")
    
    try:
        response = requests.post(
            f"{API_BASE}/admin/notifications",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "target": "user",
                "user_id": plus_user_id,
                "title": "Test single",
                "body": "Hello single user"
            },
            timeout=10
        )
        
        log_detail("Status Code", response.status_code)
        
        if response.status_code != 200:
            results.add_fail("Single user send", f"Expected HTTP 200, got {response.status_code}")
            log_detail("Response", response.text[:200])
            return
        
        results.add_pass("Single user send returns HTTP 200")
        
        data = response.json()
        log_detail("Response", json.dumps(data, indent=2))
        
        # Check response shape
        if not data.get("success"):
            results.add_fail("Response success", f"Expected success=true, got {data.get('success')}")
        else:
            results.add_pass("Response has success=true")
        
        if data.get("sent") != 1:
            results.add_fail("Response sent", f"Expected sent=1, got {data.get('sent')}")
        else:
            results.add_pass("Response has sent=1")
        
        if data.get("queued") != False:
            results.add_fail("Response queued", f"Expected queued=false, got {data.get('queued')}")
        else:
            results.add_pass("Response has queued=false")
    
    except Exception as e:
        results.add_fail("Test 3 send", f"Request exception: {str(e)}")
        return
    
    # Step 3: Verify notification delivered to test_plus
    log_info("Step 3: Verify notification delivered to test_plus")
    
    try:
        response = requests.get(
            f"{API_BASE}/notifications",
            headers={"Authorization": f"Bearer {plus_auth['token']}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail("Get notifications", f"Expected HTTP 200, got {response.status_code}")
            return
        
        data = response.json()
        notifications = data.get("items", [])
        
        log_detail("Total notifications", len(notifications))
        
        # Find the notification with title "Test single"
        found = False
        for notif in notifications:
            if notif.get("title") == "Test single":
                found = True
                log_detail("Found notification", json.dumps(notif, indent=2))
                results.add_pass("Notification 'Test single' delivered to test_plus")
                break
        
        if not found:
            results.add_fail("Notification delivery", "Notification 'Test single' not found in test_plus notifications")
            log_detail("Available notifications", [n.get("title") for n in notifications[:5]])
    
    except Exception as e:
        results.add_fail("Test 3 verify", f"Request exception: {str(e)}")

def test_4_broadcast_tier(admin_token: str):
    """Test 4: Broadcast to plus tier - queued=true, sent>=1, background delivery"""
    log_test(4, "Broadcast tier - target=plus with background delivery")
    
    if not admin_token:
        results.add_fail("Test 4 setup", "No admin token available")
        return
    
    # Step 1: Send broadcast to plus users
    log_info("Step 1: Send broadcast to plus tier as admin")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{API_BASE}/admin/notifications",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "target": "plus",
                "title": "Broadcast plus",
                "body": "Hi plus users"
            },
            timeout=10
        )
        
        elapsed = time.time() - start_time
        
        log_detail("Status Code", response.status_code)
        log_detail("Response time", f"{elapsed:.2f}s")
        
        if response.status_code != 200:
            results.add_fail("Broadcast plus send", f"Expected HTTP 200, got {response.status_code}")
            log_detail("Response", response.text[:200])
            return
        
        results.add_pass("Broadcast plus returns HTTP 200")
        
        # Check response time (should be quick, under 5s)
        if elapsed < 5.0:
            results.add_pass(f"Response returned quickly ({elapsed:.2f}s < 5s)")
        else:
            log_info(f"Response took {elapsed:.2f}s (expected < 5s)")
        
        data = response.json()
        log_detail("Response", json.dumps(data, indent=2))
        
        # Check response shape
        if not data.get("success"):
            results.add_fail("Response success", f"Expected success=true, got {data.get('success')}")
        else:
            results.add_pass("Response has success=true")
        
        sent_count = data.get("sent", 0)
        if sent_count >= 1:
            results.add_pass(f"Response has sent={sent_count} (>= 1 plus user)")
        else:
            results.add_fail("Response sent", f"Expected sent >= 1, got {sent_count}")
        
        if data.get("queued") != True:
            results.add_fail("Response queued", f"Expected queued=true, got {data.get('queued')}")
        else:
            results.add_pass("Response has queued=true")
    
    except Exception as e:
        results.add_fail("Test 4 send", f"Request exception: {str(e)}")
        return
    
    # Step 2: Wait for background task to complete
    log_info("Step 2: Wait ~3 seconds for background task to complete")
    time.sleep(3)
    
    # Step 3: Verify notification delivered to test_plus
    log_info("Step 3: Verify notification delivered to test_plus")
    
    plus_auth = login(PLUS_EMAIL, PLUS_PASSWORD)
    
    if not plus_auth or not plus_auth.get("token"):
        results.add_fail("Test 4 verify", "Failed to login as test_plus")
        return
    
    try:
        response = requests.get(
            f"{API_BASE}/notifications",
            headers={"Authorization": f"Bearer {plus_auth['token']}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail("Get notifications", f"Expected HTTP 200, got {response.status_code}")
            return
        
        data = response.json()
        notifications = data.get("items", [])
        
        log_detail("Total notifications", len(notifications))
        
        # Find the notification with title "Broadcast plus"
        found = False
        for notif in notifications:
            if notif.get("title") == "Broadcast plus":
                found = True
                log_detail("Found notification", json.dumps(notif, indent=2))
                results.add_pass("Notification 'Broadcast plus' delivered to test_plus (background task completed)")
                break
        
        if not found:
            results.add_fail("Broadcast delivery", "Notification 'Broadcast plus' not found in test_plus notifications")
            log_detail("Available notifications", [n.get("title") for n in notifications[:5]])
    
    except Exception as e:
        results.add_fail("Test 4 verify", f"Request exception: {str(e)}")

def test_5_broadcast_all(admin_token: str):
    """Test 5: Broadcast to all users - queued=true, sent>=4"""
    log_test(5, "Broadcast all - target=all with background delivery")
    
    if not admin_token:
        results.add_fail("Test 5 setup", "No admin token available")
        return
    
    log_info("Send broadcast to all users as admin")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{API_BASE}/admin/notifications",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "target": "all",
                "title": "Broadcast all",
                "body": "Hi everyone"
            },
            timeout=10
        )
        
        elapsed = time.time() - start_time
        
        log_detail("Status Code", response.status_code)
        log_detail("Response time", f"{elapsed:.2f}s")
        
        if response.status_code != 200:
            results.add_fail("Broadcast all send", f"Expected HTTP 200, got {response.status_code}")
            log_detail("Response", response.text[:200])
            return
        
        results.add_pass("Broadcast all returns HTTP 200")
        
        # Check response time (should be quick)
        if elapsed < 5.0:
            results.add_pass(f"Response returned quickly ({elapsed:.2f}s < 5s)")
        else:
            log_info(f"Response took {elapsed:.2f}s (expected < 5s)")
        
        data = response.json()
        log_detail("Response", json.dumps(data, indent=2))
        
        # Check response shape
        if not data.get("success"):
            results.add_fail("Response success", f"Expected success=true, got {data.get('success')}")
        else:
            results.add_pass("Response has success=true")
        
        sent_count = data.get("sent", 0)
        if sent_count >= 4:
            results.add_pass(f"Response has sent={sent_count} (>= 4 total users)")
        else:
            results.add_fail("Response sent", f"Expected sent >= 4, got {sent_count}")
        
        if data.get("queued") != True:
            results.add_fail("Response queued", f"Expected queued=true, got {data.get('queued')}")
        else:
            results.add_pass("Response has queued=true")
    
    except Exception as e:
        results.add_fail("Test 5", f"Request exception: {str(e)}")

def test_6_no_recipients(admin_token: str):
    """Test 6: No recipients edge case - nonexistent user_id returns 404"""
    log_test(6, "No recipients - target=user with nonexistent user_id should return 404")
    
    if not admin_token:
        results.add_fail("Test 6 setup", "No admin token available")
        return
    
    try:
        response = requests.post(
            f"{API_BASE}/admin/notifications",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "target": "user",
                "user_id": "nonexistent-id-123",
                "title": "Test nonexistent",
                "body": "This should fail"
            },
            timeout=10
        )
        
        log_detail("Status Code", response.status_code)
        
        if response.status_code == 404:
            results.add_pass("Nonexistent user_id returns HTTP 404")
            log_detail("Response", response.text[:200])
        else:
            results.add_fail("No recipients", f"Expected HTTP 404, got {response.status_code}")
            log_detail("Response", response.text[:200])
    
    except Exception as e:
        results.add_fail("Test 6", f"Request exception: {str(e)}")

def main():
    """Run all tests"""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}CARTOONIX BACKEND API TESTING - ADMIN NOTIFICATIONS{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    print(f"Backend URL: {API_BASE}")
    print(f"Admin: {ADMIN_EMAIL}")
    print(f"{BLUE}{'='*80}{RESET}\n")
    
    # Login as admin
    log_info("Logging in as admin...")
    admin_auth = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    
    if not admin_auth or not admin_auth.get("token"):
        log_fail("CRITICAL: Failed to login as admin. Cannot proceed with tests.")
        sys.exit(1)
    
    admin_token = admin_auth["token"]
    log_pass(f"Admin login successful")
    
    # Run tests in sequence
    test_1_auth_permission()
    test_2_validation(admin_token)
    test_3_single_user(admin_token)
    test_4_broadcast_tier(admin_token)
    test_5_broadcast_all(admin_token)
    test_6_no_recipients(admin_token)
    
    # Print summary
    success = results.summary()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
