import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-my-apartment',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-apartment.html',
  styleUrl: './my-apartment.css'
})
export class MyApartmentComponent implements OnInit {

  user      = JSON.parse(localStorage.getItem('user') || '{}');
  apartment: any = null;
  contract:  any = null;
  factures:  any[] = [];
  loading        = true;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getApartments(this.user.id).subscribe((res: any[]) => {
      this.apartment = res[0] || null;
      this.loading   = false;
    });

    this.api.getContracts().subscribe((res: any[]) => {
      this.contract = res.find(c => c.tenant_id === this.user.id) || null;
    });

    this.api.getFactures().subscribe((res: any[]) => {
      this.factures = res.filter(f => {
        return this.contract && f.contract_id === this.contract.id;
      });
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