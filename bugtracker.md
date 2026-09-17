# Bug Tracker Application — Complete Workflow & System Architecture

## 1. Purpose

An enterprise-grade internal bug tracking system designed for QA/Testing teams to report defects, track them across an audited lifecycle, and provide Engineering and Product Management transparent, accountable, and traceable issue resolution.

---

## 2. User Roles & Permission Model

Roles are assigned on a **per-project basis** via a dedicated project membership association to ensure flexible multi-project governance.

| Role | Scope & Permissions |
|---|---|
| **System Admin** | Global access: manage users, system settings, global integrations, and hard data purging. |
| **Project Manager / Lead** | Project level: configure project metadata, manage milestones/releases, set priority, defer bugs, reassign issues, approve terminal closures. |
| **QA / Tester** | Project level: log bugs, specify severity, perform retests, verify fixes, close or reopen issues. |
| **Developer** | Project level: triage assigned bugs, update progress, add comments, mark as Fixed or Rejected. |
| **Viewer / Stakeholder** | Read-only access: view issues, search dashboards, and export reports. |

**Core Workflow Rules:**
* Only QA or Project Leads can transition an issue to **Closed**.
* Developers cannot directly close an issue; marking an issue **Fixed** routes it directly to QA for verification.
* Terminal states require a structured **Resolution Type**.

---

## 3. Bug Lifecycle & State Machine

┌──────────────────────────────────────────────┐
                           │                    NEW                       │
                           │           (Reported by Tester)               │
                           └──────────────────────┬───────────────────────┘
                                                  │
                   ┌──────────────────────────────┼──────────────────────────────┐
                   │ Lead assigns                 │ PM defers                    │ Marked duplicate
                   ▼                              ▼                              ▼
    ┌──────────────────────────────┐ ┌──────────────────────────────┐ ┌──────────────────────────────┐
    │          ASSIGNED            │ │           DEFERRED           │ │      CLOSED (Duplicate)      │
    └──────────────┬───────────────┘ │    (Targeted for Milestone)  │ └──────────────────────────────┘
                   │                 └──────────────┬───────────────┘
                   │ Dev begins work                │ Re-queued for sprint
                   ▼                                │
    ┌──────────────────────────────┐                │
┌───►│         IN PROGRESS          │◄───────────────┘
│    └───────┬──────────┬───────────┘
│            │          │
│ Dev fixes  │ Dev      │ Dev says
│            │ cannot   │ not a bug
│            │ replicate│
│            ▼          ▼
│    ┌───────────────┐ ┌───────────────┐
│    │    CANNOT     │ │   REJECTED    │
│    │   REPRODUCE   │ │               │
│    └───────┬───────┘ └───────┬───────┘
│            │                 │
│            └────────┬────────┘
│                     │ Tester reviews & provides details
│                     ▼
│            ┌─────────────────┐
│            │   NEED INFO /   │
│            │   QA REVIEW     │
│            └────────┬────────┘
│                     │
│         ┌───────────┴───────────┐
│         │ Validated as non-bug  │ QA adds steps / reopens
│         ▼                       ▼
│  ┌──────────────┐         back to IN PROGRESS
│  │    CLOSED    │
│  │ (Won't Fix / │
│  │  By Design)  │
│  └──────────────┘
│
│ Fix ready
▼
┌──────────────────────────────┐
│            FIXED             │
└──────────────┬───────────────┘
│
▼
┌──────────────────────────────┐
│            RETEST            │
│       (QA Verification)      │
└───────┬──────────────┬───────┘
│              │
│ Verified OK  │ Fix failed / Regression
▼              ▼
┌──────────────┐ ┌──────────────┐
│    CLOSED    │ │   REOPENED   │
└──────────────┘ └──────┬───────┘
│
▼
back to IN PROGRESS


### 3.1 Status Definitions
1. **New** – Issue logged and awaiting triage.
2. **Assigned** – Assigned to an engineer for resolution.
3. **In Progress** – Engineer is actively working on the fix.
4. **Cannot Reproduce** – Developer cannot reproduce the issue; awaits additional test conditions/logs.
5. **Rejected** – Developer asserts invalid behavior; requires mandatory explanation comment.
6. **Deferred** – Valid defect postponed by Product/Lead to a future release.
7. **Fixed** – Resolved by Developer, packaged in a build, awaiting QA retest.
8. **Retest** – Actively being verified by QA against target build.
9. **Reopened** – Fix failed verification or triggered a regression.
10. **Closed** – Terminal state with required resolution type.

