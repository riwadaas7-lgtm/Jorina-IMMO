import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-my-factures',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-factures.html',
  styleUrl: './my-factures.css'
})
export class MyFacturesComponent implements OnInit {

  user      = JSON.parse(localStorage.getItem('user') || '{}');
  factures: any[] = [];
  activeTab = 'toutes';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getContracts().subscribe((contracts: any[]) => {
      const myContract = contracts.find(c => c.tenant_id === this.user.id);
      if (myContract) {
        this.api.getFactures().subscribe((res: any[]) => {
          this.factures = res.filter(f => f.contract_id === myContract.id);
        });
      }
    });
  }

  typeIcon(t: string) {
    const map: any = { loyer: '🏠', electricite: '💡', eau: '💧', autre: '📄', charges: '🔧' };
    return map[t?.toLowerCase()] || '📄';
  }

  filtered() {
    return this.factures.filter(f =>
      this.activeTab === 'toutes' || f.status === this.activeTab
    );
  }

  payer(f: any) {
    // Mark as paid via API
    this.api.payFacture(f.id).subscribe(() => {
      f.status = 'payee';
    });}
}