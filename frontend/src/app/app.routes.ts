import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout';
import { DepartmentsComponent } from './components/departments/departments';
import { ApartmentsComponent } from './components/apartments/apartments';
import { UsersComponent } from './components/users/users';
import { ContractsComponent } from './components/contracts/contracts';
import { FacturesComponent } from './components/factures/factures';
import { MyApartmentComponent } from './components/my-apartment/my-apartment';
import { AuthGuard } from './auth.guard';
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';

export const routes: Routes = [
  { path: 'login',    component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'departments',   component: DepartmentsComponent },
      { path: 'apartments',    component: ApartmentsComponent },
      { path: 'users',         component: UsersComponent },
      { path: 'contracts',     component: ContractsComponent },
      { path: 'factures',      component: FacturesComponent },
      { path: 'my-apartment',  component: MyApartmentComponent },
      { path: '',              redirectTo: 'departments', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: 'login' }
];