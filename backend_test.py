#!/usr/bin/env python3
"""
Backend test suite for Cartoonix TV pre-registration feature.
Tests only the NEW Cartoonix TV endpoints as requested.
"""
import requests
import sys
import time

# Backend URL from frontend/.env
BACKEND_URL = "http://localhost:8001/api"

# Admin credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "test_admin@cartoonix.ro"
ADMIN_PASSWORD = "TestAdmin#2026"

# Test user credentials
FREE_EMAIL = "test_free@cartoonix.ro"
FREE_PASSWORD = "TestFree#2026"

def print_test(num, desc):
    print(f"\n{'='*80}")
    print(f"TEST {num}: {desc}")
    print('='*80)

def print_pass(msg):
    print(f"✅ PASS: {msg}")

def print_fail(msg):
    print(f"❌ FAIL: {msg}")

def get_admin_token():
    """Login as admin and return access token."""
    resp = requests.post(f"{BACKEND_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code != 200:
        print_fail(f"Admin login failed: {resp.status_code} {resp.text}")
        sys.exit(1)
    return resp.json()["access_token"]

def get_free_token():
    """Login as free user and return access token."""
    resp = requests.post(f"{BACKEND_URL}/auth/login", json={
        "email": FREE_EMAIL,
        "password": FREE_PASSWORD
    })
    if resp.status_code != 200:
        print_fail(f"Free user login failed: {resp.status_code} {resp.text}")
        sys.exit(1)
    return resp.json()["access_token"]

def test_1_settings_includes_cartoonix_tv_enabled():
    """Test 1: GET /api/settings includes cartoonix_tv_enabled key (bool, default true)"""
    print_test(1, "GET /api/settings includes cartoonix_tv_enabled")
    
    resp = requests.get(f"{BACKEND_URL}/settings")
    
    if resp.status_code != 200:
        print_fail(f"Expected 200, got {resp.status_code}")
        return False
    
    data = resp.json()
    
    if "cartoonix_tv_enabled" not in data:
        print_fail("cartoonix_tv_enabled key not found in response")
        return False
    
    if not isinstance(data["cartoonix_tv_enabled"], bool):
        print_fail(f"cartoonix_tv_enabled is not bool, got {type(data['cartoonix_tv_enabled'])}")
        return False
    
    print_pass(f"cartoonix_tv_enabled present and is bool: {data['cartoonix_tv_enabled']}")
    return True

def test_2_register_valid_returns_success_and_stripe_url():
    """Test 2: POST /api/cartoonix-tv/register with valid data returns success + id + stripe_url"""
    print_test(2, "POST /api/cartoonix-tv/register with valid data")
    
    # Use unique email with timestamp to avoid conflicts
    test_email = f"ion.popescu.ctv.{int(time.time())}@test.ro"
    
    payload = {
        "name": "Ion Popescu",
        "email": test_email,
        "password": "secret123",
        "accepted": True
    }
    
    resp = requests.post(f"{BACKEND_URL}/cartoonix-tv/register", json=payload)
    
    if resp.status_code != 200:
        print_fail(f"Expected 200, got {resp.status_code}: {resp.text}")
        return False, None, None
    
    data = resp.json()
    
    # Check response structure
    if not data.get("success"):
        print_fail("success is not True")
        return False, None, None
    
    if "id" not in data:
        print_fail("id not in response")
        return False, None, None
    
    if "stripe_url" not in data:
        print_fail("stripe_url not in response")
        return False, None, None
    
    reg_id = data["id"]
    stripe_url = data["stripe_url"]
    
    # Verify stripe_url contains client_reference_id and prefilled_email
    if f"client_reference_id={reg_id}" not in stripe_url:
        print_fail(f"stripe_url does not contain client_reference_id={reg_id}")
        return False, None, None
    
    if f"prefilled_email={test_email}" not in stripe_url:
        print_fail(f"stripe_url does not contain prefilled_email={test_email}")
        return False, None, None
    
    print_pass(f"Registration successful with id={reg_id}")
    print_pass(f"stripe_url contains client_reference_id={reg_id}")
    print_pass(f"stripe_url contains prefilled_email={test_email}")
    
    return True, reg_id, test_email

def test_3_register_same_email_unpaid_returns_same_id():
    """Test 3: Registering with same email (unpaid) returns same id (idempotent)"""
    print_test(3, "POST /api/cartoonix-tv/register with same email (unpaid) - idempotent")
    
    # First registration
    test_email = f"maria.ionescu.ctv.{int(time.time())}@test.ro"
    payload = {
        "name": "Maria Ionescu",
        "email": test_email,
        "password": "password123",
        "accepted": True
    }
    
    resp1 = requests.post(f"{BACKEND_URL}/cartoonix-tv/register", json=payload)
    if resp1.status_code != 200:
        print_fail(f"First registration failed: {resp1.status_code}")
        return False
    
    id1 = resp1.json()["id"]
    print_pass(f"First registration: id={id1}")
    
    # Second registration with same email
    time.sleep(0.5)  # Small delay
    resp2 = requests.post(f"{BACKEND_URL}/cartoonix-tv/register", json=payload)
    if resp2.status_code != 200:
        print_fail(f"Second registration failed: {resp2.status_code}")
        return False
    
    id2 = resp2.json()["id"]
    print_pass(f"Second registration: id={id2}")
    
    if id1 != id2:
        print_fail(f"IDs don't match: {id1} != {id2}")
        return False
    
    print_pass(f"Idempotent behavior confirmed: same id={id1} returned")
    return True

def test_4_register_validation_errors():
    """Test 4: POST /api/cartoonix-tv/register validation errors"""
    print_test(4, "POST /api/cartoonix-tv/register validation errors")
    
    all_passed = True
    
    # Test 4a: accepted=false should return 400
    payload_no_accept = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "secret123",
        "accepted": False
    }
    resp = requests.post(f"{BACKEND_URL}/cartoonix-tv/register", json=payload_no_accept)
    if resp.status_code == 400:
        print_pass("accepted=false returns HTTP 400")
    else:
        print_fail(f"accepted=false: expected 400, got {resp.status_code}")
        all_passed = False
    
    # Test 4b: invalid email should return 422
    payload_bad_email = {
        "name": "Test User",
        "email": "not-an-email",
        "password": "secret123",
        "accepted": True
    }
    resp = requests.post(f"{BACKEND_URL}/cartoonix-tv/register", json=payload_bad_email)
    if resp.status_code == 422:
        print_pass("Invalid email returns HTTP 422")
    else:
        print_fail(f"Invalid email: expected 422, got {resp.status_code}")
        all_passed = False
    
    # Test 4c: password shorter than 6 chars should return 422
    payload_short_pass = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "12345",  # Only 5 chars
        "accepted": True
    }
    resp = requests.post(f"{BACKEND_URL}/cartoonix-tv/register", json=payload_short_pass)
    if resp.status_code == 422:
        print_pass("Password < 6 chars returns HTTP 422")
    else:
        print_fail(f"Short password: expected 422, got {resp.status_code}")
        all_passed = False
    
    return all_passed

