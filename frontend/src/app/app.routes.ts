import { Routes } from '@angular/router';
import { LayoutComponent }          from './components/layout/layout';
import { DepartmentsComponent }     from './components/departments/departments';
import { ApartmentsComponent }      from './components/apartments/apartments';
import { UsersComponent }           from './components/users/users';
import { ContractsComponent }       from './components/contracts/contracts';
import { FacturesComponent }        from './components/factures/factures';
import { InvitationsComponent }     from './components/invitations/invitations';
import { NotificationsComponent }   from './components/notifications/notifications';
import { MyApartmentComponent }     from './components/my-apartment/my-apartment';
import { MyContractComponent }      from './components/my-contract/my-contract';
import { MyFacturesComponent }      from './components/my-factures/my-factures';
import { MyPaymentsComponent }      from './components/my-payments/my-payments';
import { MyNotificationsComponent } from './components/my-notifications/my-notifications';
import { AuthGuard }                from './auth.guard';
import { GuestGuard }               from './guest.guard';
import { LoginComponent }           from './components/login/login';
import { RegisterComponent }        from './components/register/register';

export const routes: Routes = [
  // Si URL vide → aller sur login
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  // Pages publiques (pas besoin d'être connecté), protégée par GuestGuard
  { path: 'login',    component: LoginComponent,    canActivate: [GuestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [GuestGuard] },

  // Pages protégées (AuthGuard vérifie le token)
  {
    path: '',
    component: LayoutComponent,     // sidebar + topbar communs
    canActivate: [AuthGuard],
    children: [

      // ── PROPRIÉTAIRE ──────────────────────────
      { path: 'departments',   component: DepartmentsComponent },
      { path: 'apartments',    component: ApartmentsComponent },
      { path: 'users',         component: UsersComponent },
      { path: 'contracts',     component: ContractsComponent },
      { path: 'factures',      component: FacturesComponent },
      { path: 'invitations',   component: InvitationsComponent },
      { path: 'notifications', component: NotificationsComponent },

      // ── LOCATAIRE ─────────────────────────────
      { path: 'my-apartment',     component: MyApartmentComponent },
      { path: 'my-contract',      component: MyContractComponent },
      { path: 'my-factures',      component: MyFacturesComponent },
      { path: 'my-payments',      component: MyPaymentsComponent },      // Coming Soon
      { path: 'my-notifications', component: MyNotificationsComponent },

      // Par défaut → departments
      { path: '', redirectTo: 'departments', pathMatch: 'full' }
    ]
  },

  // URL inconnue → login
  { path: '**', redirectTo: 'login' }
];