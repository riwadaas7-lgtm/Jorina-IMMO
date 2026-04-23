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

  factures:   any[] = [];
  activeTab   = 'toutes';

  searchTerm  = '';

  user = JSON.parse(localStorage.getItem('user') || '{}');
  apartments: any[] = [];
  contracts: any[] = [];
  showAddModal = false;
    addForm = {
    apartment_id: '',
    contract_id: '',
    type: 'eau',
    customType: '',
    montant: 0,
    periode_start: '',
    periode_end: '',
    date_delai: ''
  };

  get noApartments() {
    return this.apartments.length === 0;
  }

  constructor(private api: ApiService, private auth: AuthService) {}



  ngOnInit() { 
    console.log('Factures loaded');
    this.load(); 
    this.loadApartments(); 
  }



  load() {
    this.api.getFactures().subscribe(res => this.factures = res);
  }

  loadApartments() {
    console.log('Loading apartments for user:', this.user);
    if (this.auth.isProprietaire()) {
      this.api.getAllApartments().subscribe({
        next: (res) => { 
          console.log('All apartments loaded:', res); 
          this.apartments = res; 
        },
        error: (err) => {
          console.error('Failed to load all apartments:', err);
          this.apartments = [];
        }
      });
    } else {
      this.api.getApartments(this.user.id).subscribe({
        next: (res) => { 
          console.log('User apartments loaded:', res); 
          this.apartments = res; 
        },
        error: (err) => {
          console.error('Failed to load user apartments:', err);
          this.apartments = [];
        }
      });
    }
  }


  countByStatus(s: string) {
    return this.factures.filter(f => f.status === s).length;
  }

  totalMontant() {
    return this.factures.reduce((sum, f) => sum + (f.montant || 0), 0);
  }

  statusLabel(s: string) {
    const map: any = {
      en_attente: 'En attente',
      payee:      'Payée',
      en_retard:  'En retard'
    };
    return map[s] || s;
  }

  typeIcon(t: string) {
    const map: any = { loyer: '🏠', electricite: '💡', eau: '💧', autre: '📄' };
    return map[t] || '📄';
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

  onApartmentChange() {
    console.log('Apartment changed:', this.addForm.apartment_id);
    if (!this.addForm.apartment_id) {
      this.contracts = [];
      this.addForm.contract_id = '';
      return;
    }
    this.api.getContracts().subscribe({
      next: (res) => {
        console.log('All contracts loaded:', res);
        this.contracts = res.filter((c: any) => c.apartment_id == this.addForm.apartment_id);
        this.addForm.contract_id = this.contracts.length > 0 ? this.contracts[0].id.toString() : '';
        console.log('Filtered contracts:', this.contracts);
      },
      error: (err) => {
        console.error('Failed to load contracts:', err);
        this.contracts = [];
        this.addForm.contract_id = '';
      }
    });
  }

  resetAddForm() {
    this.addForm = {
      apartment_id: '',
      contract_id: '',
      type: 'eau',
      customType: '',
      montant: 0,
      periode_start: '',
      periode_end: '',
      date_delai: ''
    };
    this.contracts = [];
  }

  openAddModal() {
    console.log('Open add modal clicked');
    this.resetAddForm();
    this.showAddModal = true;
  }

  addFacture() {
    console.log('addFacture called', this.addForm);
    const type = this.addForm.type === 'autre' ? this.addForm.customType : this.addForm.type;
    if (this.apartments.length === 0) {
      alert("Ajoutez d'abord un appartement via l'onglet Appartements.");
      return;
    }
    if (!this.addForm.contract_id || !this.addForm.montant || !type || !this.addForm.periode_start || !this.addForm.periode_end || !this.addForm.date_delai) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    const data = {
      type,
      montant: this.addForm.montant,
      date_facture: new Date().toISOString().split('T')[0],
      periode_start: this.addForm.periode_start,
      periode_end: this.addForm.periode_end,
      date_delai: this.addForm.date_delai,
      contract_id: parseInt(this.addForm.contract_id)
    };
    this.api.addFacture(data).subscribe({
      next: () => {
        this.load();
        this.showAddModal = false;
        this.resetAddForm();
      },
      error: (err) => alert('Erreur : ' + (err.error?.detail || err.message))
    });
  }

  updateStatus(id: number, status: string) {
    if (!confirm('Changer le statut à ' + this.statusLabel(status) + ' ?')) return;
    this.api.updateFactureStatus(id, status).subscribe({
      next: () => this.load(),
      error: (err) => alert('Erreur : ' + (err.error?.detail || err.message))
    });
  }

  delete(id: number) {
    if (!confirm('Supprimer cette facture ?')) return;
    this.api.deleteFacture(id).subscribe(() => this.load());
  }

}