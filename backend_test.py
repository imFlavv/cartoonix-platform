#!/usr/bin/env python3
"""
Cartoonix Login Endpoint Robustness Test Suite
Tests login endpoint after bcrypt compatibility fix
"""
import requests
import json
import sys

# Configuration
BASE_URL = "https://admin-episode-sorter.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@cartoonix.ro"
ADMIN_PASSWORD = "admin1234"
TEST_EMAIL = "test@cartoonix.ro"
TEST_PASSWORD = "test1234"
LEGACY_EMAIL = "legacy2y@test.ro"
LEGACY_PASSWORD = "parola123"
NOHASH_EMAIL = "nohash@test.ro"

def log(msg: str):
    """Print test log message"""
    print(f"[TEST] {msg}")

def test_backend_health():
    """Verify backend service is healthy"""
    log("\n=== BACKEND HEALTH CHECK ===")
    
    response = requests.get(f"{BASE_URL}/shows")
    
    if response.status_code != 200:
        log(f"❌ FAIL: Backend health check failed with status {response.status_code}")
        return False
    
    log(f"✅ PASS: Backend is healthy (GET /api/shows returns 200)")
    return True

def test_1_normal_login_admin():
    """Test 1: Normal login regression - admin user"""
    log("\n=== TEST 1a: Normal login (admin@cartoonix.ro) ===")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    
    if response.status_code != 200:
        log(f"❌ FAIL: Expected 200, got {response.status_code}")
        log(f"   Response: {response.text}")
        return False
    
    data = response.json()
    
    # Verify response structure
    if "token" not in data:
        log(f"❌ FAIL: Response missing 'token' field")
        return False
    
    if "user" not in data:
        log(f"❌ FAIL: Response missing 'user' field")
        return False
    
    user = data["user"]
    if user.get("role") != "admin":
        log(f"❌ FAIL: Expected role='admin', got '{user.get('role')}'")
        return False
    
    log(f"✅ PASS: Admin login successful")
    log(f"   - Status: 200")
    log(f"   - Token: {data['token'][:20]}...")
    log(f"   - User role: {user.get('role')}")
    log(f"   - User email: {user.get('email')}")
    return True

def test_1_normal_login_test():
    """Test 1: Normal login regression - test user"""
    log("\n=== TEST 1b: Normal login (test@cartoonix.ro) ===")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    
    if response.status_code != 200:
        log(f"❌ FAIL: Expected 200, got {response.status_code}")
        log(f"   Response: {response.text}")
        return False
    
    data = response.json()
    
    # Verify response structure
    if "token" not in data or "user" not in data:
        log(f"❌ FAIL: Response missing required fields")
        return False
    
    log(f"✅ PASS: Test user login successful")
    log(f"   - Status: 200")
    log(f"   - Token: {data['token'][:20]}...")
    log(f"   - User email: {data['user'].get('email')}")
    return True

def test_2_php_bcrypt_correct_password():
    """Test 2a: PHP-style bcrypt hash compatibility - correct password"""
    log("\n=== TEST 2a: PHP bcrypt ($2y$) with CORRECT password ===")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": LEGACY_EMAIL, "password": LEGACY_PASSWORD}
    )
    
    if response.status_code != 200:
        log(f"❌ FAIL: Expected 200, got {response.status_code}")
        log(f"   Response: {response.text}")
        log(f"   NOTE: Backend should normalize $2y$ to $2b$ for python-bcrypt compatibility")
        return False
    
    data = response.json()
    
    if "token" not in data or "user" not in data:
        log(f"❌ FAIL: Response missing required fields")
        return False
    
    log(f"✅ PASS: PHP bcrypt hash compatibility working")
    log(f"   - Status: 200")
    log(f"   - Token: {data['token'][:20]}...")
    log(f"   - User email: {data['user'].get('email')}")
    log(f"   - Backend correctly normalized $2y$ to $2b$")
    return True

