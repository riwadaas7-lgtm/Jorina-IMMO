import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';
import { error } from 'console';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './departments.html',
  styleUrl: './departments.css'
})
export class DepartmentsComponent implements OnInit {

  // Utilisateur connecte
  user    = JSON.parse(localStorage.getItem('user') || '{}');
  isOwner = this.user?.role === 'proprietaire';
  departments: any[] = [];
  apartments:  any[] = [];
  isLoading    = false;
  loadError    = '';
  skeletonCards = Array.from({ length: 6 }); 
  showAddModal = false;
  nom = ''; ville = ''; code_postal = ''; address = ''; photo = ''; titre_foncier = '';

  // Formulaire modification departement
  editingId         = null as number | null;
  editingNom        = '';
  editingVille      = '';
  editingCodePostal = '';
  editingAddress    = '';
  editingPhoto      = '';
  editingTitreFoncier = '';

  // Formulaire ajout appartement dans un departement
  apartmentNom         = '';
  apartmentEtage       = 0;
  apartmentPrice       = 0;
  apartmentDescription = '';
  apartmentPhoto       = '';

  // ID du departement dont on affiche les details
  selectedDepartmentId: number | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  // Appele par le bouton "Ressayer" dans le HTML
  load() {
    this.loadDepartments();
    this.loadApartments();
  }

  //Charge les departements avec gestion loading/erreur
  loadDepartments() {
    this.isLoading = true;
    this.loadError = '';

    this.api.getDepartments(this.user.id).subscribe({
      next: (res) => {
        // Ajoute showMenu et imageLoaded a chaque departement
        this.departments = res.map(d => ({
          ...d,
          showMenu:    false,
          imageLoaded: false
        }));
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Impossible de charger les departements. Verifiez le serveur.';
      }
    });
  }

  //  Charge tous les appartements
  loadApartments() {
    this.api.getAllApartments(this.user.id).subscribe({
      next:  (res) => this.apartments = res,
      error: ()    => this.apartments = []
    });
  }

  // Appele quand l'image d'un departement finit de charger
  // Permet l'effet de fondu (opacity 0 → 1)
  onImageLoad(d: any) {
    d.imageLoaded = true;
  }

  // Retourne les appartements d'un departement donne
  departmentApartments(departmentId: number): any[] {
    return this.apartments.filter(a => a.department_id === departmentId);
  }

  // Affiche/cache les appartements sous une carte departement
  toggleDepartmentDetails(d: any) {
    this.selectedDepartmentId = this.selectedDepartmentId === d.id ? null : d.id;
  }

  // Affiche/cache le menu ⋮ (ferme les autres menus ouverts)
  toggleMenu(d: any) {
    this.departments.forEach(x => { if (x !== d) x.showMenu = false; });
    d.showMenu = !d.showMenu;
  }

  // Ajoute un nouveau dpartement
  add() {
  if (!this.nom || !this.ville) return;

  this.api.addDepartment({
    nom:           this.nom,
    ville:         this.ville,
    code_postal:   this.code_postal,
    address:       this.address,
    photo:         this.photo,
    titre_foncier: this.titre_foncier,
    owner_id:      this.user.id
  }).subscribe({
    next: () => {
      this.nom = ''; this.ville = ''; this.code_postal = '';
      this.address = ''; this.photo = ''; this.titre_foncier = '';
      this.showAddModal = false;
      this.loadDepartments();
    },
    error: (err: any) => {
      alert('⚠️ ' + (err.error?.detail || 'Erreur lors de l\'ajout'));
    }
  });
}

  // Supprime un departement
  delete(id: number) {
    if (!confirm('Supprimer ce département ?')) return;
    this.api.deleteDepartment(id).subscribe(() => {
      if (this.selectedDepartmentId === id) this.selectedDepartmentId = null;
      if (this.editingId === id) this.editingId = null;
      this.loadDepartments();
    });
  }

  //  Prepare le formulaire de modification
  startEdit(d: any) {
    this.editingId         = d.id;
    this.editingNom        = d.nom;
    this.editingVille      = d.ville;
    this.editingCodePostal = d.code_postal;
    this.editingAddress    = d.address;
    this.editingPhoto      = d.photo || '';
    this.editingTitreFoncier = d.titre_foncier;
    d.showMenu             = false;
  }

  cancelEdit() { this.editingId = null; }

  //Sauvegarde les modifications du departement
  saveEdit() {
  if (this.editingId === null) return;
  this.api.updateDepartment(this.editingId, {
    nom:           this.editingNom,
    ville:         this.editingVille,
    code_postal:   this.editingCodePostal,
    address:       this.editingAddress,
    photo:         this.editingPhoto,
    titre_foncier: this.editingTitreFoncier
  }).subscribe({
    next: () => { this.editingId = null; this.loadDepartments(); },
    error: (err: any) => {
      alert('⚠️ ' + (err.error?.detail || 'Erreur lors de la modification'));
    }
  });
}

  // Upload photo pour departement (editing = true → modal modification)
  onSelectDepartmentPhoto(event: Event, editing = false) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadImage(file).subscribe(res => {
      if (editing) this.editingPhoto = res.url;
      else         this.photo        = res.url;
    });
  }

  //  Ajoute un appartement dans le departement en cours de modification
  addApartmentToEditingDepartment() {
    if (this.editingId === null || !this.apartmentNom) return;
    this.api.addApartment({
      nom:           this.apartmentNom,
      etage:         this.apartmentEtage,
      price:         this.apartmentPrice,
      description:   this.apartmentDescription,
      photo:         this.apartmentPhoto,
      department_id: this.editingId
    }).subscribe(() => {
      // Réinitialise le formulaire appartement
      this.apartmentNom         = '';
      this.apartmentEtage       = 0;
      this.apartmentPrice       = 0;
      this.apartmentDescription = '';
      this.apartmentPhoto       = '';
      this.loadApartments();
    });
  }

  //  Upload photo appartement
  onSelectApartmentPhoto(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadImage(file).subscribe(res => {
      this.apartmentPhoto = res.url;
    });
  }

  // Supprime un appartement
  deleteApartment(id: number) {
    if (!confirm('Supprimer cet appartement ?')) return;
    this.api.deleteApartment(id).subscribe(() => this.loadApartments());
  }
}