def test_5_confirm_payment_with_fake_session():
    """Test 5: POST /api/cartoonix-tv/confirm-payment with fake session_id returns 400"""
    print_test(5, "POST /api/cartoonix-tv/confirm-payment with fake session_id")
    
    payload = {
        "session_id": "cs_test_invalid_1234567890"
    }
    
    resp = requests.post(f"{BACKEND_URL}/cartoonix-tv/confirm-payment", json=payload)
    
    if resp.status_code == 400:
        print_pass(f"Fake session_id returns HTTP 400 (expected)")
        return True
    else:
        print_fail(f"Expected 400, got {resp.status_code}: {resp.text}")
        return False

def test_6_admin_list_registrations_auth():
    """Test 6: GET /api/admin/cartoonix-tv/registrations auth checks"""
    print_test(6, "GET /api/admin/cartoonix-tv/registrations auth checks")
    
    all_passed = True
    
    # Test 6a: No auth token -> 401
    resp = requests.get(f"{BACKEND_URL}/admin/cartoonix-tv/registrations")
    if resp.status_code == 401:
        print_pass("No token returns HTTP 401")
    else:
        print_fail(f"No token: expected 401, got {resp.status_code}")
        all_passed = False
    
    # Test 6b: Free user token -> 403
    free_token = get_free_token()
    headers = {"Authorization": f"Bearer {free_token}"}
    resp = requests.get(f"{BACKEND_URL}/admin/cartoonix-tv/registrations", headers=headers)
    if resp.status_code == 403:
        print_pass("Free user token returns HTTP 403")
    else:
        print_fail(f"Free user token: expected 403, got {resp.status_code}")
        all_passed = False
    
    return all_passed

