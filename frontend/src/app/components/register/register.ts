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
  role      = 'proprietaire';
  errorMsg  = '';
  loading   = false;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private route: ActivatedRoute
  ) {
    // Si on arrive depuis le landing page avec ?role=locataire
    this.route.queryParams.subscribe(params => {
      if (params['role']) this.role = params['role'];
    });
  }

  //  Change le role selectionne
  selectRole(r: string) {
    this.role     = r;
    this.errorMsg = '';
  }

  register() {
    // Verification des champs obligatoires
    if (!this.nom || !this.prenom || !this.email || !this.password) {
      this.errorMsg = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    this.loading  = true;
    this.errorMsg = '';

    // Appel API → POST /register
    this.api.register({
      nom:       this.nom,
      prenom:    this.prenom,
      email:     this.email,
      password:  this.password,
      telephone: this.telephone,
      cin:       '',
      role:      this.role
    }).subscribe({
      next: (res: any) => {
        this.auth.login(res);           // sauvegarde token + user
        this.auth.redirectAfterLogin(); // redirige selon le role
      },
      error: (err) => {
        this.errorMsg = err.error?.detail || 'Erreur lors de l\'inscription.';
        this.loading  = false;
      }
    });
  }
}