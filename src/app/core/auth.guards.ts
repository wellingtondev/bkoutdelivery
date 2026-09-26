import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from './auth.service';

const roleGuard = (allowed:UserRole[]):CanActivateFn => async () => {
  const auth = inject(AuthService); const router=inject(Router);
  await auth.ready();
  if(!auth.user) return router.createUrlTree(['/login']);
  if(!auth.role || !allowed.includes(auth.role)) return router.createUrlTree([auth.role === 'DRIVER' ? '/entregador' : '/loja']);
  return true;
};
export const storeGuard = roleGuard(['STORE']);
export const driverGuard = roleGuard(['DRIVER']);
