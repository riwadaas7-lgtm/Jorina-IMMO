import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiService {

  // URL de base du backend FastAPI
  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}
  // HttpClient est injecté automatiquement par Angular (Dependency Injection)
    // ─── AUTH ───────────────────────────────────────

  // ✅ Connexion → POST /login
  // Envoie email + password + role au backend
  // Retourne un Observable (comme une Promise)
  login(data: any) {
    return this.http.post(this.baseUrl + '/login', data);
  }

  // ✅ Inscription → POST /register
  // Envoie nom + prenom + email + password + role
  register(data: any) {
    return this.http.post(this.baseUrl + '/register', data);
  }





  // ─── IMAGES ───────────────────────────────────────
  // Envoie un fichier image au backend, retourne l'URL
  uploadImage(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(this.baseUrl + '/upload-image', form);
  }

  
 

  // ─── DÉPARTEMENTS ────────────────────────────────
  getDepartments()              { return this.http.get<any[]>(this.baseUrl + '/departments'); }
  addDepartment(data: any)      { return this.http.post(this.baseUrl + '/departments', data); }
  updateDepartment(id: number, data: any) { return this.http.put(this.baseUrl + '/departments/' + id, data); }
  deleteDepartment(id: number)  { return this.http.delete(this.baseUrl + '/departments/' + id); }

  // ─── APPARTEMENTS ────────────────────────────────
  // Tous les appartements (pour le propriétaire)
  getAllApartments() { return this.http.get<any[]>(this.baseUrl + '/apartments'); }

  // Appartements selon le rôle de l'utilisateur
  getApartments(userId: number) { return this.http.get<any[]>(this.baseUrl + '/apartments/user/' + userId); }

  addApartment(data: any)      { return this.http.post(this.baseUrl + '/apartments', data); }
  updateApartment(id: number, data: any) { return this.http.put(this.baseUrl + '/apartments/' + id, data); }
  deleteApartment(id: number)  { return this.http.delete(this.baseUrl + '/apartments/' + id); }

  // ─── REJOINDRE (locataire entre un code) ─────────
  joinApartment(data: any) { return this.http.post(this.baseUrl + '/join', data); }

  // ─── UTILISATEURS ────────────────────────────────
  getUsers()                           { return this.http.get<any[]>(this.baseUrl + '/users'); }
  addUser(data: any)                   { return this.http.post(this.baseUrl + '/users', data); }
  updateUser(id: number, data: any)    { return this.http.put(this.baseUrl + '/users/' + id, data); }
  deleteUser(id: number)               { return this.http.delete(this.baseUrl + '/users/' + id); }

  // ─── CONTRATS ────────────────────────────────────
  getContracts()               { return this.http.get<any[]>(this.baseUrl + '/contracts'); }
  addContract(data: any)       { return this.http.post(this.baseUrl + '/contracts', data); }
  deleteContract(id: number)   { return this.http.delete(this.baseUrl + '/contracts/' + id); }

  // ─── FACTURES ────────────────────────────────────
  getFactures()                { return this.http.get<any[]>(this.baseUrl + '/factures'); }
  addFacture(data: any)        { return this.http.post(this.baseUrl + '/factures', data); }
  deleteFacture(id: number)    { return this.http.delete(this.baseUrl + '/factures/' + id); }

  // Marque une facture comme payée
  payFacture(id: number)       { return this.http.put(this.baseUrl + '/factures/' + id + '/pay', {}); }
}