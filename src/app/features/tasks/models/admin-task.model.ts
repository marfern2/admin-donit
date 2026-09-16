export interface AdminTaskSummary {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha: string | null;
  completada: boolean | null;
  urgencia: number | null;
  usuarioId: number;
  usuarioUsername: string;
  usuarioEmail: string;
  tipoTareaId: number | null;
  tipoTareaNombre: string | null;
  tipoTareaColor: string | null;
}

export type AdminTaskDetail = AdminTaskSummary;

export interface TaskListParams {
  page: number;
  size: number;
  search?: string;
  userId?: number;
  completed?: boolean;
  urgency?: string;
  taskTypeId?: number;
  sort?: string;
}