def test_7_admin_list_registrations_success():
    """Test 7: GET /api/admin/cartoonix-tv/registrations with admin token returns data"""
    print_test(7, "GET /api/admin/cartoonix-tv/registrations with admin token")
    
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    resp = requests.get(f"{BACKEND_URL}/admin/cartoonix-tv/registrations", headers=headers)
    
    if resp.status_code != 200:
        print_fail(f"Expected 200, got {resp.status_code}: {resp.text}")
        return False, None
    
    data = resp.json()
    
    # Check response structure
    required_keys = ["items", "total", "paid_count", "pending_count", "page", "page_size"]
    for key in required_keys:
        if key not in data:
            print_fail(f"Missing key: {key}")
            return False, None
    
    print_pass(f"Response includes all required keys: {required_keys}")
    print_pass(f"Total registrations: {data['total']}")
    print_pass(f"Paid: {data['paid_count']}, Pending: {data['pending_count']}")
    
    return True, data

def test_8_admin_list_registrations_filters():
    """Test 8: GET /api/admin/cartoonix-tv/registrations with filters (status, q)"""
    print_test(8, "GET /api/admin/cartoonix-tv/registrations with filters")
    
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    all_passed = True
    
    # Test 8a: Filter by status=pending
    resp = requests.get(
        f"{BACKEND_URL}/admin/cartoonix-tv/registrations",
        headers=headers,
        params={"status": "pending"}
    )
    if resp.status_code == 200:
        data = resp.json()
        print_pass(f"status=pending filter works: {len(data['items'])} items")
    else:
        print_fail(f"status=pending: expected 200, got {resp.status_code}")
        all_passed = False
    
    # Test 8b: Search with query parameter
    resp = requests.get(
        f"{BACKEND_URL}/admin/cartoonix-tv/registrations",
        headers=headers,
        params={"q": "ion"}
    )
    if resp.status_code == 200:
        data = resp.json()
        print_pass(f"q=ion search works: {len(data['items'])} items")
    else:
        print_fail(f"q=ion: expected 200, got {resp.status_code}")
        all_passed = False
    
    # Test 8c: Combined filters
    resp = requests.get(
        f"{BACKEND_URL}/admin/cartoonix-tv/registrations",
        headers=headers,
        params={"status": "pending", "q": "ion"}
    )
    if resp.status_code == 200:
        data = resp.json()
        print_pass(f"Combined filters work: {len(data['items'])} items")
    else:
        print_fail(f"Combined filters: expected 200, got {resp.status_code}")
        all_passed = False
    
    return all_passed

def test_9_admin_delete_registration(reg_id):
    """Test 9: DELETE /api/admin/cartoonix-tv/registrations/{id}"""
    print_test(9, "DELETE /api/admin/cartoonix-tv/registrations/{id}")
    
    admin_token = get_admin_token()
    free_token = get_free_token()
    
    all_passed = True
    
    # Test 9a: Non-admin -> 403
    headers = {"Authorization": f"Bearer {free_token}"}
    resp = requests.delete(f"{BACKEND_URL}/admin/cartoonix-tv/registrations/{reg_id}", headers=headers)
    if resp.status_code == 403:
        print_pass("Non-admin returns HTTP 403")
    else:
        print_fail(f"Non-admin: expected 403, got {resp.status_code}")
        all_passed = False
    
    # Test 9b: Admin with valid id -> 200
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = requests.delete(f"{BACKEND_URL}/admin/cartoonix-tv/registrations/{reg_id}", headers=headers)
    if resp.status_code == 200:
        print_pass(f"Admin delete successful: {reg_id}")
    else:
        print_fail(f"Admin delete: expected 200, got {resp.status_code}")
        all_passed = False
    
    # Test 9c: Admin with same id again -> 404
    resp = requests.delete(f"{BACKEND_URL}/admin/cartoonix-tv/registrations/{reg_id}", headers=headers)
    if resp.status_code == 404:
        print_pass("Re-delete returns HTTP 404 (already deleted)")
    else:
        print_fail(f"Re-delete: expected 404, got {resp.status_code}")
        all_passed = False
    
    return all_passed

