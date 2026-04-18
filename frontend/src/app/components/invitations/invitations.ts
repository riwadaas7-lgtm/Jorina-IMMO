import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-invitations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invitations.html',
  styleUrl: './invitations.css'
})
export class InvitationsComponent implements OnInit {

  user       = JSON.parse(localStorage.getItem('user') || '{}');
  apartments: any[] = [];

  // Code généré
  currentCode       = this.randomCode();
  selectedApartment = ''; // appartement choisi pour ce code
  copied  = false;
  saved   = false;

  // Historique des codes générés (en mémoire)
  history: { code: string; apt: string; date: string }[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    // Charge les appartements du propriétaire
    this.api.getApartments(this.user.id).subscribe(res => this.apartments = res);
  }

  // ✅ Génère un code aléatoire style APT-A3XZ
  randomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'APT-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ✅ Génère un nouveau code
  generateCode() {
    this.currentCode = this.randomCode();
    this.saved  = false;
    this.copied = false;
  }

  // ✅ Copie le code dans le presse-papier
  copyCode() {
    navigator.clipboard.writeText(this.currentCode);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }

  // ✅ Associe le code à l'appartement sélectionné et sauvegarde dans le backend
  saveCode() {
    if (!this.selectedApartment) return;

    const apt = this.apartments.find(a => a.id == this.selectedApartment);

    // Envoie le nouveau code au backend
    this.api.updateApartment(+this.selectedApartment, {
      ...apt,
      code: this.currentCode
    }).subscribe(() => {
      // Ajoute à l'historique local
      this.history.unshift({
        code: this.currentCode,
        apt:  apt?.nom || 'Appartement',
        date: new Date().toLocaleDateString('fr-FR')
      });
      this.saved = true;
      setTimeout(() => this.saved = false, 3000);
    });
  }
}