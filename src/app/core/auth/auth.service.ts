import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminLoginRequest,
  AdminLoginResponse,
  AdminRefreshResponse,
  AdminSession,
} from './auth.model';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly apiUrl = `${environment.apiUrl}/api/admin/auth`;

  private readonly _session = signal<AdminSession | null>(null);
  private readonly _initialized = signal(false);

  readonly initialized = this._initialized.asReadonly();
  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed(() => {
    const s = this._session();
    return s !== null && s.accessToken !== '';
  });
  readonly currentUser = computed(() => {
    const s = this._session();
    return s ? { id: s.id, username: s.username, email: s.email } : null;
  });

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  initialize(): Promise<void> {
    const stored = sessionStorage.getItem('admin_session');
    if (!stored) {
      this._initialized.set(true);
      return Promise.resolve();
    }

    try {
      const data = JSON.parse(stored) as {
        id: number;
        username: string;
        email: string;
        refreshToken: string;
      };
      this._session.set({
        id: data.id,
        username: data.username,
        email: data.email,
        accessToken: '',
        refreshToken: data.refreshToken,
      });
    } catch {
      this.clearPersistedSession();
      this._initialized.set(true);
      return Promise.resolve();
    }

    return firstValueFrom(
      this.refresh().pipe(
        catchError(() => {
          this._session.set(null);
          this.clearPersistedSession();
          return of(null);
        }),
      ),
    ).then(() => {
      this._initialized.set(true);
    });
  }

  login(credentials: AdminLoginRequest): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        this._session.set({
          id: response.id,
          username: response.username,
          email: response.email,
          accessToken: response.token,
          refreshToken: response.refreshToken,
        });
        this.persistSession();
      }),
    );
  }

  refresh(): Observable<AdminRefreshResponse> {
    const currentRefresh = this._session()?.refreshToken;
    if (!currentRefresh) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<AdminRefreshResponse>(`${this.apiUrl}/refresh`, {
        refreshToken: currentRefresh,
      })
      .pipe(
        tap((response) => {
          const current = this._session();
          if (current) {
            this._session.set({
              ...current,
              accessToken: response.token,
              refreshToken: response.refreshToken,
            });
            this.persistSession();
          }
        }),
      );
  }

  logout(): void {
    const currentRefresh = this._session()?.refreshToken;
    if (currentRefresh) {
      this.http
        .post(`${this.apiUrl}/logout`, { refreshToken: currentRefresh })
        .subscribe({ error: () => {} });
    }
    this._session.set(null);
    this.clearPersistedSession();
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return this._session()?.accessToken ?? null;
  }

  private persistSession(): void {
    const session = this._session();
    if (session) {
      sessionStorage.setItem(
        'admin_session',
        JSON.stringify({
          id: session.id,
          username: session.username,
          email: session.email,
          refreshToken: session.refreshToken,
        }),
      );
    }
  }

  private clearPersistedSession(): void {
    sessionStorage.removeItem('admin_session');
  }
}
