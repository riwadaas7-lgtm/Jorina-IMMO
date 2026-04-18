import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';   // ✅ nécessaire pour [(ngModel)]
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-my-apartment',
  standalone: true,
  imports: [CommonModule, FormsModule],          // ✅ FormsModule ajouté
  templateUrl: './my-apartment.html',
  styleUrl: './my-apartment.css'
})
export class MyApartmentComponent implements OnInit {

  user      = JSON.parse(localStorage.getItem('user') || '{}');
  apartment: any  = null;
  contract:  any  = null;
  factures:  any[] = [];
  loading         = true;

  // Modal rejoindre
  showJoinModal = false;
  joinCode      = '';
  joinMsg       = '';
  joinLoading   = false;

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;

    this.api.getApartments(this.user.id).subscribe(res => {
      this.apartment = res[0] || null;
      this.loading   = false;
    });

    this.api.getContracts().subscribe(res => {
      this.contract = res.find((c: any) => c.tenant_id === this.user.id) || null;
    });

    this.api.getFactures().subscribe(res => {
      this.factures = res.filter((f: any) =>
        this.contract && f.contract_id === this.contract.id
      );
    });
  }

  // ✅ Le locataire entre son code pour rejoindre un appartement
  joinApartment() {
    if (!this.joinCode.trim()) return;

    this.joinLoading = true;
    this.joinMsg     = '';

    this.api.joinApartment({
      code:    this.joinCode.trim().toUpperCase(),
      user_id: this.user.id
    }).subscribe({
      next: (res: any) => {
        this.joinMsg     = '✅ ' + (res.message || 'Appartement rejoint avec succès !');
        this.joinLoading = false;
        this.joinCode    = '';

        // Après 1.5s, ferme le modal et recharge les données
        setTimeout(() => {
          this.showJoinModal = false;
          this.joinMsg       = '';
          this.loadData();
        }, 1500);
      },
      error: (err: any) => {
        this.joinMsg     = '❌ ' + (err.error?.detail || 'Code invalide. Vérifiez le code.');
        this.joinLoading = false;
      }
    });
  }

  get pendingFactures() {
    return this.factures.filter(f => f.status === 'en_attente').length;
  }

  get totalPaiements() {
    return this.factures
      .filter(f => f.status === 'payee')
      .reduce((sum, f) => sum + f.montant, 0);
  }
}