def test_10_admin_settings_toggle_cartoonix_tv():
    """Test 10: PATCH /api/admin/settings to toggle cartoonix_tv_enabled"""
    print_test(10, "PATCH /api/admin/settings toggle cartoonix_tv_enabled")
    
    admin_token = get_admin_token()
    free_token = get_free_token()
    
    all_passed = True
    
    # Test 10a: Non-admin PATCH -> 403
    headers = {"Authorization": f"Bearer {free_token}"}
    resp = requests.patch(
        f"{BACKEND_URL}/admin/settings",
        headers=headers,
        json={"cartoonix_tv_enabled": False}
    )
    if resp.status_code == 403:
        print_pass("Non-admin PATCH returns HTTP 403")
    else:
        print_fail(f"Non-admin PATCH: expected 403, got {resp.status_code}")
        all_passed = False
    
    # Test 10b: Admin PATCH to disable -> 200
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = requests.patch(
        f"{BACKEND_URL}/admin/settings",
        headers=headers,
        json={"cartoonix_tv_enabled": False}
    )
    if resp.status_code == 200:
        data = resp.json()
        if data.get("cartoonix_tv_enabled") == False:
            print_pass("Admin disabled cartoonix_tv_enabled successfully")
        else:
            print_fail(f"cartoonix_tv_enabled not false in response: {data.get('cartoonix_tv_enabled')}")
            all_passed = False
    else:
        print_fail(f"Admin PATCH disable: expected 200, got {resp.status_code}")
        all_passed = False
    
    # Test 10c: GET /api/settings reflects the change
    resp = requests.get(f"{BACKEND_URL}/settings")
    if resp.status_code == 200:
        data = resp.json()
        if data.get("cartoonix_tv_enabled") == False:
            print_pass("GET /api/settings shows cartoonix_tv_enabled=false")
        else:
            print_fail(f"GET /api/settings: cartoonix_tv_enabled not false: {data.get('cartoonix_tv_enabled')}")
            all_passed = False
    else:
        print_fail(f"GET /api/settings: expected 200, got {resp.status_code}")
        all_passed = False
    
    # Test 10d: Admin PATCH to re-enable -> 200
    resp = requests.patch(
        f"{BACKEND_URL}/admin/settings",
        headers=headers,
        json={"cartoonix_tv_enabled": True}
    )
    if resp.status_code == 200:
        data = resp.json()
        if data.get("cartoonix_tv_enabled") == True:
            print_pass("Admin re-enabled cartoonix_tv_enabled successfully")
        else:
            print_fail(f"cartoonix_tv_enabled not true in response: {data.get('cartoonix_tv_enabled')}")
            all_passed = False
    else:
        print_fail(f"Admin PATCH re-enable: expected 200, got {resp.status_code}")
        all_passed = False
    
    # Test 10e: GET /api/settings reflects the re-enable
    resp = requests.get(f"{BACKEND_URL}/settings")
    if resp.status_code == 200:
        data = resp.json()
        if data.get("cartoonix_tv_enabled") == True:
            print_pass("GET /api/settings shows cartoonix_tv_enabled=true (restored)")
        else:
            print_fail(f"GET /api/settings: cartoonix_tv_enabled not true: {data.get('cartoonix_tv_enabled')}")
            all_passed = False
    else:
        print_fail(f"GET /api/settings: expected 200, got {resp.status_code}")
        all_passed = False
    
    return all_passed

def main():
    print("\n" + "="*80)
    print("CARTOONIX TV PRE-REGISTRATION BACKEND TEST SUITE")
    print("="*80)
    
    results = []
    
    # Test 1: GET /api/settings includes cartoonix_tv_enabled
    results.append(("Test 1: GET /api/settings", test_1_settings_includes_cartoonix_tv_enabled()))
    
    # Test 2: POST /api/cartoonix-tv/register with valid data
    test2_result, reg_id, test_email = test_2_register_valid_returns_success_and_stripe_url()
    results.append(("Test 2: POST /api/cartoonix-tv/register (valid)", test2_result))
    
    # Test 3: Idempotent re-issue with same email
    results.append(("Test 3: Idempotent re-issue", test_3_register_same_email_unpaid_returns_same_id()))
    
    # Test 4: Validation errors
    results.append(("Test 4: Validation errors", test_4_register_validation_errors()))
    
    # Test 5: Confirm payment with fake session
    results.append(("Test 5: Confirm payment (fake session)", test_5_confirm_payment_with_fake_session()))
    
    # Test 6: Admin list registrations auth checks
    results.append(("Test 6: Admin list auth checks", test_6_admin_list_registrations_auth()))
    
    # Test 7: Admin list registrations success
    test7_result, list_data = test_7_admin_list_registrations_success()
    results.append(("Test 7: Admin list registrations", test7_result))
    
    # Test 8: Admin list with filters
    results.append(("Test 8: Admin list with filters", test_8_admin_list_registrations_filters()))
    
    # Test 9: Admin delete registration (use reg_id from test 2)
    if reg_id:
        results.append(("Test 9: Admin delete registration", test_9_admin_delete_registration(reg_id)))
    else:
        print_fail("Skipping Test 9: no reg_id from Test 2")
        results.append(("Test 9: Admin delete registration", False))
    
    # Test 10: Admin settings toggle
    results.append(("Test 10: Admin settings toggle", test_10_admin_settings_toggle_cartoonix_tv()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("\n" + "="*80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}%)")
    print("="*80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
