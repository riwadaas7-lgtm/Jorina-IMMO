import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-my-contract',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-contract.html',
  styleUrl: './my-contract.css'
})
export class MyContractComponent implements OnInit {

  user      = JSON.parse(localStorage.getItem('user') || '{}');
  contract: any  = null;
  apartment: any = null;
  loading        = true;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getContractsForUser(this.user.id).subscribe({
      next: (res: any[]) => {
        this.contract = res[0] || null;
        this.loading  = false;

        if (this.contract) {
          this.api.getApartments(this.user.id).subscribe((apts: any[]) => {
            this.apartment = apts[0] || null;
          });
        }
      },
      error: () => {
        this.loading  = false;
        this.contract = null;
      }
    });
  }

  statusLabel(s: string) {
    const map: any = { actif: 'Actif', termine: 'Terminé', resilie: 'Résilié' };
    return map[s] || s;
  }

  progressPercent(): number {
    if (!this.contract) return 0;
    const start = new Date(this.contract.date_debut).getTime();
    const end   = new Date(this.contract.date_fin).getTime();
    const now   = Date.now();
    if (now >= end)    return 100;
    if (now <= start)  return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  }
}