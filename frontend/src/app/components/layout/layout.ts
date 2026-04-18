import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent {

  // ✅ Getters — lisent directement depuis AuthService
  get user()        { return this.auth.getUser(); }
  get isOwner()     { return this.auth.isProprietaire(); }
  get isLocataire() { return this.auth.isLocataire(); }

  // ✅ État du menu compte et modal profil
  showAccountMenu  = false;
  showProfileModal = false;
  savingProfile    = false;
  profileError     = '';

  profileForm = { nom: '', prenom: '', email: '', telephone: '' };

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  // ✅ Clic sur la cloche → navigue vers la bonne page notifications
  goToNotifications() {
    if (this.isOwner) {
      this.router.navigate(['/notifications']);
    } else {
      this.router.navigate(['/my-notifications']);
    }
  }

  // ✅ Ouvre/ferme le menu avatar
  toggleAccountMenu() {
    this.showAccountMenu = !this.showAccountMenu;
  }

  // ✅ Ouvre le modal de modification de profil
  openProfileEditor() {
    const u = this.user || {};
    this.profileForm = {
      nom:       u.nom       || '',
      prenom:    u.prenom    || '',
      email:     u.email     || '',
      telephone: u.telephone || ''
    };
    this.profileError    = '';
    this.showAccountMenu = false;
    this.showProfileModal = true;
  }

  closeProfileEditor() {
    this.showProfileModal = false;
    this.profileError     = '';
  }

  // ✅ Sauvegarde le profil modifié
  saveProfile() {
    if (!this.user?.id) return;

    if (!this.profileForm.nom || !this.profileForm.prenom || !this.profileForm.email) {
      this.profileError = 'Nom, prénom et email sont obligatoires.';
      return;
    }

    this.savingProfile = true;
    this.profileError  = '';

    this.api.updateUser(this.user.id, this.profileForm).subscribe({
      next: (updated: any) => {
        this.auth.setUser({ ...this.user, ...updated });
        this.savingProfile    = false;
        this.showProfileModal = false;
      },
      error: (err) => {
        this.savingProfile = false;
        this.profileError  = err?.error?.detail || 'Impossible de modifier le profil.';
      }
    });
  }

  // ✅ Déconnexion
  logout() {
    this.auth.logout();
  }
}