export interface AdminTaskTypeSummary {
  id: number;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  usuarioId: number;
  usuarioUsername: string;
  taskCount: number;
}

export interface AdminTaskTypeDetail {
  id: number;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  usuarioId: number;
  usuarioUsername: string;
  usuarioEmail: string;
  taskCount: number;
}

export interface TaskTypeListParams {
  page: number;
  size: number;
  search?: string;
  sort?: string;
}
