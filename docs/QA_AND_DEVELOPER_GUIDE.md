# 🚀 Enterprise Bug Tracker — Complete End-to-End Documentation for QA & Developers

> **Comprehensive System Manual, Role Workflows, and Architecture Guide**  
> *From Scratch Setup to Production-Grade Defect Lifecycle Governance*

---

## Table of Contents
1. [Executive Overview & System Architecture](#1-executive-overview--system-architecture)
2. [Scratch-to-Running Setup Guide](#2-scratch-to-running-setup-guide)
3. [Authentication, User Roles & Access Control](#3-authentication-user-roles--access-control)
4. [QA Engineer End-to-End Workflow Guide](#4-qa-engineer-end-to-end-workflow-guide)
   - [4.1 QA Executive Dashboard](#41-qa-executive-dashboard)
   - [4.2 Testing Cycles Management](#42-testing-cycles-management)
   - [4.3 Test Suites, Test Cases & Executions](#43-test-suites-test-cases--executions)
   - [4.4 Logging Defects (The Standard Bug Form)](#44-logging-defects-the-standard-bug-form)
   - [4.5 Master Bug Repository & Triage](#45-master-bug-repository--triage)
   - [4.6 Retesting, Verification & Ticket Closure](#46-retesting-verification--ticket-closure)
5. [Software Developer End-to-End Workflow Guide](#5-software-developer-end-to-end-workflow-guide)
   - [5.1 Developer Portal & Cycle Workbench](#51-developer-portal--cycle-workbench)
   - [5.2 Assigned Defects Triage Board](#52-assigned-defects-triage-board)
   - [5.3 Defect Investigation & State Transitions](#53-defect-investigation--state-transitions)
   - [5.4 Handling Special States (Cannot Reproduce & Rejected)](#54-handling-special-states-cannot-reproduce--rejected)
   - [5.5 Defect Details, Audit Log & Collaboration](#55-defect-details-audit-log--collaboration)
6. [Defect Lifecycle & Finite State Machine (FSM)](#6-defect-lifecycle--finite-state-machine-fsm)
7. [Projects, Milestones & Multi-Tenant Governance](#7-projects-milestones--multi-tenant-governance)
8. [Comprehensive REST API Reference](#8-comprehensive-rest-api-reference)
9. [Troubleshooting & Frequently Asked Questions (FAQ)](#9-troubleshooting--frequently-asked-questions-faq)

---

## 1. Executive Overview & System Architecture

The **Enterprise Bug Tracker** is a unified quality assurance and engineering defect resolution platform. It bridges the gap between testing teams discovering issues and development teams repairing and shipping fixes across iterative release cycles.

```mermaid
graph TD
    A[QA Engineer / Tester] -->|1. Runs Test Cycles & Logs Defects| B(Next.js 16 Web Portal)
    C[Software Developer] -->|2. Investigates & Marks Fixed| B
    D[Project Lead / Admin] -->|3. Triages, Assigns & Configures| B
    B -->|HTTP / REST + httpOnly Cookies| E[NestJS 10 API Gateway :4000]
    E -->|Prisma ORM Client| F[(MySQL 8.0 Relational DB)]
    E -->|Async Background Queues| G[Redis / In-Memory Worker]
    E -->|Audit Trail Engine| H[Activity Logs & Notifications]
```

### Core Technology Stack
* **Frontend (`apps/web`)**: Next.js 16 (App Router), React 19, TypeScript, Vanilla CSS + Tailwind tokens, Lucide Icons, Recharts for analytics.
* **Backend API (`apps/api`)**: NestJS 10, TypeScript, Prisma ORM 6, Passport JWT with `httpOnly` secure cookies, class-validator DTOs, global exception filters.
* **Database**: MySQL 8.0 with full ACID transactions, full-text search indexes (`@@fulltext([title, description, stepsToReproduce])`), and optimistic locking via record `version`.
* **Monorepo Orchestrator**: NPM Workspaces with `concurrently` executing frontend and backend simultaneously.

---

## 2. Scratch-to-Running Setup Guide

Follow these steps to run the complete stack on any developer or QA machine from scratch:

### 2.1 Prerequisites
* **Node.js**: `v20.x` or `v22.x` (LTS recommended)
* **NPM**: `v10.x` or higher
* **MySQL**: `v8.0+` running on `localhost:3306` (or via Docker)

### 2.2 Environment Configuration
Create or verify `.env` in the root directory:
```env
# Database Connection (MySQL)
DATABASE_URL="mysql://root:password@localhost:3306/bug_tracker?sslmode=disable"

# Backend API Configuration
API_PORT=4000
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="enterprise-bug-tracker-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Frontend Configuration
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### 2.3 Database Setup & Schema Generation
Run the following commands from the repository root:
```bash
# 1. Install all dependencies across monorepo workspaces
npm install

# 2. Push schema to MySQL database
npm run db:push

# 3. Generate Prisma client bindings
npm run generate

# 4. Seed database with enterprise projects, 30 cycles, and test users
npm run db:seed
```

### 2.4 Launching the Application Stack
```bash
# Run both Backend API (:4000) and Frontend Web (:3000) concurrently
npm run dev
```
Once started, the terminals will output:
* 🚀 **API Gateway**: `http://localhost:4000/api/v1`
* 💻 **Web Application**: `http://localhost:3000`

---

## 3. Authentication, User Roles & Access Control

Access to the system is protected via **JSON Web Tokens (JWT)** delivered in secure `httpOnly` cookies, preventing XSS-based token theft.

![Enterprise Login Screen](./images/01_login_screen.png)

### 3.1 Pre-Configured Seed Credentials
| Role | Email Address | Password | Default Redirect | Scope & Purpose |
|---|---|---|---|---|
| **System Admin** | `admin@gmail.com` | `Admin@12` | `/dashboard` | Global governance, user administration, system-wide metrics |
| **QA / Tester** | `bala@gmail.com` | `Mohan@12` | `/dashboard` | Test cycle execution, defect reporting, fix verification |
| **Developer** | `mohan@gmail.com` | `Mohan@12` | `/developer` | Defect triage, code fixing, status transition to FIXED |
| **Project Lead / PM** | `pm@gmail.com` | `Mohan@12` | `/dashboard` | Milestone planning, cycle prioritization, issue triage |

### 3.2 Role Permission Matrix
| Capability | System Admin | Project Lead | QA / Tester | Developer |
|---|:---:|:---:|:---:|:---:|
| Create / Edit Projects & Milestones | ✅ | ✅ | ❌ | ❌ |
| Create Testing Cycles & Suites | ✅ | ✅ | ✅ | ❌ |
| Execute Test Cases (Pass/Fail) | ✅ | ✅ | ✅ | ❌ |
| Log Defect Tickets | ✅ | ✅ | ✅ | ✅ |
| Assign / Reassign Defects | ✅ | ✅ | ❌ | ❌ |
| Transition Defect to `IN_PROGRESS` | ✅ | ✅ | ❌ | ✅ |
| Transition Defect to `FIXED` | ❌ | ❌ | ❌ | ✅ |
| Transition Defect to `CLOSED` (Terminal) | ✅ | ✅ | ✅ | ❌ |
| Reopen Defect (`REOPENED`) | ✅ | ✅ | ✅ | ❌ |
| Add Markdown Comments & Audit Notes | ✅ | ✅ | ✅ | ✅ |

> [!IMPORTANT]
> **Strict Separation of Duties**: Developers **cannot** close bugs directly. When a developer marks a bug `FIXED`, it is automatically routed to QA for active retesting. Only QA or the Project Lead can approve terminal closure (`CLOSED`).

---

## 4. QA Engineer End-to-End Workflow Guide

QA Engineers maintain software quality by planning test cycles, executing test suites, logging defects with rich reproduction conditions, and verifying developer fixes.

```mermaid
flowchart TD
    A[1. Open Testing Cycle] --> B[2. Execute Test Cases]
    B -->|Passed| C[Mark PASSED in Cycle]
    B -->|Failed| D[3. Log New Defect with Repro Steps]
    D --> E[Defect Assigned to Developer]
    E --> F[Dev Fixes & marks FIXED]
    F --> G[4. QA Retest Phase]
    G -->|Fix Verified| H[5. Close Defect with Resolution]
    G -->|Still Broken / Regression| I[5. Reopen Defect with Failure Notes]
    I --> E
```

### 4.1 QA Executive Dashboard
The QA Dashboard provides instant operational visibility into defect counts, resolution velocities, and critical blocking issues across projects.

![QA Executive Dashboard](./images/02_qa_dashboard.png)

#### Key Dashboard Metrics:
* **Total Defect Count**: Aggregated volume of defects logged in the current active project.
* **Open & Unresolved**: Bugs currently in `NEW`, `ASSIGNED`, `IN_PROGRESS`, or `REOPENED` status.
* **Critical / Blocker Severity**: Urgent issues requiring hotfixes or sprint intervention.
* **Testing Cycle Health**: Live percentage of test cases executed, passed, failed, and blocked.

---

### 4.2 Testing Cycles Management
Testing Cycles group testing activities into structured milestones (e.g., *Smoke Test*, *Cycle 01 — Contact Form Initial Testing*, *Sprint 14 Regression Suite*).

![Testing Cycles Master Hub](./images/03_testing_cycles_list.png)

#### How QA Navigates Cycles:
1. Navigate to `/testing-cycles` from the top navigation bar.
2. Select the target **Project** from the top-right project selector.
3. Review cycle cards displaying:
   - **Cycle Number & Name**
   - **Environment Badge** (`DEV`, `QA`, `STAGING`, `UAT`, `PROD`)
   - **Type Badge** (`FUNCTIONAL`, `REGRESSION`, `FEATURE`, `HOTFIX`)
   - **Execution Progress Bar** (Count of executed vs remaining test cases)
4. Click on any cycle card or **"View Cycle Details"** to enter the execution workspace.

---

### 4.3 Test Suites, Test Cases & Executions
Inside each cycle, tests are organized hierarchically: `Testing Cycle` ➔ `Test Suites` ➔ `Test Cases` ➔ `Executions`.

![Testing Cycle Details & Defect Tracker](./images/04_cycle_details_defects.png)

#### Executing a Test Case:
1. Open the **Test Cases** tab within the cycle.
2. Select a test case (e.g. `TC-101: Verify contact form validation with empty email`).
3. Follow the preconditions and execution steps provided in the case description.
4. Record execution outcome:
   * **PASSED**: Feature matches expected results.
   * **FAILED**: Feature behaves erratically or produces an error. Click **"Log Bug from Test"** to pre-fill the defect form.
   * **BLOCKED**: External blocker (e.g. environment down, third-party API outage) prevents testing.

---

### 4.4 Logging Defects (The Standard Bug Form)
When an issue is identified, QA creates a defect report via `/bugs/new` or the **"Report New Defect"** button.

![Report New Defect Form](./images/05_report_defect_form.png)

#### Defect Fields & Best Practices:
1. **Defect Title**: Concise, descriptive summary following the standard format:  
   `[Module/Component]: [What failed] under [Condition]`  
   *Example*: `Checkout: Order total displays NaN when coupon code contains leading whitespace`
2. **Project & Testing Cycle**: Tie the defect to its active cycle for automated regression tracking.
3. **Bug Area Classification**:
   * `FRONTEND`: UI glitches, alignment, CSS, responsive layouts, client validation.
   * `BACKEND`: 500 errors, business logic failures, calculation discrepancies.
   * `DATABASE`: Stale data, constraint violations, missing indexes.
   * `API`: Incorrect HTTP status codes, malformed JSON schemas, auth header failures.
   * `SECURITY`: Permission bypass, unauthenticated endpoint access.
   * `REGRESSION`: Previously working feature broken by recent code commit.
4. **Severity (Technical Impact - Managed by QA)**:
   * **Critical**: System crash, data loss, security vulnerability, blocking deployment.
   * **High**: Primary business workflow broken, no workaround available.
   * **Medium**: Functional defect, but viable workaround exists.
   * **Low**: Cosmetic typo, minor visual alignment flaw.
5. **Priority (Urgency - Managed by Lead/PM)**:
   * `P1`: Immediate hotfix required.
   * `P2`: Resolve within the active sprint.
   * `P3`: Target for upcoming milestone release.
   * `P4`: Backlog / low urgency.
6. **Reproduction Steps**: Step-by-step numbered instructions that anyone can follow to replicate the defect reliably.
7. **Expected Result vs Actual Result**: Explicitly state what should happen versus what actually happened.

---

### 4.5 Master Bug Repository & Triage
All logged defects across the system appear in the Master Repository at `/bugs`.

![Master Bug Repository & Triage Table](./images/06_defects_repository_table.png)

#### QA Filtering & Triage Tools:
* **Search Query**: Real-time search across bug title, description, and steps to reproduce.
* **Status Dropdown**: Filter by `NEW`, `ASSIGNED`, `IN_PROGRESS`, `FIXED`, `RETEST`, `CLOSED`.
* **Severity Filter**: Filter for `CRITICAL` or `HIGH` to triage release blockers.
* **Bug Area**: Focus specifically on `FRONTEND` or `API` tickets.
* **Pagination**: Browse thousands of seeded and live defects efficiently.

---

### 4.6 Retesting, Verification & Ticket Closure
When a developer finishes a fix, the bug status becomes `FIXED`. QA receives a notification to begin verification:

1. Open the bug detail page `/bugs/[id]`.
2. Inspect the **Developer Fix Notes** in the comments.
3. Deploy the target build or open the specified test environment.
4. Execute the original reproduction steps.
5. **Decision Path**:
   * **If Defect is Resolved**: Change status to `CLOSED` and select Resolution: **`Fixed & Verified`**.
   * **If Defect Still Fails**: Change status to `REOPENED`. This increments the `reopenCount` metric and re-alerts the assigned engineer.

---

## 5. Software Developer End-to-End Workflow Guide

Software Developers use the Bug Tracker to triage assigned defects, inspect stack traces and reproduction steps, implement code repairs, and package fixes for QA retesting.

```mermaid
flowchart TD
    A[1. Check Developer Portal / Assigned Bugs] --> B[2. Open Bug Details & Read Repro Steps]
    B --> C{Can Reproduce?}
    C -->|No| D[Mark CANNOT REPRODUCE & Request Details]
    C -->|Not a Defect| E[Mark REJECTED with Technical Reason]
    C -->|Yes| F[3. Transition to IN_PROGRESS]
    F --> G[4. Code & Test Fix Locally]
    G --> H[5. Transition to FIXED & Post Fix Commit Notes]
    H --> I[6. Handed Over to QA for Retest]
```

### 5.1 Developer Portal & Cycle Workbench
When logging in with developer credentials (`mohan@gmail.com`), the system automatically directs the user to `/developer`.

![Developer Portal & Cycle Workbench](./images/07_developer_portal.png)

The Developer Portal highlights:
* **My Active Cycles**: Testing cycles where bugs have been assigned to the logged-in developer.
* **Assigned Bugs Count**: Quick count of unresolved tickets pending action.
* **Cycle Details**: Environment, priority, and direct links to active defect boards.

---

### 5.2 Assigned Defects Triage Board
Navigating to `/developer/bugs` opens the developer-tailored triage board.

![Developer Defect Triage Board](./images/10_developer_triage_board.png)

#### Developer Daily Workflow:
1. Open `/developer/bugs`.
2. Filter by status: `NEW` or `ASSIGNED` to view newly routed work.
3. Sort by **Priority** (`P1` > `P2`) to resolve urgent production blockers first.
4. Click on any defect key (e.g., `BP-1002`) to inspect the full defect report.

---

### 5.3 Defect Investigation & State Transitions
Inside the bug details page, the developer moves the issue through its technical lifecycle:

```
[NEW / ASSIGNED] ───► [IN PROGRESS] ───► [FIXED]
```

1. **Acknowledge Work**: Click status and select **`IN_PROGRESS`**. This signals to QA and Product Managers that an engineer is actively debugging.
2. **Reproduce & Debug**:
   - Review reproduction steps and environment (`STAGING`, `QA`, etc.).
   - Reproduce locally or in the debug sandbox.
3. **Commit Code Fix**:
   - Write unit/integration tests to prevent regressions.
   - Commit the fix with the issue key in the commit message (e.g. `git commit -m "fix(checkout): sanitize coupon code whitespace [BP-1002]"`).
4. **Submit for Retest**:
   - Change status to **`FIXED`**.
   - Enter a comment with:
     * Root cause summary
     * Commit SHA or PR link
     * Specific deployment build / container tag where the fix is available.

---

### 5.4 Handling Special States (Cannot Reproduce & Rejected)

Developers may encounter issues that cannot be reproduced or are not genuine bugs:

#### 1. Cannot Reproduce (`CANNOT_REPRODUCE`)
* Use this when following the exact reproduction steps does not reproduce the error.
* **Requirement**: Add a comment detailing:
  - Exact browser version / OS tested
  - Test data or payload utilized
  - Request for QA to provide additional HAR logs, screenshots, or console logs.

#### 2. Rejected / By Design (`REJECTED`)
* Use this if the reported behavior complies with system design specifications.
* **Requirement**: Add a comment referencing the product specification or design doc explaining why the behavior is intended. QA will review and validate.

---

### 5.5 Defect Details, Audit Log & Collaboration
The defect detail screen provides full context, discussion threads, and an tamper-proof audit trail of all historical modifications.

![Defect Details & Activity Audit Log](./images/09_defect_details_audit.png)

#### Key Sections:
* **Defect Information Card**: Issue key, title, environment, cycle link, severity, priority, and current status.
* **Reproduction Walkthrough**: Clear instructions, expected output vs actual output.
* **Activity Audit Log Tab**: Shows every field edit, status transition, timestamp, and the user who triggered the change.
* **Comments & Mentions Tab**: Rich Markdown comments supporting `@mentions` and code snippets.
* **Attachments Tab**: Direct links to screenshots, log files, and screen recordings.

---

## 6. Defect Lifecycle & Finite State Machine (FSM)

The system enforces a strict finite state machine to guarantee accountability and prevent unauthorized state bypasses.

```mermaid
stateDiagram-v2
    [*] --> NEW: QA logs defect
    NEW --> ASSIGNED: Lead/PM assigns Dev
    NEW --> DEFERRED: PM postpones
    NEW --> CLOSED: Duplicate
    
    ASSIGNED --> IN_PROGRESS: Dev starts work
    IN_PROGRESS --> CANNOT_REPRODUCE: Cannot replicate
    IN_PROGRESS --> REJECTED: Not a bug
    IN_PROGRESS --> FIXED: Dev finishes fix
    
    CANNOT_REPRODUCE --> IN_PROGRESS: QA provides extra info
    CANNOT_REPRODUCE --> CLOSED: QA confirms cannot replicate
    
    REJECTED --> IN_PROGRESS: QA provides proof of bug
    REJECTED --> CLOSED: Validated as By Design
    
    FIXED --> RETEST: QA starts verification
    RETEST --> CLOSED: QA confirms fix OK
    RETEST --> REOPENED: Fix failed / Regression
    
    REOPENED --> IN_PROGRESS: Dev re-investigates
    
    CLOSED --> [*]
```

### 6.1 State Definitions
| State | Who Owns It | Definition | Next Allowed States |
|---|---|---|---|
| **NEW** | QA | Defect logged, awaiting triage and initial review | `ASSIGNED`, `DEFERRED`, `CLOSED` |
| **ASSIGNED** | Lead / Dev | Assigned to engineer for code resolution | `IN_PROGRESS`, `DEFERRED` |
| **IN_PROGRESS** | Developer | Developer is actively investigating or implementing fix | `FIXED`, `CANNOT_REPRODUCE`, `REJECTED` |
| **CANNOT_REPRODUCE** | Dev / QA | Developer cannot reproduce; awaits additional QA logs | `IN_PROGRESS`, `CLOSED` |
| **REJECTED** | Dev / QA | Developer asserts invalid defect; requires comment | `IN_PROGRESS`, `CLOSED` |
| **DEFERRED** | Lead / PM | Postponed to a future release or milestone | `ASSIGNED`, `IN_PROGRESS` |
| **FIXED** | Developer | Resolved in code, packaged into build, ready for QA | `RETEST` |
| **RETEST** | QA | QA actively verifying the fix against target environment | `CLOSED`, `REOPENED` |
| **REOPENED** | QA | Fix failed verification; increments reopen counter | `IN_PROGRESS` |
| **CLOSED** | QA / Lead | Terminal completed state with required resolution type | *Terminal* |

### 6.2 Required Resolutions on `CLOSED`
When closing an issue, the operator must select one of the following:
* **`FIXED_VERIFIED`**: Fix validated and verified in the target test environment.
* **`WONT_FIX`**: Business or engineering decision not to resolve.
* **`BY_DESIGN`**: Confirmed to be intended system behavior.
* **`DUPLICATE`**: Duplicate of another primary issue key.
* **`CANNOT_REPRODUCE_ABANDONED`**: Unable to replicate after multiple testing attempts.

---

## 7. Projects, Milestones & Multi-Tenant Governance

The system manages multi-tenant isolation across multiple enterprise projects simultaneously.

![Projects & Multi-Tenant Hub](./images/08_projects_hub.png)

### 7.1 Project Key Sequences
Each project has a short prefix key (e.g., `BP`, `BT`, `ECP`, `PGW`). When defects are created, atomic key sequence generation guarantees sequential identifiers:
* `BP-1001`
* `BP-1002`
* `BT-1045`

### 7.2 Components & Milestones
* **Components**: Logical sub-systems (e.g. `Auth`, `Billing`, `Search`, `Notifications`) assigned to specific Component Leads.
* **Milestones**: Release targets (e.g. `v1.2.0-RC1`, `Q4-Release`). Bugs can be targeted for a milestone (`milestoneId`) and tracked for the exact release where they were resolved (`fixedInMilestoneId`).

---

## 8. Comprehensive REST API Reference

The backend exposes a REST API at `http://localhost:4000/api/v1` for frontend integration, test automation, and CI/CD pipelines.

### 8.1 Authentication Endpoints
#### `POST /auth/login`
Authenticates a user and sets the `httpOnly` secure session cookie.
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "bala@gmail.com", "password": "Mohan@12"}' \
  -c cookies.txt
```

#### `GET /auth/me`
Retrieves the profile and project memberships of the currently authenticated user.
```bash
curl -X GET http://localhost:4000/api/v1/auth/me -b cookies.txt
```

---

### 8.2 Defect Management Endpoints
#### `GET /bugs`
Paginated search and multi-attribute filtering.
* **Query Parameters**:
  - `projectId`: Filter by project UUID
  - `status`: `NEW`, `IN_PROGRESS`, `FIXED`, `CLOSED`, etc.
  - `severity`: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
  - `assignedToId`: Filter by developer UUID
  - `search`: Search query string
  - `page`: Page index (default: 1)
  - `limit`: Items per page (default: 20)

```bash
curl -X GET "http://localhost:4000/api/v1/bugs?projectId=<ID>&status=NEW&severity=CRITICAL" \
  -b cookies.txt
```

#### `POST /bugs`
Create a new defect report.
```bash
curl -X POST http://localhost:4000/api/v1/bugs \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "projectId": "8b9e59d4-1a35-430b-96fa-77a824cb7eb2",
    "title": "API returns 500 error when phone number has plus sign",
    "description": "Validation failure occurs when international format phone numbers are submitted.",
    "stepsToReproduce": "1. Go to Profile Settings\n2. Enter +1234567890\n3. Click Save",
    "expectedResult": "Profile updates successfully",
    "actualResult": "HTTP 500 Internal Server Error returned",
    "severity": "HIGH",
    "priority": "P2",
    "bugArea": "API",
    "environment": "QA"
  }'
```

#### `PATCH /bugs/:id/status`
Transition defect state with mandatory audit recording.
```bash
curl -X PATCH http://localhost:4000/api/v1/bugs/<BUG_ID>/status \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "status": "FIXED",
    "comment": "Fixed in commit 8a9f3b1. Sanitized E.164 phone string formatting."
  }'
```

#### `POST /bugs/:id/comments`
Add a collaboration note or @mention.
```bash
curl -X POST http://localhost:4000/api/v1/bugs/<BUG_ID>/comments \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "bodyMarkdown": "@bala Please retest on QA build v2.4.1. Issue is now resolved."
  }'
```

---

## 9. Troubleshooting & Frequently Asked Questions (FAQ)

### Q1: I logged in as a Developer, why don't I see the Admin Project settings?
> **Answer**: The application uses strict role-based access control. Developers are routed to `/developer` to focus on their assigned tickets and cycles without administrative distraction. Only `ADMIN` or `PROJECT_LEAD` roles have permission to modify project settings or milestones.

### Q2: Why cannot a Developer mark a bug as `CLOSED`?
> **Answer**: In professional software engineering lifecycles, developers must not verify their own fixes. Developers mark tickets as `FIXED`, which alerts QA to perform independent verification. Once QA verifies that the bug is resolved and no regression was introduced, QA closes the issue.

### Q3: How does the system handle concurrent updates by QA and Developers?
> **Answer**: Every bug record includes a `version` integer in MySQL. When updates occur, the system checks whether the record version matches the client's view. If another user modified the ticket simultaneously, the request triggers optimistic locking protection to prevent overwriting edits.

### Q4: How do I seed clean data or reset my test environment?
> **Answer**: Run:
> ```bash
> npm run db:push -- --force-reset
> npm run db:seed
> ```
> This creates a pristine database with all 20 projects, 30 testing cycles per project, and pre-configured test users.

---

*Enterprise Bug Tracker Documentation — Maintained for QA & Engineering Teams.*
