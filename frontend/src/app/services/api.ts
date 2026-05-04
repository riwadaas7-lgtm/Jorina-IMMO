import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiService {

  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  // ─── IMAGES ───────────────────────────────────────────────────────────────
  uploadImage(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(this.baseUrl + '/upload-image', form);
  }

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  login(data: any)    { return this.http.post(this.baseUrl + '/login', data); }
  register(data: any) { return this.http.post(this.baseUrl + '/register', data); }

  // ─── DEPARTMENTS ──────────────────────────────────────────────────────────
  getDepartments(ownerId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/departments?owner_id=${ownerId}`);
  }
  addDepartment(data: any)             { return this.http.post(this.baseUrl + '/departments', data); }
  updateDepartment(id: number, data: any) { return this.http.put(`${this.baseUrl}/departments/${id}`, data); }
  deleteDepartment(id: number)         { return this.http.delete(`${this.baseUrl}/departments/${id}`); }

  // ─── APARTMENTS ───────────────────────────────────────────────────────────
  // Tous les appartements d'un propriétaire
  getAllApartments(ownerId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/apartments?owner_id=${ownerId}`);
  }
  // Pour un utilisateur (locataire = son apt, proprio = tous ses apts)
  getApartments(userId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/apartments/user/${userId}`);
  }
  addApartment(data: any)              { return this.http.post(this.baseUrl + '/apartments', data); }
  updateApartment(id: number, data: any) { return this.http.put(`${this.baseUrl}/apartments/${id}`, data); }
  deleteApartment(id: number)          { return this.http.delete(`${this.baseUrl}/apartments/${id}`); }

  // ─── JOIN ─────────────────────────────────────────────────────────────────
  joinApartment(data: any) { return this.http.post(this.baseUrl + '/join', data); }

  // ─── USERS ────────────────────────────────────────────────────────────────
  getUsers(ownerId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/users?owner_id=${ownerId}`);
  }
  getUser(id: number)                  { return this.http.get<any>(`${this.baseUrl}/users/${id}`); }
  getUserByCin(cin: string)            { return this.http.get<any>(`${this.baseUrl}/users/by-cin/${cin}`); }
  updateUser(id: number, data: any)    { return this.http.put(`${this.baseUrl}/users/${id}`, data); }
  deleteUser(id: number)               { return this.http.delete(`${this.baseUrl}/users/${id}`); }
  addLocataire(data: any)              { return this.http.post(`${this.baseUrl}/users/add-locataire`, data); }

  // ─── CONTRACTS ────────────────────────────────────────────────────────────
  getContracts(ownerId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/contracts?owner_id=${ownerId}`);
  }
  getContractsForUser(userId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/contracts/user/${userId}`);
  }
  addContract(data: any)               { return this.http.post(this.baseUrl + '/contracts', data); }
  updateContract(id: number, data: any){ return this.http.put(`${this.baseUrl}/contracts/${id}`, data); }
  deleteContract(id: number)           { return this.http.delete(`${this.baseUrl}/contracts/${id}`); }

  // ─── FACTURES ─────────────────────────────────────────────────────────────
  getFactures(ownerId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/factures?owner_id=${ownerId}`);
  }
  getFacturesForUser(userId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/factures/user/${userId}`);
  }
  addFacture(data: any)                { return this.http.post(this.baseUrl + '/factures', data); }
  payFacture(id: number)               { return this.http.put(`${this.baseUrl}/factures/${id}/pay`, {}); }
  updateFactureStatus(id: number, status: string) {
    return this.http.put(`${this.baseUrl}/factures/${id}/status`, { status });
  }
  deleteFacture(id: number)            { return this.http.delete(`${this.baseUrl}/factures/${id}`); }

  // INVITATIONS
getInvitationCodes(ownerId: number) {
  return this.http.get<any[]>(`${this.baseUrl}/invitations/codes/${ownerId}`);
}
generateInvitationCode(apartmentId: number) {
  return this.http.post(`${this.baseUrl}/invitations/generate`, { apartment_id: apartmentId });
}
deleteInvitationCode(apartmentId: number) {
  return this.http.delete(`${this.baseUrl}/invitations/delete-code/${apartmentId}`);
}

// CHAT
getMessages(user1Id: number, user2Id: number) {
  return this.http.get<any[]>(`${this.baseUrl}/messages/${user1Id}/${user2Id}`);
}
getChatContacts(userId: number) {
  return this.http.get<any[]>(`${this.baseUrl}/messages/contacts/${userId}`);
}

// CHANGE PASSWORD
changePassword(userId: number, data: any) {
  return this.http.put(`${this.baseUrl}/users/${userId}/change-password`, data);
}
freeApartment(userId: number) {
  return this.http.put(`${this.baseUrl}/users/${userId}/free-apartment`, {});
}
// Contracts
renewContract(id: number, data: { date_fin: string }) {
  return this.http.put(`${this.baseUrl}/contracts/${id}/renew`, data);
}
terminateContract(id: number) {
  return this.http.put(`${this.baseUrl}/contracts/${id}/terminate`, {});
}

// Users
deleteUserSoft(id: number) {
  return this.http.delete(`${this.baseUrl}/users/${id}?permanent=false`);
}
deleteUserHard(id: number, force = false) {
  return this.http.delete(`${this.baseUrl}/users/${id}?permanent=true&force=${force}`);
}

// Apartments - update with maintenance
updateApartmentFull(id: number, data: any) {
  return this.http.put(`${this.baseUrl}/apartments/${id}`, data);
}
}