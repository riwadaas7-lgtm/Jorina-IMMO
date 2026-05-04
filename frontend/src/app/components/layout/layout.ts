import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent implements OnInit, OnDestroy {

  get user()        { return this.auth.getUser(); }
  get isOwner()     { return this.auth.isProprietaire(); }
  get isLocataire() { return this.auth.isLocataire(); }

  showAccountMenu   = false;
  showProfileModal  = false;
  savingProfile     = false;
  profileError      = '';

  // ✅ Compteur de notifications non lues (affiché sur la cloche)
  unreadNotifCount  = 0;
  unreadChatCount = 0;

  // ✅ Abonnement WebSocket (on doit le garder pour le désabonner au logout)
  private wsSub: Subscription | null = null;

  profileForm = { nom: '', prenom: '', email: '', telephone: '' };

  constructor(
    private auth:   AuthService,
    private api:    ApiService,
    private router: Router,
    private ws:     WebSocketService   // ✅ injection du service WebSocket
  ) {}

  ngOnInit() {
    /**
     * Connexion WebSocket au démarrage du layout
     *
     * OnInit = appelé quand le composant est créé
     * Le layout est le composant parent de toutes les pages protégées
     * Donc dès qu'on est connecté, le WebSocket s'ouvre
     *
     * this.user.id = ID de l'utilisateur connecté (lu depuis localStorage)
     */
    if (this.user?.id) {
      this.ws.connect(this.user.id);

      /**
       * S'abonne aux messages WebSocket entrants
       *
       * ws.messages$ = Observable — émet chaque fois qu'un message arrive
       * .subscribe() = écoute cet Observable
       *
       * Chaque message a un "type" :
       * - "notification" → incrémenter le compteur + afficher
       * - "chat"         → géré dans le composant chat
       */
      this.wsSub = this.ws.messages$.subscribe((msg: any) => {
  if (msg.type === 'notification') {
    this.unreadNotifCount++;

    // Save to storage so notifications page shows them even after navigation
    const storageKey = this.isOwner
      ? 'notifications_proprietaire'
      : 'notifications_locataire';

    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.unshift({
        type:        msg.notif_type || 'info',
        title:       msg.title      || 'Notification',
        description: msg.content    || '',
        time:        msg.time       || 'À l\'instant',
        read:        false
      });
      localStorage.setItem(storageKey, JSON.stringify(existing));
    } catch {}
  }
  if (msg.type === 'chat' && !msg.is_mine) {
    this.unreadChatCount++;
  }
});
    }
  }

  /**
   * ngOnDestroy — appelé quand le composant est détruit (logout)
   * IMPORTANT : toujours se désabonner pour éviter les fuites mémoire
   */
  ngOnDestroy() {
    if (this.wsSub) {
      this.wsSub.unsubscribe();  // arrête d'écouter les messages
    }
  }

  // Clic sur la cloche → navigue vers notifications + remet le compteur à 0
  goToNotifications() {
    this.unreadNotifCount = 0;  // reset le badge
    if (this.isOwner) {
      this.router.navigate(['/notifications']);
    } else {
      this.router.navigate(['/my-notifications']);
    }
  }
  goToChat() {
  this.unreadChatCount = 0;
  this.router.navigate(['/chat']);
}

  toggleAccountMenu() {
    this.showAccountMenu = !this.showAccountMenu;
  }

  openProfileEditor() {
    const u = this.user || {};
    this.profileForm = {
      nom:       u.nom       || '',
      prenom:    u.prenom    || '',
      email:     u.email     || '',
      telephone: u.telephone || ''
    };
    this.profileError     = '';
    this.showAccountMenu  = false;
    this.showProfileModal = true;
  }

  closeProfileEditor() {
    this.showProfileModal = false;
    this.profileError     = '';
  }

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

  logout() {
    this.ws.disconnect();  // ✅ ferme le WebSocket proprement avant de partir
    this.auth.logout();
  }
}