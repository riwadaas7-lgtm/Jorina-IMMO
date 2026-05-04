import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-invitations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invitations.html',
  styleUrl: './invitations.css'
})
export class InvitationsComponent implements OnInit {

  user = JSON.parse(localStorage.getItem('user') || '{}');

  // Liste des appartements avec leurs codes
  apartments: any[] = [];
  loading = false;

  // Appartement sélectionné pour générer/modifier un code
  selectedApt: any = null;

  // Modal de confirmation de modification de code
  showConfirmModal = false;
  confirmApt: any  = null;

  // Messages de feedback
  successMsg = '';
  errorMsg   = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadApartments();
  }

  /**
   * Charge tous les appartements avec leurs codes actuels
   * et les infos du locataire associé
   */
  loadApartments() {
    this.loading = true;
    this.api.getInvitationCodes(this.user.id).subscribe({
      next: (res: any[]) => {
        this.apartments = res;
        this.loading    = false;
      },
      error: () => {
        this.loading  = false;
        this.errorMsg = 'Impossible de charger les appartements.';
      }
    });
  }

  /**
   * Génère un nouveau code pour un appartement.
   *
   * Si l'appartement est OCCUPÉ → affiche une confirmation d'abord
   * (car le locataire sera expulsé automatiquement)
   *
   * Si l'appartement est LIBRE → génère directement sans confirmation
   */
  onGenerateCode(apt: any) {
    if (apt.status === 'occupe') {
      // Demande confirmation car le locataire sera expulsé
      this.confirmApt       = apt;
      this.showConfirmModal = true;
    } else {
      // Appartement libre → génère directement
      this.generateCode(apt);
    }
  }

  /**
   * Confirmation : le propriétaire accepte d'expulser le locataire
   * et de générer un nouveau code
   */
  confirmGenerate() {
    this.showConfirmModal = false;
    if (this.confirmApt) {
      this.generateCode(this.confirmApt);
      this.confirmApt = null;
    }
  }

  /**
   * Appelle l'API pour générer le code.
   * Le backend :
   * 1. Expulse le locataire si présent (apartment_id = null)
   * 2. Marque l'appartement comme libre
   * 3. Génère le nouveau code (APT-XXXX)
   * 4. Envoie notification WebSocket au locataire expulsé
   */
  generateCode(apt: any) {
    this.api.generateInvitationCode(apt.id).subscribe({
      next: (res: any) => {
        this.successMsg = `✅ Code généré pour ${apt.nom} : ${res.code}`;
        setTimeout(() => this.successMsg = '', 4000);
        this.loadApartments(); // recharge pour voir la carte mise à jour
      },
      error: (err: any) => {
        this.errorMsg = err.error?.detail || 'Erreur lors de la génération du code.';
        setTimeout(() => this.errorMsg = '', 4000);
      }
    });
  }

  /**
   * Supprime le code d'un appartement.
   * L'appartement devient libre sans code.
   * Le locataire (s'il y en a un) est expulsé.
   */
  deleteCode(apt: any) {
    const msg = apt.tenant
      ? `Supprimer le code de ${apt.nom} ? Le locataire ${apt.tenant.prenom} ${apt.tenant.nom} sera expulsé.`
      : `Supprimer le code de ${apt.nom} ?`;

    if (!confirm(msg)) return;

    this.api.deleteInvitationCode(apt.id).subscribe({
      next: () => {
        this.successMsg = `✅ Code supprimé. L'appartement ${apt.nom} est maintenant libre.`;
        setTimeout(() => this.successMsg = '', 4000);
        this.loadApartments();
      },
      error: (err: any) => {
        this.errorMsg = err.error?.detail || 'Erreur lors de la suppression du code.';
        setTimeout(() => this.errorMsg = '', 4000);
      }
    });
  }

  /**
   * Copie le code dans le presse-papier
   */
  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.successMsg = '📋 Code copié !';
      setTimeout(() => this.successMsg = '', 2000);
    });
  }

  // Initiales pour l'avatar du locataire
  initials(tenant: any): string {
    return ((tenant.prenom?.charAt(0) || '') + (tenant.nom?.charAt(0) || '')).toUpperCase();
  }

  // Appartements avec un code généré (colonne droite)
  get aptsWithCode() {
    return this.apartments.filter(a => a.code);
  }

  // Appartements sans code (colonne gauche)
  get aptsWithoutCode() {
    return this.apartments.filter(a => !a.code);
  }
}