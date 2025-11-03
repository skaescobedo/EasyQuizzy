import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SessionService } from '../../../../services/session.service';

@Component({
  selector: 'app-session-join',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './session-join.component.html',
})
export class SessionJoinComponent {
  private sessionService = inject(SessionService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  nickname = signal('');
  selectedAvatar = signal('');
  sessionCode = signal('');
  showCodeInput = signal(true);
  loading = signal(false);
  error = signal<string | null>(null);

  // 🧩 Avatares variados (mezcla de estilos)
  avatars = [
    // 🦁 Animales
    'https://api.dicebear.com/9.x/thumbs/svg?seed=Lion',
    'https://api.dicebear.com/9.x/thumbs/svg?seed=Fox',
    'https://api.dicebear.com/9.x/thumbs/svg?seed=Tiger',
    'https://api.dicebear.com/9.x/thumbs/svg?seed=Cat',
    'https://api.dicebear.com/9.x/thumbs/svg?seed=Panda',
    'https://api.dicebear.com/9.x/thumbs/svg?seed=Penguin',
    'https://api.dicebear.com/9.x/thumbs/svg?seed=Dolphin',

    // 🤖 Robots / Tecnología
    'https://api.dicebear.com/9.x/bottts/svg?seed=RoboKing',
    'https://api.dicebear.com/9.x/bottts/svg?seed=ChipBot',
    'https://api.dicebear.com/9.x/bottts/svg?seed=CyberByte',
    'https://api.dicebear.com/9.x/bottts/svg?seed=Mecha',

    // 🧙‍♂️ Fantasía / Aventura
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Wizard',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Elf',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Vampire',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Knight',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Samurai',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Pirate',

    // 👩 Personas / Abstractos
    'https://api.dicebear.com/9.x/notionists/svg?seed=Artist',
    'https://api.dicebear.com/9.x/notionists/svg?seed=Scientist',
    'https://api.dicebear.com/9.x/notionists/svg?seed=Teacher',
    'https://api.dicebear.com/9.x/notionists/svg?seed=Explorer',

    // 🧩 Pixel Art / Retro
    'https://api.dicebear.com/9.x/pixel-art/svg?seed=PixelHero',
    'https://api.dicebear.com/9.x/pixel-art/svg?seed=RetroKid',
    'https://api.dicebear.com/9.x/pixel-art/svg?seed=TinyKnight',
    'https://api.dicebear.com/9.x/pixel-art/svg?seed=PixelNinja',
  ];


  async ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const code = params.get('code');
      if (code) {
        this.sessionCode.set(code);
        this.showCodeInput.set(false); 
      }
    });

    // Avatar aleatorio
    const random = Math.floor(Math.random() * this.avatars.length);
    this.selectedAvatar.set(this.avatars[random]);

    // 🧠 Validar si se puede intentar reconexión
    const savedCode = localStorage.getItem('session_code');
    const savedAccessCode = localStorage.getItem('access_code');

    if (savedAccessCode && savedCode === this.sessionCode()) {
      this.loading.set(true);
      const autoJoined = await this.sessionService.tryAutoJoin(this.sessionCode()!);
      this.loading.set(false);

      if (autoJoined) {
        this.router.navigate(['/quizz/wait']);
        return;
      }
    }
  }


  selectAvatar(url: string) {
    this.selectedAvatar.set(url);
  }

  async joinSession() {
    if (!this.nickname() || !this.sessionCode()) {
      this.error.set('Por favor ingresa tu nombre y el código de sesión.');
      return;
    }

    try {
      this.loading.set(true);
      this.error.set(null);

        await this.sessionService.joinSession(
        this.sessionCode(),
        this.nickname(),
        this.selectedAvatar()
        );
      this.router.navigate(['/quizz/wait']);
    } catch (err: any) {
      this.error.set(err.message || 'No se pudo unir a la sesión.');
    } finally {
      this.loading.set(false);
    }
  }
}
