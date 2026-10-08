export interface PublicDemoUser { publicId: string; handle: string; displayName: string; bio: string | null; }
export interface PublicDemoTaskType { publicId: string; userPublicId: string; name: string; description: string | null; color: string | null; }
export interface PublicDemoTask { publicId: string; userPublicId: string; taskTypePublicId: string | null; title: string; description: string | null; dueDate: string | null; completed: boolean | null; urgency: number | null; }
export interface PublicDemoStats { users: number; taskTypes: number; tasks: number; completedTasks: number; }
export interface PublicDemoPage<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number; hasNext: boolean; }
export interface PublicDemoListParams { page: number; size: number; search?: string; sort?: string; userPublicId?: string; taskTypePublicId?: string; completed?: boolean; urgency?: number; }
