#!/usr/bin/env python3
"""
Backend API tests for Cartoonix Leaderboard endpoint.
Tests: GET /api/leaderboard (top 10 + me + search)
"""
import requests
import sys

# Configuration
BASE_URL = "https://admin-episode-sorter.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@cartoonix.ro"
ADMIN_PASSWORD = "admin1234"
TEST_EMAIL = "test@cartoonix.ro"
TEST_PASSWORD = "test1234"

def login(email: str, password: str) -> str:
    """Login and return bearer token."""
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if resp.status_code != 200:
        print(f"❌ Login failed for {email}: {resp.status_code} {resp.text}")
        sys.exit(1)
    data = resp.json()
    return data.get("token") or data.get("access_token")

def test_leaderboard():
    """Test GET /api/leaderboard endpoint."""
    print("\n" + "="*80)
    print("Testing GET /api/leaderboard")
    print("="*80)
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    test_token = login(TEST_EMAIL, TEST_PASSWORD)
    
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_test = {"Authorization": f"Bearer {test_token}"}
    
    # Test 1: As admin GET /api/leaderboard -> 200
    print("\n1. Admin GET /api/leaderboard (no query)")
    resp = requests.get(f"{BASE_URL}/leaderboard", headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"   ❌ FAIL: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
        return False
    
    data = resp.json()
    print(f"   Response keys: {list(data.keys())}")
    
    # Verify response structure
    if "top" not in data:
        print(f"   ❌ FAIL: Response missing 'top' key")
        return False
    
    if "me" not in data:
        print(f"   ❌ FAIL: Response missing 'me' key")
        return False
    
    top = data["top"]
    me = data["me"]
    
    print(f"   Top entries count: {len(top)}")
    print(f"   Me: {me}")
    
    # Verify top is a list with <= 10 entries
    if not isinstance(top, list):
        print(f"   ❌ FAIL: 'top' should be a list, got {type(top)}")
        return False
    
    if len(top) > 10:
        print(f"   ❌ FAIL: 'top' should have <= 10 entries, got {len(top)}")
        return False
    
    # Verify each entry in top has required fields
    required_fields = ["rank", "id", "name", "avatar", "plus", "seconds", "hours_label", "online"]
    for i, entry in enumerate(top):
        for field in required_fields:
            if field not in entry:
                print(f"   ❌ FAIL: top[{i}] missing field '{field}'")
                return False
        
        # Verify field types
        if not isinstance(entry["rank"], int):
            print(f"   ❌ FAIL: top[{i}].rank should be int, got {type(entry['rank'])}")
            return False
        
        if not isinstance(entry["plus"], bool):
            print(f"   ❌ FAIL: top[{i}].plus should be bool, got {type(entry['plus'])}")
            return False
        
        if not isinstance(entry["seconds"], int):
            print(f"   ❌ FAIL: top[{i}].seconds should be int, got {type(entry['seconds'])}")
            return False
        
        if not isinstance(entry["hours_label"], str):
            print(f"   ❌ FAIL: top[{i}].hours_label should be str, got {type(entry['hours_label'])}")
            return False
        
        if not isinstance(entry["online"], bool):
            print(f"   ❌ FAIL: top[{i}].online should be bool, got {type(entry['online'])}")
            return False
    
    # Verify top is sorted by seconds descending (rank 1 has highest seconds)
    if len(top) > 1:
        for i in range(len(top) - 1):
            if top[i]["seconds"] < top[i+1]["seconds"]:
                print(f"   ❌ FAIL: top not sorted by seconds descending")
                print(f"      top[{i}].seconds={top[i]['seconds']} < top[{i+1}].seconds={top[i+1]['seconds']}")
                return False
    
    print(f"   Top entries (first 3):")
    for i, entry in enumerate(top[:3]):
        print(f"      {i+1}. rank={entry['rank']}, name='{entry['name']}', seconds={entry['seconds']}, hours_label='{entry['hours_label']}', online={entry['online']}")
    
    # Verify me has required fields
    for field in required_fields:
        if field not in me:
            print(f"   ❌ FAIL: 'me' missing field '{field}'")
            return False
    
    # Verify me.rank is a positive int
    if not isinstance(me["rank"], int) or me["rank"] < 1:
        print(f"   ❌ FAIL: me.rank should be a positive int, got {me['rank']}")
        return False
    
    # Verify me corresponds to admin user (name "Admin")
    if me["name"] != "Admin":
        print(f"   ❌ FAIL: me.name should be 'Admin', got '{me['name']}'")
        return False
    
    print(f"   Me: rank={me['rank']}, name='{me['name']}', seconds={me['seconds']}, hours_label='{me['hours_label']}', online={me['online']}")
    print("   ✅ PASS")
    
    # Test 2: As admin GET /api/leaderboard?q=admin -> 200 with results
    print("\n2. Admin GET /api/leaderboard?q=admin")
    resp = requests.get(f"{BASE_URL}/leaderboard?q=admin", headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"   ❌ FAIL: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
        return False
    
    data = resp.json()
    
    # Verify response has results field
    if "results" not in data:
        print(f"   ❌ FAIL: Response missing 'results' key")
        return False
    
    results = data["results"]
    print(f"   Results count: {len(results)}")
    
    if not isinstance(results, list):
        print(f"   ❌ FAIL: 'results' should be a list, got {type(results)}")
        return False
    
    # Verify admin user appears in results (case-insensitive nickname match)
    admin_found = False
    for entry in results:
        if "admin" in entry["name"].lower():
            admin_found = True
            print(f"   Admin user found in results: rank={entry['rank']}, name='{entry['name']}', seconds={entry['seconds']}")
            break
    
    if not admin_found:
        print(f"   ❌ FAIL: Admin user not found in results")
        print(f"   Results: {[r['name'] for r in results]}")
        return False
    
    # Verify each result has required fields
    for i, entry in enumerate(results):
        for field in required_fields:
            if field not in entry:
                print(f"   ❌ FAIL: results[{i}] missing field '{field}'")
                return False
    
    print("   ✅ PASS")
    
    # Test 3: As admin GET /api/leaderboard?q=zzz_no_such_user -> 200 with empty results
    print("\n3. Admin GET /api/leaderboard?q=zzz_no_such_user")
    resp = requests.get(f"{BASE_URL}/leaderboard?q=zzz_no_such_user", headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"   ❌ FAIL: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
        return False
    
    data = resp.json()
    
    if "results" not in data:
        print(f"   ❌ FAIL: Response missing 'results' key")
        return False
    
    results = data["results"]
    
    if not isinstance(results, list):
        print(f"   ❌ FAIL: 'results' should be a list, got {type(results)}")
        return False
    
    if len(results) != 0:
        print(f"   ❌ FAIL: Expected empty results list, got {len(results)} entries")
        print(f"   Results: {results}")
        return False
    
    print(f"   Results: {results}")
    print("   ✅ PASS")
    
    # Test 4: GET /api/leaderboard with NO Authorization header -> 401 or 403
    print("\n4. GET /api/leaderboard without auth")
    resp = requests.get(f"{BASE_URL}/leaderboard")
    print(f"   Status: {resp.status_code}")
    
    if resp.status_code not in [401, 403]:
        print(f"   ❌ FAIL: Expected 401 or 403, got {resp.status_code}")
        print(f"   Response: {resp.text}")
        return False
    
    print("   ✅ PASS")
    
    # Test 5: As test user GET /api/leaderboard -> 200, me.name should be "Cont Test"
    print("\n5. Test user GET /api/leaderboard")
    resp = requests.get(f"{BASE_URL}/leaderboard", headers=headers_test)
    print(f"   Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"   ❌ FAIL: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
        return False
    
    data = resp.json()
    
    if "me" not in data:
        print(f"   ❌ FAIL: Response missing 'me' key")
        return False
    
    me = data["me"]
    
    # Verify me.name is "Cont Test"
    if me["name"] != "Cont Test":
        print(f"   ❌ FAIL: me.name should be 'Cont Test', got '{me['name']}'")
        return False
    
    print(f"   Me: rank={me['rank']}, name='{me['name']}', seconds={me['seconds']}, hours_label='{me['hours_label']}', online={me['online']}")
    print("   ✅ PASS")
    
    return True

def main():
    print("="*80)
    print("Cartoonix Leaderboard Backend Tests")
    print("="*80)
    
    try:
        # Test leaderboard endpoint
        success = test_leaderboard()
        
        # Summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        if success:
            print("✅ ALL TESTS PASSED (5/5)")
            print("   1. Admin GET /api/leaderboard -> 200 with correct structure")
            print("   2. Admin GET /api/leaderboard?q=admin -> 200 with results")
            print("   3. Admin GET /api/leaderboard?q=zzz_no_such_user -> 200 with empty results")
            print("   4. GET /api/leaderboard without auth -> 401/403")
            print("   5. Test user GET /api/leaderboard -> 200 with me.name='Cont Test'")
            return 0
        else:
            print("❌ SOME TESTS FAILED")
            return 1
    
    except Exception as e:
        print(f"\n❌ TEST EXECUTION ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
