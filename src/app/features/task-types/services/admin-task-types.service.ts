import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminPage } from '../../../shared/models/admin-page.model';
import { AdminTaskTypeSummary, AdminTaskTypeDetail, TaskTypeListParams } from '../models/admin-task-type.model';

@Injectable({ providedIn: 'root' })
export class AdminTaskTypesService {
  private readonly apiUrl = `${environment.apiUrl}/api/admin/task-types`;

  constructor(private http: HttpClient) {}

  getTaskTypes(params: TaskTypeListParams): Observable<AdminPage<AdminTaskTypeSummary>> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('size', params.size.toString());

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }

    return this.http.get<AdminPage<AdminTaskTypeSummary>>(this.apiUrl, { params: httpParams });
  }

  getTaskTypeById(id: number): Observable<AdminTaskTypeDetail> {
    return this.http.get<AdminTaskTypeDetail>(`${this.apiUrl}/${id}`);
  }
}
