import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class UsersComponent {

  users: any[] = [];

  name = '';
  role = '';

  constructor(private api: ApiService) {
    this.load();
  }

  load() {
    this.api.getUsers().subscribe(res => this.users = res);
  }

  add() {
    this.api.addUser({
      name: this.name,
      role: this.role
    }).subscribe(() => {
      this.name = '';
      this.role = '';
      this.load();
    });
  }

  delete(id: number) {
    this.api.deleteUser(id).subscribe(() => this.load());
  }
}