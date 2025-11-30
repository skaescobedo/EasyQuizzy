import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { SessionService } from '../../../../services/session.service';
import { environment } from '../../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';

declare const navigator: Navigator;

@Component({
  selector: 'app-session-host',
  standalone: true,
  imports: [CommonModule, QRCodeComponent],
  templateUrl: './session-host.component.html',
})
export class SessionHostComponent {
  private session = inject(SessionService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  domainUrl = environment.domainUrl;

  code = this.session.code;
  quizTitle = this.session.quizTitle;
  participants = this.session.participants;
  isConnected = this.session.isConnected;

  get joinUrl() {
    return `${this.domainUrl}/quizz/${this.code()}`;
  }

  startQuiz() {
    this.session.send('start_quiz');
    this.router.navigate(['/host/play']);
  }

  async endSession() {
    if (!confirm('¿Seguro que deseas finalizar la actividad?')) return;

    try {
      await this.session.endSession();
      this.toastr.info('Sesión finalizada correctamente 🏁', 'Actividad cerrada');
      this.router.navigate(['/host/quizzes']);
    } catch {
      this.toastr.error('No se pudo cerrar la sesión.', 'Error');
    }
  }

  async copyLink() {
    try {
      await navigator.clipboard.writeText(this.joinUrl);
      this.toastr.success('Enlace copiado al portapapeles 📋', '¡Copiado!');
    } catch {
      this.toastr.error('No se pudo copiar el enlace', 'Error');
    }
  }

  // ✅ Si el participante tiene avatar_url lo usamos, si no generamos uno
  getAvatar(p: { nickname: string; avatar_url?: string }) {
    return (
      p.avatar_url ||
      `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(p.nickname)}`
    );
  }
}
