import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { catchError, Observable, throwError, switchMap, map } from 'rxjs';
import { AuthserviceService } from './../../auth/services/authservice.service';
import { Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class HttpInterceptorInterceptor implements HttpInterceptor {
  private encryptionKey = 'AkriviaHCM';
  constructor(
    private authService: AuthserviceService,
    private router: Router
  ) {}
  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const currentUser = this.authService.getToken();
    let accessToken: string | null;
    //console.log('check api',!this.router.url.includes('/api'));
    if (
      !request.url.includes('/akv-interns') &&
      !request.url.includes('/api')
    ) {
      if (request.body) {
        //console.log(request.body);
        const encryptedBody = this.encryptPayload(request.body);
        request = request.clone({
          body: { data: encryptedBody },
          //headers: request.headers.set('Content-Type', 'application/json')
        });
      }
      return next.handle(request).pipe(
        map((event: HttpEvent<any>) => {
          if (event instanceof HttpResponse && event.body) {
            const decryptedBody = this.decryptPayload(event.body);
            // console.log("helo",decryptedBody);
            return event.clone({ body: decryptedBody });
          }
          return event;
        }),
        catchError((error: HttpErrorResponse) => {
          return throwError(error);
        })
      );
    } else {
      return next.handle(request);
    }
  }

  private encryptPayload(payload: any): string {
    return CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      this.encryptionKey
    ).toString();
  }

  private decryptPayload(encryptedPayload: any): string {
    const bytes = CryptoJS.AES.decrypt(encryptedPayload, this.encryptionKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }
}
