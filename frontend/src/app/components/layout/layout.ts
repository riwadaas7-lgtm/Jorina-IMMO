// layout.ts
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent {

  get user()        { return this.auth.getUser(); }
  get isOwner()     { return this.auth.isProprietaire(); }
  get isLocataire() { return this.auth.isLocataire(); }

  constructor(private auth: AuthService, private router: Router) {}

  logout() {
    this.auth.logout(); // clears localStorage + redirects to /login
  }
}