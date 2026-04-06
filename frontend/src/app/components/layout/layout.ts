// layout.ts
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent {
  showAccountMenu = false;
  showProfileModal = false;
  savingProfile = false;
  profileError = '';
  profileForm = {
    nom: '',
    prenom: '',
    email: '',
    telephone: ''
  };

  get user()        { return this.auth.getUser(); }
  get isOwner()     { return this.auth.isProprietaire(); }
  get isLocataire() { return this.auth.isLocataire(); }

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  toggleAccountMenu() {
    this.showAccountMenu = !this.showAccountMenu;
  }

  openProfileEditor() {
    const u = this.user || {};
    this.profileForm = {
      nom: u.nom || '',
      prenom: u.prenom || '',
      email: u.email || '',
      telephone: u.telephone || ''
    };
    this.profileError = '';
    this.showAccountMenu = false;
    this.showProfileModal = true;
  }

  closeProfileEditor() {
    this.showProfileModal = false;
    this.profileError = '';
  }

  saveProfile() {
    if (!this.user?.id) return;
    if (!this.profileForm.nom || !this.profileForm.prenom || !this.profileForm.email) {
      this.profileError = 'Nom, prenom et email sont obligatoires.';
      return;
    }
    this.savingProfile = true;
    this.profileError = '';
    this.api.updateUser(this.user.id, this.profileForm).subscribe({
      next: (updated: any) => {
        const merged = { ...this.user, ...updated };
        this.auth.setUser(merged);
        this.savingProfile = false;
        this.showProfileModal = false;
      },
      error: (err) => {
        this.savingProfile = false;
        this.profileError = err?.error?.detail || 'Impossible de modifier le profil.';
      }
    });
  }

  logout() {
    this.auth.logout(); // clears localStorage + redirects to /login
  }
}
