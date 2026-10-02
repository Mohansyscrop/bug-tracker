// ============================================================
// Core Domain Enums
// ============================================================

export enum BugStatus {
  NEW = 'NEW',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  CANNOT_REPRODUCE = 'CANNOT_REPRODUCE',
  REJECTED = 'REJECTED',
  DEFERRED = 'DEFERRED',
  FIXED = 'FIXED',
  RETEST = 'RETEST',
  REOPENED = 'REOPENED',
  CLOSED = 'CLOSED',
}

export enum BugSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum BugPriority {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
}

export enum ResolutionType {
  FIXED_VERIFIED = 'FIXED_VERIFIED',
  WONT_FIX = 'WONT_FIX',
  BY_DESIGN = 'BY_DESIGN',
  DUPLICATE = 'DUPLICATE',
  CANNOT_REPRODUCE_ABANDONED = 'CANNOT_REPRODUCE_ABANDONED',
}

export enum ProjectRole {
  LEAD = 'LEAD',
  QA = 'QA',
  DEV = 'DEV',
  VIEWER = 'VIEWER',
}

export enum GlobalRole {
  ADMIN = 'ADMIN',
  STANDARD = 'STANDARD',
}

export enum LinkType {
  DUPLICATE_OF = 'DUPLICATE_OF',
  BLOCKS = 'BLOCKS',
  BLOCKED_BY = 'BLOCKED_BY',
  RELATED_TO = 'RELATED_TO',
}

export enum MilestoneStatus {
  OPEN = 'OPEN',
  FROZEN = 'FROZEN',
  RELEASED = 'RELEASED',
}

export enum ScanStatus {
  PENDING = 'PENDING',
  CLEAN = 'CLEAN',
  INFECTED = 'INFECTED',
}

export enum NotificationType {
  BUG_ASSIGNED = 'BUG_ASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  BUG_REOPENED = 'BUG_REOPENED',
  CRITICAL_LOGGED = 'CRITICAL_LOGGED',
  COMMENT_MENTION = 'COMMENT_MENTION',
  SLA_BREACH = 'SLA_BREACH',
  COMMENT_ADDED = 'COMMENT_ADDED',
}

// ============================================================
// State Machine — Valid Transitions per Role
// ============================================================

export type TransitionMap = {
  [currentStatus in BugStatus]?: {
    [role in ProjectRole | 'ADMIN']?: BugStatus[];
  };
};

export const BUG_STATE_TRANSITIONS: TransitionMap = {
  [BugStatus.NEW]: {
    [ProjectRole.LEAD]: [BugStatus.ASSIGNED, BugStatus.DEFERRED, BugStatus.CLOSED],
    [ProjectRole.QA]: [BugStatus.CLOSED],
    ADMIN: [BugStatus.ASSIGNED, BugStatus.DEFERRED, BugStatus.CLOSED],
  },
  [BugStatus.ASSIGNED]: {
    [ProjectRole.DEV]: [BugStatus.IN_PROGRESS],
    [ProjectRole.LEAD]: [BugStatus.IN_PROGRESS, BugStatus.DEFERRED],
    ADMIN: [BugStatus.IN_PROGRESS, BugStatus.DEFERRED, BugStatus.CLOSED],
  },
  [BugStatus.IN_PROGRESS]: {
    [ProjectRole.DEV]: [
      BugStatus.FIXED,
      BugStatus.CANNOT_REPRODUCE,
      BugStatus.REJECTED,
    ],
    [ProjectRole.LEAD]: [BugStatus.DEFERRED],
    ADMIN: [BugStatus.FIXED, BugStatus.CANNOT_REPRODUCE, BugStatus.REJECTED, BugStatus.DEFERRED],
  },
  [BugStatus.CANNOT_REPRODUCE]: {
    [ProjectRole.QA]: [BugStatus.IN_PROGRESS, BugStatus.CLOSED],
    [ProjectRole.LEAD]: [BugStatus.CLOSED],
    ADMIN: [BugStatus.IN_PROGRESS, BugStatus.CLOSED],
  },
  [BugStatus.REJECTED]: {
    [ProjectRole.QA]: [BugStatus.IN_PROGRESS, BugStatus.CLOSED],
    [ProjectRole.LEAD]: [BugStatus.CLOSED],
    ADMIN: [BugStatus.IN_PROGRESS, BugStatus.CLOSED],
  },
  [BugStatus.DEFERRED]: {
    [ProjectRole.LEAD]: [BugStatus.ASSIGNED],
    ADMIN: [BugStatus.ASSIGNED, BugStatus.CLOSED],
  },
  [BugStatus.FIXED]: {
    [ProjectRole.QA]: [BugStatus.RETEST, BugStatus.CLOSED, BugStatus.REOPENED],
    [ProjectRole.LEAD]: [BugStatus.RETEST, BugStatus.CLOSED, BugStatus.REOPENED],
    ADMIN: [BugStatus.RETEST, BugStatus.CLOSED, BugStatus.REOPENED],
  },
  [BugStatus.RETEST]: {
    [ProjectRole.QA]: [BugStatus.CLOSED, BugStatus.REOPENED],
    [ProjectRole.LEAD]: [BugStatus.CLOSED, BugStatus.REOPENED],
    ADMIN: [BugStatus.CLOSED, BugStatus.REOPENED],
  },
  [BugStatus.REOPENED]: {
    [ProjectRole.DEV]: [BugStatus.IN_PROGRESS],
    [ProjectRole.LEAD]: [BugStatus.IN_PROGRESS, BugStatus.DEFERRED],
    ADMIN: [BugStatus.IN_PROGRESS, BugStatus.DEFERRED],
  },
  [BugStatus.CLOSED]: {
    // Terminal state — only ADMIN or QA can reopen
    [ProjectRole.QA]: [BugStatus.REOPENED],
    ADMIN: [BugStatus.REOPENED],
  },
};

// Statuses that require a resolution_type when closing
export const RESOLUTION_REQUIRED_STATUSES = new Set([BugStatus.CLOSED]);

// Statuses that require a reason/comment
export const COMMENT_REQUIRED_STATUSES = new Set([
  BugStatus.REJECTED,
  BugStatus.CANNOT_REPRODUCE,
  BugStatus.DEFERRED,
]);
