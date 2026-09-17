// Shared TypeScript interfaces mirroring all Prisma models
import {
  BugStatus,
  BugSeverity,
  BugPriority,
  ResolutionType,
  ProjectRole,
  GlobalRole,
  LinkType,
  MilestoneStatus,
  ScanStatus,
  NotificationType,
} from './enums';

// ── Base ────────────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ── User ────────────────────────────────────────────────────

export interface User extends BaseEntity {
  name: string;
  email: string;
  globalRole: GlobalRole;
  avatarUrl?: string;
}

export interface UserWithProjects extends User {
  projectMembers: ProjectMember[];
}

// ── Project ─────────────────────────────────────────────────

export interface Project extends BaseEntity {
  name: string;
  key: string;
  description?: string;
  createdById: string;
  createdBy?: User;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  projectRole: ProjectRole;
  createdAt: string;
  user?: User;
  project?: Project;
}

// ── Milestone ───────────────────────────────────────────────

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  versionCode: string;
  releaseDate?: string;
  status: MilestoneStatus;
  createdAt: string;
}

// ── Component ───────────────────────────────────────────────

export interface Component {
  id: string;
  projectId: string;
  name: string;
  leadId?: string;
  lead?: User;
}

// ── Bug ─────────────────────────────────────────────────────

export interface Bug extends BaseEntity {
  issueKey: string;
  projectId: string;
  project?: Project;
  componentId?: string;
  component?: Component;
  milestoneId?: string;
  milestone?: Milestone;
  fixedInMilestoneId?: string;
  fixedInMilestone?: Milestone;
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  severity: BugSeverity;
  priority: BugPriority;
  status: BugStatus;
  resolution?: ResolutionType;
  environment?: string;
  reopenCount: number;
  isRegression: boolean;
  reportedById: string;
  reportedBy?: User;
  assignedToId?: string;
  assignedTo?: User;
  watchers?: User[];
  links?: BugLink[];
  comments?: Comment[];
  attachments?: Attachment[];
  activityLogs?: ActivityLog[];
}

export interface BugLink {
  id: string;
  sourceBugId: string;
  targetBugId: string;
  linkType: LinkType;
  createdAt: string;
  sourceBug?: Bug;
  targetBug?: Bug;
}

// ── Comment ─────────────────────────────────────────────────

export interface Comment extends BaseEntity {
  bugId: string;
  userId: string;
  user?: User;
  bodyMarkdown: string;
  deletedAt?: string;
}

// ── Attachment ──────────────────────────────────────────────

export interface Attachment {
  id: string;
  bugId: string;
  uploadedById: string;
  uploadedBy?: User;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageKey: string;
  scanStatus: ScanStatus;
  createdAt: string;
}

// ── Activity Log ────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  bugId: string;
  userId: string;
  user?: User;
  fieldChanged: string;
  oldValue?: string;
  newValue?: string;
  changedAt: string;
}

// ── Notification ────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  bugId?: string;
  bugIssueKey?: string;
  isRead: boolean;
  createdAt: string;
}

// ── API Response Wrappers ────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

// ── Dashboard Stats ──────────────────────────────────────────

export interface ProjectStats {
  totalBugs: number;
  byStatus: Record<BugStatus, number>;
  bySeverity: Record<BugSeverity, number>;
  byPriority: Record<BugPriority, number>;
  slaBreaches: number;
  avgResolutionDays: number;
}
