export type { AdminPage } from '../../../shared/models/admin-page.model';

export interface AdminUserSummary {
  id: number;
  username: string;
  email: string;
  taskCount: number;
  taskTypeCount: number;
}

export interface AdminUserDetail {
  id: number;
  username: string;
  email: string;
  enabled: boolean;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  taskTypeCount: number;
}

export interface AdminUserTaskSummary {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha: string | null;
  completada: boolean | null;
  urgencia: number | null;
  tipoTareaId: number | null;
  tipoTareaNombre: string | null;
  tipoTareaColor: string | null;
}

export interface AdminUserTaskTypeSummary {
  id: number;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  taskCount: number;
}

export interface UserListParams {
  page: number;
  size: number;
  search?: string;
  sort?: string;
}

export interface UserTaskListParams {
  page: number;
  size: number;
}

export interface UserTaskTypeListParams {
  page: number;
  size: number;
}

export interface AdminUpdateUserRequest {
  username?: string;
  email?: string;
}

export interface AdminSetUserEnabledRequest {
  enabled: boolean;
}

export interface AdminCreateTaskRequest {
  titulo: string;
  descripcion: string | null;
  fecha: string;
  completada: boolean;
  urgencia: number;
  tipoTareaId: number;
}

export interface AdminUpdateTaskRequest {
  titulo?: string;
  descripcion?: string | null;
  fecha?: string;
  completada?: boolean;
  urgencia?: number;
  tipoTareaId?: number;
}

export interface AdminCreateTaskTypeRequest {
  nombre: string;
  descripcion: string | null;
  color: string;
}

export interface AdminUpdateTaskTypeRequest {
  nombre?: string;
  descripcion?: string | null;
  color?: string;
}
