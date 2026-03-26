import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contracts.html'
})
export class ContractsComponent {

  contracts: any[] = [];
apartments: any[] = [];
users: any[] = [];

tenantId: number | null = null;
apartmentId: number | null = null;

constructor(private api: ApiService) {
  this.load();
}

load() {
  this.api.getContracts().subscribe((res: any[]) => this.contracts = res);

  this.api.getApartments().subscribe((res: any[]) => this.apartments = res);

  this.api.getUsers().subscribe((res: any[]) => {
    this.users = res.filter((u: any) => u.role === 'locataire');
  });
}

add() {
  this.api.addContract({
    tenant_id: this.tenantId,
    apartment_id: this.apartmentId
  }).subscribe(() => {
    this.tenantId = null;
    this.apartmentId = null;
    this.load();
  });
}
getUserName(id: number) {
  const u = this.users.find(u => u.id === id);
  return u ? u.name : '';
}

getApartmentName(id: number) {
  const a = this.apartments.find(a => a.id === id);
  return a ? a.name : '';
}

}