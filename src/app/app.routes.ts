import { Routes } from '@angular/router';
import { authRoutes } from './auth/auth.routes';
import { LandingComponent } from './pages/landing/landing.component';
import { hostRoutes } from './pages/host/host.routes';
import { authGuard } from './auth/guards/auth.guard';
import { loggedGuard } from './auth/guards/logged.guard';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    canActivate: [authGuard], // 👈 solo accesible si NO estás logueado
  },
  {
    path: 'auth',
    canActivate: [authGuard], // 👈 evita que usuarios logueados entren al login/register
    children: authRoutes,
  },
  {
    path: 'host',
    canActivate: [loggedGuard], // 👈 solo accesible si estás logueado
    children: hostRoutes,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
