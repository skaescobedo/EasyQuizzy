import { afterNextRender, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { ErrorAlertComponent } from '../../shared/error/error.component';
import { ErrorMessagePipe } from '../../shared/pipes/errorMessage.pipe';
import { catchError, of } from 'rxjs';
import { GoogleAuthService } from '../../services/google-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatIconModule,
    RouterModule,
    ErrorAlertComponent,
    ErrorMessagePipe,
    RouterLink
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private googleAuth = inject(GoogleAuthService);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    // ✅ Espera que el DOM esté listo para renderizar el botón
    afterNextRender(() => {
      this.googleAuth.initGoogleButton('googleButton');
    });
  }

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get f() {
    return this.form.controls;
  }

  /** 🔹 Iniciar sesión normal */
  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.value;

    this.auth.login(email!, password!).pipe(
      catchError((err) => {
        this.errorMessage.set(err);
        this.loading.set(false);
        return of(null);
      })
    ).subscribe((res) => {
      if (!res) return;
      this.loading.set(false);
      this.router.navigateByUrl('/host');
    });
  }
}
