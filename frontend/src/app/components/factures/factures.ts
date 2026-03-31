import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-factures',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './factures.html',
})
export class FacturesComponent {

  user = JSON.parse(localStorage.getItem('user')!);
  isOwner = this.user?.role === 'proprietaire';

  factures: any[] = [];
  apartments: any[] = [];

  type = '';
  montant: number | null = null;
  apartmentId: number | null = null;

  constructor(private api: ApiService) {
    this.load();
  }

  load() {
    this.api.getFactures().subscribe(res => {
      this.factures = res;
    });

    this.api.getApartments(this.user.id).subscribe(res => {
      this.apartments = res;
    });
  }

  add() {
    if (!this.isOwner) return;

    if (!this.type || !this.montant || !this.apartmentId) return;

    this.api.addFacture({
      type: this.type,
      montant: this.montant,
      apartment_id: this.apartmentId
    }).subscribe(() => {
      this.type = '';
      this.montant = null;
      this.apartmentId = null;
      this.load();
    });
  }

  delete(id: number) {
    if (!this.isOwner) return;

    this.api.deleteFacture(id).subscribe(() => {
      this.load();
    });
  }

  getApartmentName(id: number) {
    const a = this.apartments.find(x => x.id === id);
    return a ? a.nom : '';
  }
}