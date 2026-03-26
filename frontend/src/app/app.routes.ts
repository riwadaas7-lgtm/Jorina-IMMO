import { DepartmentsComponent } from './components/departments/departments';
import { ApartmentsComponent } from './components/apartments/apartments';
import { ContractsComponent } from './components/contracts/contracts'; 
import { UsersComponent } from './components/users/users';
import { FacturesComponent } from './components/factures/factures';

export const routes = [
  { path: 'departments', component: DepartmentsComponent },
  { path: 'apartments', component: ApartmentsComponent },
  { path: 'contracts', component: ContractsComponent },
  { path: 'users', component: UsersComponent },
  { path: 'factures', component: FacturesComponent }
];