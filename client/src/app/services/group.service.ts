import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Group, CreateGroupRequest } from '../models/group.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private apiUrl = 'http://localhost:3000/api/groups';

  constructor(private http: HttpClient) {}

  getAllGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(this.apiUrl);
  }

  getGroupById(id: number): Observable<Group> {
    return this.http.get<Group>(`${this.apiUrl}/${id}`);
  }

  createGroup(groupData: CreateGroupRequest): Observable<any> {
    return this.http.post(this.apiUrl, groupData);
  }

  updateGroup(id: number, updateData: Partial<Group>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, updateData);
  }

  deleteGroup(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  addMemberById(groupId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${groupId}/members`, { userId });
  }

  addMemberByUsername(groupId: number, username: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${groupId}/members`, { username });
  }

  removeMember(groupId: number, userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${groupId}/members/${userId}`);
  }

  getGroupMembers(groupId: number): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/${groupId}/members`);
  }

  getGroupChannels(groupId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${groupId}/channels`);
  }

  // Join requests flow
  requestJoinGroup(groupId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${groupId}/join`, { userId });
  }

  cancelJoinRequest(groupId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${groupId}/join/cancel`, { userId });
  }

  getGroupJoinRequests(groupId: number): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/${groupId}/requests`);
  }

  approveJoinRequest(groupId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${groupId}/requests/${userId}/approve`, {});
  }

  rejectJoinRequest(groupId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${groupId}/requests/${userId}/reject`, {});
  }
}
