import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-factures',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './factures.html'
})
export class FacturesComponent {

  factures: any[] = [];
  contracts: any[] = [];

  type = '';
  montant: number | null = null;
  contractId: number | null = null;

  constructor(private api: ApiService) {
    this.load();
  }

  load() {
    this.api.getFactures().subscribe((res: any[]) => {
      this.factures = res;
    });

    this.api.getContracts().subscribe((res: any[]) => {
      this.contracts = res;
    });
  }

  add() {
    if (!this.type || !this.montant || !this.contractId) return;

    this.api.addFacture({
      type: this.type,
      montant: this.montant,
      contract_id: this.contractId,
      status: 'pending'
    }).subscribe(() => {
      this.type = '';
      this.montant = null;
      this.contractId = null;
      this.load();
    });
  }

  delete(id: number) {
    this.api.deleteFacture(id).subscribe(() => this.load());
  }
}