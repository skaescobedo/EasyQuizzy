import { Routes } from '@angular/router';
import { HostLayoutComponent } from './host-layout.component';
import { HostHomeComponent } from './home/host-home.component';
import { CreateQuizComponent } from './create-quiz/create-quiz.component';

export const hostRoutes: Routes = [
  {
    path: '',
    component: HostLayoutComponent,
    children: [
      { path: '', component: HostHomeComponent },
      { path: 'create', component: CreateQuizComponent },
    //   { path: 'quizzes', loadComponent: () => import('../pages/host-quizzes/host-quizzes.component').then(m => m.HostQuizzesComponent) },
    //   { path: 'analytics', loadComponent: () => import('../pages/host-analytics/host-analytics.component').then(m => m.HostAnalyticsComponent) },
    //   { path: 'profile', loadComponent: () => import('../pages/host-profile/host-profile.component').then(m => m.HostProfileComponent) },
    ],
  },
];
