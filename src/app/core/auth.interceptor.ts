import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/**
 * Attach the bearer token to platform requests, and only to platform
 * requests. Sending it to anything else would leak a token that can suspend
 * phone lines to whatever third party we happened to be calling.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.bearer();

    if (!token || req.url.indexOf(environment.apiUrl) !== 0) {
      return next.handle(req);
    }

    return next.handle(
      req.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
    );
  }
}
