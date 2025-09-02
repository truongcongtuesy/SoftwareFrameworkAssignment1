class Group {
  constructor(id, name, description, adminId, members = [], channels = []) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.adminId = adminId; // User ID of the group admin who created this group
    this.admins = [adminId]; // Array of admin user IDs
    this.members = members; // Array of member user IDs
    this.channels = channels; // Array of channel IDs
    this.createdAt = new Date();
    this.isActive = true;
  }

  // Add admin to group
  addAdmin(userId) {
    if (!this.admins.includes(userId)) {
      this.admins.push(userId);
    }
  }

  // Remove admin from group
  removeAdmin(userId) {
    this.admins = this.admins.filter(admin => admin !== userId);
  }

  // Check if user is admin of this group
  isAdmin(userId) {
    return this.admins.includes(userId);
  }

  // Add member to group
  addMember(userId) {
    if (!this.members.includes(userId)) {
      this.members.push(userId);
    }
  }

  // Remove member from group
  removeMember(userId) {
    this.members = this.members.filter(member => member !== userId);
  }

  // Check if user is member of this group
  isMember(userId) {
    return this.members.includes(userId);
  }

  // Add channel to group
  addChannel(channelId) {
    if (!this.channels.includes(channelId)) {
      this.channels.push(channelId);
    }
  }

  // Remove channel from group
  removeChannel(channelId) {
    this.channels = this.channels.filter(channel => channel !== channelId);
  }

  // Get all users in group (members + admins)
  getAllUsers() {
    return [...new Set([...this.members, ...this.admins])];
  }
}

module.exports = Group;