### 3.2 Resolution Types (Required on "Closed")
* **Fixed & Verified:** Defect confirmed resolved by QA.
* **Won't Fix:** Business or engineering decided not to fix.
* **By Design:** System behaves as originally intended.
* **Duplicate:** Issue is tracked by another primary bug record.
* **Cannot Reproduce (Abandoned):** Cannot be reproduced after extended testing.

---

## 4. Severity vs Priority Matrix

| Attribute | Managed By | Meaning | Values |
|---|---|---|---|
| **Severity** | Tester (QA) | Technical and functional impact on system integrity | **Critical** (Crash, data loss, security compromise)<br>**High** (Core flow broken, no workaround)<br>**Medium** (Functional defect with workaround)<br>**Low** (Cosmetic, minor UI/UX glitch) |
| **Priority** | Lead / PM | Business scheduling and resolution urgency | **P1** (Immediate hotfix required)<br>**P2** (Resolve within current sprint)<br>**P3** (Target for next scheduled release)<br>**P4** (Low urgency backlog item) |

---

## 5. Normalized Relational Data Model

All primary entities use soft deletes (`deleted_at`) to preserve audit and compliance histories.

```sql
-- Identity & Access Management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    global_role VARCHAR(30) DEFAULT 'STANDARD', -- 'ADMIN', 'STANDARD'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Workspace / Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    key VARCHAR(10) UNIQUE NOT NULL, -- e.g., 'PROJ' for PROJ-101
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_role VARCHAR(30) NOT NULL, -- 'LEAD', 'QA', 'DEV', 'VIEWER'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Release & Milestone Management
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    version_code VARCHAR(50) NOT NULL,
    release_date DATE,
    status VARCHAR(30) DEFAULT 'OPEN', -- 'OPEN', 'FROZEN', 'RELEASED'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    lead_id UUID REFERENCES users(id),
    UNIQUE(project_id, name)
);

-- Core Bug Table
CREATE TABLE bugs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_key VARCHAR(20) UNIQUE NOT NULL, -- e.g., 'PROJ-1024'
    project_id UUID REFERENCES projects(id),
    component_id UUID REFERENCES components(id),
    milestone_id UUID REFERENCES milestones(id),
    fixed_in_milestone_id UUID REFERENCES milestones(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    steps_to_reproduce TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    actual_result TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    priority VARCHAR(20) DEFAULT 'P3', -- 'P1', 'P2', 'P3', 'P4'
    status VARCHAR(30) DEFAULT 'NEW',
    resolution VARCHAR(30), -- 'FIXED_VERIFIED', 'WONT_FIX', 'BY_DESIGN', 'DUPLICATE'
    environment VARCHAR(100), -- 'Staging', 'Production', 'QA-Env-1'
    reopen_count INT DEFAULT 0,
    is_regression BOOLEAN DEFAULT FALSE,
    reported_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Watchers
CREATE TABLE bug_watchers (
    bug_id UUID REFERENCES bugs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY(bug_id, user_id)
);

-- Issue Links
CREATE TABLE bug_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_bug_id UUID REFERENCES bugs(id) ON DELETE CASCADE,
    target_bug_id UUID REFERENCES bugs(id) ON DELETE CASCADE,
    link_type VARCHAR(30) NOT NULL, -- 'DUPLICATE_OF', 'BLOCKS', 'BLOCKED_BY', 'RELATED_TO'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (source_bug_id <> target_bug_id)
);

-- Rich Comments & Audit Log
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_id UUID REFERENCES bugs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    body_markdown TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_id UUID REFERENCES bugs(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_key VARCHAR(500) NOT NULL, -- Object path in S3/GCS
    scan_status VARCHAR(30) DEFAULT 'PENDING', -- 'PENDING', 'CLEAN', 'INFECTED'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_id UUID REFERENCES bugs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    field_changed VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);


7. Comprehensive REST API Contract
Authentication & Project Membership

POST /api/v1/auth/login – Authenticate user and issue JWT pair. 
GET  /api/v1/projects – List accessible projects for current user. 
POST /api/v1/projects/:id/members – Assign project-specific role to a user.
GET /api/v1/projects/:id/milestones – Retrieve release tracks and milestones.

Bug Lifecycle & Batch OperationsGET    

/api/v1/bugs – Paginated filter by project, status, severity, assignee, milestone, text query. 
POST   /api/v1/bugs – Create bug (triggers duplicate check algorithm).  
 GET    /api/v1/bugs/:id – Retrieve bug details, links, and watcher status[cite: 1].
 PUT    /api/v1/bugs/:id – Full edit of reproduction steps/description[cite: 1].
 PATCH  /api/v1/bugs/:id/status – Transition state machine (enforces resolution for Closed)[cite: 1].
 PATCH  /api/v1/bugs/bulk-update – Bulk status change, reassignment, or milestone targeting.
 DELETE /api/v1/bugs/:id – Soft-delete issue (Admin/Lead only).

 Collaboration, Attachments & Traceability

 POST   /api/v1/bugs/:id/watch – Toggle current user as watcher.

GET    /api/v1/bugs/:id/comments – Retrieve discussion thread[cite: 1].

POST   /api/v1/bugs/:id/comments – Add markdown comment with @mention triggers[cite: 1].

POST   /api/v1/bugs/:id/links – Link issue (DUPLICATE_OF, BLOCKS, RELATED_TO).

POST   /api/v1/bugs/:id/attachments/presigned-url – Request signed S3 upload URL.

POST   /api/v1/bugs/:id/attachments/confirm – Confirm upload completion and trigger scan.

GET    /api/v1/bugs/:id/activity-log – Full audit history of transitions and field edits

8. Notification & Event Matrix
Events are handled asynchronously via Redis queues to prevent blocking HTTP request execution.

rigger Event	Recipients	Channel
Bug Assigned	
Assignee[cite: 1]

Email + In-App Push[cite: 1]

Status changed to Fixed	
Reporter (QA)[cite: 1]

Email + In-App Push[cite: 1]

Bug Reopened	
Assignee, Component Lead, Watchers[cite: 1]

Email + In-App Push[cite: 1]

Critical / Blocker Logged	
Project Lead, Engineering Lead[cite: 1]

Instant Webhook (Slack/Teams) + High-Priority Email[cite: 1]

User @mentioned in comment	Mentioned User	In-App Push + Email
Bug SLA Breach (>48 hrs in New)	
Project Manager[cite: 1]

Escalation Dashboard Alert + Email[cite: 1]


9. Non-Functional & Security Architecture


Attachment Security: Direct client-to-storage uploads via short-lived, pre-signed AWS S3/GCS URLs. Public bucket access is blocked; private downloads are generated with 5-minute pre-signed authorization.

Idempotency & Optimistic Locking: Uses an updated_at check or version counter on transitions to prevent concurrent overwrite collisions (e.g., QA retesting while a dev reassigns).

Data Privacy & Soft Deletion: Soft deletes preserve issue keys and audit trails[cite: 1]. Deletion records retain foreign key integrity while excluding records from standard API queries.

Search Performance: Full-text search across titles, descriptions, and reproduction steps using PostgreSQL tsvector indexes, avoiding external search engines until scaling beyond 500,000 active tickets[cite: 1].

Audit Guarantees: Database triggers record every status, priority, and assignment change directly into activity_logs[cite: 1].

10. Implementation & Launch Checklist
[ ] Multi-tenant Project Membership RBAC (project_members)

[ ] Bug CRUD with normalized Milestones, Components, and Key generation (e.g., APP-101)[cite: 1]

[ ] Complete State Machine validation engine (with mandatory Resolution on Closed)[cite: 1]

[ ] Bulk update actions endpoint (/api/v1/bugs/bulk-update)

[ ] Pre-signed storage URL workflow with antivirus webhook integration

[ ] Markdown comments with @mention parsing and Watcher subscription model

[ ] Soft deletion filters on database queries

[ ] Real-time notification worker backed by Redis Queue + WebSockets[cite: 1]

[ ] Comprehensive Activity Audit trail logging[cite: 1]

[ ] Export engine (CSV, PDF summary reports)[cite: 1]

Stack: Next.js + Tailwind | NestJS (TypeScript) | MySQL  + Prisma | Redis + BullMQ | Socket.io | JWT (httpOnly cookies)`

Single monorepo, structured cleanly
