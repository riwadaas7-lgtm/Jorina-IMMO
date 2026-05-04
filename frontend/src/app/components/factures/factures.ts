import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-factures',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './factures.html',
  styleUrl: './factures.css'
})
export class FacturesComponent implements OnInit {

  user        = JSON.parse(localStorage.getItem('user') || '{}');
  factures:   any[] = [];
  contracts:  any[] = [];   // ✅ seulement les contrats — plus de liste d'appartements
  activeTab   = 'toutes';
  searchTerm  = '';
  showAddModal = false;

  /**
   * FORMULAIRE SIMPLIFIÉ
   *
   * AVANT : il fallait choisir un appartement → puis un contrat
   * APRÈS : on choisit directement le contrat
   *
   * Pourquoi ? La table factures est reliée à contracts (contract_id)
   * Le contrat contient déjà l'appartement ET le locataire
   * Donc inutile de sélectionner l'appartement séparément
   */
  addForm = {
    contract_id:          '',    // ← le seul lien nécessaire
    type:                 'loyer',
    customType:           '',
    montant:              0,
    periode_debut: '',   // ← replaces periode_consommation
    periode_fin:   '',   // ex: "01/03/2026 → 31/03/2026"
    date_delai:  ''
  };

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.getFactures(this.user.id).subscribe({
      next: res  => this.factures = res,
      error: ()  => this.factures = []
    });
  }

  /**
   * Charge les contrats pour le select du modal
   * Appelé quand on ouvre le modal
   */
  loadContracts() {
  this.api.getContracts(this.user.id).subscribe({
    next: res => {
      // Only show active contracts in the facture modal
      this.contracts = res.filter((c: any) =>
        c.status === 'actif' || c.status === 'renouveler'
      );
    },
    error: () => this.contracts = []
  });
}

  openAddModal() {
    this.resetForm();
    this.showAddModal = true;
    this.loadContracts();  // ← charge seulement les contrats
  }

  addFacture() {
    const type = this.addForm.type === 'autre' ? this.addForm.customType : this.addForm.type;

    if (!this.addForm.contract_id) {
      alert('Veuillez sélectionner un contrat.');
      return;
    }
    if (!this.addForm.montant || this.addForm.montant <= 0) {
      alert('Veuillez entrer un montant valide.');
      return;
    }
    if (!type) {
      alert('Veuillez préciser le type de facture.');
      return;
    }
    if (!this.addForm.date_delai) {
      alert('Veuillez entrer une date délai de paiement.');
      return;
    }

    const data = {
      type,
      montant:              this.addForm.montant,
      date_facture:         new Date().toISOString().split('T')[0],
      periode_consommation: this.addForm.periode_debut && this.addForm.periode_fin
        ? `${this.addForm.periode_debut} → ${this.addForm.periode_fin}`
        : '',
      date_delai:           this.addForm.date_delai,
      contract_id:          parseInt(this.addForm.contract_id)
    };

    this.api.addFacture(data).subscribe({
      next: () => {
        this.load();
        this.showAddModal = false;
        this.resetForm();
      },
      error: (err) => alert('Erreur : ' + (err.error?.detail || err.message))
    });
  }

  resetForm() {
    this.addForm = {
      contract_id:          '',
      type:                 'loyer',
      customType:           '',
      montant:              0,
      periode_debut: '', periode_fin: '',
      date_delai:           ''
    };
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  countByStatus(s: string) {
    return this.factures.filter(f => f.status === s).length;
  }

  totalMontant() {
    return this.factures.reduce((sum, f) => sum + (f.montant || 0), 0);
  }

  statusLabel(s: string) {
    const map: any = { en_attente: 'En attente', payee: 'Payée', en_retard: 'En retard' };
    return map[s] || s;
  }

  typeIcon(t: string) {
    const map: any = { loyer: '🏠', electricite: '💡', eau: '💧', charges: '🔧', autre: '📄' };
    return map[t?.toLowerCase()] || '📄';
  }

  /**
   * Affiche le label du contrat dans le select
   * Ex: "Marie Dupont — Apt A101 (1200 DT/mois)"
   */
  contractLabel(c: any): string {
    const tenant = c.tenant_name || `Locataire #${c.tenant_id}`;
    const apt    = c.apartment_name || `Apt #${c.apartment_id}`;
    return `${tenant} — ${apt} (${c.montant_total} DT/mois)`;
  }

  filtered() {
    return this.factures.filter(f => {
      const matchTab    = this.activeTab === 'toutes' || f.status === this.activeTab;
      const term        = this.searchTerm.toLowerCase();
      const matchSearch = !term ||
        f.tenant_name?.toLowerCase().includes(term) ||
        f.apartment_name?.toLowerCase().includes(term);
      return matchTab && matchSearch;
    });
  }

  updateStatus(id: number, status: string) {
    if (!confirm(`Changer le statut à "${this.statusLabel(status)}" ?`)) return;
    this.api.updateFactureStatus(id, status).subscribe({
      next:  () => this.load(),
      error: (err) => alert('Erreur : ' + (err.error?.detail || err.message))
    });
  }

  delete(id: number) {
    if (!confirm('Supprimer cette facture ?')) return;
    this.api.deleteFacture(id).subscribe(() => this.load());
  }
}
