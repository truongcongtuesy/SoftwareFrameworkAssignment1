import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const RoleGuard = (requiredRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    const hasRole = requiredRoles.some(role => authService.hasRole(role));
    if (!hasRole) {
      router.navigate(['/dashboard']);
      return false;
    }

    return true;
  };
};


