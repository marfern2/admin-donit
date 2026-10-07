import { adminErrorMessage } from './admin-error-message';

describe('adminErrorMessage', () => {
  it('provides actionable feedback for authorization and rate limits', () => {
    expect(adminErrorMessage({ status: 403 }, 'Error')).toContain('permisos');
    expect(adminErrorMessage({ status: 429 }, 'Error')).toContain('Espera');
    expect(adminErrorMessage({ status: 401 }, 'Error')).toContain('sesión');
  });

  it('keeps contextual feedback for unrecognized failures', () => {
    expect(adminErrorMessage({ status: 409 }, 'El nombre ya existe.')).toBe('El nombre ya existe.');
  });
});
