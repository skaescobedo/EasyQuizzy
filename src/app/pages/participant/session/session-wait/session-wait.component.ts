import { Component, ChangeDetectionStrategy, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionService } from '../../../../services/session.service';

@Component({
  selector: 'app-session-wait',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-wait.component.html',
})
export class SessionWaitComponent {
  private session = inject(SessionService);
  private router = inject(Router);

  code = this.session.code;
  participants = this.session.participants;
  isConnected = this.session.isConnected;

  // ✅ Signals locales para mostrar avatar y nickname propios
  myAvatar = signal<string | null>(null);
  myNickname = signal<string | null>(null);

  constructor() {
    // 🔹 Cargar avatar y nickname del localStorage al entrar
    this.myAvatar.set(localStorage.getItem('avatar_url'));
    this.myNickname.set(localStorage.getItem('nickname'));

    // 👀 Efecto reactivo: cuando el host inicie el quiz
    effect(() => {
      if (this.session.questions().length > 0) {
        console.log('🚀 Quiz recibido, navegando a /quizz/play');
        this.router.navigate(['/quizz/play']);
      }
    });
  }

  getAvatar(nickname: string) {
    return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(nickname)}`;
  }

  leaveSession() {
    this.session.clearLocalSession();
    this.session.disconnect();
    this.router.navigate(['/']);
  }
}
