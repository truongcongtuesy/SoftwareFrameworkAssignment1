import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../services/users.service';

export const RoleGuard = (requiredRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const usersService = inject(UsersService);
    const router = inject(Router);

    const current = authService.getCurrentUser();
    if (!current) {
      router.navigate(['/login']);
      return false;
    }

    // Refresh user from server to reflect recent role changes,
    // then evaluate access based on up-to-date roles.
    return usersService.getUserById(current.id).pipe(
      tap((freshUser) => authService.setCurrentUser(freshUser)),
      map((freshUser) => requiredRoles.some((role) => (freshUser.roles || []).includes(role))),
      tap((allowed) => {
        if (!allowed) router.navigate(['/dashboard']);
      }),
      catchError(() => {
        router.navigate(['/login']);
        return of(false);
      })
    );
  };
};


