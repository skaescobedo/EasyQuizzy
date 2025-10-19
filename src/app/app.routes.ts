import { Routes } from '@angular/router';
import { authRoutes } from './auth/auth.routes';
import { LandingComponent } from './pages/landing/landing.component';

export const routes: Routes = [
  { path: '',
    component: LandingComponent
  },
  {
    path: 'auth',
    children: authRoutes,
  },
];