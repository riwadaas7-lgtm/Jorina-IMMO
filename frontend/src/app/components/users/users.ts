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

  user       = JSON.parse(localStorage.getItem('user') || '{}');
  users:      any[] = [];
  apartments: any[] = [];  // tous les appartements
  activeTab  = 'tous';
  searchTerm = '';

  showAddModal = false;
  addLoading   = false;
  addError     = '';


  // Résultat de la recherche par CIN
  cinSearchDone = false;
  existingUser: any = null;
  showDeleteModal = false;
  deletingUser: any = null;

  form = {
    cin:          '',
    nom:          '',
    prenom:       '',
    email:        '',
    telephone:    '',
    apartment_id: '',
    send_invite:  true
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadUsers();
    // Charge tous les appartements pour le select
    this.api.getAllApartments(this.user.id).subscribe(res => {
      this.apartments = res;
    });
  }

  // ✅ Appartements libres seulement pour le select
  get freeApartments() {
    return this.apartments.filter(a => a.status === 'libre');
  }

  loadUsers() {
    this.api.getUsers(this.user.id).subscribe((res: any[]) => {
      this.users = res.filter(u => u.role === 'locataire');
      this.api.getAllApartments(this.user.id).subscribe((apts: any[]) => {
      this.users = this.users.map(u => {
        const apt = apts.find(a => a.id === u.apartment_id);
        return {
          ...u,
          apartment_nom: apt?.nom || 'Non assigné',
          loyer: apt?.price || 0
        };
      });
    });
    });
  }

  // ✅ Recherche par CIN — auto-remplissage si trouvé
  searchByCin() {
    if (!this.form.cin.trim()) return;

    this.api.getUserByCin(this.form.cin).subscribe({
      next: (res: any) => {
        this.cinSearchDone = true;

        if (res.found) {
          // Locataire trouvé → auto-remplissage
          this.existingUser  = res;
          this.form.nom      = res.nom;
          this.form.prenom   = res.prenom;
          this.form.email    = res.email;
          this.form.telephone = res.telephone || '';
        } else {
          // Nouveau locataire → champs vides à remplir
          this.existingUser = null;
          this.form.nom      = '';
          this.form.prenom   = '';
          this.form.email    = '';
          this.form.telephone = '';
        }
      },
      error: () => {
        this.cinSearchDone = true;
        this.existingUser  = null;
      }
    });
  }

  // ✅ Ajoute le locataire (nouveau ou existant)
  add() {
    if (!this.form.cin) {
      this.addError = 'Le CIN est obligatoire.';
      return;
    }
    if (!this.form.apartment_id) {
      this.addError = 'Choisissez un appartement.';
      return;
    }
    if (!this.existingUser && (!this.form.nom || !this.form.prenom || !this.form.email)) {
      this.addError = 'Nom, prénom et email sont obligatoires pour un nouveau locataire.';
      return;
    }

    this.addLoading = true;
    this.addError   = '';

    this.api.addLocataire({
      cin:          this.form.cin,
      nom:          this.form.nom,
      prenom:       this.form.prenom,
      email:        this.form.email,
      telephone:    this.form.telephone,
      apartment_id: parseInt(this.form.apartment_id),
      send_invite:  this.form.send_invite
    }).subscribe({
      next: (res: any) => {
        this.addLoading   = false;
        this.showAddModal = false;
        this.resetForm();
        this.loadUsers();

        // Message de succès
        const msg = res.is_new
          ? `✅ Nouveau locataire créé ! Code envoyé à ${res.user.email}`
          : `✅ Locataire existant assigné ! Code : ${res.code}`;
        alert(msg);
      },
      error: (err: any) => {
        this.addLoading = false;
        this.addError   = err.error?.detail || 'Erreur lors de l\'ajout.';
      }
    });
  }

  openAddModal() {
    this.resetForm();
    this.showAddModal = true;
    // Recharge les appartements libres
    this.api.getAllApartments(this.user.id).subscribe(res => {
      this.apartments = res;
    });
  }

  resetForm() {
    this.form = {
      cin: '', nom: '', prenom: '',
      email: '', telephone: '',
      apartment_id: '', send_invite: true
    };
    this.cinSearchDone = false;
    this.existingUser  = null;
    this.addError      = '';
  }

  // Reste des méthodes existantes
  initials(u: any) {
    return ((u.prenom?.charAt(0) || '') + (u.nom?.charAt(0) || '')).toUpperCase();
  }

  statusLabel(s: string) {
    const map: any = { actif: 'Actif', retard: 'En retard', ancien: 'Ancien' };
    return map[s] || 'Actif';
  }

  countActifs()   { return this.users.filter(u => (u.statut || 'actif') === 'actif').length; }
  countEnRetard() { return this.users.filter(u => u.statut === 'retard').length; }
  countAnciens()  { return this.users.filter(u => u.statut === 'ancien').length; }

  filtered() {
    return this.users.filter(u => {
      const statut = u.statut || 'actif';
      let matchTab = false;
      if (this.activeTab === 'tous')    matchTab = true;
      else if (this.activeTab === 'actif')  matchTab = statut === 'actif';
      else if (this.activeTab === 'ancien') matchTab = statut === 'ancien';
      else matchTab = statut === this.activeTab;

      const term        = this.searchTerm.toLowerCase();
      const matchSearch = !term ||
        u.nom?.toLowerCase().includes(term) ||
        u.prenom?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term);
      return matchTab && matchSearch;
    });
}

  delete(u: any) {
  this.deletingUser  = u;
  this.showDeleteModal = true;
}

