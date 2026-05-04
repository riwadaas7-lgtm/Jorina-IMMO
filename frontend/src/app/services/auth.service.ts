import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private router: Router) {}

  //  Sauvegarde le token et l'utilisateur après connexion
  login(data: any): void {
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  //  Supprime tout et redirige vers login
  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  //  Vérifie si l'utilisateur est connecté (token présent)
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  //  Retourne les infos de l'utilisateur connecté
  getUser(): any {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }

  //  Met à jour les infos utilisateur dans le localStorage
  setUser(user: any): void {
    localStorage.setItem('user', JSON.stringify(user || {}));
  }

  //  Retourne le rôle : 'proprietaire' ou 'locataire'
  getRole(): string {
    return this.getUser()?.role || '';
  }

  isProprietaire(): boolean { return this.getRole() === 'proprietaire'; }
  isLocataire(): boolean    { return this.getRole() === 'locataire'; }

  //  Redirige vers la bonne page selon le rôle
  redirectAfterLogin(): void {
    if (this.isProprietaire()) {
      this.router.navigate(['/departments']);
    } else {
      this.router.navigate(['/my-apartment']);
    }
  }
}