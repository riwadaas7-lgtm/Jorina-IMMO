import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const AuthGuard: CanActivateFn = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    inject(Router).navigate(['/login']);
    return false;
  }

  return true;
};