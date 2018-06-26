import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { scopesFrom } from './permissions';

const ORG_CLAIM = 'https://simplatform.io/org';

export interface DecodedToken {
  sub: string;
  scope?: string;
  permissions?: string[];
  exp: number;
  [claim: string]: any;
}

/**
 * Auth0 session handling.
 *
 * The access token lives in memory, not localStorage. A token in
 * localStorage is readable by any script that gets onto the page, and this
 * one can terminate phone lines.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private token$ = new BehaviorSubject<DecodedToken | null>(null);
  private accessToken: string | null = null;

  setSession(accessToken: string, decoded: DecodedToken): void {
    this.accessToken = accessToken;
    this.token$.next(decoded);
  }

  clearSession(): void {
    this.accessToken = null;
    this.token$.next(null);
  }

  bearer(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    const token = this.token$.getValue();
    return Boolean(token) && token.exp * 1000 > Date.now();
  }

  scopes(): string[] {
    return scopesFrom(this.token$.getValue());
  }

  scopes$(): Observable<string[]> {
    return this.token$.pipe(map(token => scopesFrom(token)));
  }

  orgId(): string {
    const token = this.token$.getValue();
    return token ? token[ORG_CLAIM] : null;
  }
}
