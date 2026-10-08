import { routes } from './app.routes';

describe('admin routes', () => {
  it('exposes all public routes without an admin guard', () => {
    const demo = routes.find(route => route.path === 'demo');
    expect(demo?.canActivate).toBeUndefined();
    expect(demo?.children?.map(route => route.path)).toEqual(['', 'users', 'task-types', 'tasks']);
    for (const section of demo!.children!.filter(route => route.path)) {
      expect(section.canActivate).toBeUndefined();
      expect(section.children?.map(route => route.path)).toEqual(['', ':publicId']);
    }
  });
  it('redirects the protected root to the dashboard', () => {
    const shell = routes.find((route) => route.path === '');
    expect(shell?.canActivate?.length).toBe(1);
    expect(shell?.children?.find((route) => route.path === '')?.redirectTo).toBe('dashboard');
    expect(shell?.children?.some((route) => route.path === 'dashboard')).toBe(true);
  });
});
