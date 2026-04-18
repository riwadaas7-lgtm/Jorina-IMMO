import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './departments.html',
  styleUrl: './departments.css'
})
export class DepartmentsComponent implements OnInit {

  // Utilisateur connecté
  user    = JSON.parse(localStorage.getItem('user') || '{}');
  isOwner = this.user?.role === 'proprietaire';

  // Données
  departments: any[] = [];
  apartments:  any[] = [];

  // ✅ Pour le skeleton loader (6 cartes grises pendant le chargement)
  isLoading    = false;
  loadError    = '';
  skeletonCards = Array.from({ length: 6 }); // tableau de 6 éléments vides

  // Formulaire ajout département
  showAddModal = false;
  nom = ''; ville = ''; code_postal = ''; address = ''; photo = '';

  // Formulaire modification département
  editingId         = null as number | null;
  editingNom        = '';
  editingVille      = '';
  editingCodePostal = '';
  editingAddress    = '';
  editingPhoto      = '';

  // Formulaire ajout appartement dans un département
  apartmentNom         = '';
  apartmentEtage       = 0;
  apartmentPrice       = 0;
  apartmentDescription = '';
  apartmentPhoto       = '';

  // ID du département dont on affiche les détails
  selectedDepartmentId: number | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  // ✅ Appelé par le bouton "Réessayer" dans le HTML
  load() {
    this.loadDepartments();
    this.loadApartments();
  }

  // ✅ Charge les départements avec gestion loading/erreur
  loadDepartments() {
    this.isLoading = true;
    this.loadError = '';

    this.api.getDepartments().subscribe({
      next: (res) => {
        // Ajoute showMenu et imageLoaded à chaque département
        this.departments = res.map(d => ({
          ...d,
          showMenu:    false,
          imageLoaded: false
        }));
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Impossible de charger les départements. Vérifiez le serveur.';
      }
    });
  }

  // ✅ Charge tous les appartements
  loadApartments() {
    this.api.getAllApartments().subscribe({
      next:  (res) => this.apartments = res,
      error: ()    => this.apartments = []
    });
  }

  // ✅ Appelé quand l'image d'un département finit de charger
  // Permet l'effet de fondu (opacity 0 → 1)
  onImageLoad(d: any) {
    d.imageLoaded = true;
  }

  // ✅ Retourne les appartements d'un département donné
  departmentApartments(departmentId: number): any[] {
    return this.apartments.filter(a => a.department_id === departmentId);
  }

  // ✅ Affiche/cache les appartements sous une carte département
  toggleDepartmentDetails(d: any) {
    this.selectedDepartmentId = this.selectedDepartmentId === d.id ? null : d.id;
  }

  // ✅ Affiche/cache le menu ⋮ (ferme les autres menus ouverts)
  toggleMenu(d: any) {
    this.departments.forEach(x => { if (x !== d) x.showMenu = false; });
    d.showMenu = !d.showMenu;
  }

  // ✅ Ajoute un nouveau département
  add() {
    if (!this.nom || !this.ville) return;

    this.api.addDepartment({
      nom: this.nom, ville: this.ville,
      code_postal: this.code_postal,
      address: this.address, photo: this.photo
    }).subscribe(() => {
      // Réinitialise le formulaire
      this.nom = ''; this.ville = ''; this.code_postal = '';
      this.address = ''; this.photo = '';
      this.showAddModal = false;
      this.loadDepartments();
    });
  }

  // ✅ Supprime un département
  delete(id: number) {
    if (!confirm('Supprimer ce département ?')) return;
    this.api.deleteDepartment(id).subscribe(() => {
      if (this.selectedDepartmentId === id) this.selectedDepartmentId = null;
      if (this.editingId === id) this.editingId = null;
      this.loadDepartments();
    });
  }

  // ✅ Prépare le formulaire de modification
  startEdit(d: any) {
    this.editingId         = d.id;
    this.editingNom        = d.nom;
    this.editingVille      = d.ville;
    this.editingCodePostal = d.code_postal;
    this.editingAddress    = d.address;
    this.editingPhoto      = d.photo || '';
    d.showMenu             = false;
  }

  cancelEdit() { this.editingId = null; }

  // ✅ Sauvegarde les modifications du département
  saveEdit() {
    if (this.editingId === null) return;
    this.api.updateDepartment(this.editingId, {
      nom:         this.editingNom,
      ville:       this.editingVille,
      code_postal: this.editingCodePostal,
      address:     this.editingAddress,
      photo:       this.editingPhoto
    }).subscribe(() => {
      this.editingId = null;
      this.loadDepartments();
    });
  }

  // ✅ Upload photo pour département (editing = true → modal modification)
  onSelectDepartmentPhoto(event: Event, editing = false) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadImage(file).subscribe(res => {
      if (editing) this.editingPhoto = res.url;
      else         this.photo        = res.url;
    });
  }

  // ✅ Ajoute un appartement dans le département en cours de modification
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

  // ✅ Upload photo appartement
  onSelectApartmentPhoto(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadImage(file).subscribe(res => {
      this.apartmentPhoto = res.url;
    });
  }

  // ✅ Supprime un appartement
  deleteApartment(id: number) {
    if (!confirm('Supprimer cet appartement ?')) return;
    this.api.deleteApartment(id).subscribe(() => this.loadApartments());
  }
}