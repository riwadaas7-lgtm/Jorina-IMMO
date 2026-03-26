import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

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
  getApartments() {
    return this.http.get<any[]>(this.baseUrl + '/apartments');
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

  // CONTRACTS ✅ FIXED
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

  addUser(data: any) {
    return this.http.post(this.baseUrl + '/users', data);
  }

  deleteUser(id: number) {
    return this.http.delete(this.baseUrl + '/users/' + id);
  }
  getFactures() {
    return this.http.get<any[]>(this.baseUrl + '/factures');
  }

  addFacture(data: any) {
    return this.http.post(this.baseUrl + '/factures', data);
  }

  deleteFacture(id: number) {
    return this.http.delete(this.baseUrl + '/factures/' + id);
  }
}
// Factures
