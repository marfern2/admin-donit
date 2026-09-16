import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { LayoutComponent } from './layout.component';
import { AdminAuthService } from '../core/auth/auth.service';

describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;
  let authService: { currentUser: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let breakpointSubject: Subject<any>;

  beforeEach(async () => {
    breakpointSubject = new Subject();
    authService = {
      currentUser: vi.fn().mockReturnValue({ email: 'admin@test.com' }),
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LayoutComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminAuthService, useValue: authService },
        {
          provide: BreakpointObserver,
          useValue: {
            observe: vi.fn().mockReturnValue(breakpointSubject.asObservable()),
          },
        },
      ],
    }).compileComponents();

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

  it('should display user email', () => {
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('admin@test.com');
    });
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

  it('should only show Usuarios link in sidenav', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const navLinks = el.querySelectorAll('mat-nav-list a');
    expect(navLinks.length).toBe(1);
    expect(navLinks[0].getAttribute('aria-label')).toBe('Usuarios');
  });

  it('should not show Tareas link in sidenav', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).not.toContain('Tareas');
  });

  it('should not show Tipos de tarea link in sidenav', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).not.toContain('Tipos de tarea');
  });
});
