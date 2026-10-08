import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from '../core/config/runtime-config.service';
import { PublicDemoListParams, PublicDemoPage, PublicDemoStats, PublicDemoTask, PublicDemoTaskType, PublicDemoUser } from './public-demo.model';

@Injectable({ providedIn: 'root' })
export class PublicDemoApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(RuntimeConfigService);
  private get base(): string { return `${this.config.apiUrl}/api/public/demo`; }

  users(params: PublicDemoListParams): Observable<PublicDemoPage<PublicDemoUser>> { return this.http.get<PublicDemoPage<PublicDemoUser>>(`${this.base}/users`, { params: this.params(params) }); }
  user(publicId: string): Observable<PublicDemoUser> { return this.http.get<PublicDemoUser>(`${this.base}/users/${encodeURIComponent(publicId)}`); }
  taskTypes(params: PublicDemoListParams): Observable<PublicDemoPage<PublicDemoTaskType>> { return this.http.get<PublicDemoPage<PublicDemoTaskType>>(`${this.base}/task-types`, { params: this.params(params) }); }
  taskType(publicId: string): Observable<PublicDemoTaskType> { return this.http.get<PublicDemoTaskType>(`${this.base}/task-types/${encodeURIComponent(publicId)}`); }
  tasks(params: PublicDemoListParams): Observable<PublicDemoPage<PublicDemoTask>> { return this.http.get<PublicDemoPage<PublicDemoTask>>(`${this.base}/tasks`, { params: this.params(params) }); }
  task(publicId: string): Observable<PublicDemoTask> { return this.http.get<PublicDemoTask>(`${this.base}/tasks/${encodeURIComponent(publicId)}`); }
  stats(): Observable<PublicDemoStats> { return this.http.get<PublicDemoStats>(`${this.base}/stats`); }

  private params(value: PublicDemoListParams): HttpParams {
    let params = new HttpParams().set('page', value.page).set('size', value.size);
    if (value.search && value.search.trim().length >= 2 && value.search.trim().length <= 60) params = params.set('search', value.search.trim());
    if (value.sort) params = params.set('sort', value.sort);
    if (value.userPublicId) params = params.set('userPublicId', value.userPublicId);
    if (value.taskTypePublicId) params = params.set('taskTypePublicId', value.taskTypePublicId);
    if (value.completed !== undefined) params = params.set('completed', value.completed);
    if (value.urgency !== undefined) params = params.set('urgency', value.urgency);
    return params;
  }
}
