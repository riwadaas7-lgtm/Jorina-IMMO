import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',//esm el balise html <app-login>
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  // CommonModule : *ngIf, *ngFor
  // FormsModule  : [(ngModel)]
  // RouterModule : routerLink
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  email    = '';
  password = '';
  role     = 'proprietaire'; // role selectionne par defaut
  
  errorMsg = '';
  loading  = false;

  constructor(private api: ApiService, private auth: AuthService) {}

  login() {
    // Verification des champs
    if (!this.email || !this.password) {
      this.errorMsg = 'Veuillez remplir tous les champs.';
      return;
    }

    this.loading  = true;
    this.errorMsg = '';

    // Appel API → POST /login
    this.api.login({ email: this.email, password: this.password, role: this.role })
      .subscribe({
        next: (res: any) => {
          this.auth.login(res);           // sauvegarde token + user
          this.auth.redirectAfterLogin(); // redirige selon le role
        },
        error: (err) => {
          this.errorMsg = err.error?.detail || 'Erreur de connexion.';
          this.loading  = false;
        }
      });
  }
}