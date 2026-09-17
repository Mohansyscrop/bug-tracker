import { z } from 'zod';
import {
  BugStatus,
  BugSeverity,
  BugPriority,
  ResolutionType,
  LinkType,
  ProjectRole,
} from './enums';

// ============================================================
// Auth
// ============================================================

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

// ============================================================
// Projects
// ============================================================

export const CreateProjectSchema = z.object({
  name: z.string().min(2).max(100),
  key: z.string().min(2).max(10).toUpperCase().regex(/^[A-Z0-9]+$/),
  description: z.string().optional(),
});

export const AddMemberSchema = z.object({
  userId: z.string().uuid(),
  projectRole: z.nativeEnum(ProjectRole),
});

// ============================================================
// Milestones
// ============================================================

export const CreateMilestoneSchema = z.object({
  name: z.string().min(2).max(100),
  versionCode: z.string().min(1).max(50),
  releaseDate: z.string().datetime().optional(),
});

// ============================================================
// Components
// ============================================================

export const CreateComponentSchema = z.object({
  name: z.string().min(2).max(100),
  leadId: z.string().uuid().optional(),
});

// ============================================================
// Bugs
// ============================================================

export const CreateBugSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(10),
  stepsToReproduce: z.string().min(10),
  expectedResult: z.string().min(5),
  actualResult: z.string().min(5),
  severity: z.nativeEnum(BugSeverity),
  priority: z.nativeEnum(BugPriority).optional().default(BugPriority.P3),
  environment: z.string().max(100).optional(),
  componentId: z.string().uuid().optional(),
  milestoneId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
});

export const UpdateBugSchema = CreateBugSchema.partial();

export const TransitionStatusSchema = z.object({
  status: z.nativeEnum(BugStatus),
  resolution: z.nativeEnum(ResolutionType).optional(),
  comment: z.string().optional(), // mandatory for certain transitions
});

export const BulkUpdateSchema = z.object({
  bugIds: z.array(z.string().uuid()).min(1).max(100),
  update: z.object({
    status: z.nativeEnum(BugStatus).optional(),
    priority: z.nativeEnum(BugPriority).optional(),
    assignedTo: z.string().uuid().nullable().optional(),
    milestoneId: z.string().uuid().nullable().optional(),
  }),
});

export const BugFilterSchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.nativeEnum(BugStatus).optional(),
  severity: z.nativeEnum(BugSeverity).optional(),
  priority: z.nativeEnum(BugPriority).optional(),
  assignedTo: z.string().uuid().optional(),
  milestoneId: z.string().uuid().optional(),
  componentId: z.string().uuid().optional(),
  isRegression: z.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================
// Comments
// ============================================================

export const CreateCommentSchema = z.object({
  bodyMarkdown: z.string().min(1).max(10000),
});

// ============================================================
// Bug Links
// ============================================================

export const CreateBugLinkSchema = z.object({
  targetBugId: z.string().uuid(),
  linkType: z.nativeEnum(LinkType),
});

// ============================================================
// Inferred Types
// ============================================================

export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
export type AddMemberDto = z.infer<typeof AddMemberSchema>;
export type CreateMilestoneDto = z.infer<typeof CreateMilestoneSchema>;
export type CreateComponentDto = z.infer<typeof CreateComponentSchema>;
export type CreateBugDto = z.infer<typeof CreateBugSchema>;
export type UpdateBugDto = z.infer<typeof UpdateBugSchema>;
export type TransitionStatusDto = z.infer<typeof TransitionStatusSchema>;
export type BulkUpdateDto = z.infer<typeof BulkUpdateSchema>;
export type BugFilterDto = z.infer<typeof BugFilterSchema>;
export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;
export type CreateBugLinkDto = z.infer<typeof CreateBugLinkSchema>;
