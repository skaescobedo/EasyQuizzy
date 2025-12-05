import { Injectable, signal, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserOut } from '../models/user.model';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private apiAuthUrl = `${environment.apiUrl}/auth`;

  private accessTokenKey = 'access_token';
  private refreshTokenKey = 'refresh_token';
  private tokenExpiryKey = 'token_expiry';

  isAuthenticated = signal<boolean>(false);
  currentUser = signal<UserOut | null>(null);

  /** Restaura sesión al iniciar */
  async restoreSession(): Promise<void> {
    const token = localStorage.getItem(this.accessTokenKey);
    const refresh = localStorage.getItem(this.refreshTokenKey);

    if (token && refresh) {
      this.isAuthenticated.set(true);
      try {
        await firstValueFrom(this.loadCurrentUser());
      } catch {
        this.isAuthenticated.set(false);
        this.clearSession();
      }
    } else {
      this.isAuthenticated.set(false);
    }
  }

  /** Login normal */
  login(email: string, password: string): Observable<TokenResponse> {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    return this.http.post<TokenResponse>(`${this.apiAuthUrl}/login`, formData).pipe(
      tap((res) => this.handleAuthResponse(res))
    );
  }

  /** Registro */
  register(data: { full_name: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiAuthUrl}/register`, data);
  }

  /** Verificar email */
  verifyEmail(code: string): Observable<any> {
    return this.http.post(`${this.apiAuthUrl}/verify-email`, { code });
  }

  /** Reenviar código */
  resendVerification(email: string): Observable<any> {
    return this.http.post(`${this.apiAuthUrl}/resend-verification?email=${email}`, {});
  }

  /** Solicitar reset de contraseña */
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiAuthUrl}/request-password-reset`, { email });
  }

  /** Verificar código de reset */
  verifyResetCode(email: string, code: string): Observable<any> {
    return this.http.post(`${this.apiAuthUrl}/verify-reset-code`, { email, code });
  }

  /** Restablecer contraseña */
  resetPassword(tempToken: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiAuthUrl}/reset-password`, { temp_token: tempToken, new_password: newPassword });
  }

  /** Login con Google */
  googleLogin(id_token_str: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiAuthUrl}/google-login`, { id_token_str }).pipe(
      tap((res) => this.handleAuthResponse(res))
    );
  }

  /** Carga datos de usuario actual */
  loadCurrentUser(): Observable<UserOut> {
    return this.http.get<UserOut>(`${this.apiAuthUrl}/me`).pipe(
      tap((user) => this.currentUser.set(user))
    );
  }

  /** Refresh token */
  refreshToken(): Observable<TokenResponse> {
    const refresh = localStorage.getItem(this.refreshTokenKey);
    if (!refresh) throw new Error('No refresh token');

    return this.http.post<TokenResponse>(`${this.apiAuthUrl}/refresh`, { refresh_token: refresh }).pipe(
      tap((res) => this.handleAuthResponse(res))
    );
  }

  /** Logout */
  async logout() {
    const refresh = localStorage.getItem(this.refreshTokenKey);
    if (refresh) {
      this.http.post(`${this.apiAuthUrl}/logout`, { refresh_token: refresh }).subscribe();
    }
    this.clearSession();
  }

  /** Maneja almacenamiento y estado tras login o refresh */
  private async handleAuthResponse(res: TokenResponse) {
    const expiry = Date.now() + res.expires_in * 1000;
    localStorage.setItem(this.accessTokenKey, res.access_token);
    localStorage.setItem(this.refreshTokenKey, res.refresh_token);
    localStorage.setItem(this.tokenExpiryKey, expiry.toString());
    this.isAuthenticated.set(true);
    await firstValueFrom(this.loadCurrentUser());
  }

  /** Limpieza de sesión */
  clearSession(): void {
    localStorage.clear();
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.router.navigateByUrl('/', { replaceUrl: true });
  }

  /** Obtener token actual */
  getAccessToken(): Promise<string | null> {
    return Promise.resolve(localStorage.getItem('access_token'));
  }
}
