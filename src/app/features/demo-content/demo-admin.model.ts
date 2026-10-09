export type DemoKind = 'users' | 'task-types' | 'tasks';
export type PublicationStatus = 'DRAFT' | 'PUBLISHED';

interface DemoBase {
  id: number;
  publicId: string;
  publicationStatus: PublicationStatus;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DemoUser extends DemoBase {
  handle: string;
  displayName: string;
  bio: string | null;
}

export interface DemoTaskType extends DemoBase {
  demoUserId: number;
  name: string;
  description: string | null;
  color: string;
}

export interface DemoTask extends DemoBase {
  demoUserId: number;
  demoTaskTypeId: number;
  title: string;
  description: string | null;
  dueDate: string;
  completed: boolean;
  urgency: number;
}

export interface DemoStats {
  usersTotal: number;
  usersPublished: number;
  typesTotal: number;
  typesPublished: number;
  tasksTotal: number;
  tasksPublished: number;
  tasksCompleted: number;
}

export interface DemoPage<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface DemoListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  publicationStatus?: PublicationStatus;
  demoUserId?: number;
  demoTaskTypeId?: number;
  completed?: boolean;
  urgency?: number;
}

export type DemoUserWrite = Pick<DemoUser, 'handle' | 'displayName' | 'bio'>;
export type DemoTypeWrite = Pick<DemoTaskType, 'demoUserId' | 'name' | 'description' | 'color'>;
export type DemoTaskWrite = Pick<DemoTask, 'demoUserId' | 'demoTaskTypeId' | 'title' | 'description' | 'dueDate' | 'completed' | 'urgency'>;

export interface FixtureChanges {
  create: string[];
  update: string[];
  unchanged: string[];
  retired: string[];
  conflicts: string[];
}

export interface FixturePreview {
  currentRevision: number;
  targetRevision: number;
  currentManifestVersion: number | null;
  manifestVersion: number;
  etag: string;
  users: FixtureChanges;
  types: FixtureChanges;
  tasks: FixtureChanges;
  catalogConflicts: string[];
  customRecords: number;
}

export interface FixtureRestoreResult {
  previousRevision: number;
  newRevision: number;
  manifestVersion: number;
  restoreId: string;
  etag: string;
  users: FixtureChanges;
  types: FixtureChanges;
  tasks: FixtureChanges;
}

export interface Versioned<T> { body: T; etag: string; }
export interface OptionalVersioned<T> { body: T; etag: string | null; }
