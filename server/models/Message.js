class Message {
  constructor(id, channelId, userId, username, content, type = 'text', timestamp = new Date()) {
    this.id = id;
    this.channelId = channelId;
    this.userId = userId;
    this.username = username;
    this.content = content;
    this.type = type; // 'text', 'image', 'file', 'video-call'
    this.timestamp = timestamp;
    this.edited = false;
    this.editedAt = null;
  }

  // Edit message content
  edit(newContent) {
    this.content = newContent;
    this.edited = true;
    this.editedAt = new Date();
  }
}

module.exports = Message;
