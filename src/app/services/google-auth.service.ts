import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private clientId = environment.googleClientId;

  constructor(private auth: AuthService, private router: Router) {}

  initGoogleButton(elementId: string) {
    google.accounts.id.initialize({
      client_id: this.clientId,
      callback: (response: any) => this.handleGoogleResponse(response),
    });

    google.accounts.id.renderButton(document.getElementById(elementId), {
      theme: 'outline',
      size: 'large',
      text: 'signup_with',
      shape: 'pill',
      logo_alignment: 'left',
      width: '100%',  
    });
  }

  private handleGoogleResponse(response: any) {
    const id_token = response.credential;

    this.auth.googleLogin(id_token).subscribe({
      next: (res) => {
        console.log('✅ Login con Google exitoso', res);
        // 🔹 Guardar tokens (igual que en tu login normal)
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('refresh_token', res.refresh_token);
        this.router.navigate(['/host']);
      },
      error: (err) => {
        console.error('❌ Error login con Google', err);
      },
    });
  }
}
