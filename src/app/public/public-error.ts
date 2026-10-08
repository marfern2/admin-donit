import { HttpErrorResponse } from '@angular/common/http';

export function publicErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse) || error.status === 0) return 'No hay conexión con la API. Comprueba tu conexión e inténtalo de nuevo.';
  switch (error.status) {
    case 400: return 'Los filtros o parámetros no son válidos. Revisa la URL e inténtalo de nuevo.';
    case 403: return 'La API pública ha rechazado el acceso. Comprueba la configuración del proxy.';
    case 404: return 'Este elemento público no existe o ya no está publicado.';
    default: return error.status >= 500 ? 'La API no está disponible temporalmente. Inténtalo de nuevo más tarde.' : 'No se pudo cargar el contenido público.';
  }
}
