import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = 'http://localhost:3000/api/users';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
    }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  updateUser(id: number, updateData: Partial<User>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, updateData);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  promoteUser(id: number, role: 'group-admin' | 'super-admin'): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/promote`, { role });
  }

  demoteUser(id: number, role: 'group-admin' | 'super-admin'): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/demote`, { role });
  }

  uploadAvatar(id: number, file: File): Observable<User> {
    const form = new FormData();
    form.append('avatar', file);
    return this.http.post<{ success: boolean; user: User }>(`${this.apiUrl}/${id}/avatar`, form)
      .pipe((source: any) => source);
  }
}


