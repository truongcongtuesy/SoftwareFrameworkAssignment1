import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { UsersService } from '../../services/users.service';
import { ChannelService } from '../../services/channel.service';
import { SocketService } from '../../services/socket.service';
import { User } from '../../models/user.model';
import { Group } from '../../models/group.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="dashboard-container">
      <!-- Navigation Bar -->
      <nav class="navbar">
        <div class="navbar-left">
          <div class="navbar-brand">
            <span class="brand-logo">💬</span>
            <span>Chat System</span>
          </div>
        </div>
        <div class="navbar-right">
          <div class="nav-userbox">
            <img *ngIf="currentUser?.avatarUrl" [src]="getAvatarUrl()" class="nav-avatar" alt="avatar">
            <div class="nav-user-info">
              <div class="nav-user">{{ currentUser?.username }}</div>
              <div class="nav-role-badge" [class.super]="getUserRoleDisplay() === 'Super Admin'" [class.group]="getUserRoleDisplay() === 'Group Admin'">
                {{ getUserRoleDisplay() }}
              </div>
            </div>
          </div>
          <div *ngIf="currentUser?.roles?.includes('super-admin')" class="nav-notify" title="Pending join requests" (click)="toggleNotifyDropdown($event)">
            <span class="notify-icon">🔔</span>
            <span class="notify-badge" *ngIf="pendingRequestsTotal > 0">{{ pendingRequestsTotal }}</span>
            <div class="notify-dropdown" *ngIf="showNotifyDropdown">
              <div class="notify-header">Pending Requests</div>
              <div *ngIf="pendingRequestsTotal === 0" class="notify-empty">No pending requests</div>
              <div *ngFor="let item of pendingDetails" class="notify-group">
                <div class="notify-group-title">{{ item.groupName }} ({{ item.users.length }})</div>
                <ul class="notify-users">
                  <li *ngFor="let u of item.users">{{ u.username }} <span class="muted">{{ u.email }}</span></li>
                </ul>
              </div>
              <div class="notify-footer" *ngIf="pendingDetails.length > 0">
                <button class="btn btn-secondary" routerLink="/admin">Open Admin</button>
              </div>
            </div>
          </div>
          <div class="nav-actions">
            <label class="btn btn-outline-primary" for="avatarInput">Upload Avatar</label>
            <input id="avatarInput" type="file" (change)="onAvatarSelected($event)" accept="image/*" style="display:none;" />
            <button class="btn btn-danger" (click)="deleteAccount()">Delete Account</button>
            <button class="btn btn-secondary" (click)="logout()">Logout</button>
          </div>
        </div>
      </nav>

      <div class="dashboard-content">
        <!-- Admin Panel (Super Admin and Group Admin only) -->
        <div *ngIf="canAccessAdmin()" class="admin-section">
          <h3>Administration</h3>
          <div class="admin-actions">
            <button class="btn btn-primary" routerLink="/admin">Admin Panel</button>
            <button *ngIf="canCreateGroup()" class="btn btn-success" (click)="showCreateGroupForm = true">
              Create Group
            </button>
          </div>
        </div>

        <!-- Create Group Form -->
        <div *ngIf="showCreateGroupForm" class="form-section">
          <h4>Create New Group</h4>
          <div class="form-grid">
            <div class="form-group">
              <label for="dashGroupName">Group Name</label>
              <input id="dashGroupName" type="text" maxlength="60" class="form-control" [(ngModel)]="newGroup.name" placeholder="Enter a clear, short name">
              <div class="form-row-meta">
                <small class="help-text">Required. Max 60 characters.</small>
                <small class="input-counter">{{ (newGroup.name || '').length }}/60</small>
              </div>
            </div>
            <div class="form-group">
              <label for="dashGroupDesc">Description</label>
              <textarea id="dashGroupDesc" rows="3" maxlength="240" class="form-control" [(ngModel)]="newGroup.description" placeholder="What is this group about?"></textarea>
              <div class="form-row-meta">
                <small class="help-text">Optional. Max 240 characters.</small>
                <small class="input-counter">{{ (newGroup.description || '').length }}/240</small>
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" (click)="createGroup()" [disabled]="!(newGroup.name && newGroup.name.trim())">Create</button>
            <button class="btn btn-secondary" (click)="cancelCreateGroup()">Cancel</button>
          </div>
        </div>

        <!-- User's Groups -->
        <div class="groups-section">
          <div class="section-header">
            <h3>My Groups</h3>
            <div class="section-actions" *ngIf="canCreateGroup()">
              <button class="btn btn-success" (click)="showCreateGroupForm = true">+ New Group</button>
            </div>
          </div>
          <div *ngIf="userGroups.length === 0" class="no-groups">
            <p>You are not a member of any groups yet.</p>
            <p *ngIf="!canCreateGroup()">Ask a group admin to add you to a group.</p>
          </div>
          
          <div class="groups-grid">
            <div *ngFor="let group of userGroups" class="group-card" (click)="selectGroup(group)">
              <div class="group-card-header">
                <h4>{{ group.name }}</h4>
                <span *ngIf="isGroupAdmin(group)" class="chip chip-admin">Admin</span>
              </div>
              <p class="group-desc">{{ group.description }}</p>
              <div class="group-info">
                <small>{{ group.members.length + group.admins.length }} members</small>
                <small>{{ group.channels.length }} channels</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Other Groups (discover/join) -->
        <div class="groups-section" *ngIf="otherGroups.length > 0">
          <div class="section-header">
            <h3>Other Groups</h3>
          </div>
          <div class="groups-grid">
            <div *ngFor="let group of otherGroups" class="group-card">
              <div class="group-card-header">
                <h4>{{ group.name }}</h4>
              </div>
              <p class="group-desc">{{ group.description }}</p>
              <div class="group-info">
                <small>{{ group.members.length + group.admins.length }} members</small>
                <small>{{ group.channels.length }} channels</small>
              </div>
              <div class="form-actions" style="margin-top:12px;">
                <button 
                  *ngIf="!isPendingForCurrentUser(group.id)" 
                  class="btn btn-primary" 
                  (click)="joinGroup(group.id)" 
                  [disabled]="!currentUser"
                >Join</button>
                <button 
                  *ngIf="isPendingForCurrentUser(group.id)" 
                  class="btn btn-secondary" 
                  (click)="cancelPending(group.id)"
                >Pending</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Group Channels -->
        <div *ngIf="selectedGroup" class="channels-section">
          <div class="section-header">
            <h3>{{ selectedGroup.name }} - Channels</h3>
            <div class="section-actions" *ngIf="canManageChannels(selectedGroup)">
              <button class="btn btn-success" (click)="showCreateChannelForm = true">+ Create Channel</button>
            </div>
          </div>
          
          <div class="channel-actions">
            <button class="btn btn-outline-danger" (click)="leaveSelectedGroup()" [disabled]="!currentUser">
              Leave Group
            </button>
          </div>

          <!-- Create Channel Form -->
          <div *ngIf="showCreateChannelForm" class="form-section">
            <h4>Create New Channel</h4>
            <div class="form-grid">
              <div class="form-group">
                <label for="dashChannelName">Channel Name</label>
                <input id="dashChannelName" type="text" maxlength="60" class="form-control" [(ngModel)]="newChannel.name" placeholder="e.g. general, announcements">
                <div class="form-row-meta">
                  <small class="help-text">Required. Max 60 characters.</small>
                  <small class="input-counter">{{ (newChannel.name || '').length }}/60</small>
                </div>
              </div>
              <div class="form-group">
                <label for="dashChannelDesc">Description</label>
                <textarea id="dashChannelDesc" rows="3" maxlength="240" class="form-control" [(ngModel)]="newChannel.description" placeholder="Describe the purpose of this channel"></textarea>
                <div class="form-row-meta">
                  <small class="help-text">Optional. Max 240 characters.</small>
                  <small class="input-counter">{{ (newChannel.description || '').length }}/240</small>
                </div>
              </div>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" (click)="createChannel()" [disabled]="!(newChannel.name && newChannel.name.trim())">Create</button>
              <button class="btn btn-secondary" (click)="cancelCreateChannel()">Cancel</button>
            </div>
          </div>

          <div *ngIf="groupChannels.length === 0" class="no-channels">
            <p>No channels in this group yet.</p>
          </div>

          <div class="channels-grid">
            <div *ngFor="let channel of groupChannels" class="channel-card" (click)="joinChannel(channel)">
              <h5>{{ channel.name }}</h5>
              <p>{{ channel.description }}</p>
              <div class="channel-info">
                <small>{{ channel.members.length }} members</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background-color: #f5f7fa;
    }

    .navbar {
      background: #1f2937;
      color: #fff;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .navbar-brand {
      font-size: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-logo { filter: saturate(1.2); }

    .navbar-right { display: flex; align-items: center; gap: 16px; }
    .nav-userbox { display: flex; align-items: center; gap: 12px; }
    .nav-user-info { display: flex; flex-direction: column; gap: 2px; }
    .nav-actions { display: flex; align-items: center; gap: 8px; }
    .nav-notify { position: relative; display: flex; align-items: center; cursor: pointer; user-select: none; }
    .notify-icon { font-size: 18px; }
    .notify-badge { position: absolute; top: -6px; right: -8px; background: #ef4444; color: #fff; font-size: 11px; padding: 2px 6px; border-radius: 9999px; }
    .notify-dropdown { position: absolute; top: 28px; right: 0; width: 320px; background: #ffffff; color: #111827; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 20px rgba(0,0,0,0.08); z-index: 20; }
    .notify-header { padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #f3f4f6; }
    .notify-empty { padding: 12px; color: #6b7280; }
    .notify-group { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
    .notify-group-title { font-weight: 600; margin-bottom: 6px; }
    .notify-users { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
    .notify-users .muted { color: #9ca3af; }
    .notify-footer { padding: 10px 12px; display: flex; justify-content: flex-end; }

    .nav-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255,255,255,0.9);
    }

    .nav-user {
      font-weight: 600;
    }

    .nav-role-badge { font-size: 12px; color: #e5e7eb; }
    .nav-role-badge.super { color: #fde68a; }
    .nav-role-badge.group { color: #93c5fd; }

    .dashboard-content {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .admin-section, .groups-section, .channels-section {
      background: #ffffff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 6px 16px rgba(0,0,0,0.08);
      margin-bottom: 20px;
    }

    .admin-actions {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }

    .form-section {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 10px;
      margin: 15px 0;
    }
    .form-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
    .form-row-meta { display: flex; justify-content: space-between; color: #6b7280; }
    .help-text { color: #6b7280; }
    .input-counter { color: #9ca3af; }

    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }

    .groups-grid, .channels-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }

    .group-card, .channel-card {
      background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
      padding: 18px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      position: relative;
    }

    .group-card:hover, .channel-card:hover {
      border-color: #93c5fd;
      box-shadow: 0 10px 20px rgba(0,0,0,0.08);
      transform: translateY(-2px);
    }

    .group-card.selected {
      border-color: #3b82f6;
      background: #eff6ff;
    }

    .group-card-header { display: flex; align-items: center; justify-content: space-between; }
    .group-desc { color: #6b7280; margin: 6px 0 8px; min-height: 36px; }

    .group-info, .channel-info {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      font-size: 14px;
      color: #6c757d;
    }

    .chip { font-size: 12px; border-radius: 9999px; padding: 4px 8px; }
    .chip-admin { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }

    .no-groups, .no-channels {
      text-align: center;
      color: #6c757d;
      padding: 40px;
    }

    .channel-actions {
      margin-bottom: 15px;
    }

    .section-header { display: flex; align-items: center; justify-content: space-between; }
    .section-actions { display: flex; align-items: center; gap: 10px; }

    @media (max-width: 768px) {
      .navbar {
        flex-direction: column;
        gap: 10px;
      }

      .admin-actions {
        flex-direction: column;
      }

      .groups-grid, .channels-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  userGroups: Group[] = [];
  otherGroups: Group[] = [];
  selectedGroup: Group | null = null;
  groupChannels: any[] = [];
  showCreateGroupForm = false;
  showCreateChannelForm = false;
  avatarVersion = 0;
  pendingRequestsTotal = 0;
  private pendingGroupIds = new Set<number>();
  showNotifyDropdown = false;
  pendingDetails: { groupId: number; groupName: string; users: User[] }[] = [];
  
  newGroup = {
    name: '',
    description: ''
  };

  newChannel = {
    name: '',
    description: ''
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private groupService: GroupService,
    private channelService: ChannelService,
    private usersService: UsersService,
    private socketService: SocketService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    // Refresh user from server once on load to reflect recent promotions/demotions
    if (this.currentUser) {
      this.usersService.getUserById(this.currentUser.id).subscribe({
        next: (fresh) => {
          this.authService.setCurrentUser(fresh);
        },
        error: () => {
          // no-op: fall back to local user
        }
      });
    }
    const authSub = this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      this.avatarVersion++;
    });
    this.subscriptions.push(authSub);
    
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Connect to socket
    this.socketService.connect(this.currentUser.id, this.currentUser.username);

    this.loadUserGroups();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.socketService.disconnect();
  }

  loadUserGroups() {
    if (!this.currentUser) return;

    const sub = this.groupService.getAllGroups().subscribe({
      next: (groups) => {
        // Filter groups where user is member or admin
        this.userGroups = groups.filter(group => 
          group.members.includes(this.currentUser!.id) || 
          group.admins.includes(this.currentUser!.id)
        );
        this.otherGroups = groups.filter(group => 
          !group.members.includes(this.currentUser!.id) && 
          !group.admins.includes(this.currentUser!.id)
        );

        this.refreshPendingIndicators(groups);
      },
      error: (error) => {
        console.error('Error loading groups:', error);
      }
    });

    this.subscriptions.push(sub);
  }

  selectGroup(group: Group) {
    this.selectedGroup = group;
    this.loadGroupChannels(group.id);
  }

  loadGroupChannels(groupId: number) {
    const sub = this.groupService.getGroupChannels(groupId).subscribe({
      next: (channels) => {
        this.groupChannels = channels;
      },
      error: (error) => {
        console.error('Error loading channels:', error);
      }
    });

    this.subscriptions.push(sub);
  }

  createGroup() {
    if (!this.newGroup.name.trim() || !this.currentUser) return;

    const groupData = {
      name: this.newGroup.name,
      description: this.newGroup.description,
      adminId: this.currentUser.id
    };

    const sub = this.groupService.createGroup(groupData).subscribe({
      next: (response) => {
        this.loadUserGroups();
        this.cancelCreateGroup();
      },
      error: (error) => {
        console.error('Error creating group:', error);
      }
    });

    this.subscriptions.push(sub);
  }

  cancelCreateGroup() {
    this.showCreateGroupForm = false;
    this.newGroup = { name: '', description: '' };
  }

  createChannel() {
    if (!this.newChannel.name.trim() || !this.selectedGroup || !this.currentUser) return;

    const channelData = {
      name: this.newChannel.name,
      description: this.newChannel.description,
      groupId: this.selectedGroup.id,
      adminId: this.currentUser.id
    };

    const sub = this.channelService.createChannel(channelData).subscribe({
      next: (response) => {
        this.loadGroupChannels(this.selectedGroup!.id);
        this.cancelCreateChannel();
      },
      error: (error) => {
        console.error('Error creating channel:', error);
      }
    });

    this.subscriptions.push(sub);
  }

  cancelCreateChannel() {
    this.showCreateChannelForm = false;
    this.newChannel = { name: '', description: '' };
  }

  joinChannel(channel: any) {
    if (!this.selectedGroup) return;
    this.router.navigate(['/chat', this.selectedGroup.id, channel.id]);
  }

  joinGroup(groupId: number) {
    if (!this.currentUser) return;
    const isSuper = this.currentUser.roles.includes('super-admin');
    const req$ = isSuper
      ? this.groupService.addMemberById(groupId, this.currentUser.id)
      : this.groupService.requestJoinGroup(groupId, this.currentUser.id);
    req$.subscribe({
      next: () => {
        if (isSuper) {
          this.loadUserGroups();
        } else {
          // optimistically mark as pending
          this.pendingGroupIds.add(groupId);
        }
      },
      error: (error) => console.error('Error joining group:', error)
    });
  }

  private refreshPendingIndicators(allGroups: Group[]) {
    this.pendingRequestsTotal = 0;
    this.pendingGroupIds.clear();
    this.pendingDetails = [];
    if (!this.currentUser) return;
    const currentUserId = this.currentUser.id;
    const isSuper = this.currentUser.roles.includes('super-admin');
    if (isSuper) {
      // Sum pending across all groups
      allGroups.forEach(g => {
        this.groupService.getGroupJoinRequests(g.id).subscribe({
          next: (users) => {
            this.pendingRequestsTotal += (users || []).length;
            if (users && users.length > 0) {
              this.pendingDetails.push({ groupId: g.id, groupName: g.name, users });
            }
          },
          error: () => {}
        });
      });
    } else {
      // For the current user, figure out groups where they have pending requests
      this.otherGroups.forEach(g => {
        this.groupService.getGroupJoinRequests(g.id).subscribe({
          next: (users) => {
            const has = (users || []).some(u => u.id === currentUserId);
            if (has) this.pendingGroupIds.add(g.id);
          },
          error: () => {}
        });
      });
    }
  }

  isPendingForCurrentUser(groupId: number): boolean {
    return this.pendingGroupIds.has(groupId);
  }

  cancelPending(groupId: number) {
    if (!this.currentUser) return;
    this.groupService.cancelJoinRequest(groupId, this.currentUser.id).subscribe({
      next: () => {
        this.pendingGroupIds.delete(groupId);
      },
      error: (error) => console.error('Error cancelling request:', error)
    });
  }

  toggleNotifyDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.showNotifyDropdown = !this.showNotifyDropdown;
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  deleteAccount() {
    if (!this.currentUser) return;
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    this.usersService.deleteUser(this.currentUser.id).subscribe({
      next: () => {
        this.authService.logout().subscribe(() => this.router.navigate(['/login']));
      },
      error: (error) => console.error('Error deleting account:', error)
    });
  }

  onAvatarSelected(event: Event) {
    if (!this.currentUser) return;
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.usersService.uploadAvatar(this.currentUser.id, file).subscribe({
      next: (res: any) => {
        const updatedUser = res.user;
        this.authService.setCurrentUser(updatedUser);
      },
      error: (err) => console.error('Upload avatar failed:', err)
    });
  }

  getAvatarUrl(): string {
    const u: any = this.currentUser as any;
    const url: string | undefined = u && u.avatarUrl ? u.avatarUrl : undefined;
    if (!url) return '';
    // Server serves /uploads statically
    const base = url.startsWith('http') ? url : `http://localhost:3000${url}`;
    return `${base}?v=${this.avatarVersion}`;
  }

  leaveSelectedGroup() {
    if (!this.selectedGroup || !this.currentUser) return;
    if (!confirm(`Leave group "${this.selectedGroup.name}"?`)) return;
    this.groupService.removeMember(this.selectedGroup.id, this.currentUser.id).subscribe({
      next: () => {
        this.loadUserGroups();
        this.selectedGroup = null;
        this.groupChannels = [];
      },
      error: (error) => console.error('Error leaving group:', error)
    });
  }

  // Permission checks
  canAccessAdmin(): boolean {
    return this.authService.isSuperAdmin() || this.authService.isGroupAdmin();
  }

  canCreateGroup(): boolean {
    return this.authService.isSuperAdmin() || this.authService.isGroupAdmin();
  }

  isGroupAdmin(group: Group): boolean {
    return this.currentUser ? group.admins.includes(this.currentUser.id) : false;
  }

  canManageChannels(group: Group): boolean {
    return this.authService.isSuperAdmin() || this.isGroupAdmin(group);
  }

  getUserRoleDisplay(): string {
    if (!this.currentUser) return '';
    
    if (this.currentUser.roles.includes('super-admin')) return 'Super Admin';
    if (this.currentUser.roles.includes('group-admin')) return 'Group Admin';
    return 'User';
  }
}
