import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './departments.html',
  styleUrl: './departments.css'
})
export class DepartmentsComponent {

  departments: any[] = [];
  name = '';

  editingId: number | null = null;
  editingName = '';

  constructor(private api: ApiService) {
    this.load();
  }

  load() {
    this.api.getDepartments().subscribe((res: any[]) => {
      this.departments = res;
    });
  }

 add() {
  console.log("CLICKED ADD");

  if (!this.name) return;

  this.api.addDepartment({ name: this.name }).subscribe(() => {
    this.name = '';
    this.load();
  });
}

  delete(id: number) {
    this.api.deleteDepartment(id).subscribe(() => {
      this.load();
    });
  }

  startEdit(dep: any) {
    this.editingId = dep.id;
    this.editingName = dep.name;
  }

  saveEdit() {
  if (this.editingId === null) return;

  this.api.updateDepartment(this.editingId, { name: this.editingName })
    .subscribe(() => {
      this.editingId = null;
      this.editingName = '';
      this.load();
    });
}
}