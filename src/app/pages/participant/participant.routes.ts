import { Routes } from '@angular/router';
import { SessionJoinComponent } from './session/session-join/session-join.component';
import { SessionWaitComponent } from './session/session-wait/session-wait.component';
import { SessionPlayComponent } from './session/session-play/session-play.component';

export const participantRoutes: Routes = [
  // 1️⃣ Ruta principal: unirse sin código
  {
    path: '',
    component: SessionJoinComponent,
  },

  // 2️⃣ Ruta explícita de espera (debe ir antes del parámetro dinámico)
  {
    path: 'wait',
    component: SessionWaitComponent,
  },

  // 3️⃣ Ruta para jugar (fase del quiz)
  {
    path: 'play',
    component: SessionPlayComponent,
  },

  // 4️⃣ Ruta con código (debe ir al final)
  {
    path: ':code',
    component: SessionJoinComponent,
  },
];
