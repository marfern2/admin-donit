import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AdminAuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authService: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    initialized: ReturnType<typeof vi.fn>;
    initialize: ReturnType<typeof vi.fn>;
  };
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  beforeEach(() => {
    authService = {
      isAuthenticated: vi.fn(),
      initialized: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
    };
    router = { createUrlTree: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AdminAuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('restores a private session only on entering a private route', async () => {
    authService.initialized.mockReturnValue(false);
    authService.isAuthenticated.mockReturnValue(false);

    router.createUrlTree.mockReturnValue({} as any);
    const result = await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(authService.initialize).toHaveBeenCalledOnce();
    expect(result).toEqual({});
  });

  it('should allow access when initialized and authenticated', async () => {
    authService.initialized.mockReturnValue(true);
    authService.isAuthenticated.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(result).toBeTruthy();
  });

  it('does not restore again immediately after login', async () => {
    authService.initialized.mockReturnValue(false);
    authService.isAuthenticated.mockReturnValue(true);
    const result = await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(result).toBe(true);
    expect(authService.initialize).not.toHaveBeenCalled();
  });

  it('should redirect to /login when initialized but not authenticated', async () => {
    authService.initialized.mockReturnValue(true);
    authService.isAuthenticated.mockReturnValue(false);
    router.createUrlTree.mockReturnValue({} as any);

    const result = await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toEqual({});
  });
});