def test_2_php_bcrypt_wrong_password():
    """Test 2b: PHP-style bcrypt hash compatibility - wrong password"""
    log("\n=== TEST 2b: PHP bcrypt ($2y$) with WRONG password ===")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": LEGACY_EMAIL, "password": "wrong"}
    )
    
    if response.status_code == 500:
        log(f"❌ FAIL: Got 500 (server crash) - should return 401")
        log(f"   Response: {response.text}")
        log(f"   NOTE: Backend should handle bcrypt verification errors gracefully")
        return False
    
    if response.status_code != 401:
        log(f"❌ FAIL: Expected 401, got {response.status_code}")
        log(f"   Response: {response.text}")
        return False
    
    log(f"✅ PASS: Wrong password correctly rejected")
    log(f"   - Status: 401 (NOT 500)")
    log(f"   - Clean error handling for wrong password")
    return True

def test_3_missing_password_hash():
    """Test 3: Missing password_hash field - should return 401, NOT 500"""
    log("\n=== TEST 3: Missing password_hash field ===")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": NOHASH_EMAIL, "password": "anything"}
    )
    
    if response.status_code == 500:
        log(f"❌ FAIL: Got 500 (server crash) - should return 401")
        log(f"   Response: {response.text}")
        log(f"   NOTE: Backend should handle missing password_hash gracefully")
        log(f"   HINT: Use get_stored_hash(user) instead of user['password_hash']")
        return False
    
    if response.status_code != 401:
        log(f"❌ FAIL: Expected 401, got {response.status_code}")
        log(f"   Response: {response.text}")
        return False
    
    data = response.json()
    detail = data.get("detail", "")
    
    # Should return a clean "invalid credentials" message, not a server error
    if "internal" in detail.lower() or "error" in detail.lower():
        log(f"❌ FAIL: Error message suggests server error: '{detail}'")
        return False
    
    log(f"✅ PASS: Missing password_hash handled gracefully")
    log(f"   - Status: 401 (NOT 500)")
    log(f"   - Clean error message: '{detail}'")
    log(f"   - No server crash")
    return True

def test_4_wrong_password_admin():
    """Test 4: Wrong password for admin user"""
    log("\n=== TEST 4: Wrong password for admin ===")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": "bad"}
    )
    
    if response.status_code != 401:
        log(f"❌ FAIL: Expected 401, got {response.status_code}")
        log(f"   Response: {response.text}")
        return False
    
    log(f"✅ PASS: Wrong password correctly rejected")
    log(f"   - Status: 401")
    return True

def test_5_nonexistent_email():
    """Test 5: Non-existent email"""
    log("\n=== TEST 5: Non-existent email ===")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "nobody@nowhere.ro", "password": "x"}
    )
    
    if response.status_code != 401:
        log(f"❌ FAIL: Expected 401, got {response.status_code}")
        log(f"   Response: {response.text}")
        return False
    
    log(f"✅ PASS: Non-existent email correctly rejected")
    log(f"   - Status: 401")
    return True

def main():
    """Run all tests"""
    print("=" * 80)
    print("CARTOONIX LOGIN ENDPOINT ROBUSTNESS TEST SUITE")
    print("=" * 80)
    
    tests = [
        ("Backend Health Check", test_backend_health),
        ("Test 1a: Normal login (admin)", test_1_normal_login_admin),
        ("Test 1b: Normal login (test user)", test_1_normal_login_test),
        ("Test 2a: PHP bcrypt ($2y$) - correct password", test_2_php_bcrypt_correct_password),
        ("Test 2b: PHP bcrypt ($2y$) - wrong password", test_2_php_bcrypt_wrong_password),
        ("Test 3: Missing password_hash field", test_3_missing_password_hash),
        ("Test 4: Wrong password for admin", test_4_wrong_password_admin),
        ("Test 5: Non-existent email", test_5_nonexistent_email),
    ]
    
    passed = 0
    failed = 0
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
                failed_tests.append(test_name)
        except Exception as e:
            failed += 1
            failed_tests.append(test_name)
            log(f"❌ ERROR in {test_name}: {e}")
            import traceback
            traceback.print_exc()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total tests: {len(tests)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed > 0:
        print("\nFailed tests:")
        for test_name in failed_tests:
            print(f"  - {test_name}")
    
    print("=" * 80)
    
    if failed == 0:
        print("✅ ALL TESTS PASSED!")
        return 0
    else:
        print(f"❌ {failed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
