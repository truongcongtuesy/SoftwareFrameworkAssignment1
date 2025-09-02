import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Channel, CreateChannelRequest, Message } from '../models/channel.model';

@Injectable({
  providedIn: 'root'
})
export class ChannelService {
  private apiUrl = 'http://localhost:3000/api/channels';

  constructor(private http: HttpClient) {}

  getAllChannels(): Observable<Channel[]> {
    return this.http.get<Channel[]>(this.apiUrl);
  }

  getChannelById(id: number): Observable<Channel> {
    return this.http.get<Channel>(`${this.apiUrl}/${id}`);
  }

  createChannel(channelData: CreateChannelRequest): Observable<any> {
    return this.http.post(this.apiUrl, channelData);
  }

  updateChannel(id: number, updateData: Partial<Channel>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, updateData);
  }

  deleteChannel(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getChannelMessages(channelId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/${channelId}/messages`);
  }

  addMember(channelId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${channelId}/members`, { userId });
  }

  removeMember(channelId: number, userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${channelId}/members/${userId}`);
  }

  banUser(channelId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${channelId}/ban`, { userId });
  }

  unbanUser(channelId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${channelId}/unban`, { userId });
  }
}
