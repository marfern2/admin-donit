import { HttpErrorResponse } from '@angular/common/http';
import { publicErrorMessage } from './public-error';

describe('public API errors', () => {
  it.each([
    [0, 'conexión'],
    [400, 'parámetros'],
    [403, 'proxy'],
    [404, 'no existe'],
    [500, 'temporalmente'],
  ])('maps HTTP %i without exposing backend details', (status, fragment) => {
    const message = publicErrorMessage(new HttpErrorResponse({ status, error: { stackTrace: 'secret' } }));
    expect(message).toContain(fragment);
    expect(message).not.toContain('secret');
  });
});
