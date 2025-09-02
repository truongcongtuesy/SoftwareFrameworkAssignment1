import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { ChannelService } from '../../services/channel.service';
import { GroupService } from '../../services/group.service';
import { Message } from '../../models/channel.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-container">
      <!-- Chat Header -->
      <div class="chat-header">
        <div class="header-left">
          <button class="btn btn-secondary" (click)="goBack()">← Back</button>
          <h3>{{ groupName }} / {{ channelName }}</h3>
        </div>
        <div class="header-right">
          <span class="user-count">{{ channelMembers?.length || 0 }} members</span>
          <button class="btn btn-primary" (click)="startVideoCall()" [disabled]="!canStartVideoCall()">
            📹 Video Call
          </button>
        </div>
      </div>

      <!-- Chat Messages -->
      <div class="chat-messages" #messagesContainer>
        <div *ngFor="let message of messages" class="message" 
             [class.own-message]="message.userId === currentUser?.id">
          <div class="message-header">
            <span class="message-author">{{ message.username }}</span>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
          <div class="message-content">{{ message.content }}</div>
        </div>
        
        <!-- Typing Indicators -->
        <div *ngIf="typingUsers.length > 0" class="typing-indicator">
          {{ getTypingText() }}
        </div>
      </div>

      <!-- Chat Input -->
      <div class="chat-input">
        <div class="input-group">
          <input 
            type="text" 
            class="form-control" 
            [(ngModel)]="newMessage"
            (keydown)="onKeyDown($event)"
            (input)="onTyping()"
            placeholder="Type a message..."
            [disabled]="!canSendMessages()"
          >
          <button 
            class="btn btn-primary" 
            (click)="sendMessage()"
            [disabled]="!newMessage.trim() || !canSendMessages()"
          >
            Send
          </button>
        </div>
      </div>

      <!-- Video Call Modal -->
      <div *ngIf="incomingCall" class="video-call-modal">
        <div class="modal-content">
          <h4>Incoming Video Call</h4>
          <p>{{ incomingCall.fromUsername }} is calling you</p>
          <div class="call-actions">
            <button class="btn btn-success" (click)="acceptCall()">Accept</button>
            <button class="btn btn-danger" (click)="rejectCall()">Reject</button>
          </div>
        </div>
      </div>

      <!-- Video Call Interface -->
      <div *ngIf="isInCall" class="video-call-interface">
        <div class="video-container">
          <video #localVideo autoplay muted class="local-video"></video>
          <video #remoteVideo autoplay class="remote-video"></video>
        </div>
        <div class="call-controls">
          <button class="btn btn-danger" (click)="endCall()">End Call</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f5f7fa;
    }

    .chat-header {
      background: white;
      padding: 15px 20px;
      border-bottom: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .user-count {
      color: #6c757d;
      font-size: 14px;
    }

    .chat-messages {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      background: #f8f9fa;
    }

    .message {
      margin-bottom: 15px;
      max-width: 70%;
    }

    .message.own-message {
      margin-left: auto;
    }

    .message.own-message .message-content {
      background: #007bff;
      color: white;
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }

    .message-author {
      font-weight: 600;
      color: #007bff;
    }

    .message-time {
      font-size: 12px;
      color: #6c757d;
    }

    .message-content {
      background: white;
      padding: 10px 15px;
      border-radius: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      word-wrap: break-word;
    }

    .typing-indicator {
      font-style: italic;
      color: #6c757d;
      padding: 10px;
    }

    .chat-input {
      background: white;
      padding: 20px;
      border-top: 1px solid #ddd;
    }

    .input-group {
      display: flex;
      gap: 10px;
    }

    .input-group .form-control {
      flex: 1;
    }

    .video-call-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
      min-width: 300px;
    }

    .call-actions {
      display: flex;
      gap: 15px;
      margin-top: 20px;
      justify-content: center;
    }

    .video-call-interface {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: black;
      z-index: 999;
    }

    .video-container {
      position: relative;
      width: 100%;
      height: calc(100% - 60px);
    }

    .remote-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .local-video {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 200px;
      height: 150px;
      border-radius: 10px;
      object-fit: cover;
      border: 2px solid white;
    }

    .call-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 20px;
      text-align: center;
      background: rgba(0,0,0,0.5);
    }

    @media (max-width: 768px) {
      .chat-header {
        flex-direction: column;
        gap: 10px;
      }

      .message {
        max-width: 85%;
      }

      .local-video {
        width: 120px;
        height: 90px;
      }
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy {
  groupId!: number;
  channelId!: number;
  groupName = '';
  channelName = '';
  currentUser: User | null = null;
  messages: Message[] = [];
  newMessage = '';
  typingUsers: string[] = [];
  channelMembers: any[] = [];
  
  // Video call properties
  incomingCall: any = null;
  isInCall = false;
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  peerConnection: RTCPeerConnection | null = null;

  private subscriptions: Subscription[] = [];
  private typingTimer: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private socketService: SocketService,
    private channelService: ChannelService,
    private groupService: GroupService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Get route parameters
    this.route.params.subscribe(params => {
      this.groupId = +params['groupId'];
      this.channelId = +params['channelId'];
      this.loadChannelData();
    });

    // Setup socket subscriptions
    this.setupSocketListeners();
    
    // Join the channel
    this.socketService.joinChannel(this.channelId, this.currentUser.id);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.socketService.leaveChannel(this.channelId);
    this.endCall();
  }

  loadChannelData() {
    // Load group info
    const groupSub = this.groupService.getGroupById(this.groupId).subscribe({
      next: (group) => {
        this.groupName = group.name;
      },
      error: (error) => console.error('Error loading group:', error)
    });

    // Load channel info
    const channelSub = this.channelService.getChannelById(this.channelId).subscribe({
      next: (channel) => {
        this.channelName = channel.name;
        this.channelMembers = channel.members;
      },
      error: (error) => console.error('Error loading channel:', error)
    });

    this.subscriptions.push(groupSub, channelSub);
  }

  setupSocketListeners() {
    // Messages
    const messagesSub = this.socketService.messages$.subscribe(messages => {
      this.messages = messages;
      setTimeout(() => this.scrollToBottom(), 100);
    });

    // Typing indicators
    const typingSub = this.socketService.typingUsers$.subscribe(users => {
      this.typingUsers = users.filter(user => user !== this.currentUser?.username);
    });

    // Video call events
    const callOfferSub = this.socketService.onVideoCallOffer().subscribe(data => {
      this.incomingCall = data;
    });

    this.subscriptions.push(messagesSub, typingSub, callOfferSub);
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    this.socketService.sendMessage(this.channelId, this.newMessage);
    this.newMessage = '';
    this.socketService.stopTyping(this.channelId);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onTyping() {
    this.socketService.startTyping(this.channelId);
    
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.socketService.stopTyping(this.channelId);
    }, 1000);
  }

  formatTime(timestamp: Date): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getTypingText(): string {
    if (this.typingUsers.length === 0) return '';
    if (this.typingUsers.length === 1) return `${this.typingUsers[0]} is typing...`;
    if (this.typingUsers.length === 2) return `${this.typingUsers[0]} and ${this.typingUsers[1]} are typing...`;
    return `${this.typingUsers.length} people are typing...`;
  }

  scrollToBottom() {
    const container = document.querySelector('.chat-messages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  canSendMessages(): boolean {
    return this.socketService.isConnected() && !!this.currentUser;
  }

  canStartVideoCall(): boolean {
    return this.channelMembers && this.channelMembers.length > 1;
  }

  // Video call methods
  async startVideoCall() {
    // Implementation for starting video call
    console.log('Starting video call...');
  }

  acceptCall() {
    // Implementation for accepting call
    console.log('Accepting call...');
    this.incomingCall = null;
    this.isInCall = true;
  }

  rejectCall() {
    this.incomingCall = null;
  }

  endCall() {
    this.isInCall = false;
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}
