import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminPage } from '../../../shared/models/admin-page.model';
import { AdminTaskSummary, AdminTaskDetail, TaskListParams } from '../models/admin-task.model';

@Injectable({ providedIn: 'root' })
export class AdminTasksService {
  private readonly apiUrl = `${environment.apiUrl}/api/admin/tasks`;

  constructor(private http: HttpClient) {}

  getTasks(params: TaskListParams): Observable<AdminPage<AdminTaskSummary>> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('size', params.size.toString());

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.userId !== undefined) {
      httpParams = httpParams.set('userId', params.userId.toString());
    }
    if (params.completed !== undefined) {
      httpParams = httpParams.set('completed', params.completed.toString());
    }
    if (params.urgency) {
      httpParams = httpParams.set('urgency', params.urgency);
    }
    if (params.taskTypeId !== undefined) {
      httpParams = httpParams.set('taskTypeId', params.taskTypeId.toString());
    }
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }

    return this.http.get<AdminPage<AdminTaskSummary>>(this.apiUrl, { params: httpParams });
  }

  getTaskById(id: number): Observable<AdminTaskDetail> {
    return this.http.get<AdminTaskDetail>(`${this.apiUrl}/${id}`);
  }
}
