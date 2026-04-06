import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
export class DepartmentsComponent implements OnInit {
  user = JSON.parse(localStorage.getItem('user') || '{}');
  isOwner = this.user?.role === 'proprietaire';

  departments: any[] = [];
  apartments: any[] = [];
  readonly skeletonCards = Array.from({ length: 6 });
  isLoading = false;
  loadError = '';

  selectedDepartmentId: number | null = null;

  showAddModal = false;
  nom = '';
  ville = '';
  code_postal = '';
  address = '';
  photo = '';

  editingId = null as number | null;
  editingNom = '';
  editingVille = '';
  editingCodePostal = '';
  editingAddress = '';
  editingPhoto = '';

  apartmentNom = '';
  apartmentEtage = 0;
  apartmentPrice = 0;
  apartmentDescription = '';
  apartmentPhoto = '';

  pendingEditDepartmentId: number | null = null;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadDepartments();
    this.loadApartments();
  }

  private withUiFields(list: any[]): any[] {
    return list.map((d: any) => ({
      ...d,
      showMenu: false,
      imageLoaded: !!d.imageLoaded
    }));
  }

  loadDepartments() {
    this.isLoading = true;
    this.loadError = '';

    this.api.getDepartments().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (Array.isArray(res?.value) ? res.value : []);
        this.departments = this.withUiFields(list);
        this.isLoading = false;

        if (this.departments.length === 0) {
          this.loadError = 'Aucun departement trouve.';
        }

        if (this.pendingEditDepartmentId !== null) {
          const dep = this.departments.find((d) => d.id === this.pendingEditDepartmentId);
          this.pendingEditDepartmentId = null;
          if (dep) this.startEdit(dep);
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Impossible de charger les departements.';
        this.cdr.detectChanges();
      }
    });
  }

  loadApartments() {
    this.api.getAllApartments().subscribe({
      next: (res: any) => {
        this.apartments = Array.isArray(res) ? res : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.apartments = [];
        this.cdr.detectChanges();
      }
    });
  }

  load() {
    this.refreshAll();
  }

  refreshAll() {
    this.loadDepartments();
    this.loadApartments();
  }

  departmentApartments(departmentId: number): any[] {
    return this.apartments.filter((a) => a.department_id === departmentId);
  }

  toggleDepartmentDetails(d: any) {
    this.selectedDepartmentId = this.selectedDepartmentId === d.id ? null : d.id;
  }

  onImageLoad(d: any) {
    d.imageLoaded = true;
  }

  toggleMenu(d: any) {
    this.departments.forEach((x) => {
      if (x !== d) x.showMenu = false;
    });
    d.showMenu = !d.showMenu;
  }

  add(openManageAfterCreate = false) {
    if (!this.nom || !this.ville) return;

    this.api
      .addDepartment({
        nom: this.nom,
        ville: this.ville,
        code_postal: this.code_postal,
        address: this.address,
        photo: this.photo
      })
      .subscribe((created: any) => {
        this.nom = '';
        this.ville = '';
        this.code_postal = '';
        this.address = '';
        this.photo = '';
        this.showAddModal = false;

        if (openManageAfterCreate && created?.id) {
          this.pendingEditDepartmentId = created.id;
        }

        this.refreshAll();
      });
  }

  delete(id: number) {
    if (!confirm('Supprimer ce departement ?')) return;
    this.api.deleteDepartment(id).subscribe(() => {
      if (this.selectedDepartmentId === id) {
        this.selectedDepartmentId = null;
      }
      if (this.editingId === id) {
        this.cancelEdit();
      }
      this.refreshAll();
    });
  }

  startEdit(d: any) {
    this.editingId = d.id;
    this.editingNom = d.nom;
    this.editingVille = d.ville;
    this.editingCodePostal = d.code_postal;
    this.editingAddress = d.address;
    this.editingPhoto = d.photo || '';
    d.showMenu = false;

    this.resetApartmentForm();
  }

  cancelEdit() {
    this.editingId = null;
    this.resetApartmentForm();
  }

  saveEdit() {
    if (this.editingId === null) return;
    this.api
      .updateDepartment(this.editingId, {
        nom: this.editingNom,
        ville: this.editingVille,
        code_postal: this.editingCodePostal,
        address: this.editingAddress,
        photo: this.editingPhoto
      })
      .subscribe(() => {
        this.editingId = null;
        this.refreshAll();
      });
  }

  onSelectDepartmentPhoto(event: Event, editing = false) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.api.uploadImage(file).subscribe((res) => {
      if (editing) {
        this.editingPhoto = res.url;
      } else {
        this.photo = res.url;
      }
      this.cdr.detectChanges();
    });
  }

  addApartmentToEditingDepartment() {
    if (this.editingId === null || !this.apartmentNom) return;

    this.api
      .addApartment({
        nom: this.apartmentNom,
        etage: this.apartmentEtage,
        price: this.apartmentPrice,
        description: this.apartmentDescription,
        photo: this.apartmentPhoto,
        department_id: this.editingId
      })
      .subscribe(() => {
        this.resetApartmentForm();
        this.refreshAll();
      });
  }

  onSelectApartmentPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.api.uploadImage(file).subscribe((res) => {
      this.apartmentPhoto = res.url;
      this.cdr.detectChanges();
    });
  }

  deleteApartment(apartmentId: number) {
    if (!confirm('Supprimer cet appartement ?')) return;
    this.api.deleteApartment(apartmentId).subscribe(() => this.refreshAll());
  }

  private resetApartmentForm() {
    this.apartmentNom = '';
    this.apartmentEtage = 0;
    this.apartmentPrice = 0;
    this.apartmentDescription = '';
    this.apartmentPhoto = '';
  }
}
