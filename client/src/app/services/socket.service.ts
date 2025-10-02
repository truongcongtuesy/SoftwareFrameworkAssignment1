import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject } from 'rxjs';
import { Message } from '../models/channel.model';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: Socket;
  private connected = false;
  
  // Observables for real-time updates
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  
  private typingUsersSubject = new BehaviorSubject<string[]>([]);
  public typingUsers$ = this.typingUsersSubject.asObservable();

  private userJoinedSubject = new BehaviorSubject<any>(null);
  public userJoined$ = this.userJoinedSubject.asObservable();

  private userLeftSubject = new BehaviorSubject<any>(null);
  public userLeft$ = this.userLeftSubject.asObservable();

  private authenticatedSubject = new BehaviorSubject<boolean>(false);
  public authenticated$ = this.authenticatedSubject.asObservable();

  constructor(private http: HttpClient) {}

  connect(userId: number, username: string): void {
    if (!this.connected) {
      this.socket = io('http://localhost:3000');
      
      this.socket.on('connect', () => {
        console.log('Connected to server');
        this.connected = true;
        
        // Authenticate user
        this.socket.emit('authenticate', { userId, username });
      });

      this.socket.on('authenticated', (data: any) => {
        console.log('User authenticated:', data);
        this.authenticatedSubject.next(true);
      });

      this.socket.on('new_message', (message: Message) => {
        const currentMessages = this.messagesSubject.value;
        this.messagesSubject.next([...currentMessages, message]);
      });

      this.socket.on('channel_messages', (messages: Message[]) => {
        this.messagesSubject.next(messages);
      });

      this.socket.on('user_typing', (data: any) => {
        const currentTyping = this.typingUsersSubject.value;
        if (!currentTyping.includes(data.username)) {
          this.typingUsersSubject.next([...currentTyping, data.username]);
        }
      });

      this.socket.on('user_stopped_typing', (data: any) => {
        const currentTyping = this.typingUsersSubject.value;
        this.typingUsersSubject.next(currentTyping.filter(user => user !== data.username));
      });

      this.socket.on('user_joined', (data: any) => {
        this.userJoinedSubject.next(data);
      });

      this.socket.on('user_left', (data: any) => {
        this.userLeftSubject.next(data);
      });

      this.socket.on('error', (error: any) => {
        console.error('Socket error:', error);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
        this.connected = false;
        this.authenticatedSubject.next(false);
      });
    }
  }

  disconnect(): void {
    if (this.socket && this.connected) {
      this.socket.disconnect();
      this.connected = false;
      this.authenticatedSubject.next(false);
    }
  }

  joinChannel(channelId: number, userId: number): void {
    if (this.socket && this.connected) {
      this.socket.emit('join_channel', { channelId, userId });
    }
  }

  leaveChannel(channelId: number): void {
    if (this.socket && this.connected) {
      this.socket.emit('leave_channel', { channelId });
    }
  }

  sendMessage(channelId: number, content: string, type: string = 'text'): void {
    if (this.socket && this.connected) {
      this.socket.emit('send_message', { channelId, content, type });
    }
  }

  startTyping(channelId: number): void {
    if (this.socket && this.connected) {
      this.socket.emit('typing_start', { channelId });
    }
  }

  stopTyping(channelId: number): void {
    if (this.socket && this.connected) {
      this.socket.emit('typing_stop', { channelId });
    }
  }

  // Video call methods
  sendVideoCallOffer(channelId: number, offer: any, targetUserId: number): void {
    if (this.socket && this.connected) {
      this.socket.emit('video_call_offer', { channelId, offer, targetUserId });
    }
  }

  sendVideoCallAnswer(answer: any, targetUserId: number): void {
    if (this.socket && this.connected) {
      this.socket.emit('video_call_answer', { answer, targetUserId });
    }
  }

  sendIceCandidate(candidate: any, targetUserId: number): void {
    if (this.socket && this.connected) {
      this.socket.emit('ice_candidate', { candidate, targetUserId });
    }
  }

  // Observable for video call events
  onVideoCallOffer(): Observable<any> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('video_call_offer', (data: any) => {
          observer.next(data);
        });
      }
    });
  }

  onVideoCallAnswer(): Observable<any> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('video_call_answer', (data: any) => {
          observer.next(data);
        });
      }
    });
  }

  onIceCandidate(): Observable<any> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('ice_candidate', (data: any) => {
          observer.next(data);
        });
      }
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  clearMessages(): void {
    this.messagesSubject.next([]);
  }

  // Get user join/leave events
  onUserJoined(): Observable<any> {
    return this.userJoined$;
  }

  onUserLeft(): Observable<any> {
    return this.userLeft$;
  }

  onAuthenticated(): Observable<boolean> {
    return this.authenticated$;
  }
}
