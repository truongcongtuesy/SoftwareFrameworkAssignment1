class Channel {
  constructor(id, name, description, groupId, adminId, members = []) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.groupId = groupId; // ID of the group this channel belongs to
    this.adminId = adminId; // User ID of the admin who created this channel
    this.members = members; // Array of user IDs who can access this channel
    this.bannedUsers = []; // Array of user IDs who are banned from this channel
    this.messages = []; // Array of messages in this channel
    this.createdAt = new Date();
    this.isActive = true;
  }

  // Add member to channel
  addMember(userId) {
    if (!this.members.includes(userId) && !this.bannedUsers.includes(userId)) {
      this.members.push(userId);
    }
  }

  // Remove member from channel
  removeMember(userId) {
    this.members = this.members.filter(member => member !== userId);
  }

  // Check if user is member of this channel
  isMember(userId) {
    return this.members.includes(userId);
  }

  // Ban user from channel
  banUser(userId) {
    if (!this.bannedUsers.includes(userId)) {
      this.bannedUsers.push(userId);
      this.removeMember(userId);
    }
  }

  // Unban user from channel
  unbanUser(userId) {
    this.bannedUsers = this.bannedUsers.filter(user => user !== userId);
  }

  // Check if user is banned from this channel
  isBanned(userId) {
    return this.bannedUsers.includes(userId);
  }

  // Add message to channel
  addMessage(message) {
    this.messages.push(message);
  }

  // Get recent messages (limit to last 100)
  getRecentMessages(limit = 100) {
    return this.messages.slice(-limit);
  }
}

module.exports = Channel;
