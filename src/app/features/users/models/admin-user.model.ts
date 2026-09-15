export interface AdminPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

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
  urgencia: string | null;
  tipoTareaId: number | null;
  tipoTareaNombre: string | null;
  tipoTareaColor: string | null;
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
