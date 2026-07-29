#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Rebrand Cartoonix chat improvements:
  1. Tone down the golden PLUS message bubble style (less flashy — darker with gold outline, keep shine effect but subtle).
  2. Add admin-only chat commands (e.g., /important) — message appears centered in a highlighted frame,
     with NO avatar/name shown (only the highlighted content). Not pinned. Also add a few similar commands.
  Implemented commands: /important (gold), /announce (red), /warn (orange), /success (green), /info (blue).

backend:
  - task: "Change-password endpoint PUT /api/auth/password"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "New endpoint. Body: {current_password, new_password}. Validates current password with verify_password, requires new_password min 6 chars, rejects when new==current, then hashes and updates. Returns {ok:true}."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL TESTS PASSED (6/6). A1: User registration works. A2: Wrong current password correctly returns 400 with 'Parola actuală este incorectă'. A3: Current==new password correctly returns 400 with 'diferită de cea actuală'. A4: Too short password (< 6 chars) correctly returns 422 (Pydantic validation). A5: Successful password change returns {ok:true}, login with new password works, old password fails. Note: Had to disable maintenance mode for testing regular user login."

  - task: "Admin chat commands parsing in POST /api/chat"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Added ADMIN_CHAT_COMMANDS set {important, announce, warn, success, info}. In POST /api/chat: if text starts with '/' AND user.role=='admin', parse first token as command; if in allowed set and body is non-empty, store command field and strip prefix from text. Non-admins sending /important still get regular message (command=null). All messages now include a 'command' field (null for regular messages)."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL TESTS PASSED (7/7). B1: Regular user posting /important keeps text literal, command=null. B2: Admin /important correctly returns command='important', text='Breaking!'. B3: All commands (/announce, /warn, /success, /info) work correctly with proper command field and stripped text. B4: Unknown command /unknown returns command=null. B5: Command without body (/important alone) returns command=null. B6: Mixed case /IMPORTANT with spaces correctly normalizes to command='important', text='Mixed Case'. B7: GET /api/chat returns messages with command field populated."

  - task: "Environment setup (.env files) recreated"
    implemented: true
    working: true
    file: "backend/.env, frontend/.env"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Recreated missing .env files: backend has MONGO_URL, DB_NAME=cartoonix, JWT_SECRET, ADMIN_EMAIL=admin@cartoonix.app, ADMIN_PASSWORD=Admin1234!, CORS_ORIGINS=*. Frontend has REACT_APP_BACKEND_URL. Backend and frontend restarted and are running."
        -working: true
        -agent: "testing"
        -comment: "✅ Environment verified. Backend URL https://instant-preview-27.preview.emergentagent.com/api is accessible. Admin credentials work correctly. All API endpoints responding properly."

  - task: "Stripe PLUS lifetime payment (BYOK own key)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Implemented real Stripe checkout via emergentintegrations (Flow B, user's own sk_test key in STRIPE_API_KEY). One-time payment 50 RON = Cartoonix PLUS lifetime. Endpoints: POST /api/payments/checkout (auth, body {origin_url} -> returns checkout_url+session_id, inserts payment_transactions with status=initiated), GET /api/payments/status/{session_id} (unauth, polls Stripe, idempotently grants plus=True on paid), POST /api/webhook/stripe (idempotent). Amount defined server-side. /auth/subscribe now admin-only fallback."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL STRIPE PAYMENT TESTS PASSED (4/4). C1: Test user (test@cartoonix.ro, plus=false) successfully creates checkout session - returns real Stripe URL (checkout.stripe.com) and session_id, confirming the real Stripe test key (sk_test_51TEpbd...) is valid and working. Transaction record created in payment_transactions with status=initiated, payment_status=pending, amount=50 RON, currency=ron. C2: GET /api/payments/status/{session_id} without auth returns 200 with payment_status=pending (unpaid session). C3: Admin user (plus=true) attempting checkout correctly returns 400 with 'Ai deja Cartoonix PLUS activ'. C4: Checkout without auth correctly returns 401. Note: Fixed admin user's plus field to true in database for proper testing."

  - task: "Users schema alignment to production (UUID id, nickname, avatar_url, subscription)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Refactored backend to align with production DB schema. User identity is now UUID field `id` (not _id/ObjectId). User docs use `nickname` (not name), `avatar_url` (not avatar), `subscription` ('plus'/'free', not boolean plus), `email_verified`, `last_active`, `presence_seconds`. Added helper functions: uid_of(), user_name(), user_avatar(), user_is_plus(), serialize_user() to map DB fields to frontend-friendly keys (id, name, avatar, plus). Updated all endpoints: POST /api/auth/login, GET /api/auth/me, PUT /api/auth/profile (updates nickname), PUT /api/auth/avatar (updates avatar_url), PUT /api/admin/users/{id} (updates subscription), POST /api/presence (updates last_active/presence_seconds), POST /api/payments/checkout (checks subscription). Local DB reset and reseeded with new schema. Credentials: admin@cartoonix.ro / admin1234 (subscription=plus), test@cartoonix.ro / test1234 (subscription=free)."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL SCHEMA ALIGNMENT TESTS PASSED (26/26). Test 1: Login for both users returns correct UUID id (36 chars with dashes), role (admin/user), and plus field (true for admin, false for test user). Test 2: GET /api/auth/me returns UUID id for both users. Test 3: PUT /api/auth/profile updates DB field `nickname` (NOT `name`) - verified in MongoDB. Test 4: PUT /api/auth/avatar updates DB field `avatar_url` (NOT `avatar`) - verified in MongoDB. Premium avatar as free user correctly returns 403. Test 5: GET /api/admin/users returns users with UUID ids. PUT /api/admin/users/{id} with plus=true updates DB `subscription` to 'plus', plus=false updates to 'free' - verified in MongoDB. Test 6: POST /api/presence updates DB fields `last_active` (ISO timestamp) and `presence_seconds` (numeric). GET /api/presence/online returns online count >= 1. Test 7: POST /api/payments/checkout as free user returns 200 with checkout_url. As admin (subscription=plus) correctly returns 400 'Ai deja Cartoonix PLUS activ'. MongoDB verification confirms: admin has id=d2b328e9-da7b-406e-9f54-838a9a10e8da, nickname='Admin', avatar_url, subscription='plus'. Test user has id=b988d6ef-da61-44df-91ae-5dac75d19be7, nickname='Cont Test', avatar_url, subscription='free'. All field names match production schema. Test user state restored after testing."

