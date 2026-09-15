import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AdminPage,
  AdminUserSummary,
  AdminUserDetail,
  AdminUserTaskSummary,
  UserListParams,
  UserTaskListParams,
} from '../models/admin-user.model';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly apiUrl = `${environment.apiUrl}/api/admin/users`;

  constructor(private http: HttpClient) {}

  getUsers(params: UserListParams): Observable<AdminPage<AdminUserSummary>> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('size', params.size.toString());

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }

    return this.http.get<AdminPage<AdminUserSummary>>(this.apiUrl, { params: httpParams });
  }

  getUserById(id: number): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(`${this.apiUrl}/${id}`);
  }

  getUserTasks(
    id: number,
    params: UserTaskListParams,
  ): Observable<AdminPage<AdminUserTaskSummary>> {
    const httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('size', params.size.toString());

    return this.http.get<AdminPage<AdminUserTaskSummary>>(`${this.apiUrl}/${id}/tasks`, {
      params: httpParams,
    });
  }
}
