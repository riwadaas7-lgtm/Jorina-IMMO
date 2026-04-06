import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class UsersComponent implements OnInit {

  users:      any[] = [];
  apartments: any[] = [];

  showAddModal = false;
  activeTab    = 'tous';
  searchTerm   = '';

  form = {
    nom: '', prenom: '', email: '',
    telephone: '', password: '', role: 'locataire'
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadUsers();
    this.api.getDepartments().subscribe(); // preload
  }

  loadUsers() {
    this.api.getUsers().subscribe((res: any[]) => {
      // only show locataires
      this.users = res
        .filter(u => u.role === 'locataire')
        .map(u => ({
          ...u,
          qr_url: this.qrUrl(u.tenant_code || 'NO-CODE')
        }));
    });
  }

  qrUrl(value: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(value)}`;
  }

  initials(u: any) {
    const f = u.prenom?.charAt(0) || '';
    const l = u.nom?.charAt(0)    || '';
    return (f + l).toUpperCase();
  }

  statusLabel(s: string) {
    const map: any = {
      actif:  'Actif',
      retard: 'En retard',
      ancien: 'Ancien'
    };
    return map[s] || 'Actif';
  }

  countActifs()   { return this.users.filter(u => (u.statut || 'actif') === 'actif').length; }
  countEnRetard() { return this.users.filter(u => u.statut === 'retard').length; }
  countAnciens()  { return this.users.filter(u => u.statut === 'ancien').length; }

  filtered() {
    return this.users.filter(u => {
      const matchTab = this.activeTab === 'tous' ||
                       (u.statut || 'actif') === this.activeTab;
      const term     = this.searchTerm.toLowerCase();
      const matchSearch = !term ||
        u.nom?.toLowerCase().includes(term) ||
        u.prenom?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term);
      return matchTab && matchSearch;
    });
  }

  add() {
    if (!this.form.nom || !this.form.email || !this.form.password) return;

    this.api.register(this.form).subscribe({
      next: () => {
        this.showAddModal = false;
        this.resetForm();
        this.loadUsers();
      },
      error: (err) => alert(err.error?.detail || 'Erreur')
    });
  }

  delete(id: number) {
    if (!confirm('Supprimer ce locataire ?')) return;
    this.api.deleteUser(id).subscribe(() => this.loadUsers());
  }

  resetForm() {
    this.form = { nom: '', prenom: '', email: '',
                  telephone: '', password: '', role: 'locataire' };
  }
}
