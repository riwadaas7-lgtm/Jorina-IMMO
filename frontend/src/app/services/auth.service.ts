// auth.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private router: Router) {}

  login(data: any): void {
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getUser(): any {
    return JSON.parse(localStorage.getItem('user') || '{}');
  }

  getRole(): string {
    return this.getUser()?.role || '';
  }

  isProprietaire(): boolean {
    return this.getRole() === 'proprietaire';
  }

  isLocataire(): boolean {
    return this.getRole() === 'locataire';
  }

  redirectAfterLogin(): void {
    if (this.isProprietaire()) {
      this.router.navigate(['/app/departments']);
    } else {
      this.router.navigate(['/app/my-apartment']);
    }
  }
}