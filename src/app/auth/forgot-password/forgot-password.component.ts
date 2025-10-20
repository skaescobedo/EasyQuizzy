import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ErrorAlertComponent } from '../../shared/error/error.component';
import { ErrorMessagePipe } from '../../shared/pipes/errorMessage.pipe';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule, ErrorAlertComponent, ErrorMessagePipe],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const email = this.form.value.email!;

    this.auth
      .requestPasswordReset(email)
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
        this.successMessage.set('Código enviado a tu correo');
        this.router.navigate(['/auth/reset-password'], {
          queryParams: { email },
        });
      });
  }
}
