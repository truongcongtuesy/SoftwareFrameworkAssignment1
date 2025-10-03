const database = require("../config/database");

class MongoStorage {
  constructor() {
    this.db = null;
  }

  async init() {
    this.db = await database.connect();
  }

  async getNextId(collectionName) {
    try {
      const res = await this.db
        .collection("counters")
        .findOneAndUpdate(
          { _id: collectionName },
          { $inc: { seq: 1 } },
          { upsert: true, returnDocument: "after" }
        );
      if (res && res.value && typeof res.value.seq === "number") {
        return res.value.seq;
      }
    } catch (e) {
      // initialize then retry
      await this.db
        .collection("counters")
        .updateOne(
          { _id: collectionName },
          { $setOnInsert: { seq: 0 } },
          { upsert: true }
        );
      const res2 = await this.db
        .collection("counters")
        .findOneAndUpdate(
          { _id: collectionName },
          { $inc: { seq: 1 } },
          { upsert: true, returnDocument: "after" }
        );
      if (res2 && res2.value && typeof res2.value.seq === "number") {
        return res2.value.seq;
      }
    }
    const doc = await this.db
      .collection("counters")
      .findOne({ _id: collectionName });
    if (doc && typeof doc.seq === "number") return doc.seq;
    await this.db
      .collection("counters")
      .updateOne(
        { _id: collectionName },
        { $set: { seq: 1 } },
        { upsert: true }
      );
    return 1;
  }

  // Users
  async getAllUsers() {
    return await this.db.collection("users").find({}).toArray();
  }
  async getUserById(id) {
    return await this.db.collection("users").findOne({ id: parseInt(id) });
  }
  async getUserByUsername(username) {
    return await this.db.collection("users").findOne({ username });
  }
  async createUser(userData) {
    const user = {
      id: await this.getNextId("users"),
      username: userData.username,
      email: userData.email,
      password: userData.password,
      roles: userData.roles || ["user"],
      groups: userData.groups || [],
      avatarUrl: userData.avatarUrl || "",
      createdAt: new Date(),
      isActive: true,
    };
    await this.db.collection("users").insertOne(user);
    return user;
  }
  async updateUser(id, updateData) {
    await this.db
      .collection("users")
      .updateOne({ id: parseInt(id) }, { $set: updateData });
    return await this.getUserById(id);
  }
  async deleteUser(id) {
    const res = await this.db
      .collection("users")
      .deleteOne({ id: parseInt(id) });
    return res.deletedCount > 0;
  }

  // Groups
  async getAllGroups() {
    return await this.db.collection("groups").find({}).toArray();
  }
  async getGroupById(id) {
    return await this.db.collection("groups").findOne({ id: parseInt(id) });
  }
  async createGroup(groupData) {
    const group = {
      id: await this.getNextId("groups"),
      name: groupData.name,
      description: groupData.description || "",
      adminId: groupData.adminId,
      admins: [groupData.adminId],
      members: groupData.members || [],
      channels: groupData.channels || [],
      createdAt: new Date(),
      isActive: true,
    };
    await this.db.collection("groups").insertOne(group);
    return group;
  }
  async updateGroup(id, updateData) {
    await this.db
      .collection("groups")
      .updateOne({ id: parseInt(id) }, { $set: updateData });
    return await this.getGroupById(id);
  }
  async deleteGroup(id) {
    const res = await this.db
      .collection("groups")
      .deleteOne({ id: parseInt(id) });
    return res.deletedCount > 0;
  }

  // Channels
  async getAllChannels() {
    return await this.db.collection("channels").find({}).toArray();
  }
  async getChannelById(id) {
    return await this.db.collection("channels").findOne({ id: parseInt(id) });
  }
  async getChannelsByGroupId(groupId) {
    return await this.db
      .collection("channels")
      .find({ groupId: parseInt(groupId) })
      .toArray();
  }
  async createChannel(channelData) {
    const channel = {
      id: await this.getNextId("channels"),
      name: channelData.name,
      description: channelData.description || "",
      groupId: channelData.groupId,
      adminId: channelData.adminId,
      members: channelData.members || [],
      bannedUsers: [],
      messages: [],
      createdAt: new Date(),
      isActive: true,
    };
    await this.db.collection("channels").insertOne(channel);
    return channel;
  }
  async updateChannel(id, updateData) {
    await this.db
      .collection("channels")
      .updateOne({ id: parseInt(id) }, { $set: updateData });
    return await this.getChannelById(id);
  }
  async deleteChannel(id) {
    const res = await this.db
      .collection("channels")
      .deleteOne({ id: parseInt(id) });
    return res.deletedCount > 0;
  }

  // Messages
  async getMessagesByChannelId(channelId) {
    return await this.db
      .collection("messages")
      .find({ channelId: parseInt(channelId) })
      .sort({ timestamp: 1 })
      .toArray();
  }
  async createMessage(messageData) {
    const message = {
      id: await this.getNextId("messages"),
      channelId: messageData.channelId,
      userId: messageData.userId,
      username: messageData.username,
      content: messageData.content,
      type: messageData.type || "text",
      timestamp: new Date(),
      edited: false,
      editedAt: null,
    };
    await this.db.collection("messages").insertOne(message);
    // Also keep a lightweight reference on channel doc for traceability
    await this.db
      .collection("channels")
      .updateOne(
        { id: message.channelId },
        { $addToSet: { messages: message.id } }
      );
    return message;
  }
}

module.exports = new MongoStorage();