frontend:
  - task: "PLUS chat bubble redesign (darker, gold outline, subtle shine)"
    implemented: true
    working: "NA"
    file: "frontend/src/index.css"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Replaced full-gold gradient with dark gradient + 1px gold border, softer glow, subtler shine (lower opacity, smaller sweep). Text color changed to warm gold #ffe27a. Sparkles retinted gold."

  - task: "Admin-only chat commands UI (centered highlighted messages + helper)"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/ChatRoom.jsx, frontend/src/index.css"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Command messages render centered without avatar/name — only the highlighted framed content with icon. Added helper button (HelpCircle) visible to admins that toggles a palette of the 5 commands. Placeholder text also hints commands to admins."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 3
  run_ui: false

test_plan:
  current_focus:
    - "Support tickets (create/list/reply + admin) and playlist limit (FREE=1)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "Please test both: (1) NEW: PUT /api/auth/password with cases — wrong current password (400), same current==new (400), too-short new (validation), success flow (login again with new password works, revert password after). Admin creds admin@cartoonix.app / Admin1234!. IMPORTANT: after testing password change, RESTORE admin password to Admin1234!. (2) Admin chat commands parsing (details in previous message)."
    -agent: "testing"
    -message: "✅ BACKEND TESTING COMPLETE - ALL TESTS PASSED (16/16). Password change endpoint works perfectly with all validation cases. Admin chat commands work correctly for all 5 commands (/important, /announce, /warn, /success, /info) with proper permission checks, case normalization, and command parsing. Regular users cannot use commands. GET endpoint returns command field. Note: Maintenance mode was enabled during testing and has been disabled. Admin password unchanged (Admin1234!)."
    -agent: "main"
    -message: "NEW STRIPE TEST NEEDED. Test the Stripe PLUS payment flow (real Stripe test key configured via emergentintegrations Flow B). Credentials: test user test@cartoonix.ro / test1234 (plus=false), admin admin@cartoonix.ro / admin1234. Steps: (1) Login as test user, POST /api/payments/checkout with body {\"origin_url\":\"https://example.com\"} -> expect 200 with checkout_url (a real stripe.com URL) and session_id. Verify a payment_transactions doc was created with status=initiated, payment_status=pending, amount=50, currency=ron, correct user_id. (2) GET /api/payments/status/{session_id} without auth -> expect 200 with payment_status=pending (unpaid session). (3) POST /api/payments/checkout again as admin (plus=true) -> expect 400 'Ai deja Cartoonix PLUS activ'. (4) POST /api/payments/checkout without auth -> expect 401/403. Do NOT attempt to actually complete a card payment. Just verify checkout session creation works with the real Stripe key (confirms the key is valid) and the transaction recording + guards work."
    -agent: "testing"
    -message: "✅ STRIPE PAYMENT TESTING COMPLETE - ALL TESTS PASSED (21/21 total, 4/4 Stripe tests). The Stripe PLUS lifetime payment flow is working perfectly with the real Stripe test key. Key findings: (1) Checkout session creation works - returns real checkout.stripe.com URL and valid session_id, confirming the Stripe API key (sk_test_51TEpbd...) is valid and properly configured. (2) Payment transactions are correctly recorded in MongoDB with status=initiated, payment_status=pending, amount=50 RON, currency=ron, product=cartoonix_plus_lifetime. (3) Status endpoint works without auth and returns pending status for unpaid sessions. (4) Guards work correctly - users with plus=true cannot create duplicate checkouts (400 error), and unauthenticated requests are rejected (401). (5) Fixed admin user's plus field to true in database for proper testing. All backend APIs tested and working."
    -agent: "main"
    -message: "NEW: USERS SCHEMA ALIGNMENT to production DB. The real production DB uses a different user schema, so I refactored the backend to be compatible: identity is now UUID field `id` (not _id/ObjectId), and user docs use `nickname` (not name), `avatar_url` (not avatar), `subscription` ('plus'/'free', not boolean plus), `email_verified`, `last_active`, `presence_seconds`. serialize_user maps these back to frontend-friendly keys (id, name, avatar, plus). Local DB was reset and reseeded in the new schema. Credentials (real schema): admin admin@cartoonix.ro / admin1234 (role=admin, subscription=plus), test user test@cartoonix.ro / test1234 (subscription=free). PLEASE TEST: (1) POST /api/auth/login for BOTH admin and test user -> 200, returns token + user with correct id (UUID), role, plus (true for admin, false for test). (2) GET /api/auth/me with the token -> returns same user, id is a UUID. (3) PUT /api/auth/profile {name:'Nou'} as test user -> 200, name updated; verify in DB the `nickname` field changed (NOT `name`). (4) PUT /api/auth/avatar with a non-premium avatar as test user -> 200; verify DB `avatar_url` changed. Premium avatar as test(free) -> 403. (5) GET /api/admin/users as admin -> 200 list; PUT /api/admin/users/{id} to set plus=true on the test user by its UUID id -> 200; verify DB `subscription` became 'plus'. Then set it back to plus=false. (6) POST /api/presence as test user then GET /api/presence/online -> online>=1; verify DB writes `last_active`/`presence_seconds`. (7) POST /api/payments/checkout as test user (free) -> 200 with checkout_url; as admin (subscription=plus) -> 400 'Ai deja'. NOTE: register/verify was already verified manually (creates user with id/nickname/avatar_url/subscription=free). Do NOT reset admin/test passwords."
    -agent: "testing"
    -message: "✅ USERS SCHEMA ALIGNMENT TESTING COMPLETE - ALL TESTS PASSED (26/26). Comprehensive testing confirms the backend is fully aligned with production schema. All 7 test scenarios passed: (1) Login endpoints return UUID ids (36 chars with dashes) for both admin and test users, with correct role and plus fields. (2) GET /api/auth/me returns UUID ids. (3) PUT /api/auth/profile correctly updates DB field `nickname` (NOT `name`) - verified in MongoDB. (4) PUT /api/auth/avatar correctly updates DB field `avatar_url` (NOT `avatar`) - verified in MongoDB. Premium avatar restriction works (403 for free users). (5) Admin users endpoint works with UUID ids. PUT /api/admin/users/{id} correctly updates DB field `subscription` to 'plus'/'free' (NOT boolean) - verified in MongoDB. (6) Presence endpoint correctly updates DB fields `last_active` (ISO timestamp) and `presence_seconds` (numeric) - verified in MongoDB. Online count works. (7) Payment checkout guard correctly checks `subscription` field - free users can checkout, plus users get 400 error. MongoDB direct verification confirms correct schema: admin (id=d2b328e9-da7b-406e-9f54-838a9a10e8da, nickname='Admin', avatar_url, subscription='plus'), test user (id=b988d6ef-da61-44df-91ae-5dac75d19be7, nickname='Cont Test', avatar_url, subscription='free'). Test user state restored after testing. All backend APIs working correctly with production schema."
    -agent: "main"
    -message: "NEW FEATURES TO TEST (backend only). Creds: admin admin@cartoonix.ro/admin1234 (subscription=plus), test test@cartoonix.ro/test1234 (subscription=free). (A) SUPPORT TICKETS: (1) As test user POST /api/tickets {subject,message,attachment optional data:image/png;base64,...} -> 201/200 returns ticket with status 'open', id (uuid). (2) POST /api/tickets again while one is unresolved -> 400 'deja o solicitare deschisă'. (3) GET /api/tickets/my -> list includes the ticket. (4) POST /api/tickets/{id}/reply {text} as owner -> ok, reply appended (from 'user'). (5) Admin: GET /api/admin/tickets -> list; POST /api/admin/tickets/{id}/reply {text} -> reply from 'admin', status auto-> 'in_progress'; PUT /api/admin/tickets/{id}/status {status:'resolved'} -> status resolved. (6) After resolved, test user POST /api/tickets again -> now allowed (200). (7) Attachment validation: POST with attachment not starting data:image/ -> 400; very large (>4.8M chars) -> 400. (B) PLAYLIST LIMIT: as FREE test user POST /api/playlists {name} -> 200 first time; second POST -> 403 'un singur playlist'. As admin (plus) create 2+ playlists -> all 200. Clean up any playlists you create for test user afterwards. Do NOT reset passwords."
