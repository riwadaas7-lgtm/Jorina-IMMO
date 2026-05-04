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
    this.api.getFacturesForUser(this.user.id).subscribe({
      next:  (res: any[]) => this.factures = res,
      error: ()           => this.factures = []
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

  statusLabel(s: string) {
    const map: any = {
      en_attente: 'En attente',
      payee: 'Payée',
      en_retard: 'En retard'
    };
    return map[s] || s;
  }
}