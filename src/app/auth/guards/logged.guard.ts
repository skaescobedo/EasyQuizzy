// src/app/auth/authenticated.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export const loggedGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // 🔒 Si no está autenticado → redirigir al login
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/']);
  }

  // ✅ Si está autenticado → permitir acceso
  return true;
};