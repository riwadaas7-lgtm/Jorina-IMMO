import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-apartments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './apartments.html',
  styleUrl: './apartments.css'
})
export class ApartmentsComponent implements OnInit {

  user        = JSON.parse(localStorage.getItem('user') || '{}');
  apartments: any[] = [];
  departments: any[] = [];

  showAddModal = false;
  editingId: number | null = null;
  activeTab  = 'tous';
  searchTerm = '';

  // Formulaire partagé add/edit
  form = { nom: '', etage: 0, price: 0, description: '', department_id: '', status: 'libre', photo: '' };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadApartments();
    this.api.getDepartments().subscribe(res => this.departments = res);
  }

  loadApartments() {
    this.api.getApartments(this.user.id).subscribe(res => this.apartments = res);
  }

  // ✅ Compte les appartements par statut (pour les cartes stats)
  countByStatus(s: string) {
    return this.apartments.filter(a => a.status === s).length;
  }

  statusLabel(s: string) {
    const map: any = { occupe: 'Occupé', libre: 'Disponible', maintenance: 'Maintenance' };
    return map[s] || s;
  }

  // ✅ Filtre selon l'onglet actif et la recherche
  filtered() {
    return this.apartments.filter(a => {
      const matchTab    = this.activeTab === 'tous' || a.status === this.activeTab;
      const matchSearch = !this.searchTerm ||
        a.nom?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        a.description?.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchTab && matchSearch;
    });
  }

  add() {
    if (!this.form.nom || !this.form.department_id) return;
    this.api.addApartment(this.form).subscribe(() => {
      this.showAddModal = false;
      this.resetForm();
      this.loadApartments();
    });
  }

  delete(id: number) {
    if (!confirm('Supprimer cet appartement ?')) return;
    this.api.deleteApartment(id).subscribe(() => this.loadApartments());
  }

  startEdit(a: any) {
    this.editingId = a.id;
    this.form = { nom: a.nom, etage: a.etage, price: a.price,
                  description: a.description, department_id: a.department_id,
                  status: a.status, photo: a.photo || '' };
  }

  cancelEdit() { this.editingId = null; this.resetForm(); }

  saveEdit() {
    if (this.editingId === null) return;
    this.api.updateApartment(this.editingId, this.form).subscribe(() => {
      this.editingId = null;
      this.resetForm();
      this.loadApartments();
    });
  }

  // ✅ Upload photo appartement
  onSelectPhoto(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadImage(file).subscribe(res => this.form.photo = res.url);
  }

  resetForm() {
    this.form = { nom: '', etage: 0, price: 0, description: '', department_id: '', status: 'libre', photo: '' };
  }
}