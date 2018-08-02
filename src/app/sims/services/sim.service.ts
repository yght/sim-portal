import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sim, SuspensionReason } from '../sim.model';
import { environment } from '../../../environments/environment';

/**
 * The platform API.
 *
 * The bearer token is attached by the interceptor rather than here - see
 * core/auth.interceptor.ts. Services should not know how auth works.
 */
@Injectable({ providedIn: 'root' })
export class SimService {
  constructor(private http: HttpClient) {}

  list(orgId: string): Observable<Sim[]> {
    const params = new HttpParams().set('orgId', orgId);
    return this.http.get<Sim[]>(environment.apiUrl + '/sims', { params });
  }

  get(iccid: string): Observable<Sim> {
    return this.http.get<Sim>(environment.apiUrl + '/sims/' + encodeURIComponent(iccid));
  }

  /**
   * The command endpoints return the SIM as the platform now understands it,
   * so the store can replace its optimistic guess with the real thing rather
   * than firing a second request to find out what happened.
   */
  suspend(iccid: string, reason: SuspensionReason): Observable<Sim> {
    return this.http.post<Sim>(
      environment.apiUrl + '/sims/' + encodeURIComponent(iccid) + '/suspend',
      { reason }
    );
  }

  resume(iccid: string): Observable<Sim> {
    return this.http.post<Sim>(
      environment.apiUrl + '/sims/' + encodeURIComponent(iccid) + '/resume',
      {}
    );
  }

  terminate(iccid: string): Observable<Sim> {
    return this.http.post<Sim>(
      environment.apiUrl + '/sims/' + encodeURIComponent(iccid) + '/terminate',
      {}
    );
  }
}
