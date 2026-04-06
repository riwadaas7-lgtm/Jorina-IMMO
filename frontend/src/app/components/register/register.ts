// register.ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {

  nom       = '';
  prenom    = '';
  email     = '';
  password  = '';
  telephone = '';
  cin       = '';
  role      = 'proprietaire';
  errorMsg  = '';
  loading   = false;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private route: ActivatedRoute
  ) {
    // Pre-select role if coming from landing page buttons
    this.route.queryParams.subscribe(params => {
      if (params['role']) this.role = params['role'];
    });
  }

  selectRole(r: string) {
    this.role = r;
    this.errorMsg = '';
  }

  register() {
  if (!this.nom || !this.prenom || !this.email || !this.password) {
    this.errorMsg = 'Veuillez remplir tous les champs obligatoires.';
    return;
  }

  this.loading  = true;
  this.errorMsg = '';

  this.api.register({
    nom: this.nom,
    prenom: this.prenom,
    email: this.email,
    password: this.password,
    telephone: this.telephone,
    cin: '',
    role: this.role
  }).subscribe({
    next: (res: any) => {
      localStorage.setItem('token', res.access_token);
      localStorage.setItem('user', JSON.stringify(res.user));
      this.auth.redirectAfterLogin();
    },
    error: (err) => {
      console.error('Register error:', err); // 👈 open browser console to see this
      this.errorMsg = err.error?.detail || 'Erreur lors de l\'inscription. Vérifiez que le serveur est démarré.';
      this.loading  = false;
    }
  });
  }}
