import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const GuestGuard: CanActivateFn = () => {
  const token = localStorage.getItem('token');
  if (token) {
    // déjà connecté → pas besoin de login
    inject(Router).navigate(['/departments']);
    return false;
  }
  return true;
};



