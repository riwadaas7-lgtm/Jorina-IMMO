import { Component } from '@angular/core';
import { ApartmentsComponent } from '../apartments/apartments';
import { DepartmentsComponent } from '../departments/departments';
import { RouterModule } from '@angular/router'; // ✅ ADD THIS

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [DepartmentsComponent, ApartmentsComponent,RouterModule],
  templateUrl: './layout.html', // ✅ USE HTML FILE
})
export class LayoutComponent {}