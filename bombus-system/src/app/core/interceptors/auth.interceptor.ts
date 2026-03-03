import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';

/** 不需附加 Token 的路徑 */
const SKIP_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/platform-login'];

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 跳過不需認證的路徑
  if (SKIP_PATHS.some(path => req.url.includes(path))) {
    return next(req);
  }

  // 附加 Authorization Header
  const token = authService.getAccessToken();
  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isRefreshing) {
        isRefreshing = true;

        return authService.refreshToken().pipe(
          switchMap(newToken => {
            isRefreshing = false;
            if (newToken) {
              return next(addToken(req, newToken));
            }
            // Refresh 失敗，導向登入頁
            router.navigate(['/login']);
            return throwError(() => error);
          }),
          catchError(refreshErr => {
            isRefreshing = false;
            router.navigate(['/login']);
            return throwError(() => refreshErr);
          })
        );
      }

      return throwError(() => error);
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
}
