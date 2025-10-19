import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)] px-4">
      <div class="max-w-md w-full bg-[var(--color-bg)] border border-[var(--color-border)] p-6 md:p-8 rounded-2xl shadow-[0_0_10px_0_var(--color-shadow)]">
        
        <div class="flex justify-center items-center mb-6">
          <img src="assets/logo-full.png" alt="EasyQuizzy" class="h-30 md:h-40 object-contain" />
        </div>

        <h2 class="text-center mb-2">¿Olvidaste tu contraseña?</h2>
        <p class="subtitle text-center mb-6">
          Te enviaremos un código para restablecer tu contraseña
        </p>

        <form (ngSubmit)="onSubmit()">
          <input
            name="email"
            type="email"
            placeholder="Correo electrónico"
            class="input my-3"
            required
          />

          <button type="submit" class="btn btn--primary mt-4">
            Enviar código
          </button>
        </form>

        <div class="text-center mt-6">
          <a routerLink="/auth/login" class="link">
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  loading = signal(false);
  onSubmit() {
    this.loading.set(true);
    // TODO: enviar solicitud de recuperación
  }
}
