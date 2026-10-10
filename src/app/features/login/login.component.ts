import { Component, signal, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { AdminAuthService } from '../../core/auth/auth.service';
import { canOpenPrivateUrl, privateLanding } from '../../core/auth/capability.guard';
import { DemoPermissionsService } from '../../core/auth/demo-permissions.service';
import { adminErrorMessage } from '../../shared/admin-error-message';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements AfterViewInit {
  @ViewChild('emailInput') emailInput!: ElementRef<HTMLInputElement>;

  readonly loginForm;
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly hidePassword = signal(true);

  constructor(
    private fb: FormBuilder,
    private authService: AdminAuthService,
    private router: Router,
    private route: ActivatedRoute,
    private permissions: DemoPermissionsService,
  ) {
    this.loginForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.emailInput?.nativeElement?.focus(), 0);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        const requested = this.route.snapshot.queryParamMap.get('redirectUrl');
        const target = requested && canOpenPrivateUrl(requested, this.permissions) ? requested : privateLanding(this.permissions);
        this.router.navigateByUrl(target);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.status === 401
          ? 'Credenciales incorrectas o acceso no permitido.'
          : adminErrorMessage(error, 'No se pudo iniciar sesión. Inténtalo de nuevo más tarde.'));
      },
    });
  }
}
