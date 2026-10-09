import { HttpErrorResponse } from '@angular/common/http';

export interface DemoError { message: string; reload: boolean; retryAfter: number | null; }

export function demoError(error: unknown): DemoError {
  const response = error instanceof HttpErrorResponse ? error : null;
  const status = response?.status;
  const detail = response?.error && typeof response.error === 'object' && typeof response.error.message === 'string'
    ? response.error.message : null;
  const retry = response?.headers.get('Retry-After');
  const retryAfter = retry && /^\d+$/.test(retry) ? Number(retry)
    : retry && !Number.isNaN(Date.parse(retry)) ? Math.max(0, Math.ceil((Date.parse(retry) - Date.now()) / 1000)) : null;
  const conflict = detail === 'handle ya existe' ? 'Ese handle ya está en uso.'
    : detail === 'Hay tipos o tareas publicados' ? 'Despublica antes los tipos y tareas relacionados.'
    : detail === 'El usuario demo debe estar publicado' ? 'Publica antes al usuario relacionado.'
    : detail === 'El tipo tiene tareas publicadas' ? 'Despublica antes las tareas de este tipo.'
    : detail === 'El tipo tiene tareas asociadas' ? 'Este tipo tiene tareas asociadas y no se puede borrar.'
    : detail === 'Usuario y tipo deben estar publicados y pertenecer al mismo catálogo' ? 'Publica antes el usuario y el tipo, y comprueba que pertenezcan al mismo usuario.'
    : detail === 'El tipo pertenece a otro usuario demo' ? 'Selecciona un tipo del usuario elegido.'
    : 'La operación entra en conflicto con datos relacionados o publicados.';
  const reload = status === 412 || status === 428;
  const message = status === 400 ? 'Revisa los datos del formulario.'
    : status === 401 ? 'Tu sesión ha caducado. Inicia sesión de nuevo.'
    : status === 403 ? 'No tienes permiso para esta acción.'
    : status === 404 ? 'El recurso ya no existe.'
    : status === 409 ? conflict
    : status === 412 ? 'Este recurso ha cambiado desde que lo abriste. Recarga los datos antes de continuar.'
    : status === 428 ? 'Falta la precondición de esta operación. Recarga los datos antes de continuar.'
    : status === 429 ? `Límite de solicitudes alcanzado. ${retryAfter ? `Espera ${retryAfter} segundos` : 'Espera un momento'} antes de reintentar.`
    : status === 0 ? 'No se pudo conectar con el servidor.'
    : status && status >= 500 ? 'El servidor tiene un problema temporal. Inténtalo más tarde.'
    : 'No se pudo completar la operación.';
  return { message, reload, retryAfter };
}
