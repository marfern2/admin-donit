import { HttpInterceptorFn, HttpEvent, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import {
  switchMap,
  catchError,
  throwError,
  Observable,
  map,
  take,
  finalize,
  shareReplay,
} from 'rxjs';
import { AdminAuthService } from './auth.service';

let isRefreshing = false;
let refreshToken$: Observable<string> | null = null;

function addAuthHeader(
  req: HttpRequest<unknown>,
  token: string,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(authReq);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AdminAuthService);

  if (!req.url.includes('/api/admin/')) {
    return next(req);
  }

  if (
    req.url.includes('/api/admin/auth/login') ||
    req.url.includes('/api/admin/auth/refresh') ||
    req.url.includes('/api/admin/auth/logout')
  ) {
    return next(req);
  }

  const token = authService.getAccessToken();

  if (!token) {
    return next(req);
  }

  return addAuthHeader(req, token, next).pipe(
    catchError((error) => {
      if (error.status === 401) {
        return handle401Error(authService, req, next);
      }
      return throwError(() => error);
    }),
  );
};

function handle401Error(
  authService: AdminAuthService,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshToken$ = authService.refresh().pipe(
      map(() => authService.getAccessToken()!),
      catchError((err) => {
        refreshToken$ = null;
        isRefreshing = false;
        authService.logout();
        return throwError(() => err);
      }),
      finalize(() => {
        isRefreshing = false;
      }),
      shareReplay(1),
    );
  }

  return refreshToken$!.pipe(
    take(1),
    switchMap((token: string) => addAuthHeader(req, token, next)),
  );
}
