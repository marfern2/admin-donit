export interface AdminPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export function isAdminPage<T>(value: AdminPage<T> | null | undefined): value is AdminPage<T> {
  return value !== null && value !== undefined && Array.isArray(value.content)
    && typeof value.totalElements === 'number';
}
