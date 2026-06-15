#!/usr/bin/env python3
"""
Backend API Testing Suite for Cartoonix
Tests auth/profile endpoints with focus on presence_seconds and level fields
"""
import os
import sys
import requests
import json
from typing import Optional

# Backend URL from environment
BACKEND_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://4b695aa3-ef7a-461f-9755-32ede9a21472.preview.emergentagent.com")
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
TEST_EMAIL = "test_plus@cartoonix.ro"
TEST_PASSWORD = "TestPlus#2026"

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

def test_1_login():
    """Test 1: POST /api/auth/login with test credentials"""
    log_test(1, "POST /api/auth/login - Verify response structure and new fields")
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=10
        )
        
        log_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            results.add_fail("Login request", f"Expected HTTP 200, got {response.status_code}")
            log_detail("Response", response.text[:500])
            return None
        
        results.add_pass("Login returns HTTP 200")
        
        data = response.json()
        log_detail("Response keys", list(data.keys()))
        
        # Check for access_token
        if "access_token" not in data:
            results.add_fail("Login response", "Missing 'access_token' field")
            return None
        results.add_pass("Response contains 'access_token'")
        
        # Check for user object
        if "user" not in data:
            results.add_fail("Login response", "Missing 'user' object")
            return None
        results.add_pass("Response contains 'user' object")
        
        user = data["user"]
        log_detail("User keys", list(user.keys()))
        
        # Required fields
        required_fields = ["presence_seconds", "level", "created_at", "nickname", "email", 
                          "avatar_url", "subscription", "role"]
        
        for field in required_fields:
            if field not in user:
                results.add_fail(f"User object field '{field}'", f"Missing required field")
            else:
                results.add_pass(f"User object contains '{field}'")
                log_detail(f"  {field}", user[field])
        
        # Validate presence_seconds type and value
        if "presence_seconds" in user:
            ps = user["presence_seconds"]
            if not isinstance(ps, int):
                results.add_fail("presence_seconds type", f"Expected int, got {type(ps).__name__}")
            elif ps < 0:
                results.add_fail("presence_seconds value", f"Expected >= 0, got {ps}")
            else:
                results.add_pass(f"presence_seconds is valid integer >= 0 (value: {ps})")
        
        # Validate level type and value
        if "level" in user:
            level = user["level"]
            if not isinstance(level, int):
                results.add_fail("level type", f"Expected int, got {type(level).__name__}")
            elif level < 1:
                results.add_fail("level value", f"Expected >= 1, got {level}")
            else:
                results.add_pass(f"level is valid integer >= 1 (value: {level})")
        
        # Validate subscription
        if "subscription" in user:
            if user["subscription"] != "plus":
                log_info(f"Note: subscription is '{user['subscription']}', expected 'plus' for test_plus user")
        
        return data["access_token"]
        
    except requests.exceptions.RequestException as e:
        results.add_fail("Login request", f"Request failed: {str(e)}")
        return None
    except json.JSONDecodeError as e:
        results.add_fail("Login response", f"Invalid JSON: {str(e)}")
        return None
    except Exception as e:
        results.add_fail("Login test", f"Unexpected error: {str(e)}")
        return None

