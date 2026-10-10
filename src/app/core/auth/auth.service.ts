import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of, firstValueFrom, switchMap, map, finalize, shareReplay } from 'rxjs';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { DemoPermissionsService } from './demo-permissions.service';
import {
  AdminLoginRequest,
  AdminLoginResponse,
  AdminRefreshResponse,
  AdminSession,
} from './auth.model';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private get apiUrl(): string {
    return `${this.runtimeConfig.apiUrl}/api/admin/auth`;
  }
  private get meUrl(): string { return `${this.runtimeConfig.apiUrl}/api/admin/me`; }

  private readonly _session = signal<AdminSession | null>(null);
  private readonly _initialized = signal(false);
  private initialization: Promise<void> | null = null;
  private identityRequestId = 0;
  private permissionLookup: { token: string; request: Observable<void> } | null = null;

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
    private runtimeConfig: RuntimeConfigService,
    private demoPermissions: DemoPermissionsService,
  ) {}

  initialize(): Promise<void> {
    if (this._initialized()) return Promise.resolve();
    if (this.initialization) return this.initialization;
    this.initialization = this.restoreSession().finally(() => { this.initialization = null; });
    return this.initialization;
  }

  private restoreSession(): Promise<void> {
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
    this.invalidateCapabilities();
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
        this._initialized.set(true);
      }),
      switchMap(response => this.revalidatePermissions().pipe(map(() => response))),
    );
  }

  refresh(): Observable<AdminRefreshResponse> {
    const currentRefresh = this._session()?.refreshToken;
    if (!currentRefresh) {
      return throwError(() => new Error('No refresh token available'));
    }

    this.invalidateCapabilities();
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
        switchMap(response => this.revalidatePermissions().pipe(map(() => response))),
      );
  }

  /** Revalidate capabilities while a private session is active. */
  revalidatePermissions(): Observable<void> {
    const token = this.getAccessToken();
    if (!token) {
      this.invalidateCapabilities();
      return of(undefined);
    }
    if (this.permissionLookup?.token === token) return this.permissionLookup.request;
    const request = this.loadCurrentPermissions().pipe(
      finalize(() => {
        if (this.permissionLookup?.request === request) this.permissionLookup = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.permissionLookup = { token, request };
    return request;
  }

  /** A failed identity lookup leaves sensitive capabilities unavailable. */
  private loadCurrentPermissions(): Observable<void> {
    const token = this.getAccessToken();
    const requestId = ++this.identityRequestId;
    return this.http.get<{ username: string; permissions: string[] }>(this.meUrl).pipe(
      tap(identity => {
        if (requestId !== this.identityRequestId || token !== this.getAccessToken()) return;
        if (identity?.username !== this._session()?.username || !Array.isArray(identity.permissions)) {
          this.demoPermissions.clear();
          return;
        }
        this.demoPermissions.setPermissions(identity.permissions);
      }),
      map(() => undefined),
      catchError(error => {
        if (requestId !== this.identityRequestId || token !== this.getAccessToken()) return of(undefined);
        this.demoPermissions.clear();
        if (error?.status === 401) {
          this.logout();
          return throwError(() => error);
        }
        return of(undefined);
      }),
    );
  }

  logout(): void {
    this.invalidateCapabilities();
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

  private invalidateCapabilities(): void {
    this.identityRequestId++;
    this.permissionLookup = null;
    this.demoPermissions.clear();
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
