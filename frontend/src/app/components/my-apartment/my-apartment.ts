import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-my-apartment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-apartment.html',
  styleUrl: './my-apartment.css'
})
export class MyApartmentComponent implements OnInit {

  user      = JSON.parse(localStorage.getItem('user') || '{}');
  apartment: any   = null;
  contract:  any   = null;
  factures:  any[] = [];
  owner:     any   = null;
  loading         = true;
  contractExpired = false;

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;

    // Load apartment
    this.api.getApartments(this.user.id).subscribe({
      next: (res) => {
        this.apartment = res[0] || null;
        this.loading   = false;

        // If has apartment → load owner info
        if (this.apartment) {
          this.loadOwner();
        }
      },
      error: () => { this.apartment = null; this.loading = false; }
    });

    // Load contracts — most recent first
    this.api.getContractsForUser(this.user.id).subscribe({
      next: (res: any[]) => {
        const sorted = res.sort((a, b) =>
          new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime()
        );
        this.contract = sorted[0] || null;

        // Check if contract is expired
        if (this.contract) {
          const today = new Date().toISOString().split('T')[0];
          this.contractExpired = this.contract.date_fin < today
            || this.contract.status === 'expire'
            || this.contract.status === 'termine';
        }
      },
      error: () => this.contract = null
    });

    // Load factures
    this.api.getFacturesForUser(this.user.id).subscribe({
      next: (res: any[]) => this.factures = res,
      error: () => this.factures = []
    });
  }

  loadOwner() {
    // Get chat contacts — for locataire this returns the propriétaire
    this.api.getChatContacts(this.user.id).subscribe({
      next: (res: any[]) => this.owner = res[0] || null,
      error: () => this.owner = null
    });
  }

  get pendingFactures() {
    return this.factures.filter(f => f.status === 'en_attente' || f.status === 'en_retard').length;
  }

  get totalPaiements() {
    return this.factures
      .filter(f => f.status === 'payee')
      .reduce((sum, f) => sum + f.montant, 0);
  }
}