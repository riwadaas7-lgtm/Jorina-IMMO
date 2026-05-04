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
import { ChatComponent }            from './components/chat/chat';   // ✅ NOUVEAU
import { AuthGuard }                from './auth.guard';
import { GuestGuard }               from './guest.guard';
import { RoleGuard }                from './role.guard';
import { LoginComponent }           from './components/login/login';
import { RegisterComponent }        from './components/register/register';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  { path: 'login',    component: LoginComponent,    canActivate: [GuestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [GuestGuard] },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [

      // ── PROPRIÉTAIRE ──────────────────────────────────────────
      { path: 'departments',  component: DepartmentsComponent,  canActivate: [RoleGuard], data: { role: 'proprietaire' } },
      { path: 'apartments',   component: ApartmentsComponent,   canActivate: [RoleGuard], data: { role: 'proprietaire' } },
      { path: 'users',        component: UsersComponent,        canActivate: [RoleGuard], data: { role: 'proprietaire' } },
      { path: 'contracts',    component: ContractsComponent,    canActivate: [RoleGuard], data: { role: 'proprietaire' } },
      { path: 'factures',     component: FacturesComponent,     canActivate: [RoleGuard], data: { role: 'proprietaire' } },
      { path: 'invitations',  component: InvitationsComponent,  canActivate: [RoleGuard], data: { role: 'proprietaire' } },
      { path: 'notifications',component: NotificationsComponent,canActivate: [RoleGuard], data: { role: 'proprietaire' } },
      // ── LOCATAIRE ─────────────────────────────────────────────
      { path: 'my-apartment',     component: MyApartmentComponent,     canActivate: [RoleGuard], data: { role: 'locataire' } },
      { path: 'my-contract',      component: MyContractComponent,      canActivate: [RoleGuard], data: { role: 'locataire' } },
      { path: 'my-factures',      component: MyFacturesComponent,      canActivate: [RoleGuard], data: { role: 'locataire' } },
      { path: 'my-payments',      component: MyPaymentsComponent,      canActivate: [RoleGuard], data: { role: 'locataire' } },
      { path: 'my-notifications', component: MyNotificationsComponent, canActivate: [RoleGuard], data: { role: 'locataire' } },

      // ── CHAT — accessible aux deux rôles ──────────────────────
      { path: 'chat', component: ChatComponent },   // ✅ NOUVEAU

      { path: '', redirectTo: 'departments', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: 'login' }
];