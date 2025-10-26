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

      // 🆕 Listado de quizzes
      { path: 'quizzes', loadComponent: () => import('./quizzes/quizzes').then(m => m.HostQuizzes) },

      // (opcional futuro) viewer:
      // { path: 'quizzes/:id', loadComponent: () => import('./quiz-viewer/quiz-viewer').then(m => m.QuizViewer) },
    ],
  },
];
