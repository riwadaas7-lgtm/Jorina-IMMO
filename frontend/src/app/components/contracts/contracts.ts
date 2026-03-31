import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contracts.html',
  styleUrl: './contracts.css'
})
export class ContractsComponent implements OnInit {

  contracts:  any[] = [];
  tenants:    any[] = [];
  apartments: any[] = [];

  showAddModal   = false;
  viewingContract: any = null;
  activeTab      = 'tous';
  searchTerm     = '';

  form = {
    tenant_id:    '',
    apartment_id: '',
    date_debut:   '',
    date_fin:     '',
    montant_total: 0,
    caution:       0
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadContracts();

    // load tenants & apartments for the add modal
    this.api.getUsers().subscribe((res: any[]) => {
      this.tenants = res.filter(u => u.role === 'locataire');
    });
    this.api.getApartments(
      JSON.parse(localStorage.getItem('user') || '{}').id
    ).subscribe(res => this.apartments = res);
  }

  loadContracts() {
    this.api.getContracts().subscribe((res: any[]) => {
      this.contracts = res.map(c => ({
        ...c,
        status: this.computeStatus(c)
      }));
    });
  }

  // Compute status from dates if not set
  computeStatus(c: any): string {
    if (c.status && c.status !== 'actif') return c.status;
    const now   = new Date();
    const end   = new Date(c.date_fin);
    const diff  = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0)  return 'expire';
    if (diff < 60) return 'renouveler';
    return 'actif';
  }

  statusLabel(s: string) {
    const map: any = {
      actif:      'Actif',
      renouveler: 'À renouveler',
      expire:     'Expiré',
      resilie:    'Résilié'
    };
    return map[s] || s;
  }

  countByStatus(s: string) {
    return this.contracts.filter(c => c.status === s).length;
  }

  filtered() {
    return this.contracts.filter(c => {
      const matchTab    = this.activeTab === 'tous' || c.status === this.activeTab;
      const term        = this.searchTerm.toLowerCase();
      const matchSearch = !term ||
        c.tenant_name?.toLowerCase().includes(term) ||
        c.apartment_name?.toLowerCase().includes(term);
      return matchTab && matchSearch;
    });
  }

  add() {
    if (!this.form.tenant_id || !this.form.apartment_id ||
        !this.form.date_debut || !this.form.date_fin) return;

    this.api.addContract(this.form).subscribe(() => {
      this.showAddModal = false;
      this.resetForm();
      this.loadContracts();
    });
  }

  delete(id: number) {
    if (!confirm('Supprimer ce contrat ?')) return;
    this.api.deleteContract(id).subscribe(() => this.loadContracts());
  }

  viewContract(c: any) {
    this.viewingContract = c;
  }

  resetForm() {
    this.form = {
      tenant_id: '', apartment_id: '',
      date_debut: '', date_fin: '',
      montant_total: 0, caution: 0
    };
  }
}