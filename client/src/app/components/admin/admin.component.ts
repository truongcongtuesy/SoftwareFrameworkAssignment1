import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { ChannelService } from '../../services/channel.service';
import { UsersService } from '../../services/users.service';
import { User } from '../../models/user.model';
import { Group } from '../../models/group.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="admin-container">
      <!-- Navigation -->
      <nav class="navbar">
        <div class="navbar-left">
          <div class="navbar-brand">
            <span class="brand-logo">🛠️</span>
            <span>Admin Panel</span>
          </div>
        </div>
        <div class="navbar-right">
          <div class="nav-userbox">
            <div class="nav-user">{{ currentUser?.username }}</div>
            <div class="nav-role-badge" [class.super]="getUserRole() === 'Super Admin'" [class.group]="getUserRole() === 'Group Admin'">
              {{ getUserRole() }}
            </div>
          </div>
          <div *ngIf="authService.isSuperAdmin()" class="nav-notify" title="Pending join requests" (click)="toggleNotifyDropdown($event)">
            <span class="notify-icon">🔔</span>
            <span class="notify-badge" *ngIf="pendingRequestsTotal > 0">{{ pendingRequestsTotal }}</span>
            <div class="notify-dropdown" *ngIf="showNotifyDropdown">
              <div class="notify-header">Pending Requests</div>
              <div class="notify-empty" *ngIf="pendingRequestsTotal === 0">No pending requests</div>
              <div *ngFor="let item of pendingDetails" class="notify-group">
                <div class="notify-group-title">{{ item.groupName }} ({{ item.users.length }})</div>
                <ul class="notify-users">
                  <li *ngFor="let u of item.users">{{ u.username }} <span class="muted">{{ u.email }}</span></li>
                </ul>
              </div>
            </div>
          </div>
          <div class="nav-actions">
            <button class="btn btn-secondary" routerLink="/dashboard">Dashboard</button>
            <button class="btn btn-secondary" (click)="logout()">Logout</button>
          </div>
        </div>
      </nav>

      <div class="admin-content">
        <!-- Super Admin Only Features -->
        <div *ngIf="authService.isSuperAdmin()" class="admin-section">
          <div class="section-header">
            <h3>User Management</h3>
            <span class="section-subtitle">Super Admin</span>
          </div>
          <div class="section-content">
            <div class="action-buttons">
              <button class="btn btn-primary" (click)="showUserList = !showUserList">
                {{ showUserList ? 'Hide' : 'Show' }} All Users
              </button>
            </div>

            <div *ngIf="showUserList" class="users-list">
              <h4>All Users</h4>
              <div class="table-responsive">
                <table class="table table-modern">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Roles</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let user of allUsers">
                      <td>{{ user.id }}</td>
                      <td>{{ user.username }}</td>
                      <td>{{ user.email }}</td>
                      <td>{{ user.roles.join(', ') }}</td>
                      <td>
                        <span [class]="user.isActive ? 'status-active' : 'status-inactive'">
                          {{ user.isActive ? 'Active' : 'Inactive' }}
                        </span>
                      </td>
                      <td>
                        <div class="action-buttons-small">
                          <button 
                            *ngIf="!user.roles.includes('group-admin') && !user.roles.includes('super-admin')" 
                            class="btn btn-sm btn-success"
                            (click)="promoteUser(user.id, 'group-admin')"
                          >
                            Promote to Group Admin
                          </button>
                          <button 
                            *ngIf="user.roles.includes('group-admin') && !user.roles.includes('super-admin')" 
                            class="btn btn-sm btn-warning"
                            (click)="demoteUser(user.id, 'group-admin')"
                          >
                            Demote from Group Admin
                          </button>
                          <button 
                            *ngIf="!user.roles.includes('super-admin') && user.id !== currentUser?.id" 
                            class="btn btn-sm btn-primary"
                            (click)="promoteUser(user.id, 'super-admin')"
                          >
                            Promote to Super Admin
                          </button>
                          <button 
                            *ngIf="canDemoteSuperAdmin(user)" 
                            class="btn btn-sm btn-warning"
                            (click)="demoteUser(user.id, 'super-admin')"
                          >
                            Demote from Super Admin
                          </button>
                          <button 
                            *ngIf="canDeleteUser(user)" 
                            class="btn btn-sm btn-danger"
                            (click)="deleteUser(user.id)"
                          >
                            Delete User
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Group Management -->
        <div class="admin-section">
          <div class="section-header">
            <h3>Group Management</h3>
            <div class="section-actions">
              <button class="btn btn-success" (click)="showCreateGroupForm = !showCreateGroupForm">
                {{ showCreateGroupForm ? 'Cancel' : 'Create New Group' }}
              </button>
              <button class="btn btn-primary" (click)="loadGroups()">Refresh</button>
            </div>
          </div>
          <div class="section-content">

            <!-- Create Group Form -->
            <div *ngIf="showCreateGroupForm" class="form-section">
              <h4>Create New Group</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label for="groupName">Group Name</label>
                  <input id="groupName" type="text" maxlength="60" class="form-control" [(ngModel)]="newGroup.name" placeholder="Enter a clear, short name">
                  <div class="form-row-meta">
                    <small class="help-text">Required. Max 60 characters.</small>
                    <small class="input-counter">{{ (newGroup.name || '').length }}/60</small>
                  </div>
                </div>
                <div class="form-group">
                  <label for="groupDesc">Description</label>
                  <textarea id="groupDesc" rows="3" maxlength="240" class="form-control" [(ngModel)]="newGroup.description" placeholder="What is this group about?"></textarea>
                  <div class="form-row-meta">
                    <small class="help-text">Optional. Max 240 characters.</small>
                    <small class="input-counter">{{ (newGroup.description || '').length }}/240</small>
                  </div>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-primary" (click)="createGroup()" [disabled]="!(newGroup.name && newGroup.name.trim())">Create Group</button>
                <button class="btn btn-secondary" (click)="cancelCreateGroup()">Cancel</button>
              </div>
            </div>

            <!-- Groups List -->
            <div class="groups-list">
              <h4>{{ authService.isSuperAdmin() ? 'All Groups' : 'My Groups' }}</h4>
              <div *ngIf="groups.length === 0" class="no-data">
                No groups found.
              </div>
              
              <div class="table-responsive" *ngIf="groups.length > 0">
                <table class="table table-modern">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Members</th>
                      <th>Channels</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let group of groups">
                      <td>{{ group.name }}</td>
                      <td>{{ group.description }}</td>
                      <td>{{ getMemberCount(group) }}</td>
                      <td>{{ group.channels.length }}</td>
                      <td>{{ formatDate(group.createdAt) }}</td>
                      <td>
                        <div class="action-buttons-small">
                          <button class="btn btn-sm btn-primary" (click)="manageGroup(group)">
                            Manage
                          </button>
                          <button 
                            *ngIf="canDeleteGroup(group)" 
                            class="btn btn-sm btn-danger"
                            (click)="deleteGroup(group.id)"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Group Detail Management -->
        <div *ngIf="selectedGroup" class="admin-section">
          <div class="section-header">
            <h3>Managing: {{ selectedGroup.name }}</h3>
          </div>
          
          <div class="section-content">
            <div class="action-buttons" *ngIf="canEditSelectedGroup()">
              <button class="btn btn-primary" (click)="toggleEditGroup()">
                {{ showEditGroupForm ? 'Cancel Edit' : 'Edit Group' }}
              </button>
            </div>

            <!-- Edit Group Form -->
            <div *ngIf="showEditGroupForm" class="form-section">
              <h4>Edit Group Details</h4>
              <div class="form-group">
                <label>Group Name</label>
                <input type="text" class="form-control" [(ngModel)]="editGroup.name" placeholder="Enter group name">
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea class="form-control" [(ngModel)]="editGroup.description" placeholder="Enter group description"></textarea>
              </div>
              <div class="form-actions">
                <button class="btn btn-success" (click)="saveGroupEdits()" [disabled]="!editGroup.name?.trim()">Save Changes</button>
                <button class="btn btn-secondary" (click)="cancelEditGroup()">Cancel</button>
              </div>
            </div>

            <div class="tabs">
              <button 
                class="tab-button" 
                [class.active]="activeTab === 'members'"
                (click)="activeTab = 'members'"
              >
                Members
              </button>
              <button 
                class="tab-button" 
                [class.active]="activeTab === 'channels'"
                (click)="activeTab = 'channels'"
              >
                Channels
              </button>
              <button 
                class="tab-button" 
                [class.active]="activeTab === 'requests'"
                (click)="activeTab = 'requests'"
              >
                Requests
              </button>
            </div>

            <!-- Members Tab -->
            <div *ngIf="activeTab === 'members'" class="tab-content">
              <h4>Group Members</h4>
              <div class="action-buttons">
                <button class="btn btn-success" (click)="showAddMemberForm = !showAddMemberForm">
                  {{ showAddMemberForm ? 'Cancel' : 'Add Member' }}
                </button>
              </div>

              <!-- Add Member Form (by Username) -->
              <div *ngIf="showAddMemberForm" class="form-section">
                <div class="form-group">
                  <label>Select user to add</label>
                  <select class="form-control" [(ngModel)]="selectedUserId">
                    <option [ngValue]="null">-- Choose a user --</option>
                    <option *ngFor="let u of getCandidateUsers()" [ngValue]="u.id">
                      {{ u.username }} ({{ u.email }})
                    </option>
                  </select>
                </div>
                <div class="form-actions">
                  <button class="btn btn-primary" (click)="addSelectedMember()" [disabled]="selectedUserId === null">Add</button>
                  <button class="btn btn-secondary" (click)="showAddMemberForm = false; selectedUserId = null;">Close</button>
                </div>
              </div>

              <div class="members-list">
                <div *ngFor="let member of groupMembers" class="member-item">
                  <span>{{ member.username }} ({{ member.email }})</span>
                  <div class="member-roles">
                    <span *ngFor="let role of member.roles" class="role-badge">{{ role }}</span>
                  </div>
                  <button 
                    class="btn btn-sm btn-danger"
                    (click)="removeMember(member.id)"
                    [disabled]="member.id === currentUser?.id"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <!-- Requests Tab -->
            <div *ngIf="activeTab === 'requests'" class="tab-content">
              <h4>Pending Join Requests</h4>
              <div class="no-data" *ngIf="pendingRequests.length === 0">No pending requests.</div>
              <div class="table-responsive" *ngIf="pendingRequests.length > 0">
                <table class="table table-modern">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let u of pendingRequests">
                      <td>{{ u.id }}</td>
                      <td>{{ u.username }}</td>
                      <td>{{ u.email }}</td>
                      <td>
                        <div class="action-buttons-small">
                          <button class="btn btn-sm btn-success" (click)="approveRequest(u.id)">Approve</button>
                          <button class="btn btn-sm btn-secondary" (click)="rejectRequest(u.id)">Reject</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Channels Tab -->
            <div *ngIf="activeTab === 'channels'" class="tab-content">
              <h4>Group Channels</h4>
              <div class="action-buttons">
                <button class="btn btn-success" (click)="showCreateChannelForm = !showCreateChannelForm">
                  {{ showCreateChannelForm ? 'Cancel' : 'Create Channel' }}
                </button>
              </div>

            <!-- Create Channel Form -->
            <div *ngIf="showCreateChannelForm" class="form-section">
              <h4>Create New Channel</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label for="channelName">Channel Name</label>
                  <input id="channelName" type="text" maxlength="60" class="form-control" [(ngModel)]="newChannel.name" placeholder="e.g. general, announcements">
                  <div class="form-row-meta">
                    <small class="help-text">Required. Max 60 characters.</small>
                    <small class="input-counter">{{ (newChannel.name || '').length }}/60</small>
                  </div>
                </div>
                <div class="form-group">
                  <label for="channelDesc">Description</label>
                  <textarea id="channelDesc" rows="3" maxlength="240" class="form-control" [(ngModel)]="newChannel.description" placeholder="Describe the purpose of this channel"></textarea>
                  <div class="form-row-meta">
                    <small class="help-text">Optional. Max 240 characters.</small>
                    <small class="input-counter">{{ (newChannel.description || '').length }}/240</small>
                  </div>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-primary" (click)="createChannel()" [disabled]="!(newChannel.name && newChannel.name.trim())">Create Channel</button>
                <button class="btn btn-secondary" (click)="cancelCreateChannel()">Cancel</button>
              </div>
            </div>

              <div class="channels-list">
                <div *ngFor="let channel of groupChannels" class="channel-item">
                  <div class="channel-info">
                    <h5>{{ channel.name }}</h5>
                    <p>{{ channel.description }}</p>
                    <small>{{ channel.members.length }} members</small>
                  </div>
                  <button class="btn btn-sm btn-danger" (click)="deleteChannel(channel.id)">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-container {
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

    .navbar-right { display: flex; align-items: center; gap: 16px; }
    .nav-userbox { display: flex; align-items: center; gap: 10px; }
    .nav-user { font-weight: 600; }
    .nav-role-badge { font-size: 12px; color: #e5e7eb; }
    .nav-role-badge.super { color: #fde68a; }
    .nav-role-badge.group { color: #93c5fd; }
    .nav-actions { display: flex; align-items: center; gap: 12px; }
    .nav-actions .btn + .btn { margin-left: 8px; }
    .nav-notify { position: relative; display: flex; align-items: center; cursor: pointer; }
    .notify-icon { font-size: 18px; }
    .notify-badge { position: absolute; top: -6px; right: -8px; background: #ef4444; color: #fff; font-size: 11px; padding: 2px 6px; border-radius: 9999px; }
    .notify-dropdown { position: absolute; top: 28px; right: 0; width: 320px; background: #ffffff; color: #111827; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 20px rgba(0,0,0,0.08); z-index: 20; }
    .notify-header { padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #f3f4f6; }
    .notify-empty { padding: 12px; color: #6b7280; }
    .notify-group { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
    .notify-group-title { font-weight: 600; margin-bottom: 6px; }
    .notify-users { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
    .notify-users .muted { color: #9ca3af; }

    .admin-content {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .admin-section {
      background: #ffffff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 6px 16px rgba(0,0,0,0.08);
      margin-bottom: 20px;
    }

    .section-content {
      margin-top: 15px;
    }

    .section-header { display: flex; align-items: center; justify-content: space-between; }
    .section-subtitle { color: #6b7280; font-size: 13px; }
    .section-actions { display: flex; align-items: center; gap: 10px; }

    .action-buttons {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
      flex-wrap: wrap;
    }

    .action-buttons-small {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
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

    .table-responsive {
      overflow-x: auto;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }

    .table th,
    .table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }

    .table th {
      background: #f8fafc;
      font-weight: 600;
    }

    .table-modern tr:hover td { background: #f9fafb; }

    .status-active {
      color: #28a745;
      font-weight: 500;
    }

    .status-inactive {
      color: #dc3545;
      font-weight: 500;
    }

    .tabs {
      display: flex;
      border-bottom: 2px solid #ddd;
      margin-bottom: 20px;
    }

    .tab-button {
      padding: 10px 20px;
      border: none;
      background: none;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.3s ease;
    }

    .tab-button.active {
      border-bottom-color: #007bff;
      color: #007bff;
    }

    .tab-content {
      margin-top: 20px;
    }

    .member-item,
    .channel-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin-bottom: 10px;
    }

    .member-roles {
      display: flex;
      gap: 5px;
    }

    .role-badge {
      background: #007bff;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .channel-info h5 {
      margin: 0 0 5px 0;
    }

    .channel-info p {
      margin: 0 0 5px 0;
      color: #6c757d;
    }

    .no-data {
      text-align: center;
      color: #6c757d;
      padding: 40px;
    }

    @media (max-width: 768px) {
      .navbar {
        flex-direction: column;
        gap: 10px;
      }

      .action-buttons {
        flex-direction: column;
      }

      .table {
        font-size: 14px;
      }

      .member-item,
      .channel-item {
        flex-direction: column;
        gap: 10px;
        align-items: stretch;
      }
    }
  `]
})
export class AdminComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  allUsers: User[] = [];
  groups: Group[] = [];
  selectedGroup: Group | null = null;
  groupMembers: User[] = [];
  groupChannels: any[] = [];
  
  showUserList = false;
  showCreateGroupForm = false;
  showCreateChannelForm = false;
  showAddMemberForm = false;
  activeTab = 'members';
  
  newGroup = { name: '', description: '' };
  newChannel = { name: '', description: '' };
  newMemberUsername: string = '';
  userSearchTerm: string = '';
  selectedUserId: number | null = null;
  showEditGroupForm = false;
  editGroup: { name: string; description: string } = { name: '', description: '' };
  pendingRequests: User[] = [];
  // Notification dropdown state
  showNotifyDropdown = false;
  pendingRequestsTotal = 0;
  pendingDetails: { groupId: number; groupName: string; users: User[] }[] = [];
  private notifyTimer: any;

  constructor(
    public authService: AuthService,
    private groupService: GroupService,
    private channelService: ChannelService,
    private usersService: UsersService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser || (!this.authService.isSuperAdmin() && !this.authService.isGroupAdmin())) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadGroups();
    
    if (this.authService.isSuperAdmin()) {
      this.loadAllUsers();
      // Kick off periodic refresh of header notifications while on admin panel
      this.notifyTimer = setInterval(() => this.refreshPendingHeader(), 15000);
    }
  }

  ngOnDestroy() {
    if (this.notifyTimer) {
      clearInterval(this.notifyTimer);
      this.notifyTimer = null;
    }
  }

  loadAllUsers() {
    this.usersService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
      },
      error: (error) => console.error('Error loading users:', error)
    });
  }

  loadGroups() {
    this.groupService.getAllGroups().subscribe({
      next: (groups) => {
        if (this.authService.isSuperAdmin()) {
          this.groups = groups;
        } else {
          // Filter groups where user is admin
          this.groups = groups.filter(group => 
            group.admins.includes(this.currentUser!.id)
          );
        }
        // Refresh header notifications after groups list is ready
        if (this.authService.isSuperAdmin()) {
          this.refreshPendingHeader();
        }
      },
      error: (error) => console.error('Error loading groups:', error)
    });
  }

  createGroup() {
    if (!this.newGroup.name.trim()) return;

    const groupData = {
      name: this.newGroup.name,
      description: this.newGroup.description,
      adminId: this.currentUser!.id
    };

    this.groupService.createGroup(groupData).subscribe({
      next: () => {
        this.loadGroups();
        this.cancelCreateGroup();
      },
      error: (error) => console.error('Error creating group:', error)
    });
  }

  cancelCreateGroup() {
    this.showCreateGroupForm = false;
    this.newGroup = { name: '', description: '' };
  }

  deleteGroup(groupId: number) {
    if (confirm('Are you sure you want to delete this group?')) {
      this.groupService.deleteGroup(groupId).subscribe({
        next: () => {
          this.loadGroups();
          if (this.selectedGroup?.id === groupId) {
            this.selectedGroup = null;
          }
        },
        error: (error) => console.error('Error deleting group:', error)
      });
    }
  }

  manageGroup(group: Group) {
    this.selectedGroup = group;
    this.loadGroupMembers();
    this.loadGroupChannels();
    this.showEditGroupForm = false;
    this.editGroup = { name: group.name, description: group.description };
    // For group admins, load users list to enable selection UI
    if (!this.authService.isSuperAdmin()) {
      this.loadAllUsers();
    }
    this.loadPendingRequests();
    // also refresh header notifications
    this.refreshPendingHeader();
  }

  loadGroupMembers() {
    if (!this.selectedGroup) return;
    
    this.groupService.getGroupMembers(this.selectedGroup.id).subscribe({
      next: (members) => {
        this.groupMembers = members;
      },
      error: (error) => console.error('Error loading group members:', error)
    });
  }

  loadGroupChannels() {
    if (!this.selectedGroup) return;
    
    this.groupService.getGroupChannels(this.selectedGroup.id).subscribe({
      next: (channels) => {
        this.groupChannels = channels;
      },
      error: (error) => console.error('Error loading group channels:', error)
    });
  }

  loadPendingRequests() {
    if (!this.selectedGroup) return;
    this.groupService.getGroupJoinRequests(this.selectedGroup.id).subscribe({
      next: (users) => this.pendingRequests = users,
      error: (error) => console.error('Error loading join requests:', error)
    });
  }

  refreshPendingHeader() {
    this.pendingRequestsTotal = 0;
    this.pendingDetails = [];
    const targetGroups = this.groups || [];
    targetGroups.forEach(g => {
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
  }

  addMember() {
    if (!this.newMemberUsername.trim() || !this.selectedGroup) return;

    this.groupService.addMemberByUsername(this.selectedGroup.id, this.newMemberUsername.trim()).subscribe({
      next: () => {
        this.loadGroupMembers();
        this.showAddMemberForm = false;
        this.newMemberUsername = '';
      },
      error: (error) => console.error('Error adding member:', error)
    });
  }

  addMemberById(userId: number) {
    if (!this.selectedGroup) return;
    this.groupService.addMemberById(this.selectedGroup.id, userId).subscribe({
      next: () => {
        this.loadGroupMembers();
      },
      error: (error) => console.error('Error adding member:', error)
    });
  }

  addSelectedMember() {
    if (this.selectedUserId === null) return;
    this.addMemberById(this.selectedUserId);
  }

  removeMember(userId: number) {
    if (!this.selectedGroup) return;

    this.groupService.removeMember(this.selectedGroup.id, userId).subscribe({
      next: () => {
        this.loadGroupMembers();
      },
      error: (error) => console.error('Error removing member:', error)
    });
  }

  createChannel() {
    if (!this.newChannel.name.trim() || !this.selectedGroup) return;
    const payload = {
      name: this.newChannel.name,
      description: this.newChannel.description,
      groupId: this.selectedGroup.id,
      adminId: this.currentUser!.id
    };
    this.channelService.createChannel(payload).subscribe({
      next: () => {
        this.loadGroupChannels();
        this.cancelCreateChannel();
      },
      error: (error) => console.error('Error creating channel:', error)
    });
  }

  cancelCreateChannel() {
    this.showCreateChannelForm = false;
    this.newChannel = { name: '', description: '' };
  }

  deleteChannel(channelId: number) {
    if (confirm('Are you sure you want to delete this channel?')) {
      this.channelService.deleteChannel(channelId).subscribe({
        next: () => this.loadGroupChannels(),
        error: (error) => console.error('Error deleting channel:', error)
      });
    }
  }

  promoteUser(userId: number, role: string) {
    this.usersService.promoteUser(userId, role as 'group-admin' | 'super-admin').subscribe({
      next: () => this.loadAllUsers(),
      error: (error) => console.error('Error promoting user:', error)
    });
  }

  demoteUser(userId: number, role: string) {
    this.usersService.demoteUser(userId, role as 'group-admin' | 'super-admin').subscribe({
      next: () => this.loadAllUsers(),
      error: (error) => console.error('Error demoting user:', error)
    });
  }

  deleteUser(userId: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.usersService.deleteUser(userId).subscribe({
        next: () => this.loadAllUsers(),
        error: (error) => console.error('Error deleting user:', error)
      });
    }
  }

  approveRequest(userId: number) {
    if (!this.selectedGroup) return;
    this.groupService.approveJoinRequest(this.selectedGroup.id, userId).subscribe({
      next: () => {
        this.loadPendingRequests();
        this.loadGroupMembers();
        this.refreshPendingHeader();
      },
      error: (error) => console.error('Error approving request:', error)
    });
  }

  rejectRequest(userId: number) {
    if (!this.selectedGroup) return;
    this.groupService.rejectJoinRequest(this.selectedGroup.id, userId).subscribe({
      next: () => { this.loadPendingRequests(); this.refreshPendingHeader(); },
      error: (error) => console.error('Error rejecting request:', error)
    });
  }

  toggleNotifyDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.showNotifyDropdown = !this.showNotifyDropdown;
  }

  canDeleteGroup(group: Group): boolean {
    return this.authService.isSuperAdmin() || group.adminId === this.currentUser?.id;
  }

  getUserRole(): string {
    if (!this.currentUser) return '';
    if (this.currentUser.roles.includes('super-admin')) return 'Super Admin';
    if (this.currentUser.roles.includes('group-admin')) return 'Group Admin';
    return 'User';
  }

  canDemoteSuperAdmin(target: User): boolean {
    // Only root super admin (id 1) can demote other super admins, never themselves
    if (!this.currentUser) return false;
    const isRoot = this.currentUser.id === 1 && this.currentUser.roles.includes('super-admin');
    const targetIsOtherSuper = target.id !== this.currentUser.id && target.roles.includes('super-admin');
    return isRoot && targetIsOtherSuper;
  }

  canDeleteUser(target: User): boolean {
    if (!this.currentUser) return false;
    // Never allow deleting yourself
    if (target.id === this.currentUser.id) return false;
    // Only root (id 1) can delete root, and no one else can delete root
    if (target.id === 1) return this.currentUser.id === 1;
    // Otherwise, allow delete
    return true;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  getMemberCount(group: Group): number {
    const members = Array.isArray(group.members) ? group.members : [];
    const admins = Array.isArray(group.admins) ? group.admins : [];
    const uniqueIds = new Set([...(members as number[]), ...(admins as number[])]);
    // If we have full users list, filter out deleted/non-existent users to avoid overcount
    if (this.authService.isSuperAdmin() && Array.isArray(this.allUsers) && this.allUsers.length > 0) {
      const knownIds = new Set(this.allUsers.map(u => u.id));
      let count = 0;
      uniqueIds.forEach(id => { if (knownIds.has(id)) count++; });
      return count;
    }
    return uniqueIds.size;
  }

  getCandidateUsers(): User[] {
    if (!this.selectedGroup) return [];
    const memberIds = new Set([...(this.selectedGroup.members as number[] || []), ...(this.selectedGroup.admins as number[] || [])]);
    return (this.allUsers || []).filter(u => !memberIds.has(u.id));
  }

  getFilteredCandidateUsers(): User[] {
    const term = (this.userSearchTerm || '').toLowerCase().trim();
    const base = this.getCandidateUsers();
    if (!term) return base.slice(0, 20);
    return base.filter(u =>
      (u.username || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term)
    ).slice(0, 20);
  }

  canEditSelectedGroup(): boolean {
    if (!this.selectedGroup) return false;
    return this.authService.isSuperAdmin() || this.selectedGroup.adminId === this.currentUser?.id;
  }

  toggleEditGroup() {
    this.showEditGroupForm = !this.showEditGroupForm;
    if (this.showEditGroupForm && this.selectedGroup) {
      this.editGroup = { name: this.selectedGroup.name, description: this.selectedGroup.description };
    }
  }

  cancelEditGroup() {
    this.showEditGroupForm = false;
    if (this.selectedGroup) {
      this.editGroup = { name: this.selectedGroup.name, description: this.selectedGroup.description };
    } else {
      this.editGroup = { name: '', description: '' };
    }
  }

  saveGroupEdits() {
    if (!this.selectedGroup || !this.editGroup.name.trim()) return;
    const payload = {
      name: this.editGroup.name,
      description: this.editGroup.description
    };
    this.groupService.updateGroup(this.selectedGroup.id, payload).subscribe({
      next: (res: any) => {
        // Refresh groups and selectedGroup
        this.loadGroups();
        this.selectedGroup = { ...this.selectedGroup!, name: payload.name, description: payload.description } as Group;
        this.showEditGroupForm = false;
      },
      error: (error) => console.error('Error updating group:', error)
    });
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
