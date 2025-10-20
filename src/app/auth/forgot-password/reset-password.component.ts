import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ErrorAlertComponent } from '../../shared/error/error.component';
import { ErrorMessagePipe } from '../../shared/pipes/errorMessage.pipe';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule, ErrorAlertComponent, ErrorMessagePipe],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  email = signal<string | null>(null);
  tempToken = signal<string | null>(null);
  step = signal<'verify' | 'reset'>('verify');

  verifyForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  resetForm = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

  constructor() {
    this.email.set(this.route.snapshot.queryParamMap.get('email'));
  }

  get v() {
    return this.verifyForm.controls;
  }

  get r() {
    return this.resetForm.controls;
  }

  /** Verifica que ambas contraseñas coincidan */
  private passwordMatchValidator(control: AbstractControl) {
    const pass = control.get('password')?.value;
    const confirm = control.get('confirm')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  /** Verificar código recibido */
  onVerifyCode() {
    if (this.verifyForm.invalid || !this.email()) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.verifyResetCode(this.email()!, this.verifyForm.value.code!)
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
        this.tempToken.set(res.temp_token);
        this.step.set('reset');
      });
  }

  /** Cambiar la contraseña */
  onResetPassword() {
    if (this.resetForm.invalid || !this.tempToken()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.resetPassword(this.tempToken()!, this.resetForm.value.password!)
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
        this.successMessage.set('Contraseña restablecida con éxito');
        setTimeout(() => this.router.navigateByUrl('/auth/login'), 2000);
      });
  }
}
