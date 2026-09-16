import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AdminPage,
  AdminUserSummary,
  AdminUserDetail,
  AdminUserTaskSummary,
  AdminUserTaskTypeSummary,
  AdminUpdateUserRequest,
  AdminSetUserEnabledRequest,
  AdminCreateTaskRequest,
  AdminUpdateTaskRequest,
  AdminCreateTaskTypeRequest,
  AdminUpdateTaskTypeRequest,
  UserListParams,
  UserTaskListParams,
  UserTaskTypeListParams,
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

  updateUser(id: number, body: AdminUpdateUserRequest): Observable<AdminUserDetail> {
    return this.http.patch<AdminUserDetail>(`${this.apiUrl}/${id}`, body);
  }

  setUserEnabled(id: number, enabled: boolean): Observable<AdminUserDetail> {
    return this.http.patch<AdminUserDetail>(`${this.apiUrl}/${id}/enabled`, { enabled });
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
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

  createTask(userId: number, body: AdminCreateTaskRequest): Observable<AdminUserTaskSummary> {
    return this.http.post<AdminUserTaskSummary>(`${this.apiUrl}/${userId}/tasks`, body);
  }

  updateTask(
    userId: number,
    taskId: number,
    body: AdminUpdateTaskRequest,
  ): Observable<AdminUserTaskSummary> {
    return this.http.patch<AdminUserTaskSummary>(`${this.apiUrl}/${userId}/tasks/${taskId}`, body);
  }

  deleteTask(userId: number, taskId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}/tasks/${taskId}`);
  }

  getUserTaskTypes(
    id: number,
    params: UserTaskTypeListParams,
  ): Observable<AdminPage<AdminUserTaskTypeSummary>> {
    const httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('size', params.size.toString());

    return this.http.get<AdminPage<AdminUserTaskTypeSummary>>(
      `${this.apiUrl}/${id}/task-types`,
      { params: httpParams },
    );
  }

  createTaskType(
    userId: number,
    body: AdminCreateTaskTypeRequest,
  ): Observable<AdminUserTaskTypeSummary> {
    return this.http.post<AdminUserTaskTypeSummary>(`${this.apiUrl}/${userId}/task-types`, body);
  }

  updateTaskType(
    userId: number,
    taskTypeId: number,
    body: AdminUpdateTaskTypeRequest,
  ): Observable<AdminUserTaskTypeSummary> {
    return this.http.patch<AdminUserTaskTypeSummary>(
      `${this.apiUrl}/${userId}/task-types/${taskTypeId}`,
      body,
    );
  }

  deleteTaskType(userId: number, taskTypeId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}/task-types/${taskTypeId}`);
  }
}
