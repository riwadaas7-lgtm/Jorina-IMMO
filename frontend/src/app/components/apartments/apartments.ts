import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-apartments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './apartments.html',
  
})
export class ApartmentsComponent {

  apartments: any[] = [];
  departments: any[] = [];

  name = '';
  departmentId: number | null = null;

  constructor(private api: ApiService) {
    this.load();
  }

  load() {
    this.api.getApartments().subscribe((res: any[]) => {
      this.apartments = res;
    });

    this.api.getDepartments().subscribe((res: any[]) => {
      this.departments = res;
    });
  }

  add() {
    console.log("ADD APARTMENT");

    if (!this.name || !this.departmentId) return;

    this.api.addApartment({
      name: this.name,
      department_id: this.departmentId
    }).subscribe(() => {
      this.name = '';
      this.departmentId = null;
      this.load();
    });
  }
  delete(id: number) {
  this.api.deleteApartment(id).subscribe(() => {
    this.load();
  });
}
getDepartmentName(id: number) {
  const dep = this.departments.find(d => d.id === id);
  return dep ? dep.name : 'Unknown';
}
editingId: number | null = null;
editingName = '';
editingDepartmentId: number | null = null;
startEdit(a: any) {
  this.editingId = a.id;
  this.editingName = a.name;
  this.editingDepartmentId = a.department_id;
}

saveEdit() {
  if (this.editingId === null) return;

  this.api.updateApartment(this.editingId, {
    name: this.editingName,
    department_id: this.editingDepartmentId
  }).subscribe(() => {
    this.editingId = null;
    this.load();
  });
}
}