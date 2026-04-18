import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

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

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.getFactures().subscribe(res => this.factures = res);
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

  delete(id: number) {
    if (!confirm('Supprimer cette facture ?')) return;
    this.api.deleteFacture(id).subscribe(() => this.load());
  }
}