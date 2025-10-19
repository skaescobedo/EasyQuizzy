import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { ErrorAlertComponent } from '../../shared/error/error.component';
import { ErrorMessagePipe } from '../../shared/pipes/errorMessage.pipe';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, MatIconModule, ErrorAlertComponent, ErrorMessagePipe],
  templateUrl: './verify-email.component.html',
})
export class VerifyEmailComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  loading = signal(false);
  email = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  /** Formulario de verificación */
  verifyForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  get v() {
    return this.verifyForm.controls;
  }

  constructor() {
    // Obtener email desde query param (?email=...)
    const emailParam = this.route.snapshot.queryParamMap.get('email');
    if (emailParam) this.email.set(emailParam);
  }

  /** Verificar código */
  onVerify() {
    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.auth
      .verifyEmail(this.verifyForm.value.code!)
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
        this.successMessage.set('✅ Correo verificado correctamente.');
        setTimeout(() => this.router.navigateByUrl('/auth/login'), 1500);
      });
  }

  /** Reenviar código */
  onResend() {
    if (!this.email()) {
      this.errorMessage.set('No se puede reenviar sin un correo registrado.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.auth
      .resendVerification(this.email()!)
      .pipe(
        catchError((err) => {
          this.errorMessage.set(err);
          this.loading.set(false);
          return of(null);
        })
      )
      .subscribe((res: any) => {
        if (!res) return;
        this.loading.set(false);
        this.successMessage.set(res.message || 'Se ha reenviado el código a tu correo.');
      });
  }
}
