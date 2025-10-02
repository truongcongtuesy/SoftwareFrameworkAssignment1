import { Component, OnInit } from '@angular/core';
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
        <div class="navbar-brand">Admin Panel</div>
        <div class="navbar-nav">
          <span class="nav-user">{{ currentUser?.username }} ({{ getUserRole() }})</span>
          <button class="btn btn-secondary" routerLink="/dashboard">Dashboard</button>
          <button class="btn btn-secondary" (click)="logout()">Logout</button>
        </div>
      </nav>

      <div class="admin-content">
        <!-- Super Admin Only Features -->
        <div *ngIf="authService.isSuperAdmin()" class="admin-section">
          <h3>User Management (Super Admin)</h3>
          
          <div class="section-content">
            <div class="action-buttons">
              <button class="btn btn-primary" (click)="showUserList = !showUserList">
                {{ showUserList ? 'Hide' : 'Show' }} All Users
              </button>
            </div>

            <div *ngIf="showUserList" class="users-list">
              <h4>All Users</h4>
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Roles</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let user of allUsers">
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
                            *ngIf="!user.roles.includes('group-admin')" 
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
                            *ngIf="user.id !== currentUser?.id" 
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
          <h3>Group Management</h3>
          
          <div class="section-content">
            <div class="action-buttons">
              <button class="btn btn-success" (click)="showCreateGroupForm = !showCreateGroupForm">
                {{ showCreateGroupForm ? 'Cancel' : 'Create New Group' }}
              </button>
              <button class="btn btn-primary" (click)="loadGroups()">Refresh Groups</button>
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
                <button class="btn btn-primary" (click)="createGroup()">Create Group</button>
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
                <table class="table">
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
                      <td>{{ group.members.length + group.admins.length }}</td>
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
          <h3>Managing: {{ selectedGroup.name }}</h3>
          
          <div class="section-content">
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
            </div>

            <!-- Members Tab -->
            <div *ngIf="activeTab === 'members'" class="tab-content">
              <h4>Group Members</h4>
              <div class="action-buttons">
                <button class="btn btn-success" (click)="showAddMemberForm = !showAddMemberForm">
                  {{ showAddMemberForm ? 'Cancel' : 'Add Member' }}
                </button>
              </div>

              <!-- Add Member Form -->
              <div *ngIf="showAddMemberForm" class="form-section">
                <div class="form-group">
                  <label>User ID</label>
                  <input type="number" class="form-control" [(ngModel)]="newMemberId" placeholder="Enter user ID">
                </div>
                <div class="form-actions">
                  <button class="btn btn-primary" (click)="addMember()">Add Member</button>
                  <button class="btn btn-secondary" (click)="showAddMemberForm = false">Cancel</button>
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
                <div class="form-group">
                  <label>Channel Name</label>
                  <input type="text" class="form-control" [(ngModel)]="newChannel.name" placeholder="Enter channel name">
                </div>
                <div class="form-group">
                  <label>Description</label>
                  <textarea class="form-control" [(ngModel)]="newChannel.description" placeholder="Enter channel description"></textarea>
                </div>
                <div class="form-actions">
                  <button class="btn btn-primary" (click)="createChannel()">Create Channel</button>
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

    .admin-content {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .admin-section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    .section-content {
      margin-top: 15px;
    }

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
      background: #f8f9fa;
      font-weight: 600;
    }

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
export class AdminComponent implements OnInit {
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
  newMemberId: number | null = null;

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

  addMember() {
    if (!this.newMemberId || !this.selectedGroup) return;

    this.groupService.addMember(this.selectedGroup.id, this.newMemberId).subscribe({
      next: () => {
        this.loadGroupMembers();
        this.showAddMemberForm = false;
        this.newMemberId = null;
      },
      error: (error) => console.error('Error adding member:', error)
    });
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

  canDeleteGroup(group: Group): boolean {
    return this.authService.isSuperAdmin() || group.adminId === this.currentUser?.id;
  }

  getUserRole(): string {
    if (!this.currentUser) return '';
    if (this.currentUser.roles.includes('super-admin')) return 'Super Admin';
    if (this.currentUser.roles.includes('group-admin')) return 'Group Admin';
    return 'User';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
