import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AdminAuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authService: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    initialized: ReturnType<typeof vi.fn>;
  };
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  beforeEach(() => {
    authService = {
      isAuthenticated: vi.fn(),
      initialized: vi.fn(),
    };
    router = { createUrlTree: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AdminAuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('should block access when not initialized', () => {
    authService.initialized.mockReturnValue(false);
    authService.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(result).toBeFalsy();
  });

  it('should allow access when initialized and authenticated', () => {
    authService.initialized.mockReturnValue(true);
    authService.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(result).toBeTruthy();
  });

  it('should redirect to /login when initialized but not authenticated', () => {
    authService.initialized.mockReturnValue(true);
    authService.isAuthenticated.mockReturnValue(false);
    router.createUrlTree.mockReturnValue({} as any);

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toEqual({});
  });
});
