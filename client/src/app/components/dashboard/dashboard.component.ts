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
        <div class="navbar-brand">Chat System</div>
        <div class="navbar-nav">
          <span class="nav-user">Welcome, {{ currentUser?.username }}!</span>
          <span class="nav-role">({{ getUserRoleDisplay() }})</span>
          <button class="btn btn-danger" (click)="deleteAccount()">Delete Account</button>
          <button class="btn btn-secondary" (click)="logout()">Logout</button>
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
          <div class="form-group">
            <label>Group Name</label>
            <input type="text" class="form-control" [(ngModel)]="newGroup.name" placeholder="Enter group name">
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea class="form-control" [(ngModel)]="newGroup.description" placeholder="Enter group description"></textarea>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" (click)="createGroup()">Create</button>
            <button class="btn btn-secondary" (click)="cancelCreateGroup()">Cancel</button>
          </div>
        </div>

        <!-- User's Groups -->
        <div class="groups-section">
          <h3>My Groups</h3>
          <div *ngIf="userGroups.length === 0" class="no-groups">
            <p>You are not a member of any groups yet.</p>
            <p *ngIf="!canCreateGroup()">Ask a group admin to add you to a group.</p>
          </div>
          
          <div class="groups-grid">
            <div *ngFor="let group of userGroups" class="group-card" (click)="selectGroup(group)">
              <h4>{{ group.name }}</h4>
              <p>{{ group.description }}</p>
              <div class="group-info">
                <small>{{ group.members.length + group.admins.length }} members</small>
                <small>{{ group.channels.length }} channels</small>
              </div>
              <div *ngIf="isGroupAdmin(group)" class="group-admin-badge">
                Admin
              </div>
            </div>
          </div>
        </div>

        <!-- Group Channels -->
        <div *ngIf="selectedGroup" class="channels-section">
          <h3>{{ selectedGroup.name }} - Channels</h3>
          
          <div class="channel-actions" *ngIf="canManageChannels(selectedGroup)">
            <button class="btn btn-success" (click)="showCreateChannelForm = true">
              Create Channel
            </button>
          </div>

          <div class="channel-actions">
            <button class="btn btn-outline-danger" (click)="leaveSelectedGroup()" [disabled]="!currentUser">
              Leave Group
            </button>
          </div>

          <!-- Create Channel Form -->
          <div *ngIf="showCreateChannelForm" class="form-section">
            <h4>Create New Channel</h4>
            <div class="form-group">
              <label>Channel Name</label>
              <input type="text" class="form-control" [(ngModel)]="newChannel.name" placeholder="Enter channel name">
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea class="form-control" [(ngModel)]="newChannel.description" placeholder="Enter channel description"></textarea>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" (click)="createChannel()">Create</button>
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
      background: #343a40;
      color: white;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .navbar-brand {
      font-size: 24px;
      font-weight: bold;
    }

    .navbar-nav {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .nav-user {
      font-weight: 500;
    }

    .nav-role {
      font-size: 14px;
      color: #adb5bd;
    }

    .dashboard-content {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .admin-section, .groups-section, .channels-section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    .admin-actions {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }

    .form-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 15px 0;
    }

    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }

    .groups-grid, .channels-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }

    .group-card, .channel-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
    }

    .group-card:hover, .channel-card:hover {
      border-color: #007bff;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .group-card.selected {
      border-color: #007bff;
      background: #e3f2fd;
    }

    .group-info, .channel-info {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      font-size: 14px;
      color: #6c757d;
    }

    .group-admin-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #28a745;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .no-groups, .no-channels {
      text-align: center;
      color: #6c757d;
      padding: 40px;
    }

    .channel-actions {
      margin-bottom: 15px;
    }

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
  selectedGroup: Group | null = null;
  groupChannels: any[] = [];
  showCreateGroupForm = false;
  showCreateChannelForm = false;
  
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
