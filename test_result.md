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
  - task: "Admin chat commands parsing in POST /api/chat"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Added ADMIN_CHAT_COMMANDS set {important, announce, warn, success, info}. In POST /api/chat: if text starts with '/' AND user.role=='admin', parse first token as command; if in allowed set and body is non-empty, store command field and strip prefix from text. Non-admins sending /important still get regular message (command=null). All messages now include a 'command' field (null for regular messages)."

  - task: "Environment setup (.env files) recreated"
    implemented: true
    working: "NA"
    file: "backend/.env, frontend/.env"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Recreated missing .env files: backend has MONGO_URL, DB_NAME=cartoonix, JWT_SECRET, ADMIN_EMAIL=admin@cartoonix.app, ADMIN_PASSWORD=Admin1234!, CORS_ORIGINS=*. Frontend has REACT_APP_BACKEND_URL. Backend and frontend restarted and are running."

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
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus:
    - "Admin chat commands parsing in POST /api/chat"
    - "Environment setup (.env files) recreated"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "Please test the admin chat command parsing. Test admin credentials in /app/memory/test_credentials.md (admin@cartoonix.app / Admin1234!). Scenarios: (1) Register or login as a regular user, POST /api/chat with text='/important hello' and verify command is null (regular users cannot execute commands). (2) Login as admin, POST /api/chat with '/important Big news!' and verify response contains command='important' and text='Big news!'. (3) Repeat for /announce, /warn, /success, /info. (4) Admin sending '/unknown thing' should result in command=null. (5) Admin sending '/important' with no body should result in command=null. (6) GET /api/chat returns messages including command field. Skip frontend tests unless user asks."
