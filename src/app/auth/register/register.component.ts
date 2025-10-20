import { afterNextRender, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { ErrorMessagePipe } from '../../shared/pipes/errorMessage.pipe';
import { ErrorAlertComponent } from '../../shared/error/error.component';
import { GoogleAuthService } from '../../services/google-auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, MatIconModule, ErrorMessagePipe, ErrorAlertComponent, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private googleAuth = inject(GoogleAuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    // ✅ Espera que el DOM esté listo para renderizar el botón
    afterNextRender(() => {
      this.googleAuth.initGoogleButton('googleButton');
    });
  }

  /** Formulario de registro */
  form = this.fb.group({
    full_name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get f() {
    return this.form.controls;
  }

  /** Enviar registro al backend */
  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const payload = this.form.value as {
      full_name: string;
      email: string;
      password: string;
    };

    this.auth
      .register(payload)
      .pipe(
        catchError((err) => {
          this.errorMessage.set(err);
          this.loading.set(false);
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res) return;
        this.loading.set(false);

        // ✅ Redirigir al componente de verificación con el email
        this.router.navigate(['/auth/verify-email'], {
          queryParams: { email: this.form.value.email },
        });
      });
  }
}
