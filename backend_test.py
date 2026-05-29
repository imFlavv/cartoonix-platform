#!/usr/bin/env python3
"""Backend test for Cartoonix video streaming endpoint with HTTP Range support."""
import os
import sys
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / "frontend" / ".env")

# Get backend URL from frontend .env
BACKEND_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001")
BASE_URL = f"{BACKEND_URL}/api"

print(f"Testing backend at: {BASE_URL}")
print("=" * 80)

# Test counters
total_tests = 0
passed_tests = 0
failed_tests = 0

def test_result(name, passed, details=""):
    """Record and print test result."""
    global total_tests, passed_tests, failed_tests
    total_tests += 1
    if passed:
        passed_tests += 1
        print(f"✅ PASS: {name}")
    else:
        failed_tests += 1
        print(f"❌ FAIL: {name}")
    if details:
        print(f"   {details}")
    print()

# =============================================================================
# VIDEO STREAMING ENDPOINT TESTS
# =============================================================================

print("\n" + "=" * 80)
print("VIDEO STREAMING ENDPOINT TESTS (HTTP Range Support)")
print("=" * 80 + "\n")

# Test 1: Full GET request (no Range header)
print("Test 1: Full GET /api/media/videos/_qa/clip.mp4")
print("-" * 80)
try:
    response = requests.get(f"{BASE_URL}/media/videos/_qa/clip.mp4", timeout=10)
    
    status_ok = response.status_code == 200
    accept_ranges = response.headers.get("Accept-Ranges") == "bytes"
    content_type = response.headers.get("Content-Type") == "video/mp4"
    content_length = response.headers.get("Content-Length") == "1048576"
    body_size = len(response.content) == 1048576
    
    all_checks = status_ok and accept_ranges and content_type and content_length and body_size
    
    details = f"Status: {response.status_code} (expected 200), "
    details += f"Accept-Ranges: {response.headers.get('Accept-Ranges')} (expected bytes), "
    details += f"Content-Type: {response.headers.get('Content-Type')} (expected video/mp4), "
    details += f"Content-Length: {response.headers.get('Content-Length')} (expected 1048576), "
    details += f"Body size: {len(response.content)} (expected 1048576)"
    
    test_result("Full GET returns 200 with correct headers and body", all_checks, details)
except Exception as e:
    test_result("Full GET returns 200 with correct headers and body", False, f"Exception: {e}")

# Test 2: Range GET bytes=0-1023
print("Test 2: Range GET bytes=0-1023")
print("-" * 80)
try:
    headers = {"Range": "bytes=0-1023"}
    response = requests.get(f"{BASE_URL}/media/videos/_qa/clip.mp4", headers=headers, timeout=10)
    
    status_ok = response.status_code == 206
    content_range = response.headers.get("Content-Range") == "bytes 0-1023/1048576"
    content_length = response.headers.get("Content-Length") == "1024"
    accept_ranges = response.headers.get("Accept-Ranges") == "bytes"
    body_size = len(response.content) == 1024
    
    all_checks = status_ok and content_range and content_length and accept_ranges and body_size
    
    details = f"Status: {response.status_code} (expected 206), "
    details += f"Content-Range: {response.headers.get('Content-Range')} (expected bytes 0-1023/1048576), "
    details += f"Content-Length: {response.headers.get('Content-Length')} (expected 1024), "
    details += f"Accept-Ranges: {response.headers.get('Accept-Ranges')} (expected bytes), "
    details += f"Body size: {len(response.content)} (expected 1024)"
    
    test_result("Range GET bytes=0-1023 returns 206 Partial Content", all_checks, details)
except Exception as e:
    test_result("Range GET bytes=0-1023 returns 206 Partial Content", False, f"Exception: {e}")

