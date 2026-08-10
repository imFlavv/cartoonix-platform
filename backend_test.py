#!/usr/bin/env python3
"""
Backend API tests for Cartoonix VPS media library features.
Tests: POST /api/admin/import-folder and GET /api/media/videos/{path} with Range support.
"""
import requests
import sys
from urllib.parse import quote

# Configuration
BASE_URL = "https://a24d1dc1-8c5f-4d9b-b559-5d7a7b94cb87.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@cartoonix.ro"
ADMIN_PASSWORD = "admin1234"
TEST_EMAIL = "test@cartoonix.ro"
TEST_PASSWORD = "test1234"

# Test file details
S01E01_FILENAME = "Alpha Teens On Machines A.T.O.M S01E01 - Evadarea lui Paine [WmJx1].mp4"
S01E02_FILENAME = "Alpha Teens On Machines A.T.O.M S01E02 - Atingerea [aBc2].mp4"
S01E01_SIZE = 3000000
S01E02_SIZE = 2000000

def login(email: str, password: str) -> str:
    """Login and return bearer token."""
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if resp.status_code != 200:
        print(f"❌ Login failed for {email}: {resp.status_code} {resp.text}")
        sys.exit(1)
    data = resp.json()
    return data.get("token") or data.get("access_token")

def test_import_folder():
    """Test POST /api/admin/import-folder endpoint."""
    print("\n" + "="*80)
    print("(A) Testing POST /api/admin/import-folder")
    print("="*80)
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    test_token = login(TEST_EMAIL, TEST_PASSWORD)
    
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_test = {"Authorization": f"Bearer {test_token}"}
    
    # A1: Admin with folder "ATOM" -> 200
    print("\nA1: Admin POST with folder='ATOM'")
    resp = requests.post(f"{BASE_URL}/admin/import-folder", 
                        json={"folder": "ATOM"}, 
                        headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        count = data.get("count")
        episodes = data.get("episodes", [])
        folder = data.get("folder", "")
        
        print(f"   Count: {count}")
        print(f"   Folder: {folder}")
        
        # Verify count
        if count != 2:
            print(f"   ❌ FAIL: Expected count=2, got {count}")
            return False
        
        # Verify folder ends with /media/videos/ATOM
        if not folder.endswith("/media/videos/ATOM"):
            print(f"   ❌ FAIL: Folder should end with /media/videos/ATOM, got {folder}")
            return False
        
        # Verify episodes structure
        if len(episodes) != 2:
            print(f"   ❌ FAIL: Expected 2 episodes, got {len(episodes)}")
            return False
        
        # Verify episode 1
        ep1 = episodes[0]
        if ep1.get("number") != 1:
            print(f"   ❌ FAIL: Episode 1 number should be 1, got {ep1.get('number')}")
            return False
        
        expected_title1 = "Alpha Teens On Machines A.T.O.M S01E01 - Evadarea lui Paine"
        if ep1.get("title") != expected_title1:
            print(f"   ❌ FAIL: Episode 1 title mismatch")
            print(f"      Expected: {expected_title1}")
            print(f"      Got: {ep1.get('title')}")
            return False
        
        if not ep1.get("video_url", "").startswith("/media/videos/ATOM/"):
            print(f"   ❌ FAIL: Episode 1 video_url should start with /media/videos/ATOM/, got {ep1.get('video_url')}")
            return False
        
        # Verify episode 2
        ep2 = episodes[1]
        if ep2.get("number") != 2:
            print(f"   ❌ FAIL: Episode 2 number should be 2, got {ep2.get('number')}")
            return False
        
        print(f"   Episode 1: number={ep1.get('number')}, title='{ep1.get('title')}'")
        print(f"   Episode 2: number={ep2.get('number')}, title='{ep2.get('title')}'")
        print("   ✅ PASS")
    else:
        print(f"   ❌ FAIL: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
        return False
    
    # A2: Admin with absolute path "/media/videos/ATOM" -> 200
    print("\nA2: Admin POST with absolute folder='/media/videos/ATOM'")
    resp = requests.post(f"{BASE_URL}/admin/import-folder", 
                        json={"folder": "/media/videos/ATOM"}, 
                        headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        if data.get("count") != 2:
            print(f"   ❌ FAIL: Expected count=2, got {data.get('count')}")
            return False
        print(f"   Count: {data.get('count')}, Episodes: {len(data.get('episodes', []))}")
        print("   ✅ PASS")
    else:
        print(f"   ❌ FAIL: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
        return False
    
    # A3: Admin with "/etc" -> 400 (outside VIDEO_DIR)
    print("\nA3: Admin POST with folder='/etc' (outside VIDEO_DIR)")
    resp = requests.post(f"{BASE_URL}/admin/import-folder", 
                        json={"folder": "/etc"}, 
                        headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 400:
        print("   ✅ PASS")
    else:
        print(f"   ❌ FAIL: Expected 400, got {resp.status_code}")
        return False
    
    # A3b: Admin with "../../etc" -> 400 (path traversal)
    print("\nA3b: Admin POST with folder='../../etc' (path traversal)")
    resp = requests.post(f"{BASE_URL}/admin/import-folder", 
                        json={"folder": "../../etc"}, 
                        headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 400:
        print("   ✅ PASS")
    else:
        print(f"   ❌ FAIL: Expected 400, got {resp.status_code}")
        return False
    
    # A4: Admin with non-existent folder -> 404
    print("\nA4: Admin POST with folder='NOPE_DOES_NOT_EXIST'")
    resp = requests.post(f"{BASE_URL}/admin/import-folder", 
                        json={"folder": "NOPE_DOES_NOT_EXIST"}, 
                        headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 404:
        print("   ✅ PASS")
    else:
        print(f"   ❌ FAIL: Expected 404, got {resp.status_code}")
        return False
    
    # A5: Admin with empty folder -> 400
    print("\nA5: Admin POST with folder='' (empty)")
    resp = requests.post(f"{BASE_URL}/admin/import-folder", 
                        json={"folder": ""}, 
                        headers=headers_admin)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 400:
        print("   ✅ PASS")
    else:
        print(f"   ❌ FAIL: Expected 400, got {resp.status_code}")
        return False
    
    # A6: Test user (non-admin) with "ATOM" -> 403
    print("\nA6: Test user (non-admin) POST with folder='ATOM'")
    resp = requests.post(f"{BASE_URL}/admin/import-folder", 
                        json={"folder": "ATOM"}, 
                        headers=headers_test)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 403:
        print("   ✅ PASS")
    else:
        print(f"   ❌ FAIL: Expected 403, got {resp.status_code}")
        return False
    
    return True

def test_video_streaming():
    """Test GET /api/media/videos/{path} with Range support."""
    print("\n" + "="*80)
    print("(B) Testing GET /api/media/videos/{path} with Range support")
    print("="*80)
    
    # URL-encode the filename (spaces and brackets)
    encoded_filename = quote(S01E01_FILENAME)
    video_url = f"{BASE_URL}/media/videos/ATOM/{encoded_filename}"
    
    # B1: Full GET -> 200, Content-Length=3000000, Accept-Ranges=bytes, Content-Type=video/mp4
    print("\nB1: Full GET of S01E01 file")
    resp = requests.get(video_url)
    print(f"   Status: {resp.status_code}")
    print(f"   Content-Length: {resp.headers.get('Content-Length')}")
    print(f"   Accept-Ranges: {resp.headers.get('Accept-Ranges')}")
    print(f"   Content-Type: {resp.headers.get('Content-Type')}")
    
    if resp.status_code != 200:
        print(f"   ❌ FAIL: Expected 200, got {resp.status_code}")
        return False
    
    if resp.headers.get('Content-Length') != str(S01E01_SIZE):
        print(f"   ❌ FAIL: Expected Content-Length={S01E01_SIZE}, got {resp.headers.get('Content-Length')}")
        return False
    
    if resp.headers.get('Accept-Ranges') != 'bytes':
        print(f"   ❌ FAIL: Expected Accept-Ranges=bytes, got {resp.headers.get('Accept-Ranges')}")
        return False
    
    if resp.headers.get('Content-Type') != 'video/mp4':
        print(f"   ❌ FAIL: Expected Content-Type=video/mp4, got {resp.headers.get('Content-Type')}")
        return False
    
    print("   ✅ PASS")
    
    # B2: Range: bytes=0-99 -> 206, Content-Range="bytes 0-99/3000000", body=100 bytes
    print("\nB2: GET with Range: bytes=0-99")
    resp = requests.get(video_url, headers={"Range": "bytes=0-99"})
    print(f"   Status: {resp.status_code}")
    print(f"   Content-Range: {resp.headers.get('Content-Range')}")
    print(f"   Body length: {len(resp.content)}")
    
    if resp.status_code != 206:
        print(f"   ❌ FAIL: Expected 206, got {resp.status_code}")
        return False
    
    if resp.headers.get('Content-Range') != f'bytes 0-99/{S01E01_SIZE}':
        print(f"   ❌ FAIL: Expected Content-Range='bytes 0-99/{S01E01_SIZE}', got {resp.headers.get('Content-Range')}")
        return False
    
    if len(resp.content) != 100:
        print(f"   ❌ FAIL: Expected body length=100, got {len(resp.content)}")
        return False
    
    print("   ✅ PASS")
    
    # B3: Range: bytes=1000000- -> 206, Content-Range="bytes 1000000-2999999/3000000"
    print("\nB3: GET with Range: bytes=1000000-")
    resp = requests.get(video_url, headers={"Range": "bytes=1000000-"})
    print(f"   Status: {resp.status_code}")
    print(f"   Content-Range: {resp.headers.get('Content-Range')}")
    
    if resp.status_code != 206:
        print(f"   ❌ FAIL: Expected 206, got {resp.status_code}")
        return False
    
    expected_range = f'bytes 1000000-{S01E01_SIZE-1}/{S01E01_SIZE}'
    if resp.headers.get('Content-Range') != expected_range:
        print(f"   ❌ FAIL: Expected Content-Range='{expected_range}', got {resp.headers.get('Content-Range')}")
        return False
    
    print("   ✅ PASS")
    
    # B4: Path traversal -> 403
    print("\nB4: GET with path traversal %2e%2e%2f%2e%2e%2fetc%2fpasswd")
    traversal_url = f"{BASE_URL}/media/videos/%2e%2e%2f%2e%2e%2fetc%2fpasswd"
    resp = requests.get(traversal_url)
    print(f"   Status: {resp.status_code}")
    
    if resp.status_code != 403:
        print(f"   ❌ FAIL: Expected 403, got {resp.status_code}")
        return False
    
    print("   ✅ PASS")
    
    # B5: Missing file -> 404
    print("\nB5: GET missing file ATOM/nope.mp4")
    missing_url = f"{BASE_URL}/media/videos/ATOM/nope.mp4"
    resp = requests.get(missing_url)
    print(f"   Status: {resp.status_code}")
    
    if resp.status_code != 404:
        print(f"   ❌ FAIL: Expected 404, got {resp.status_code}")
        return False
    
    print("   ✅ PASS")
    
    return True

def main():
    print("="*80)
    print("Cartoonix VPS Media Library Backend Tests")
    print("="*80)
    
    try:
        # Test import-folder endpoint
        import_success = test_import_folder()
        
        # Test video streaming endpoint
        streaming_success = test_video_streaming()
        
        # Summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        if import_success and streaming_success:
            print("✅ ALL TESTS PASSED (11/11)")
            print("   - POST /api/admin/import-folder: 6/6 tests passed")
            print("   - GET /api/media/videos/{path}: 5/5 tests passed")
            return 0
        else:
            print("❌ SOME TESTS FAILED")
            if not import_success:
                print("   - POST /api/admin/import-folder: FAILED")
            if not streaming_success:
                print("   - GET /api/media/videos/{path}: FAILED")
            return 1
    
    except Exception as e:
        print(f"\n❌ TEST EXECUTION ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