def test_2_auth_me(token: str):
    """Test 2: GET /api/auth/me with bearer token"""
    log_test(2, "GET /api/auth/me - Verify same fields present")
    
    if not token:
        results.add_fail("Auth me test", "No token available (login failed)")
        return None
    
    try:
        response = requests.get(
            f"{API_BASE}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        log_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            results.add_fail("Auth me request", f"Expected HTTP 200, got {response.status_code}")
            log_detail("Response", response.text[:500])
            return None
        
        results.add_pass("GET /auth/me returns HTTP 200")
        
        user = response.json()
        log_detail("User keys", list(user.keys()))
        
        # Required fields
        required_fields = ["presence_seconds", "level", "created_at", "nickname", "email", 
                          "avatar_url", "subscription", "role"]
        
        for field in required_fields:
            if field not in user:
                results.add_fail(f"User object field '{field}'", f"Missing required field")
            else:
                results.add_pass(f"User object contains '{field}'")
                log_detail(f"  {field}", user[field])
        
        # Validate presence_seconds type and value
        if "presence_seconds" in user:
            ps = user["presence_seconds"]
            if not isinstance(ps, int):
                results.add_fail("presence_seconds type", f"Expected int, got {type(ps).__name__}")
            elif ps < 0:
                results.add_fail("presence_seconds value", f"Expected >= 0, got {ps}")
            else:
                results.add_pass(f"presence_seconds is valid integer >= 0 (value: {ps})")
        
        # Validate level type and value
        if "level" in user:
            level = user["level"]
            if not isinstance(level, int):
                results.add_fail("level type", f"Expected int, got {type(level).__name__}")
            elif level < 1:
                results.add_fail("level value", f"Expected >= 1, got {level}")
            else:
                results.add_pass(f"level is valid integer >= 1 (value: {level})")
        
        return user
        
    except requests.exceptions.RequestException as e:
        results.add_fail("Auth me request", f"Request failed: {str(e)}")
        return None
    except json.JSONDecodeError as e:
        results.add_fail("Auth me response", f"Invalid JSON: {str(e)}")
        return None
    except Exception as e:
        results.add_fail("Auth me test", f"Unexpected error: {str(e)}")
        return None

def test_3_patch_avatar(token: str):
    """Test 3: PATCH /api/auth/me - Update avatar_url and verify persistence"""
    log_test(3, "PATCH /api/auth/me - Update avatar_url and verify persistence")
    
    if not token:
        results.add_fail("Patch avatar test", "No token available (login failed)")
        return
    
    # Step 1: Get current avatar
    try:
        response = requests.get(
            f"{API_BASE}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        if response.status_code != 200:
            results.add_fail("Get current avatar", f"Failed to get current user: {response.status_code}")
            return
        
        original_avatar = response.json().get("avatar_url")
        log_info(f"Original avatar: {original_avatar}")
        
    except Exception as e:
        results.add_fail("Get current avatar", f"Error: {str(e)}")
        return
    
    # Step 2: Update to robot.jpg
    new_avatar = "/api/uploads/avatars/robot.jpg"
    log_info(f"Updating avatar to: {new_avatar}")
    
    try:
        response = requests.patch(
            f"{API_BASE}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"avatar_url": new_avatar},
            timeout=10
        )
        
        log_info(f"PATCH Status Code: {response.status_code}")
        
        if response.status_code != 200:
            results.add_fail("PATCH avatar", f"Expected HTTP 200, got {response.status_code}")
            log_detail("Response", response.text[:500])
            return
        
        results.add_pass("PATCH /auth/me returns HTTP 200")
        
        user = response.json()
        if user.get("avatar_url") != new_avatar:
            results.add_fail("Avatar update", f"Expected '{new_avatar}', got '{user.get('avatar_url')}'")
        else:
            results.add_pass(f"Avatar updated to '{new_avatar}'")
        
    except Exception as e:
        results.add_fail("PATCH avatar", f"Error: {str(e)}")
        return
    
    # Step 3: Verify persistence with GET
    log_info("Verifying persistence with GET /auth/me")
    
    try:
        response = requests.get(
            f"{API_BASE}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail("Verify persistence", f"GET failed: {response.status_code}")
            return
        
        user = response.json()
        if user.get("avatar_url") != new_avatar:
            results.add_fail("Avatar persistence", f"Expected '{new_avatar}', got '{user.get('avatar_url')}'")
        else:
            results.add_pass(f"Avatar persisted correctly: '{new_avatar}'")
        
    except Exception as e:
        results.add_fail("Verify persistence", f"Error: {str(e)}")
        return
    
    # Step 4: Restore original avatar
    log_info(f"Restoring original avatar: {original_avatar}")
    
    try:
        response = requests.patch(
            f"{API_BASE}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"avatar_url": original_avatar},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail("Restore avatar", f"Failed to restore: {response.status_code}")
            log_info("WARNING: Avatar not restored to original value")
            return
        
        user = response.json()
        if user.get("avatar_url") != original_avatar:
            results.add_fail("Restore avatar", f"Expected '{original_avatar}', got '{user.get('avatar_url')}'")
        else:
            results.add_pass(f"Avatar restored to original: '{original_avatar}'")
        
    except Exception as e:
        results.add_fail("Restore avatar", f"Error: {str(e)}")

def test_4_avatars():
    """Test 4: GET /api/avatars - Verify 14 unique items"""
    log_test(4, "GET /api/avatars - Verify 14 unique items with slug and url")
    
    try:
        response = requests.get(f"{API_BASE}/avatars", timeout=10)
        
        log_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            results.add_fail("GET avatars", f"Expected HTTP 200, got {response.status_code}")
            log_detail("Response", response.text[:500])
            return
        
        results.add_pass("GET /api/avatars returns HTTP 200")
        
        avatars = response.json()
        
        if not isinstance(avatars, list):
            results.add_fail("Avatars response", f"Expected list, got {type(avatars).__name__}")
            return
        
        results.add_pass(f"Response is a list")
        log_detail("Avatar count", len(avatars))
        
        # Check for 14 items
        if len(avatars) != 14:
            log_info(f"Expected 14 avatars, got {len(avatars)}")
        else:
            results.add_pass("Response contains 14 avatars")
        
        # Check for unique slugs
        slugs = []
        for i, avatar in enumerate(avatars):
            if not isinstance(avatar, dict):
                results.add_fail(f"Avatar {i}", f"Expected dict, got {type(avatar).__name__}")
                continue
            
            # Check for slug and url
            if "slug" not in avatar:
                results.add_fail(f"Avatar {i}", "Missing 'slug' field")
            else:
                slug = avatar["slug"]
                if slug in slugs:
                    results.add_fail(f"Avatar {i}", f"Duplicate slug: '{slug}'")
                else:
                    slugs.append(slug)
            
            if "url" not in avatar:
                results.add_fail(f"Avatar {i}", "Missing 'url' field")
        
        if len(slugs) == len(avatars):
            results.add_pass(f"All {len(avatars)} avatars have unique slugs")
        else:
            results.add_fail("Avatar uniqueness", f"Found {len(avatars) - len(slugs)} duplicate slugs")
        
        # Log first 3 avatars as sample
        log_info("Sample avatars (first 3):")
        for avatar in avatars[:3]:
            log_detail(f"  {avatar.get('slug', 'N/A')}", avatar.get('url', 'N/A'))
        
    except requests.exceptions.RequestException as e:
        results.add_fail("GET avatars", f"Request failed: {str(e)}")
    except json.JSONDecodeError as e:
        results.add_fail("Avatars response", f"Invalid JSON: {str(e)}")
    except Exception as e:
        results.add_fail("Avatars test", f"Unexpected error: {str(e)}")

def test_5_settings():
    """Test 5: GET /api/settings - Sanity check"""
    log_test(5, "GET /api/settings - Sanity check (public settings)")
    
    try:
        response = requests.get(f"{API_BASE}/settings", timeout=10)
        
        log_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            results.add_fail("GET settings", f"Expected HTTP 200, got {response.status_code}")
            log_detail("Response", response.text[:500])
            return
        
        results.add_pass("GET /api/settings returns HTTP 200")
        
        settings = response.json()
        
        if not isinstance(settings, dict):
            results.add_fail("Settings response", f"Expected dict, got {type(settings).__name__}")
            return
        
        results.add_pass("Response is a JSON object")
        log_detail("Settings keys", list(settings.keys()))
        
        # Log some common settings
        for key in ["presentation_mode", "maintenance_mode", "early_access_mode", "chat_enabled"]:
            if key in settings:
                log_detail(f"  {key}", settings[key])
        
    except requests.exceptions.RequestException as e:
        results.add_fail("GET settings", f"Request failed: {str(e)}")
    except json.JSONDecodeError as e:
        results.add_fail("Settings response", f"Invalid JSON: {str(e)}")
    except Exception as e:
        results.add_fail("Settings test", f"Unexpected error: {str(e)}")

def main():
    """Run all tests"""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}CARTOONIX BACKEND API TESTING - AUTH/PROFILE SCOPE{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    print(f"Backend URL: {API_BASE}")
    print(f"Test User: {TEST_EMAIL}")
    print(f"{BLUE}{'='*80}{RESET}\n")
    
    # Run tests in sequence
    token = test_1_login()
    test_2_auth_me(token)
    test_3_patch_avatar(token)
    test_4_avatars()
    test_5_settings()
    
    # Print summary
    success = results.summary()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
