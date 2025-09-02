class User {
  constructor(id, username, email, password, roles = ['user'], groups = []) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.password = password;
    this.roles = roles; // ['user', 'group-admin', 'super-admin']
    this.groups = groups; // Array of group IDs user belongs to
    this.createdAt = new Date();
    this.isActive = true;
  }

  // Check if user has specific role
  hasRole(role) {
    return this.roles.includes(role);
  }

  // Check if user is super admin
  isSuperAdmin() {
    return this.hasRole('super-admin');
  }

  // Check if user is group admin
  isGroupAdmin() {
    return this.hasRole('group-admin');
  }

  // Add role to user
  addRole(role) {
    if (!this.roles.includes(role)) {
      this.roles.push(role);
    }
  }

  // Remove role from user
  removeRole(role) {
    this.roles = this.roles.filter(r => r !== role);
  }

  // Add user to group
  joinGroup(groupId) {
    if (!this.groups.includes(groupId)) {
      this.groups.push(groupId);
    }
  }

  // Remove user from group
  leaveGroup(groupId) {
    this.groups = this.groups.filter(g => g !== groupId);
  }

  // Get user data without password
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;