# Test 3: Range GET bytes=1048000- (open-ended)
print("Test 3: Range GET bytes=1048000- (open-ended)")
print("-" * 80)
try:
    headers = {"Range": "bytes=1048000-"}
    response = requests.get(f"{BASE_URL}/media/videos/_qa/clip.mp4", headers=headers, timeout=10)
    
    status_ok = response.status_code == 206
    # Should return bytes 1048000-1048575 (576 bytes remaining)
    content_range = response.headers.get("Content-Range") == "bytes 1048000-1048575/1048576"
    expected_length = 1048576 - 1048000  # 576 bytes
    content_length = response.headers.get("Content-Length") == str(expected_length)
    accept_ranges = response.headers.get("Accept-Ranges") == "bytes"
    body_size = len(response.content) == expected_length
    
    all_checks = status_ok and content_range and content_length and accept_ranges and body_size
    
    details = f"Status: {response.status_code} (expected 206), "
    details += f"Content-Range: {response.headers.get('Content-Range')} (expected bytes 1048000-1048575/1048576), "
    details += f"Content-Length: {response.headers.get('Content-Length')} (expected {expected_length}), "
    details += f"Accept-Ranges: {response.headers.get('Accept-Ranges')} (expected bytes), "
    details += f"Body size: {len(response.content)} (expected {expected_length})"
    
    test_result("Range GET bytes=1048000- returns 206 with correct ending", all_checks, details)
except Exception as e:
    test_result("Range GET bytes=1048000- returns 206 with correct ending", False, f"Exception: {e}")

# Test 4: Unsatisfiable range bytes=9999999-10000000
print("Test 4: Unsatisfiable range bytes=9999999-10000000")
print("-" * 80)
try:
    headers = {"Range": "bytes=9999999-10000000"}
    response = requests.get(f"{BASE_URL}/media/videos/_qa/clip.mp4", headers=headers, timeout=10)
    
    status_ok = response.status_code == 416
    content_range = response.headers.get("Content-Range") == "bytes */1048576"
    
    all_checks = status_ok and content_range
    
    details = f"Status: {response.status_code} (expected 416), "
    details += f"Content-Range: {response.headers.get('Content-Range')} (expected bytes */1048576)"
    
    test_result("Unsatisfiable range returns 416 Range Not Satisfiable", all_checks, details)
except Exception as e:
    test_result("Unsatisfiable range returns 416 Range Not Satisfiable", False, f"Exception: {e}")

# Test 5: Missing file
print("Test 5: Missing file GET /api/media/videos/_qa/does-not-exist.mp4")
print("-" * 80)
try:
    response = requests.get(f"{BASE_URL}/media/videos/_qa/does-not-exist.mp4", timeout=10)
    
    status_ok = response.status_code == 404
    
    details = f"Status: {response.status_code} (expected 404)"
    
    test_result("Missing file returns 404 Not Found", status_ok, details)
except Exception as e:
    test_result("Missing file returns 404 Not Found", False, f"Exception: {e}")

# Test 6: Path traversal attempt
print("Test 6: Path traversal GET /api/media/videos/..%2f..%2f..%2fetc%2fpasswd")
print("-" * 80)
try:
    # URL-encoded ../../../etc/passwd
    response = requests.get(f"{BASE_URL}/media/videos/..%2f..%2f..%2fetc%2fpasswd", timeout=10)
    
    # Must NOT return 200 with /etc/passwd contents
    # Should be 403 or 404
    status_ok = response.status_code in [403, 404]
    
    # Additional check: if it's 200, make sure it's not the passwd file
    if response.status_code == 200:
        # Check if response contains typical /etc/passwd patterns
        content = response.text.lower()
        is_passwd = "root:" in content or "/bin/bash" in content or "/bin/sh" in content
        if is_passwd:
            status_ok = False
            details = f"SECURITY ISSUE: Status {response.status_code} returned /etc/passwd contents!"
        else:
            details = f"Status: {response.status_code} (unexpected 200, but not /etc/passwd)"
    else:
        details = f"Status: {response.status_code} (expected 403 or 404) ✓ Path traversal blocked"
    
    test_result("Path traversal attempt blocked (403/404, not 200 with passwd)", status_ok, details)
except Exception as e:
    test_result("Path traversal attempt blocked (403/404, not 200 with passwd)", False, f"Exception: {e}")

# =============================================================================
# SUMMARY
# =============================================================================

print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"Total tests: {total_tests}")
print(f"Passed: {passed_tests} ✅")
print(f"Failed: {failed_tests} ❌")
print(f"Success rate: {(passed_tests/total_tests*100):.1f}%")
print("=" * 80 + "\n")

# Exit with appropriate code
sys.exit(0 if failed_tests == 0 else 1)
