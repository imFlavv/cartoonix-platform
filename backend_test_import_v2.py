#!/usr/bin/env python3
"""
Backend API tests for Cartoonix VPS media import v2 features.
Tests: POST /api/admin/import-folder (season-aware + duration) and POST /api/admin/import-all (bulk import).
"""
import requests
import sys

# Configuration
BASE_URL = "https://a24d1dc1-8c5f-4d9b-b559-5d7a7b94cb87.preview.emergentagent.com/api"
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

def test_import_folder_v2():
    """Test POST /api/admin/import-folder with season awareness and duration detection."""
    print("\n" + "="*80)
    print("(A) Testing POST /api/admin/import-folder (v2 - seasons + duration)")
    print("="*80)
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    test_token = login(TEST_EMAIL, TEST_PASSWORD)
    
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_test = {"Authorization": f"Bearer {test_token}"}
    
    passed = 0
    failed = 0
    
    # A1: {"folder":"ATOM"} -> 200, count=2, seasons=[], season=null, durations non-empty
    print("\nA1: Admin POST with folder='ATOM' (flat structure, no seasons)")
    resp = requests.post(f"{BASE_URL}/admin/import-folder", 
                        json={"folder": "ATOM"}, 
                        headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        count = data.get("count")
        episodes = data.get("episodes", [])
        seasons = data.get("seasons", [])
        
        print(f"   Count: {count}")
        print(f"   Seasons: {seasons}")
        
        # Check count
        if count != 2:
            print(f"   ❌ FAIL: Expected count=2, got {count}")
            failed += 1
        # Check seasons is empty list
        elif seasons != []:
            print(f"   ❌ FAIL: Expected seasons=[], got {seasons}")
            failed += 1
        # Check episodes
        elif len(episodes) != 2:
            print(f"   ❌ FAIL: Expected 2 episodes, got {len(episodes)}")
            failed += 1
        else:
            # Check episode 1
            ep1 = episodes[0]
            ep2 = episodes[1]
            
            print(f"   Episode 1: number={ep1.get('number')}, season={ep1.get('season')}, duration='{ep1.get('duration')}'")
            print(f"   Episode 2: number={ep2.get('number')}, season={ep2.get('season')}, duration='{ep2.get('duration')}'")
            
            # Verify episode numbers
            if ep1.get("number") != 1 or ep2.get("number") != 2:
                print(f"   ❌ FAIL: Expected episode numbers 1 and 2, got {ep1.get('number')} and {ep2.get('number')}")
                failed += 1
            # Verify season is null
            elif ep1.get("season") is not None or ep2.get("season") is not None:
                print(f"   ❌ FAIL: Expected season=null for both episodes, got {ep1.get('season')} and {ep2.get('season')}")
                failed += 1
            # Verify durations are non-empty
            elif not ep1.get("duration") or not ep2.get("duration"):
                print(f"   ❌ FAIL: Expected non-empty durations, got '{ep1.get('duration')}' and '{ep2.get('duration')}'")
                failed += 1
            else:
                print("   ✅ PASS: count=2, seasons=[], episode numbers 1,2, season=null, durations non-empty")
                passed += 1
    else:
        print(f"   ❌ FAIL: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
        failed += 1
    
    # A2: {"folder":"Tom si Jerry"} -> 200, count=3, seasons=["Sezon 1","Sezon 2"], episodes with correct seasons
    print("\nA2: Admin POST with folder='Tom si Jerry' (subfolder seasons)")
    resp = requests.post(f"{BASE_URL}/admin/import-folder", 
                        json={"folder": "Tom si Jerry"}, 
                        headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        count = data.get("count")
        episodes = data.get("episodes", [])
        seasons = data.get("seasons", [])
        
        print(f"   Count: {count}")
        print(f"   Seasons: {seasons}")
        
        # Check count
        if count != 3:
            print(f"   ❌ FAIL: Expected count=3, got {count}")
            failed += 1
        # Check seasons
        elif seasons != ["Sezon 1", "Sezon 2"]:
            print(f"   ❌ FAIL: Expected seasons=['Sezon 1', 'Sezon 2'], got {seasons}")
            failed += 1
        # Check episodes
        elif len(episodes) != 3:
            print(f"   ❌ FAIL: Expected 3 episodes, got {len(episodes)}")
            failed += 1
        else:
            ep1 = episodes[0]
            ep2 = episodes[1]
            ep3 = episodes[2]
            
            print(f"   Episode 1: number={ep1.get('number')}, season='{ep1.get('season')}', duration='{ep1.get('duration')}'")
            print(f"   Episode 2: number={ep2.get('number')}, season='{ep2.get('season')}', duration='{ep2.get('duration')}'")
            print(f"   Episode 3: number={ep3.get('number')}, season='{ep3.get('season')}', duration='{ep3.get('duration')}'")
            
            # Verify episode numbers
            if ep1.get("number") != 1 or ep2.get("number") != 2 or ep3.get("number") != 3:
                print(f"   ❌ FAIL: Expected episode numbers 1,2,3, got {ep1.get('number')},{ep2.get('number')},{ep3.get('number')}")
                failed += 1
            # Verify seasons
            elif ep1.get("season") != "Sezon 1" or ep2.get("season") != "Sezon 1" or ep3.get("season") != "Sezon 2":
                print(f"   ❌ FAIL: Expected seasons 'Sezon 1','Sezon 1','Sezon 2', got '{ep1.get('season')}','{ep2.get('season')}','{ep3.get('season')}'")
                failed += 1
            # Verify durations are non-empty
            elif not ep1.get("duration") or not ep2.get("duration") or not ep3.get("duration"):
                print(f"   ❌ FAIL: Expected non-empty durations, got '{ep1.get('duration')}','{ep2.get('duration')}','{ep3.get('duration')}'")
                failed += 1
            else:
                print("   ✅ PASS: count=3, seasons=['Sezon 1','Sezon 2'], correct episode numbers and seasons, durations non-empty")
                passed += 1
    else:
        print(f"   ❌ FAIL: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
        failed += 1
    
    # A3a: {"folder":"/etc"} -> 400 (outside VIDEO_DIR)
    print("\nA3a: Admin POST with folder='/etc' (outside VIDEO_DIR)")
    resp = requests.post(f"{BASE_URL}/admin/import-folder", 
                        json={"folder": "/etc"}, 
                        headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 400:
        print("   ✅ PASS: Correctly rejected folder outside VIDEO_DIR")
        passed += 1
    else:
        print(f"   ❌ FAIL: Expected 400, got {resp.status_code}")
        failed += 1
    
    # A3b: {"folder":"NOPE_DOES_NOT_EXIST"} -> 404
    print("\nA3b: Admin POST with folder='NOPE_DOES_NOT_EXIST' (non-existent)")
    resp = requests.post(f"{BASE_URL}/admin/import-folder", 
                        json={"folder": "NOPE_DOES_NOT_EXIST"}, 
                        headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 404:
        print("   ✅ PASS: Correctly returned 404 for non-existent folder")
        passed += 1
    else:
        print(f"   ❌ FAIL: Expected 404, got {resp.status_code}")
        failed += 1
    
    # A3c: {"folder":""} -> 400
    print("\nA3c: Admin POST with folder='' (empty)")
    resp = requests.post(f"{BASE_URL}/admin/import-folder", 
                        json={"folder": ""}, 
                        headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 400:
        print("   ✅ PASS: Correctly rejected empty folder")
        passed += 1
    else:
        print(f"   ❌ FAIL: Expected 400, got {resp.status_code}")
        failed += 1
    
    # A3d: Test user (non-admin) {"folder":"ATOM"} -> 403
    print("\nA3d: Test user (non-admin) POST with folder='ATOM'")
    resp = requests.post(f"{BASE_URL}/admin/import-folder", 
                        json={"folder": "ATOM"}, 
                        headers=headers_test)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 403:
        print("   ✅ PASS: Correctly rejected non-admin user")
        passed += 1
    else:
        print(f"   ❌ FAIL: Expected 403, got {resp.status_code}")
        failed += 1
    
    print(f"\n(A) import-folder: {passed} passed, {failed} failed")
    return passed, failed

def test_import_all():
    """Test POST /api/admin/import-all bulk import."""
    print("\n" + "="*80)
    print("(B) Testing POST /api/admin/import-all (bulk import)")
    print("="*80)
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    test_token = login(TEST_EMAIL, TEST_PASSWORD)
    
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_test = {"Authorization": f"Bearer {test_token}"}
    
    passed = 0
    failed = 0
    
    # B1: {"folder":"/media/videos"} -> 200, shows already exist so skipped_count >= 2
    print("\nB1: Admin POST with folder='/media/videos' (re-run, shows exist)")
    resp = requests.post(f"{BASE_URL}/admin/import-all", 
                        json={"folder": "/media/videos"}, 
                        headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        created_count = data.get("created_count")
        skipped_count = data.get("skipped_count")
        total_episodes = data.get("total_episodes")
        created = data.get("created", [])
        skipped = data.get("skipped", [])
        
        print(f"   created_count: {created_count}")
        print(f"   skipped_count: {skipped_count}")
        print(f"   total_episodes: {total_episodes}")
        print(f"   created: {created}")
        print(f"   skipped: {skipped}")
        
        # Check response structure
        if "created_count" not in data or "skipped_count" not in data or "total_episodes" not in data:
            print(f"   ❌ FAIL: Missing required keys in response")
            failed += 1
        elif "created" not in data or "skipped" not in data:
            print(f"   ❌ FAIL: Missing 'created' or 'skipped' lists in response")
            failed += 1
        # Check skipped count (should be >= 2 since ATOM and Tom si Jerry exist)
        elif skipped_count < 2:
            print(f"   ❌ FAIL: Expected skipped_count >= 2 (ATOM and Tom si Jerry exist), got {skipped_count}")
            failed += 1
        else:
            # Check if skipped entries have reason "există deja"
            atom_skipped = False
            tom_skipped = False
            for skip in skipped:
                if "ATOM" in skip.get("folder", "") or "ATOM" in skip.get("title", ""):
                    atom_skipped = True
                    if skip.get("reason") != "există deja":
                        print(f"   ❌ FAIL: ATOM skip reason should be 'există deja', got '{skip.get('reason')}'")
                        failed += 1
                        break
                if "Tom si Jerry" in skip.get("folder", "") or "Tom si Jerry" in skip.get("title", ""):
                    tom_skipped = True
                    if skip.get("reason") != "există deja":
                        print(f"   ❌ FAIL: Tom si Jerry skip reason should be 'există deja', got '{skip.get('reason')}'")
                        failed += 1
                        break
            
            if not atom_skipped or not tom_skipped:
                print(f"   ⚠️  WARNING: Expected ATOM and Tom si Jerry in skipped list")
                print(f"   Skipped entries: {skipped}")
            
            if failed == 0:
                print("   ✅ PASS: Response structure correct, skipped_count >= 2, reason 'există deja'")
                passed += 1
    else:
        print(f"   ❌ FAIL: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
        failed += 1
    
    # B2: {"folder":"/etc"} -> 400 (outside VIDEO_DIR)
    print("\nB2: Admin POST with folder='/etc' (outside VIDEO_DIR)")
    resp = requests.post(f"{BASE_URL}/admin/import-all", 
                        json={"folder": "/etc"}, 
                        headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 400:
        print("   ✅ PASS: Correctly rejected folder outside VIDEO_DIR")
        passed += 1
    else:
        print(f"   ❌ FAIL: Expected 400, got {resp.status_code}")
        failed += 1
    
    # B3: {"folder":"/media/videos/ATOM/NOPE"} -> 404 (non-existent)
    print("\nB3: Admin POST with folder='/media/videos/ATOM/NOPE' (non-existent)")
    resp = requests.post(f"{BASE_URL}/admin/import-all", 
                        json={"folder": "/media/videos/ATOM/NOPE"}, 
                        headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 404:
        print("   ✅ PASS: Correctly returned 404 for non-existent folder")
        passed += 1
    else:
        print(f"   ❌ FAIL: Expected 404, got {resp.status_code}")
        failed += 1
    
    # B4: Test user (non-admin) {"folder":"/media/videos"} -> 403
    print("\nB4: Test user (non-admin) POST with folder='/media/videos'")
    resp = requests.post(f"{BASE_URL}/admin/import-all", 
                        json={"folder": "/media/videos"}, 
                        headers=headers_test)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 403:
        print("   ✅ PASS: Correctly rejected non-admin user")
        passed += 1
    else:
        print(f"   ❌ FAIL: Expected 403, got {resp.status_code}")
        failed += 1
    
    print(f"\n(B) import-all: {passed} passed, {failed} failed")
    return passed, failed

def main():
    print("="*80)
    print("Cartoonix VPS Media Import v2 Backend Tests")
    print("="*80)
    
    try:
        # Test import-folder v2 (seasons + duration)
        a_passed, a_failed = test_import_folder_v2()
        
        # Test import-all (bulk import)
        b_passed, b_failed = test_import_all()
        
        # Summary
        total_passed = a_passed + b_passed
        total_failed = a_failed + b_failed
        total_tests = total_passed + total_failed
        
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        if total_failed == 0:
            print(f"✅ ALL TESTS PASSED ({total_passed}/{total_tests})")
            print(f"   - POST /api/admin/import-folder (v2): {a_passed}/6 tests passed")
            print(f"   - POST /api/admin/import-all: {b_passed}/4 tests passed")
            return 0
        else:
            print(f"❌ SOME TESTS FAILED ({total_passed} passed, {total_failed} failed out of {total_tests})")
            if a_failed > 0:
                print(f"   - POST /api/admin/import-folder (v2): {a_passed} passed, {a_failed} failed")
            if b_failed > 0:
                print(f"   - POST /api/admin/import-all: {b_passed} passed, {b_failed} failed")
            return 1
    
    except Exception as e:
        print(f"\n❌ TEST EXECUTION ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
