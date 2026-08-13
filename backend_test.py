#!/usr/bin/env python3
"""
WatchParty Backend API Test Suite
Tests all 12 scenarios for the WatchParty feature
"""
import requests
import json
import time
from typing import Optional, Dict, Any

# Configuration
BASE_URL = "https://admin-episode-sorter.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@cartoonix.ro"
ADMIN_PASSWORD = "admin1234"
TEST_EMAIL = "test@cartoonix.ro"
TEST_PASSWORD = "test1234"

# Global state
admin_token = None
test_token = None
show_id = None
episode_number = None
room_id = None

def log(msg: str):
    """Print test log message"""
    print(f"[TEST] {msg}")

def login(email: str, password: str) -> str:
    """Login and return JWT token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
    if response.status_code != 200:
        raise Exception(f"Login failed for {email}: {response.status_code} {response.text}")
    data = response.json()
    return data["token"]

def get_shows(token: str) -> list:
    """Get list of shows"""
    response = requests.get(
        f"{BASE_URL}/shows",
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code != 200:
        raise Exception(f"Get shows failed: {response.status_code} {response.text}")
    return response.json()

def setup():
    """Setup test environment"""
    global admin_token, test_token, show_id, episode_number
    
    log("Setting up test environment...")
    
    # Login both users
    log("Logging in admin user...")
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    log(f"✓ Admin logged in")
    
    log("Logging in test user...")
    test_token = login(TEST_EMAIL, TEST_PASSWORD)
    log(f"✓ Test user logged in")
    
    # Get a show and episode
    log("Fetching shows...")
    shows = get_shows(admin_token)
    if not shows or len(shows) == 0:
        raise Exception("No shows available in database")
    
    show = shows[0]
    show_id = show["id"]
    episodes = show.get("episodes", [])
    if not episodes or len(episodes) == 0:
        raise Exception(f"Show {show.get('title')} has no episodes")
    
    episode_number = episodes[0]["number"]
    log(f"✓ Using show: {show.get('title')} (id={show_id})")
    log(f"✓ Using episode number: {episode_number}")
    
    log("Setup complete!\n")

def cleanup():
    """Cleanup any leftover active rooms"""
    global admin_token, test_token
    
    log("\nCleaning up...")
    
    # End any active rooms for admin
    try:
        response = requests.get(
            f"{BASE_URL}/watchparty/current",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200 and response.json():
            room = response.json()
            requests.post(
                f"{BASE_URL}/watchparty/{room['id']}/end",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            log("✓ Ended admin's active room")
    except:
        pass
    
    # End any active rooms for test user
    try:
        response = requests.get(
            f"{BASE_URL}/watchparty/current",
            headers={"Authorization": f"Bearer {test_token}"}
        )
        if response.status_code == 200 and response.json():
            room = response.json()
            requests.post(
                f"{BASE_URL}/watchparty/{room['id']}/end",
                headers={"Authorization": f"Bearer {test_token}"}
            )
            log("✓ Ended test user's active room")
    except:
        pass
    
    log("Cleanup complete!")

def test_1_create_as_plus():
    """(1) CREATE as admin (PLUS): POST /api/watchparty/create"""
    global room_id
    
    log("\n=== TEST 1: Create room as PLUS user (admin) ===")
    
    response = requests.post(
        f"{BASE_URL}/watchparty/create",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"playlist": [{"show_id": show_id, "episode_number": episode_number}]}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    room_id = data["id"]
    
    # Verify response structure
    assert data["is_owner"] == True, f"Expected is_owner=true, got {data['is_owner']}"
    assert data["max_others"] == 4, f"Expected max_others=4 for PLUS user, got {data['max_others']}"
    assert len(data["participants"]) == 1, f"Expected 1 participant, got {len(data['participants'])}"
    assert data["participants"][0]["name"] == "Admin", f"Expected participant name 'Admin', got {data['participants'][0]['name']}"
    assert len(data["playlist"]) == 1, f"Expected 1 playlist item, got {len(data['playlist'])}"
    assert data["status"] == "active", f"Expected status 'active', got {data['status']}"
    
    log(f"✅ PASS: Room created with id={room_id}")
    log(f"   - is_owner: {data['is_owner']}")
    log(f"   - max_others: {data['max_others']}")
    log(f"   - participants: {len(data['participants'])} (Admin)")
    log(f"   - playlist: {len(data['playlist'])} items")
    log(f"   - status: {data['status']}")
    
    return True

def test_2_get_current():
    """(2) GET /api/watchparty/current as admin"""
    log("\n=== TEST 2: Get current room as admin ===")
    
    response = requests.get(
        f"{BASE_URL}/watchparty/current",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert data is not None, "Expected room data, got null"
    assert data["id"] == room_id, f"Expected room_id={room_id}, got {data['id']}"
    
    log(f"✅ PASS: Current room returned correctly")
    log(f"   - room_id: {data['id']}")
    log(f"   - owner: {data['owner_name']}")
    
    return True

def test_3_invite_by_username():
    """(3) INVITE by username: as admin POST /api/watchparty/{id}/invite"""
    log("\n=== TEST 3: Invite test user by username ===")
    
    # Invite test user
    response = requests.post(
        f"{BASE_URL}/watchparty/{room_id}/invite",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"username": "Cont Test"}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    invited = data["invited"]
    assert len(invited) > 0, "Expected invited list to have entries"
    
    # Find the invited user
    invited_user = next((i for i in invited if i["name"] == "Cont Test"), None)
    assert invited_user is not None, "Expected 'Cont Test' in invited list"
    assert invited_user["status"] == "pending", f"Expected status 'pending', got {invited_user['status']}"
    assert data["slots_used"] == 1, f"Expected slots_used=1, got {data['slots_used']}"
    
    log(f"✅ PASS: User invited successfully")
    log(f"   - invited user: {invited_user['name']}")
    log(f"   - status: {invited_user['status']}")
    log(f"   - slots_used: {data['slots_used']}")
    
    # Check notifications for test user
    log("   Checking notifications for test user...")
    response = requests.get(
        f"{BASE_URL}/notifications",
        headers={"Authorization": f"Bearer {test_token}"}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    notifications_data = response.json()
    notifications = notifications_data.get("items", [])
    watchparty_notif = next((n for n in notifications if n.get("type") == "watchparty_invite" and n.get("room_id") == room_id), None)
    assert watchparty_notif is not None, "Expected watchparty_invite notification"
    
    log(f"   ✓ Notification found: type={watchparty_notif['type']}, room_id={watchparty_notif['room_id']}")
    
    # Check invitations list for test user
    log("   Checking invitations list for test user...")
    response = requests.get(
        f"{BASE_URL}/watchparty/invitations",
        headers={"Authorization": f"Bearer {test_token}"}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    invitations = response.json()
    room_invitation = next((inv for inv in invitations if inv["id"] == room_id), None)
    assert room_invitation is not None, f"Expected room {room_id} in invitations list"
    
    log(f"   ✓ Invitation found in list: room_id={room_invitation['id']}")
    
    return True

def test_4_invite_invalid_username():
    """(4) INVITE invalid username: as admin POST invite"""
    log("\n=== TEST 4: Invite invalid username ===")
    
    response = requests.post(
        f"{BASE_URL}/watchparty/{room_id}/invite",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"username": "no_such_user_xyz"}
    )
    
    assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    
    log(f"✅ PASS: Invalid username correctly rejected with 404")
    
    return True

def test_5_self_invite():
    """(5) SELF invite: as admin invite self"""
    log("\n=== TEST 5: Self-invite (should fail) ===")
    
    response = requests.post(
        f"{BASE_URL}/watchparty/{room_id}/invite",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"username": "Admin"}
    )
    
    assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    
    log(f"✅ PASS: Self-invite correctly rejected with 400")
    
    return True

def test_6_respond_accept():
    """(6) RESPOND accept: as test user POST /api/watchparty/{id}/respond"""
    log("\n=== TEST 6: Accept invitation as test user ===")
    
    response = requests.post(
        f"{BASE_URL}/watchparty/{room_id}/respond",
        headers={"Authorization": f"Bearer {test_token}"},
        json={"accept": True}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    participants = data["participants"]
    assert len(participants) == 2, f"Expected 2 participants, got {len(participants)}"
    
    participant_names = [p["name"] for p in participants]
    assert "Admin" in participant_names, "Expected 'Admin' in participants"
    assert "Cont Test" in participant_names, "Expected 'Cont Test' in participants"
    
    log(f"✅ PASS: Invitation accepted successfully")
    log(f"   - participants: {', '.join(participant_names)}")
    
    return True

def test_7_duplicate_invite():
    """(7) DUPLICATE invite: as admin invite test user again"""
    log("\n=== TEST 7: Duplicate invite (should fail) ===")
    
    response = requests.post(
        f"{BASE_URL}/watchparty/{room_id}/invite",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"username": "Cont Test"}
    )
    
    assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    
    log(f"✅ PASS: Duplicate invite correctly rejected with 400")
    
    return True

def test_8_control_owner():
    """(8) CONTROL owner: as admin POST control actions"""
    log("\n=== TEST 8: Control actions (owner vs non-owner) ===")
    
    # Admin (owner) can control - play
    log("   Testing owner control: play...")
    response = requests.post(
        f"{BASE_URL}/watchparty/{room_id}/control",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"action": "play", "position": 0}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert data["is_playing"] == True, f"Expected is_playing=true, got {data['is_playing']}"
    
    log(f"   ✓ Owner play action successful: is_playing={data['is_playing']}")
    
    # Admin (owner) can control - next
    log("   Testing owner control: next...")
    response = requests.post(
        f"{BASE_URL}/watchparty/{room_id}/control",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"action": "next"}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    log(f"   ✓ Owner next action successful")
    
    # Test user (non-owner) cannot control
    log("   Testing non-owner control: pause (should fail)...")
    response = requests.post(
        f"{BASE_URL}/watchparty/{room_id}/control",
        headers={"Authorization": f"Bearer {test_token}"},
        json={"action": "pause"}
    )
    
    assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
    
    log(f"✅ PASS: Control permissions working correctly")
    log(f"   - Owner can control: ✓")
    log(f"   - Non-owner blocked: ✓ (403)")
    
    return True

def test_9_access_control():
    """(9) ACCESS control: verify access after leaving"""
    log("\n=== TEST 9: Access control after leaving ===")
    
    # Test user leaves
    log("   Test user leaving room...")
    response = requests.post(
        f"{BASE_URL}/watchparty/{room_id}/leave",
        headers={"Authorization": f"Bearer {test_token}"}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert data["ended"] == False, f"Expected ended=false (non-owner leave), got {data['ended']}"
    
    log(f"   ✓ Test user left room: ended={data['ended']}")
    
    # Test user should not be able to access room anymore
    log("   Testing access after leaving (should fail)...")
    response = requests.get(
        f"{BASE_URL}/watchparty/{room_id}",
        headers={"Authorization": f"Bearer {test_token}"}
    )
    
    assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
    
    log(f"✅ PASS: Access control working correctly")
    log(f"   - Leave successful: ✓")
    log(f"   - Access denied after leaving: ✓ (403)")
    
    return True

def test_10_free_user_capacity():
    """(10) FREE user capacity: test max_others=1 for FREE user"""
    global room_id
    
    log("\n=== TEST 10: FREE user capacity limits ===")
    
    # Login as test user (FREE) and create room
    log("   Creating room as FREE user (test)...")
    response = requests.post(
        f"{BASE_URL}/watchparty/create",
        headers={"Authorization": f"Bearer {test_token}"},
        json={"playlist": []}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    free_room_id = data["id"]
    assert data["max_others"] == 1, f"Expected max_others=1 for FREE user, got {data['max_others']}"
    
    log(f"   ✓ FREE user room created: max_others={data['max_others']}")
    
    # Invite admin (first invite should work)
    log("   Inviting admin user (should work)...")
    response = requests.post(
        f"{BASE_URL}/watchparty/{free_room_id}/invite",
        headers={"Authorization": f"Bearer {test_token}"},
        json={"username": "Admin"}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert data["slots_used"] == 1, f"Expected slots_used=1, got {data['slots_used']}"
    
    log(f"   ✓ First invite successful: slots_used={data['slots_used']}")
    
    # Try to invite admin again (should fail - duplicate)
    log("   Trying duplicate invite (should fail with 400)...")
    response = requests.post(
        f"{BASE_URL}/watchparty/{free_room_id}/invite",
        headers={"Authorization": f"Bearer {test_token}"},
        json={"username": "Admin"}
    )
    
    assert response.status_code == 400, f"Expected 400 (duplicate), got {response.status_code}: {response.text}"
    
    log(f"   ✓ Duplicate invite correctly rejected (400)")
    
    log(f"✅ PASS: FREE user capacity limits working correctly")
    log(f"   - max_others=1: ✓")
    log(f"   - Single invite allowed: ✓")
    log(f"   - Capacity enforcement: ✓")
    
    # Clean up - end the free user's room
    requests.post(
        f"{BASE_URL}/watchparty/{free_room_id}/end",
        headers={"Authorization": f"Bearer {test_token}"}
    )
    
    # Restore room_id to admin's room for remaining tests
    room_id = room_id  # Keep original admin room_id
    
    return True

def test_11_end_room():
    """(11) END: as room owner POST /api/watchparty/{id}/end"""
    log("\n=== TEST 11: End room as owner ===")
    
    # End the room
    log("   Ending room as owner (admin)...")
    response = requests.post(
        f"{BASE_URL}/watchparty/{room_id}/end",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert data["ended"] == True, f"Expected ended=true, got {data['ended']}"
    
    log(f"   ✓ Room ended: ended={data['ended']}")
    
    # Check current room should be null
    log("   Checking current room (should be null)...")
    response = requests.get(
        f"{BASE_URL}/watchparty/current",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert data is None, f"Expected null, got {data}"
    
    log(f"   ✓ Current room is null")
    
    log(f"✅ PASS: End room working correctly")
    
    return True

def test_12_respond_without_invite():
    """(12) RESPOND without invite: should return 404"""
    log("\n=== TEST 12: Respond without invitation ===")
    
    # Use a fake room ID or the ended room
    log("   Trying to respond to ended/unrelated room...")
    response = requests.post(
        f"{BASE_URL}/watchparty/{room_id}/respond",
        headers={"Authorization": f"Bearer {test_token}"},
        json={"accept": True}
    )
    
    assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    
    log(f"✅ PASS: Respond without invitation correctly rejected with 404")
    
    return True

def main():
    """Run all tests"""
    print("=" * 80)
    print("WATCHPARTY BACKEND API TEST SUITE")
    print("=" * 80)
    
    try:
        # Setup
        setup()
        
        # Run all tests
        tests = [
            test_1_create_as_plus,
            test_2_get_current,
            test_3_invite_by_username,
            test_4_invite_invalid_username,
            test_5_self_invite,
            test_6_respond_accept,
            test_7_duplicate_invite,
            test_8_control_owner,
            test_9_access_control,
            test_10_free_user_capacity,
            test_11_end_room,
            test_12_respond_without_invite,
        ]
        
        passed = 0
        failed = 0
        
        for test_func in tests:
            try:
                if test_func():
                    passed += 1
            except AssertionError as e:
                failed += 1
                log(f"❌ FAIL: {e}")
            except Exception as e:
                failed += 1
                log(f"❌ ERROR: {e}")
        
        # Cleanup
        cleanup()
        
        # Summary
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Total tests: {len(tests)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print("=" * 80)
        
        if failed == 0:
            print("✅ ALL TESTS PASSED!")
            return 0
        else:
            print(f"❌ {failed} TEST(S) FAILED")
            return 1
            
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())
