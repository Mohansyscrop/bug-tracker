// State machine — valid transitions per role
// Mirrors packages/shared/src/enums.ts but as a pure TS file for the API

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

type Role = 'LEAD' | 'QA' | 'DEV' | 'VIEWER' | 'ADMIN';

export const BUG_STATE_TRANSITIONS: Record<BugStatus, Partial<Record<Role, BugStatus[]>>> = {
  [BugStatus.NEW]: {
    LEAD: [BugStatus.ASSIGNED, BugStatus.DEFERRED, BugStatus.CLOSED],
    QA: [BugStatus.CLOSED],
    ADMIN: [BugStatus.ASSIGNED, BugStatus.DEFERRED, BugStatus.CLOSED],
  },
  [BugStatus.ASSIGNED]: {
    DEV: [BugStatus.IN_PROGRESS],
    LEAD: [BugStatus.IN_PROGRESS, BugStatus.DEFERRED],
    ADMIN: [BugStatus.IN_PROGRESS, BugStatus.DEFERRED, BugStatus.CLOSED],
  },
  [BugStatus.IN_PROGRESS]: {
    DEV: [BugStatus.FIXED, BugStatus.CANNOT_REPRODUCE, BugStatus.REJECTED],
    LEAD: [BugStatus.DEFERRED],
    ADMIN: [BugStatus.FIXED, BugStatus.CANNOT_REPRODUCE, BugStatus.REJECTED, BugStatus.DEFERRED],
  },
  [BugStatus.CANNOT_REPRODUCE]: {
    QA: [BugStatus.IN_PROGRESS, BugStatus.CLOSED],
    LEAD: [BugStatus.CLOSED],
    ADMIN: [BugStatus.IN_PROGRESS, BugStatus.CLOSED],
  },
  [BugStatus.REJECTED]: {
    QA: [BugStatus.IN_PROGRESS, BugStatus.CLOSED],
    LEAD: [BugStatus.CLOSED],
    ADMIN: [BugStatus.IN_PROGRESS, BugStatus.CLOSED],
  },
  [BugStatus.DEFERRED]: {
    LEAD: [BugStatus.ASSIGNED],
    ADMIN: [BugStatus.ASSIGNED, BugStatus.CLOSED],
  },
  [BugStatus.FIXED]: {
    QA: [BugStatus.RETEST],
    LEAD: [BugStatus.RETEST],
    ADMIN: [BugStatus.RETEST, BugStatus.CLOSED],
  },
  [BugStatus.RETEST]: {
    QA: [BugStatus.CLOSED, BugStatus.REOPENED],
    LEAD: [BugStatus.CLOSED, BugStatus.REOPENED],
    ADMIN: [BugStatus.CLOSED, BugStatus.REOPENED],
  },
  [BugStatus.REOPENED]: {
    DEV: [BugStatus.IN_PROGRESS],
    LEAD: [BugStatus.IN_PROGRESS, BugStatus.DEFERRED],
    ADMIN: [BugStatus.IN_PROGRESS, BugStatus.DEFERRED],
  },
  [BugStatus.CLOSED]: {
    QA: [BugStatus.REOPENED],
    ADMIN: [BugStatus.REOPENED],
  },
};

export const RESOLUTION_REQUIRED_STATUSES = new Set([BugStatus.CLOSED]);
