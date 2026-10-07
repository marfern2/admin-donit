import { routes } from './app.routes';

describe('admin routes', () => {
  it('redirects the protected root to the dashboard', () => {
    const shell = routes.find((route) => route.path === '');
    expect(shell?.canActivate?.length).toBe(1);
    expect(shell?.children?.find((route) => route.path === '')?.redirectTo).toBe('dashboard');
    expect(shell?.children?.some((route) => route.path === 'dashboard')).toBe(true);
  });
});
