// src/app/auth/auth.interceptor.ts
import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpErrorResponse
} from '@angular/common/http';
import { from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);

  const excludedUrls = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/verify-email', '/auth/forgot-password', '/auth/reset-password'];
  if (excludedUrls.some(url => request.url.includes(url))) {
    return next(request); // sin token ni retry
  }

  return from(auth.getAccessToken()!).pipe(
    switchMap((access) => {

      if (access) {
        request = request.clone({
          setHeaders: { Authorization: `Bearer ${access}` }
        });
      }

      return next(request).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) {
            // 🔄 Intentamos refresh
            return auth.refreshToken().pipe(
              switchMap((res) => {
                const retryReq = request.clone({
                  setHeaders: { Authorization: `Bearer ${res.access_token}` }
                });
                return next(retryReq);
              }),
              catchError(() => {
                auth.clearSession();
                return throwError(() => err);
              })
            );
          }
          return throwError(() => err);
        })
      );
    })
  );
};
