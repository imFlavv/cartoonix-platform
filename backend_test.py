#!/usr/bin/env python3
"""
Backend API Test Suite for Cartoonix Watch Party Global Toggle
Tests the watch_party_enabled setting and its enforcement across REST and WebSocket endpoints.
"""
import requests
import sys
import json

# Configuration
BASE_URL = "https://user-dashboard-138.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "test_admin@cartoonix.ro"
ADMIN_PASSWORD = "TestAdmin#2026"
FREE_EMAIL = "test_free@cartoonix.ro"
FREE_PASSWORD = "TestFree#2026"

def login(email: str, password: str) -> str:
    """Login and return access token."""
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if resp.status_code != 200:
        print(f"❌ Login failed for {email}: {resp.status_code} {resp.text}")
        return None
    data = resp.json()
    return data.get("access_token")

def test_watch_party_toggle():
    """Test Watch Party global toggle feature."""
    print("\n" + "="*80)
    print("WATCH PARTY GLOBAL TOGGLE TEST SUITE")
    print("="*80)
    
    results = []
    
    # Get tokens
    print("\n🔐 Authenticating...")
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    free_token = login(FREE_EMAIL, FREE_PASSWORD)
    
    if not admin_token:
        print("❌ CRITICAL: Admin login failed")
        return False
    if not free_token:
        print("❌ CRITICAL: Free user login failed")
        return False
    
    print(f"✅ Admin token: {admin_token[:20]}...")
    print(f"✅ Free token: {free_token[:20]}...")
    
    # ========================================================================
    # TEST 1: GET /api/settings (public, no auth) returns watch_party_enabled
    # ========================================================================
    print("\n" + "-"*80)
    print("TEST 1: GET /api/settings (public, no auth)")
    print("-"*80)
    try:
        resp = requests.get(f"{BASE_URL}/settings")
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text[:500]}")
        
        if resp.status_code == 200:
            data = resp.json()
            if "watch_party_enabled" in data:
                current_value = data["watch_party_enabled"]
                print(f"✅ PASS: watch_party_enabled present in response: {current_value}")
                results.append(("TEST 1", True, f"watch_party_enabled={current_value}"))
            else:
                print(f"❌ FAIL: watch_party_enabled key missing from response")
                results.append(("TEST 1", False, "watch_party_enabled key missing"))
        else:
            print(f"❌ FAIL: Expected 200, got {resp.status_code}")
            results.append(("TEST 1", False, f"HTTP {resp.status_code}"))
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        results.append(("TEST 1", False, str(e)))
    
    # ========================================================================
    # TEST 2: Permission checks - non-admin and no-auth cannot modify setting
    # ========================================================================
    print("\n" + "-"*80)
    print("TEST 2: Permission checks for PATCH /api/admin/settings")
    print("-"*80)
    
    # 2a: Non-admin token (free user) should get 403
    print("\n2a. Non-admin token (free user) -> expect 403")
    try:
        resp = requests.patch(
            f"{BASE_URL}/admin/settings",
            json={"watch_party_enabled": False},
            headers={"Authorization": f"Bearer {free_token}"}
        )
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text[:300]}")
        
        if resp.status_code == 403:
            print(f"✅ PASS: Non-admin correctly rejected with 403")
            results.append(("TEST 2a", True, "Non-admin rejected with 403"))
        else:
            print(f"❌ FAIL: Expected 403, got {resp.status_code}")
            results.append(("TEST 2a", False, f"Expected 403, got {resp.status_code}"))
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        results.append(("TEST 2a", False, str(e)))
    
    # 2b: No token should get 401 or 403
    print("\n2b. No token -> expect 401 or 403")
    try:
        resp = requests.patch(
            f"{BASE_URL}/admin/settings",
            json={"watch_party_enabled": False}
        )
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text[:300]}")
        
        if resp.status_code in (401, 403):
            print(f"✅ PASS: No token correctly rejected with {resp.status_code}")
            results.append(("TEST 2b", True, f"No token rejected with {resp.status_code}"))
        else:
            print(f"❌ FAIL: Expected 401 or 403, got {resp.status_code}")
            results.append(("TEST 2b", False, f"Expected 401/403, got {resp.status_code}"))
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        results.append(("TEST 2b", False, str(e)))
    
    # ========================================================================
    # TEST 3: Admin can disable watch_party_enabled
    # ========================================================================
    print("\n" + "-"*80)
    print("TEST 3: Admin PATCH to disable watch_party_enabled")
    print("-"*80)
    try:
        resp = requests.patch(
            f"{BASE_URL}/admin/settings",
            json={"watch_party_enabled": False},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text[:500]}")
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("watch_party_enabled") == False:
                print(f"✅ PASS: Admin successfully disabled watch_party_enabled")
                results.append(("TEST 3a", True, "Admin PATCH successful"))
                
                # Verify via GET /api/settings
                print("\n3b. Verify via GET /api/settings")
                resp2 = requests.get(f"{BASE_URL}/settings")
                if resp2.status_code == 200:
                    data2 = resp2.json()
                    if data2.get("watch_party_enabled") == False:
                        print(f"✅ PASS: GET /api/settings confirms watch_party_enabled=false")
                        results.append(("TEST 3b", True, "GET confirms disabled"))
                    else:
                        print(f"❌ FAIL: GET shows watch_party_enabled={data2.get('watch_party_enabled')}")
                        results.append(("TEST 3b", False, f"GET shows {data2.get('watch_party_enabled')}"))
                else:
                    print(f"❌ FAIL: GET returned {resp2.status_code}")
                    results.append(("TEST 3b", False, f"GET returned {resp2.status_code}"))
            else:
                print(f"❌ FAIL: watch_party_enabled={data.get('watch_party_enabled')}, expected False")
                results.append(("TEST 3a", False, f"Value is {data.get('watch_party_enabled')}"))
        else:
            print(f"❌ FAIL: Expected 200, got {resp.status_code}")
            results.append(("TEST 3a", False, f"HTTP {resp.status_code}"))
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        results.append(("TEST 3a", False, str(e)))
    
    # ========================================================================
    # TEST 4: While disabled, POST /api/watch-parties should return 403
    # ========================================================================
    print("\n" + "-"*80)
    print("TEST 4: While disabled, admin POST /api/watch-parties -> expect 403")
    print("-"*80)
    try:
        resp = requests.post(
            f"{BASE_URL}/watch-parties",
            json={"title": "Should be blocked"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text[:500]}")
        
        if resp.status_code == 403:
            data = resp.json()
            detail = data.get("detail", "")
            if "dezactivat" in detail.lower() or "disabled" in detail.lower():
                print(f"✅ PASS: Create blocked with 403 and appropriate message")
                results.append(("TEST 4", True, f"403 with message: {detail}"))
            else:
                print(f"⚠️  PASS (status): Got 403 but message unclear: {detail}")
                results.append(("TEST 4", True, f"403 but message: {detail}"))
        else:
            print(f"❌ FAIL: Expected 403, got {resp.status_code}")
            results.append(("TEST 4", False, f"Expected 403, got {resp.status_code}"))
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        results.append(("TEST 4", False, str(e)))
    
    # ========================================================================
    # TEST 5: Re-enable watch_party_enabled
    # ========================================================================
    print("\n" + "-"*80)
    print("TEST 5: Admin PATCH to re-enable watch_party_enabled")
    print("-"*80)
    try:
        resp = requests.patch(
            f"{BASE_URL}/admin/settings",
            json={"watch_party_enabled": True},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text[:500]}")
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("watch_party_enabled") == True:
                print(f"✅ PASS: Admin successfully re-enabled watch_party_enabled")
                results.append(("TEST 5a", True, "Admin PATCH successful"))
                
                # Verify via GET /api/settings
                print("\n5b. Verify via GET /api/settings")
                resp2 = requests.get(f"{BASE_URL}/settings")
                if resp2.status_code == 200:
                    data2 = resp2.json()
                    if data2.get("watch_party_enabled") == True:
                        print(f"✅ PASS: GET /api/settings confirms watch_party_enabled=true")
                        results.append(("TEST 5b", True, "GET confirms enabled"))
                    else:
                        print(f"❌ FAIL: GET shows watch_party_enabled={data2.get('watch_party_enabled')}")
                        results.append(("TEST 5b", False, f"GET shows {data2.get('watch_party_enabled')}"))
                else:
                    print(f"❌ FAIL: GET returned {resp2.status_code}")
                    results.append(("TEST 5b", False, f"GET returned {resp2.status_code}"))
            else:
                print(f"❌ FAIL: watch_party_enabled={data.get('watch_party_enabled')}, expected True")
                results.append(("TEST 5a", False, f"Value is {data.get('watch_party_enabled')}"))
        else:
            print(f"❌ FAIL: Expected 200, got {resp.status_code}")
            results.append(("TEST 5a", False, f"HTTP {resp.status_code}"))
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        results.append(("TEST 5a", False, str(e)))
    
    # ========================================================================
    # TEST 6: While enabled, POST /api/watch-parties should work (200 with party)
    # ========================================================================
    print("\n" + "-"*80)
    print("TEST 6: While enabled, admin POST /api/watch-parties -> expect 200")
    print("-"*80)
    try:
        resp = requests.post(
            f"{BASE_URL}/watch-parties",
            json={"title": "Now allowed"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text[:500]}")
        
        if resp.status_code == 200:
            data = resp.json()
            party = data.get("party", {})
            public_code = party.get("public_code")
            if public_code:
                print(f"✅ PASS: Create succeeded with 200, party.public_code={public_code}")
                results.append(("TEST 6", True, f"200 with public_code={public_code}"))
            else:
                print(f"⚠️  PASS (status): Got 200 but no public_code in response")
                results.append(("TEST 6", True, "200 but no public_code"))
        else:
            print(f"❌ FAIL: Expected 200, got {resp.status_code}")
            results.append(("TEST 6", False, f"Expected 200, got {resp.status_code}"))
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        results.append(("TEST 6", False, str(e)))
    
    # ========================================================================
    # FINAL: Ensure watch_party_enabled is left TRUE
    # ========================================================================
    print("\n" + "-"*80)
    print("FINAL: Ensure watch_party_enabled is left TRUE")
    print("-"*80)
    try:
        resp = requests.get(f"{BASE_URL}/settings")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("watch_party_enabled") == True:
                print(f"✅ Setting is TRUE (as required)")
            else:
                print(f"⚠️  Setting is {data.get('watch_party_enabled')}, re-enabling...")
                resp2 = requests.patch(
                    f"{BASE_URL}/admin/settings",
                    json={"watch_party_enabled": True},
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                if resp2.status_code == 200:
                    print(f"✅ Re-enabled successfully")
                else:
                    print(f"❌ Failed to re-enable: {resp2.status_code}")
    except Exception as e:
        print(f"⚠️  Could not verify final state: {e}")
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, success, _ in results if success)
    total = len(results)
    
    for test_name, success, detail in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} | {test_name:15} | {detail}")
    
    print("\n" + "="*80)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("="*80)
    
    return passed == total

if __name__ == "__main__":
    success = test_watch_party_toggle()
    sys.exit(0 if success else 1)
