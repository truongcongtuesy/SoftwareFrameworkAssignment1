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
          <span class="user-count">{{ channelMembers.length || 0 }} members</span>
          <button class="btn btn-primary" (click)="startVideoCall()" [disabled]="!canStartVideoCall()">
            📹 Video Call
          </button>
        </div>
      </div>

      <!-- Chat Messages -->
      <div class="chat-messages" #messagesContainer>
        <div *ngFor="let message of messages" class="message" 
             [class.own-message]="message.userId === currentUser?.id"
             [class.system-message]="message.type === 'system'">
          <div *ngIf="message.type !== 'system'" class="message-header">
            <span class="message-author">
              <img *ngIf="getAvatarUrlByUserId(message.userId)" [src]="getAvatarUrlByUserId(message.userId)" class="msg-avatar" alt="avatar">
              {{ message.username }}
            </span>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
          <div *ngIf="message.type === 'system'" class="system-message-content">
            {{ message.content }}
          </div>
          <div *ngIf="message.type === 'image'" class="image-message">
            <img [src]="resolveMessageImage(message.content)" alt="image" class="chat-image" (click)="openImagePreview(resolveMessageImage(message.content))">
          </div>
          <div *ngIf="message.type === 'video'" class="image-message">
            <video class="chat-image" controls [src]="resolveMessageImage(message.content)"></video>
          </div>
          <div *ngIf="message.type !== 'system' && message.type !== 'image' && message.type !== 'video'" class="message-content">{{ message.content }}</div>
        </div>
        
        <!-- Typing Indicators -->
        <div *ngIf="typingUsers.length > 0" class="typing-indicator">
          {{ getTypingText() }}
        </div>
      </div>

      <!-- Chat Input -->
      <div class="chat-input">
        <div class="input-group">
          <label class="btn btn-outline-secondary attach-btn" for="imageInput">📎</label>
          <input id="imageInput" type="file" (change)="onImageSelected($event)" accept="image/*" style="display:none;" />
          <label class="btn btn-outline-secondary attach-btn" for="videoInput">🎞</label>
          <input id="videoInput" type="file" (change)="onVideoSelected($event)" accept="video/*" style="display:none;" />
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
      
      <!-- Image Preview Modal -->
      <div *ngIf="previewImageUrl" class="img-preview-overlay" (click)="closeImagePreview()">
        <img class="img-preview-content" [src]="previewImageUrl" alt="preview">
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
      max-width: 35%;
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

    .msg-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      object-fit: cover;
      margin-right: 8px;
      vertical-align: middle;
      border: 1px solid #ddd;
    }

    .image-message {
      margin: 10px 0;
      width: 100%;
      display: flex;
      justify-content: center;
    }

    .chat-image {
      display: block;
      max-width: 320px;
      width: 100%;
      height: auto;
      border-radius: 10px;
    }

    .system-message {
      display: flex;
      justify-content: center;
      max-width: 100%;
      margin: 10px 0;
    }

    .system-message-content {
      background: #e9ecef;
      color: #6c757d;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-style: italic;
      display: inline-block;
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

    .attach-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
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

    /* Image preview modal */
    .img-preview-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      cursor: zoom-out;
    }
    .img-preview-content {
      max-width: 90vw;
      max-height: 90vh;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
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
  channelMembers: number[] = [];
  memberUsers: User[] = [];
  
  // Video call properties
  incomingCall: any = null;
  isInCall = false;
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  peerConnection: RTCPeerConnection | null = null;
  previewImageUrl: string | null = null;

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

    // Ensure socket connected & authenticated
    this.socketService.connect(this.currentUser.id, this.currentUser.username);

    // Get route parameters
    this.route.params.subscribe(params => {
      this.groupId = +params['groupId'];
      this.channelId = +params['channelId'];
      this.loadChannelData();

      // Wait for authenticated then join the channel
      const authSub = this.socketService.onAuthenticated().subscribe(isAuth => {
        if (isAuth) {
          this.socketService.joinChannel(this.channelId, this.currentUser!.id);
          authSub.unsubscribe();
        }
      });
      this.subscriptions.push(authSub);
    });

    // Setup socket subscriptions
    this.setupSocketListeners();
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

    // Load group members with avatar info
    const membersSub = this.groupService.getGroupMembers(this.groupId).subscribe({
      next: (users) => {
        this.memberUsers = users;
      },
      error: (error) => console.error('Error loading group members:', error)
    });

    this.subscriptions.push(groupSub, channelSub, membersSub);
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

    // User join/leave notifications
    const userJoinedSub = this.socketService.onUserJoined().subscribe(data => {
      if (data && data.username !== this.currentUser?.username) {
        // Add system message to chat
        const systemMessage: Message = {
          id: Date.now(), // Temporary ID for system messages
          channelId: this.channelId,
          userId: 0, // System user
          username: 'System',
          content: `${data.username} joined the channel`,
          type: 'system',
          timestamp: new Date(),
          edited: false
        };
        this.messages.push(systemMessage);
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });

    const userLeftSub = this.socketService.onUserLeft().subscribe(data => {
      if (data && data.username !== this.currentUser?.username) {
        // Add system message to chat
        const systemMessage: Message = {
          id: Date.now(), // Temporary ID for system messages
          channelId: this.channelId,
          userId: 0, // System user
          username: 'System',
          content: `${data.username} left the channel`,
          type: 'system',
          timestamp: new Date(),
          edited: false
        };
        this.messages.push(systemMessage);
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });

    // Video call events
    const callOfferSub = this.socketService.onVideoCallOffer().subscribe(data => {
      this.incomingCall = data;
    });

    this.subscriptions.push(messagesSub, typingSub, userJoinedSub, userLeftSub, callOfferSub);
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    this.socketService.sendMessage(this.channelId, this.newMessage);
    this.newMessage = '';
    this.socketService.stopTyping(this.channelId);
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !this.currentUser) return;
    const file = input.files[0];
    const form = new FormData();
    form.append('image', file);
    form.append('userId', String(this.currentUser.id));
    form.append('username', this.currentUser.username);
    // Upload to server image message endpoint
    fetch(`http://localhost:3000/api/channels/${this.channelId}/messages/image`, {
      method: 'POST',
      body: form
    }).then(async (res) => {
      if (!res.ok) throw new Error('Upload failed');
      // Do not append here; rely on socket 'new_message' to avoid duplicates
      await res.json().catch(() => ({}));
    }).catch(err => console.error('Upload image message failed:', err));
    // reset input
    (event.target as HTMLInputElement).value = '';
  }

  onVideoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !this.currentUser) return;
    const file = input.files[0];
    const form = new FormData();
    form.append('video', file);
    form.append('userId', String(this.currentUser.id));
    form.append('username', this.currentUser.username);
    fetch(`http://localhost:3000/api/channels/${this.channelId}/messages/video`, {
      method: 'POST',
      body: form
    }).then(async (res) => {
      if (!res.ok) throw new Error('Upload failed');
      await res.json().catch(() => ({}));
    }).catch(err => console.error('Upload video message failed:', err));
    (event.target as HTMLInputElement).value = '';
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
      (container as HTMLElement).scrollTop = (container as HTMLElement).scrollHeight;
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  canSendMessages(): boolean {
    return this.socketService.isConnected() && !!this.currentUser;
  }

  canStartVideoCall(): boolean {
    const count = this.memberUsers?.length ? this.memberUsers.length : (this.channelMembers?.length || 0);
    return count > 1;
  }

  getAvatarUrlByUserId(userId: number): string {
    // Find from detailed member users loaded from server
    const member = (this.memberUsers || []).find((m: any) => m?.id === userId);
    const avatarUrl: string | undefined = (member as any)?.avatarUrl;
    if (!avatarUrl) return '';
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return `http://localhost:3000${avatarUrl}`;
  }

  resolveMessageImage(pathStr: string): string {
    if (!pathStr) return '';
    return pathStr.startsWith('http') ? pathStr : `http://localhost:3000${pathStr}`;
  }

  openImagePreview(url: string) {
    this.previewImageUrl = url;
  }

  closeImagePreview() {
    this.previewImageUrl = null;
  }

  // Video call methods
  async startVideoCall() {
    console.log('Starting video call...');
  }

  acceptCall() {
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
