import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  email    = '';
  password = '';
  role     = 'proprietaire';
  errorMsg = '';
  loading  = false;

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  login() {
    if (!this.email || !this.password) {
      this.errorMsg = 'Veuillez remplir tous les champs.';
      return;
    }

    this.loading  = true;
    this.errorMsg = '';

    this.api.login({ email: this.email, password: this.password, role: this.role })
      .subscribe({
        next: (res: any) => {
          this.auth.login(res);
          this.auth.redirectAfterLogin();
        },
        error: (err) => {
          this.errorMsg = err.error?.detail || 'Erreur de connexion.';
          this.loading  = false;
        }
      });
  }
}