confirmDelete(action: 'archive' | 'permanent') {
  this.showDeleteModal = false;
  const u = this.deletingUser;
  if (!u) return;

  if (action === 'archive') {
    this.api.deleteUserSoft(u.id).subscribe({
      next: () => { this.deletingUser = null; this.loadUsers(); },
      error: (err: any) => {
        // Show the backend error message clearly
        const msg = err.error?.detail || 'Erreur archivage';
        alert('⚠️ ' + msg);
        this.deletingUser = null;
      }
    });
  } else {
    this.api.deleteUserHard(u.id, true).subscribe({
      next: () => { this.deletingUser = null; this.loadUsers(); },
      error: (err: any) => {
        const msg = err.error?.detail || 'Erreur suppression';
        alert('⚠️ ' + msg);
        this.deletingUser = null;
      }
    });
  }
}
  showEditModal   = false;
  editingUser: any = null;
  editForm = {
    nom:          '',
    prenom:       '',
    email:        '',
    telephone:    '',
    apartment_id: ''
  };

edit(u: any) {
  this.editingUser = u;
  this.editForm = {
    nom:          u.nom,
    prenom:       u.prenom,
    email:        u.email,
    telephone:    u.telephone || '',
    apartment_id: u.apartment_id || ''
  };
  this.showEditModal = true;
}

saveEdit() {
  if (!this.editingUser) return;
  this.api.updateUser(this.editingUser.id, {
    nom:       this.editForm.nom,
    prenom:    this.editForm.prenom,
    email:     this.editForm.email,
    telephone: this.editForm.telephone
  }).subscribe({
    next: () => {
      // If apartment changed → reassign
      if (this.editForm.apartment_id &&
          this.editForm.apartment_id != this.editingUser.apartment_id) {
        this.api.addLocataire({
          cin:          this.editingUser.cin,
          apartment_id: parseInt(this.editForm.apartment_id)
        }).subscribe({
          next: () => { this.showEditModal = false; this.loadUsers(); },
          error: (err: any) => alert(err.error?.detail || 'Erreur changement apt')
        });
      } else {
        this.showEditModal = false;
        this.loadUsers();
      }
    },
    error: (err: any) => alert(err.error?.detail || 'Erreur modification')
  });
}
freeApartment(u: any) {
  if (!confirm(`Libérer l'appartement de ${u.prenom} ${u.nom} ?`)) return;
  this.api.freeApartment(u.id).subscribe({
    next: () => this.loadUsers(),
    error: (err: any) => alert(err.error?.detail || 'Erreur')
  });
}
}