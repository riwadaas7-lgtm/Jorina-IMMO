import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiService {

  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  uploadImage(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(this.baseUrl + '/upload-image', form);
  }

  // AUTH
  login(data: any) {
    return this.http.post(this.baseUrl + '/login', data);
  }

  // DEPARTMENTS
  getDepartments() {
    return this.http.get<any[]>(this.baseUrl + '/departments');
  }

  addDepartment(dep: any) {
    return this.http.post(this.baseUrl + '/departments', dep);
  }

  deleteDepartment(id: number) {
    return this.http.delete(this.baseUrl + '/departments/' + id);
  }

  updateDepartment(id: number, data: any) {
    return this.http.put(this.baseUrl + '/departments/' + id, data);
  }

  // APARTMENTS
  getAllApartments() {
    return this.http.get<any[]>(this.baseUrl + '/apartments');
  }

  getApartments(userId: number) {
  return this.http.get<any[]>(`${this.baseUrl}/apartments/user/${userId}`);
}

  addApartment(data: any) {
    return this.http.post(this.baseUrl + '/apartments', data);
  }

  deleteApartment(id: number) {
    return this.http.delete(this.baseUrl + '/apartments/' + id);
  }

  updateApartment(id: number, data: any) {
    return this.http.put(this.baseUrl + '/apartments/' + id, data);
  }

  // JOIN
  joinApartment(data: any) {
    return this.http.post(this.baseUrl + '/join', data);
  }

  // CONTRACTS
  getContracts() {
  return this.http.get<any[]>(this.baseUrl + '/contracts');
}

  addContract(data: any) {
  return this.http.post(this.baseUrl + '/contracts', data);
}

  deleteContract(id: number) {
    return this.http.delete(this.baseUrl + '/contracts/' + id);
  }

  // USERS
  getUsers() {
    return this.http.get<any[]>(this.baseUrl + '/users');
  }

  updateUser(id: number, data: any) {
    return this.http.put(this.baseUrl + '/users/' + id, data);
  }

  addUser(data: any) {
    return this.http.post(this.baseUrl + '/users', data);
  }

  deleteUser(id: number) {
    return this.http.delete(this.baseUrl + '/users/' + id);
  }

  // FACTURES
  getFactures() {
  return this.http.get<any[]>(this.baseUrl + '/factures');
}

  addFacture(data: any) {
    return this.http.post(this.baseUrl + '/factures', data);
  }

  deleteFacture(id: number) {
    return this.http.delete(this.baseUrl + '/factures/' + id);
  }
  register(data: any) {
  return this.http.post(this.baseUrl + '/register', data);
}
}
