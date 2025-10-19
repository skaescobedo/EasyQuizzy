import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { ErrorAlertComponent } from "../../shared/error/error.component";
import { ErrorMessagePipe } from '../../shared/pipes/errorMessage.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, MatIconModule, ErrorAlertComponent, ErrorMessagePipe],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
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

    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: async () => {
        this.loading.set(false);
        await this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err);
      },
    });
  }
}
