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

  user     = JSON.parse(localStorage.getItem('user') || '{}');
  isOwner  = this.user?.role === 'proprietaire';

  departments: any[] = [];
  showAddModal = false;

  nom = ''; ville = ''; code_postal = ''; address = '';

  editingId          = null as number | null;
  editingNom         = '';
  editingVille       = '';
  editingCodePostal  = '';
  editingAddress     = '';

  constructor(private api: ApiService) { this.load(); }

  load() {
    this.api.getDepartments().subscribe(res => {
      this.departments = res.map((d: any) => ({ ...d, showMenu: false }));
    });
  }

  toggleMenu(d: any) {
    this.departments.forEach(x => { if (x !== d) x.showMenu = false; });
    d.showMenu = !d.showMenu;
  }

  add() {
    if (!this.nom || !this.ville) return;
    this.api.addDepartment({
      nom: this.nom, ville: this.ville,
      code_postal: this.code_postal, address: this.address
    }).subscribe(() => {
      this.nom = ''; this.ville = ''; this.code_postal = ''; this.address = '';
      this.showAddModal = false;
      this.load();
    });
  }

  delete(id: number) {
    if (!confirm('Supprimer ce département ?')) return;
    this.api.deleteDepartment(id).subscribe(() => this.load());
  }

  startEdit(d: any) {
    this.editingId         = d.id;
    this.editingNom        = d.nom;
    this.editingVille      = d.ville;
    this.editingCodePostal = d.code_postal;
    this.editingAddress    = d.address;
    d.showMenu = false;
  }

  cancelEdit() { this.editingId = null; }

  saveEdit() {
    if (this.editingId === null) return;
    this.api.updateDepartment(this.editingId, {
      nom: this.editingNom, ville: this.editingVille,
      code_postal: this.editingCodePostal, address: this.editingAddress
    }).subscribe(() => { this.editingId = null; this.load(); });
  }
}