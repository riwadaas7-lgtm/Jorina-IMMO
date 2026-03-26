import { LayoutComponent } from './components/layout/layout';
import { DepartmentsComponent } from './components/departments/departments';
import { ApartmentsComponent } from './components/apartments/apartments';
import { UsersComponent } from './components/users/users';
import { ContractsComponent } from './components/contracts/contracts';
import { FacturesComponent } from './components/factures/factures';

export const routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'departments', component: DepartmentsComponent },
      { path: 'apartments', component: ApartmentsComponent },
      { path: 'users', component: UsersComponent },
      { path: 'contracts', component: ContractsComponent },
      { path: 'factures', component: FacturesComponent },
    ]
  }
];