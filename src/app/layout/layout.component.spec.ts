import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { of } from 'rxjs';
import { LayoutComponent } from './layout.component';
import { AdminAuthService } from '../core/auth/auth.service';
import { RuntimeConfigService } from '../core/config/runtime-config.service';
import { DemoPermissionsService } from '../core/auth/demo-permissions.service';

describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;
  let authService: { currentUser: ReturnType<typeof vi.fn>; isAuthenticated: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn>; revalidatePermissions: ReturnType<typeof vi.fn> };
  let breakpointSubject: Subject<any>;

  beforeEach(async () => {
    breakpointSubject = new Subject();
    authService = {
      currentUser: vi.fn().mockReturnValue({ email: 'admin@test.com' }),
      isAuthenticated: vi.fn().mockReturnValue(true),
      logout: vi.fn(),
      revalidatePermissions: vi.fn(() => of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [LayoutComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminAuthService, useValue: authService },
        { provide: RuntimeConfigService, useValue: { apiUrl: 'https://donit-api-prod.marfern.dev' } },
        {
          provide: BreakpointObserver,
          useValue: {
            observe: vi.fn().mockReturnValue(breakpointSubject.asObservable()),
          },
        },
      ],
    }).compileComponents();

    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    TestBed.inject(DemoPermissionsService).setPermissions(['ADMIN_READ']);

    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    breakpointSubject.complete();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show default title on init', () => {
    fixture.detectChanges();
    expect(component.pageTitle()).toBe('Panel de Administración');
  });

  it('identifies production from the API host, not its .dev top-level domain', () => {
    fixture.detectChanges();
    expect(component.environmentLabel).toBe('PROD');
  });

  it('should compute title from route segments', () => {
    fixture.detectChanges();
    component['updateTitle']('/users');
    expect(component.pageTitle()).toBe('Usuarios');
  });

  it('should compute title for tasks', () => {
    fixture.detectChanges();
    component['updateTitle']('/tasks');
    expect(component.pageTitle()).toBe('Tareas');
  });

  it('should compute title for task-types', () => {
    fixture.detectChanges();
    component['updateTitle']('/task-types');
    expect(component.pageTitle()).toBe('Tipos de tarea');
  });

  it('should compute title for detail routes', () => {
    fixture.detectChanges();
    component['updateTitle']('/users/42');
    expect(component.pageTitle()).toBe('Usuarios');
  });

  it('keeps the contextual title when a detail route has query parameters', () => {
    fixture.detectChanges();
    component['updateTitle']('/users/42?tab=tasks');
    expect(component.pageTitle()).toBe('Usuarios');
  });

  it('should fallback to default for unknown routes', () => {
    fixture.detectChanges();
    component['updateTitle']('/unknown');
    expect(component.pageTitle()).toBe('Panel de Administración');
  });

  it('should set isMobile when breakpoint matches handset', () => {
    fixture.detectChanges();
    breakpointSubject.next({ matches: true });
    expect(component.isMobile()).toBeTruthy();
  });

  it('should set isMobile to false when breakpoint does not match', () => {
    fixture.detectChanges();
    breakpointSubject.next({ matches: false });
    expect(component.isMobile()).toBeFalsy();
  });

  it('should toggle sidenav', () => {
    fixture.detectChanges();
    component.sidenav.set(false);
    component.toggleSidenav();
    expect(component.sidenav()).toBeTruthy();
    component.toggleSidenav();
    expect(component.sidenav()).toBeFalsy();
  });

  it('should close sidenav on mobile when closeSidenav is called', () => {
    fixture.detectChanges();
    component.isMobile.set(true);
    component.sidenav.set(true);
    component.closeSidenav();
    expect(component.sidenav()).toBeFalsy();
  });

  it('should not close sidenav on desktop when closeSidenav is called', () => {
    fixture.detectChanges();
    component.isMobile.set(false);
    component.sidenav.set(true);
    component.closeSidenav();
    expect(component.sidenav()).toBeTruthy();
  });

  it('should call authService.logout', () => {
    fixture.detectChanges();
    component.authService.logout();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('should offer an accessible account menu', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[aria-label="Menú de usuario"]')).toBeTruthy();
  });

  it('should close sidenav on navigation when mobile', () => {
    fixture.detectChanges();
    component.isMobile.set(true);
    component.sidenav.set(true);
    component.closeSidenav();
    expect(component.sidenav()).toBeFalsy();
  });

  it('should close sidenav when BreakpointObserver reports mobile', () => {
    fixture.detectChanges();
    component.sidenav.set(true);
    breakpointSubject.next({ matches: true });
    component.closeSidenav();
    expect(component.sidenav()).toBeFalsy();
  });

  it('should show all primary navigation links', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const labels = Array.from(el.querySelectorAll('mat-nav-list a')).map((link) => link.getAttribute('aria-label'));
    expect(labels).toEqual(['Dashboard', 'Usuarios', 'Tareas', 'Tipos de tarea']);
  });

  it('shows only demo navigation for DEMO-only and updates after revocation', () => {
    const permissions = TestBed.inject(DemoPermissionsService);
    permissions.setPermissions(['DEMO_READ', 'DEMO_WRITE', 'DEMO_PUBLISH', 'DEMO_RESTORE']);
    fixture.detectChanges();
    const labels = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-nav-list a')).map(link => link.getAttribute('aria-label'));
    expect(labels()).toEqual(['Contenido demo']);
    expect((fixture.nativeElement as HTMLElement).querySelector('.brand')?.getAttribute('href')).toBe('/demo-content');
    permissions.setPermissions(['DEMO_RESTORE']);
    fixture.detectChanges();
    expect(labels()).toEqual(['Contenido demo']);
    permissions.clear();
    fixture.detectChanges();
    expect(labels()).toEqual([]);
  });

  it('shows both spaces for an admin with demo capabilities', () => {
    TestBed.inject(DemoPermissionsService).setPermissions(['ADMIN_READ', 'DEMO_READ']);
    fixture.detectChanges();
    const labels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-nav-list a')).map(link => link.getAttribute('aria-label'));
    expect(labels).toEqual(['Dashboard', 'Usuarios', 'Tareas', 'Tipos de tarea', 'Contenido demo']);
  });

  it('leaves an active real route when ADMIN_READ is revoked', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/dashboard');
    fixture.detectChanges();
    TestBed.inject(DemoPermissionsService).setPermissions(['DEMO_READ']);
    fixture.detectChanges();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/demo-content');
  });

  it('should expose a visible theme selector', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('select[aria-label="Tema visual"]')).toBeTruthy();
  });

  it('revalidates current permissions when the tab regains focus', () => {
    fixture.detectChanges();
    window.dispatchEvent(new Event('focus'));
    expect(authService.revalidatePermissions).toHaveBeenCalledOnce();
  });
});
