import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const AuthGuard: CanActivateFn = () => {

  const token = localStorage.getItem('token'); // cherche le token

  if (!token) {
    // Pas de token = pas connecté → redirige vers login
    inject(Router).navigate(['/login']);
    return false;
  }

  return true; // token présent = accès autorisé
};