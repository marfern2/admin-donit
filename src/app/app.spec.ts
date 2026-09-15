import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import { AdminAuthService } from './core/auth/auth.service';

describe('App', () => {
  let authService: { initialized: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      initialized: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdminAuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should show bootstrap loading screen when not initialized', () => {
    authService.initialized.mockReturnValue(false);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.bootstrap-screen')).toBeTruthy();
    expect(el.querySelector('.bootstrap-brand')?.textContent).toContain('Donit Admin');
  });

  it('should show router outlet when initialized', () => {
    authService.initialized.mockReturnValue(true);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('router-outlet')).toBeTruthy();
    expect(el.querySelector('.bootstrap-screen')).toBeFalsy();
  });
});
