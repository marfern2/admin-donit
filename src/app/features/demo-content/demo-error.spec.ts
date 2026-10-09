import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { demoError } from './demo-error';

describe('demoError', () => {
  it('explains publication dependency conflicts without exposing arbitrary server text', () => {
    const response = new HttpErrorResponse({ status: 409, error: { message: 'El tipo tiene tareas publicadas' } });
    expect(demoError(response).message).toBe('Despublica antes las tareas de este tipo.');
    const unexpected = new HttpErrorResponse({ status: 409, error: { message: 'internal stack trace' } });
    expect(demoError(unexpected).message).not.toContain('stack trace');
  });
  it('reads Retry-After without scheduling automatic retries', () => {
    const response = new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '12' }) });
    expect(demoError(response)).toEqual({ message: 'Límite de solicitudes alcanzado. Espera 12 segundos antes de reintentar.', reload: false, retryAfter: 12 });
  });
});
