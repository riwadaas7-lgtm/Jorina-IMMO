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
  user       = JSON.parse(localStorage.getItem('user') || '{}');
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
    caution:       0,
    contract_file: ''
  };
  showEditModal  = false;
  showRenewModal    = false;
  renewingContract: any = null;
  renewForm = { date_fin: '' };

  showTerminateConfirm = false;
  terminatingContract: any = null;
  editingContract: any = null;
  editForm = {
    tenant_id:    '',
    apartment_id: '',
    date_debut:   '',
    date_fin:     '',
    montant_total: 0,
    caution:       0,
    contract_file: ''
  };
  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadContracts();

    // load tenants & apartments for the add modal
    this.api.getUsers(this.user.id).subscribe((res: any[]) => {
      this.tenants = res.filter(u => u.role === 'locataire');
    });
    this.api.getApartments(this.user.id).subscribe(res => {
    this.apartments = res;
  });
  }

  loadContracts() {
  this.api.getContracts(this.user.id).subscribe((res: any[]) => {
    console.log('RAW contract from backend:', JSON.stringify(res[0]));
    this.contracts = res.map(c => {
      const computed = c.status || this.computeStatus(c);
      return {
        id:             c.id,
        tenant_id:      c.tenant_id,
        apartment_id:   c.apartment_id,
        tenant_name:    c.tenant_name,
        apartment_name: c.apartment_name,
        date_debut:     c.date_debut,
        date_fin:       c.date_fin,
        montant_total:  c.montant_total,
        caution:        c.caution,
        contract_file:  c.contract_file,
        status:         computed
      };
    });
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
      termine:    'Terminé',
      resilie:    'Résilié'
    };
    return map[s] || s;
  }

  countByStatus(s: string) {
    if (s === 'renouveler')
      return this.contracts.filter(c => c.status === 'renouveler' || c.status === 'expire').length;
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

  onSelectContractFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.api.uploadImage(file).subscribe((res) => {
      this.form.contract_file = res.url;
    });
  }

  delete(id: number) {
    const c = this.contracts.find(x => x.id === id);
    if (c && ['actif', 'renouveler'].includes(c.status)) {
      alert('Impossible de supprimer un contrat actif. Terminez-le d\'abord.');
      return;
    }
    if (!confirm('Supprimer ce contrat définitivement ?')) return;
    this.api.deleteContract(id).subscribe(() => this.loadContracts());
  }

  viewContract(c: any) {
    this.viewingContract = c;
  }

  resetForm() {
    this.form = {
      tenant_id: '', apartment_id: '',
      date_debut: '', date_fin: '',
      montant_total: 0, caution: 0,
      contract_file: ''
    };
  }
  openEdit(c: any) {
  this.editingContract = c;
  this.editForm = {
    tenant_id:    String(c.tenant_id),
    apartment_id: String(c.apartment_id),
    date_debut:   c.date_debut,
    date_fin:     c.date_fin,
    montant_total: c.montant_total,
    caution:       c.caution,
    contract_file: c.contract_file || ''
  };
  this.showEditModal = true;
}

saveEdit() {
  if (!this.editingContract) return;
  this.api.updateContract(this.editingContract.id, this.editForm).subscribe({
    next: () => {
      this.showEditModal = false;
      this.editingContract = null;
      this.loadContracts();
      // WS notification is sent by backend automatically
    },
    error: (err: any) => alert(err.error?.detail || 'Erreur modification')
  });
}
  openRenew(c: any) {
    console.log('Contract object:', c);
    if (c.status === 'termine') {
      alert('Impossible de renouveler un contrat terminé.');
      return;
    }
    this.renewingContract = c;
    this.renewForm.date_fin = '';
    this.showRenewModal = true;
}

saveRenew() {
  if (!this.renewForm.date_fin) {
    alert('Veuillez choisir une nouvelle date de fin.');
    return;
  }
  if (!this.renewingContract?.id) {
    alert('Erreur : contrat introuvable');
    return;
  }
  this.api.renewContract(this.renewingContract.id, this.renewForm).subscribe({
    next: () => {
      this.showRenewModal   = false;
      this.renewingContract = null;
      this.loadContracts();
    },
    error: (err: any) => {
      alert('Erreur : ' + (err.error?.detail || err.message || 'Erreur inconnue'));
    }
  });
}
askTerminate(c: any) {
  if (c.status === 'termine') {
    alert('Ce contrat est déjà terminé.');
    return;
  }
  console.log('Full contract object keys:', Object.keys(c));
  console.log('Full contract:', JSON.stringify(c));
  this.terminatingContract = c;
  this.showTerminateConfirm = true;
}
confirmTerminate() {
  this.showTerminateConfirm = false;
  if (!this.terminatingContract?.id) {
    alert('Erreur : contrat introuvable');
    return;
  }
  this.api.terminateContract(this.terminatingContract.id).subscribe({
    next: () => {
      this.terminatingContract = null;
      this.loadContracts();
    },
    error: (err: any) => {
      alert('Erreur : ' + (err.error?.detail || err.message || 'Erreur inconnue'));
      this.terminatingContract = null;
    }
  });
}
}
