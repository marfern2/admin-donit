import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { RuntimeConfigService } from '../../core/config/runtime-config.service';
import { DemoKind, DemoListParams, DemoPage, DemoStats, DemoTask, DemoTaskType, DemoTaskWrite, DemoTypeWrite, DemoUser, DemoUserWrite, FixturePreview, FixtureRestoreResult, OptionalVersioned, PublicationStatus, Versioned } from './demo-admin.model';

type DemoEntity = DemoUser | DemoTaskType | DemoTask;
type DemoWrite = DemoUserWrite | DemoTypeWrite | DemoTaskWrite;

@Injectable({ providedIn: 'root' })
export class DemoAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(RuntimeConfigService);
  private get base(): string { return `${this.config.apiUrl}/api/admin/demo`; }

  list<T extends DemoEntity>(kind: DemoKind, value: DemoListParams): Observable<DemoPage<T>> {
    let params = new HttpParams().set('page', value.page).set('size', value.size);
    for (const key of ['sort', 'search', 'publicationStatus', 'demoUserId', 'demoTaskTypeId', 'completed', 'urgency'] as const) {
      const entry = value[key];
      if (entry !== undefined && entry !== '') params = params.set(key, String(entry));
    }
    return this.http.get<DemoPage<T>>(`${this.base}/${kind}`, { params });
  }

  get<T extends DemoEntity>(kind: DemoKind, id: number): Observable<Versioned<T>> {
    return this.http.get<T>(`${this.base}/${kind}/${id}`, { observe: 'response' }).pipe(map(response => this.versioned(response)));
  }

  create<T extends DemoEntity>(kind: DemoKind, body: DemoWrite): Observable<OptionalVersioned<T>> {
    return this.http.post<T>(`${this.base}/${kind}`, body, { observe: 'response' }).pipe(map(response => this.optionalVersioned(response)));
  }

  update<T extends DemoEntity>(kind: DemoKind, id: number, body: Partial<DemoWrite>, etag: string): Observable<Versioned<T>> {
    return this.http.patch<T>(`${this.base}/${kind}/${id}`, body, { observe: 'response', headers: this.ifMatch(etag) }).pipe(map(response => this.versioned(response)));
  }

  publish<T extends DemoEntity>(kind: DemoKind, id: number, publicationStatus: PublicationStatus, etag: string): Observable<Versioned<T>> {
    return this.http.patch<T>(`${this.base}/${kind}/${id}/publication`, { publicationStatus }, { observe: 'response', headers: this.ifMatch(etag) }).pipe(map(response => this.versioned(response)));
  }

  delete(kind: 'task-types' | 'tasks', id: number, etag: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${kind}/${id}`, { headers: this.ifMatch(etag) });
  }

  stats(): Observable<DemoStats> { return this.http.get<DemoStats>(`${this.base}/stats`); }

  preview(): Observable<Versioned<FixturePreview>> {
    return this.http.get<FixturePreview>(`${this.base}/fixtures/restore-preview`, { observe: 'response' }).pipe(map(response => this.versioned(response)));
  }

  restore(etag: string): Observable<OptionalVersioned<FixtureRestoreResult>> {
    return this.http.post<FixtureRestoreResult>(`${this.base}/fixtures/restore`, null, { observe: 'response', headers: this.ifMatch(etag) }).pipe(map(response => this.optionalVersioned(response)));
  }

  private ifMatch(etag: string): HttpHeaders {
    if (!etag) throw new Error('Falta ETag para la operación');
    return new HttpHeaders({ 'If-Match': etag });
  }

  private versioned<T>(response: HttpResponse<T>): Versioned<T> {
    const value = this.optionalVersioned(response);
    const etag = value.etag;
    if (!etag) throw new Error('La API no devolvió ETag');
    return { body: value.body, etag };
  }

  private optionalVersioned<T>(response: HttpResponse<T>): OptionalVersioned<T> {
    if (response.body === null) throw new Error('Respuesta administrativa vacía');
    return { body: response.body, etag: response.headers.get('ETag') };
  }
}
