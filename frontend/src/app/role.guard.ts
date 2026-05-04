import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    // Each route declares which role is allowed via data: { role: '...' }
    const requiredRole = route.data['role'];
    const userRole = this.auth.getRole();

    if (requiredRole && userRole !== requiredRole) {
      // Wrong role :redirect to their own dashboard
      this.auth.redirectAfterLogin();
      return false;
    }

    return true;
  }
}
