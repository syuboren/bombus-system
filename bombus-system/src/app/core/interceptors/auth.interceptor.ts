import { HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';

/** 不需附加 Token 的路徑 */
const SKIP_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/platform-login'];

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

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

        // 平台管理員沒有 refresh token，直接登出
        if (!authService.getRefreshToken()) {
          isRefreshing = false;
          authService.logout();
          return throwError(() => error);
        }

        return authService.refreshToken().pipe(
          switchMap(newToken => {
            isRefreshing = false;
            if (newToken) {
              return next(addToken(req, newToken));
            }
            // Refresh 失敗，登出（清除 session + 導向登入頁）
            authService.logout();
            return throwError(() => error);
          }),
          catchError(refreshErr => {
            isRefreshing = false;
            authService.logout();
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
