import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root',
})
export class AuthserviceService {
  private apiUrl = environment.Url;

  constructor(private http: HttpClient) {}

  signup(
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ): Observable<any> {
    const body = {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
    };
    return this.http
      .post(`${this.apiUrl}/auth/signup`, body)
      .pipe(catchError(this.handleError));
  }

  login(email: string, password: string): Observable<any> {
    const body = { email, password };
    return this.http
      .post(`${this.apiUrl}/auth/login`, body)
      .pipe(catchError(this.handleError));
  }
  getAllUsers(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/user/getAll`)
      .pipe(catchError(this.handleError));
  }

  isBrowser(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.sessionStorage !== 'undefined'
    );
  }

  setToken(token: string): void {
    if (this.isBrowser()) {
      sessionStorage.setItem('access_token', token);
    }
  }

  setRefreshToken(token: string): void {
    if (this.isBrowser()) {
      sessionStorage.setItem('refresh_token', token);
    }
  }

  getToken(): any {
    if (this.isBrowser()) {
      return sessionStorage.getItem('access_token');
    }
    return null;
  }

  refreshToken(): Observable<any> {
    const refreshToken = sessionStorage.getItem('refresh_token');
    return this.http.post<any>(`${this.apiUrl}/auth/refresh`, {
      refresh_token: refreshToken,
    });
  }

  logout(): void {
    localStorage.removeItem('access_token');
  }

  private handleError(error: any): Observable<any> {
    console.error(error);
    throw error;
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/send-email`, { email });
  }

  resetPassword(token: string | null, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, {
      token,
      newPassword,
    });
  }
}
