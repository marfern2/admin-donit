/** Short, actionable feedback for admin requests without exposing server details. */
export function adminErrorMessage(error: unknown, fallback: string): string {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status: unknown }).status : undefined;

  switch (status) {
    case 0:
      return 'No hay conexión con el servidor. Comprueba tu red e inténtalo de nuevo.';
    case 401:
      return 'La sesión ha caducado. Inicia sesión de nuevo.';
    case 403:
      return 'No tienes permisos para realizar esta acción.';
    case 429:
      return 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';
    default:
      return fallback;
  }
}
