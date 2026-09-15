import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form initially', () => {
    expect(component.loginForm.valid).toBeFalsy();
  });

  it('should require email', () => {
    const email = component.loginForm.get('email')!;
    expect(email.hasError('required')).toBeTruthy();
  });

  it('should require valid email format', () => {
    const email = component.loginForm.get('email')!;
    email.setValue('invalid-email');
    expect(email.hasError('email')).toBeTruthy();

    email.setValue('valid@email.com');
    expect(email.hasError('email')).toBeFalsy();
  });

  it('should require password', () => {
    const password = component.loginForm.get('password')!;
    expect(password.hasError('required')).toBeTruthy();
  });

  it('should mark form as touched on submit when invalid', () => {
    component.onSubmit();
    expect(component.loginForm.get('email')?.touched).toBeTruthy();
    expect(component.loginForm.get('password')?.touched).toBeTruthy();
  });

  it('should toggle password visibility', () => {
    expect(component.hidePassword()).toBeTruthy();
    component.hidePassword.set(false);
    expect(component.hidePassword()).toBeFalsy();
  });

  it('should have form valid with correct data', () => {
    component.loginForm.setValue({ email: 'admin@test.com', password: 'password123' });
    expect(component.loginForm.valid).toBeTruthy();
  });

  it('should have email input with autocomplete email', () => {
    const el: HTMLElement = fixture.nativeElement;
    const emailInput = el.querySelector('input[formcontrolname="email"]') as HTMLInputElement;
    expect(emailInput).toBeTruthy();
    expect(emailInput.getAttribute('autocomplete')).toBe('email');
  });

  it('should have password input with autocomplete current-password', () => {
    const el: HTMLElement = fixture.nativeElement;
    const passwordInput = el.querySelector('input[formcontrolname="password"]') as HTMLInputElement;
    expect(passwordInput).toBeTruthy();
    expect(passwordInput.getAttribute('autocomplete')).toBe('current-password');
  });

  it('should have role alert on error banner', async () => {
    component.errorMessage.set('Test error');
    fixture.detectChanges();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const alert = el.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
  });

  it('should disable submit button during loading', () => {
    component.loading.set(true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const button = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBeTruthy();
  });
});
