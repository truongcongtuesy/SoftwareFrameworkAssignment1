const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Group = require('../models/Group');
const Channel = require('../models/Channel');
const Message = require('../models/Message');

class DataStorage {
  constructor() {
    this.dataPath = path.join(__dirname, 'storage.json');
    this.data = {
      users: [],
      groups: [],
      channels: [],
      messages: [],
      nextId: {
        user: 1,
        group: 1,
        channel: 1,
        message: 1
      }
    };
    
    this.loadData();
    this.initializeDefaultData();
  }

  // Load data from file
  loadData() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const fileData = fs.readFileSync(this.dataPath, 'utf8');
        this.data = JSON.parse(fileData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.data = {
        users: [],
        groups: [],
        channels: [],
        messages: [],
        nextId: {
          user: 1,
          group: 1,
          channel: 1,
          message: 1
        }
      };
    }
  }

  // Save data to file
  saveData() {
    try {
      // Create a copy of data to avoid modifying original objects
      const dataToSave = {
        ...this.data,
        users: this.data.users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          password: user.password,
          roles: user.roles,
          groups: user.groups,
          createdAt: user.createdAt,
          isActive: user.isActive
        }))
      };
      fs.writeFileSync(this.dataPath, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  // Initialize default data
  initializeDefaultData() {
    if (this.data.users.length === 0) {
      // Create default super admin user
      const superAdmin = new User(
        this.getNextId('user'),
        'super',
        'super@example.com',
        '123',
        ['super-admin']
      );
      this.data.users.push(superAdmin);
      this.saveData();
    }
  }

  // Get next ID for entity type
  getNextId(type) {
    const id = this.data.nextId[type];
    this.data.nextId[type]++;
    this.saveData();
    return id;
  }

  // User methods
  getAllUsers() {
    return this.data.users.map(userData => {
      const user = new User(userData.id, userData.username, userData.email, userData.password, userData.roles, userData.groups);
      Object.assign(user, userData);
      return user;
    });
  }

  getUserById(id) {
    const userData = this.data.users.find(user => user.id === parseInt(id));
    if (userData) {
      const user = new User(userData.id, userData.username, userData.email, userData.password, userData.roles, userData.groups);
      Object.assign(user, userData);
      return user;
    }
    return null;
  }

  getUserByUsername(username) {
    const userData = this.data.users.find(user => user.username === username);
    if (userData) {
      const user = new User(userData.id, userData.username, userData.email, userData.password, userData.roles, userData.groups);
      Object.assign(user, userData);
      return user;
    }
    return null;
  }

  createUser(userData) {
    const user = new User(
      this.getNextId('user'),
      userData.username,
      userData.email,
      userData.password,
      userData.roles || ['user'],
      userData.groups || []
    );
    this.data.users.push(user);
    this.saveData();
    return user;
  }

  updateUser(id, updateData) {
    const userIndex = this.data.users.findIndex(user => user.id === parseInt(id));
    if (userIndex !== -1) {
      this.data.users[userIndex] = { ...this.data.users[userIndex], ...updateData };
      this.saveData();
      return this.getUserById(id);
    }
    return null;
  }

  deleteUser(id) {
    const userIndex = this.data.users.findIndex(user => user.id === parseInt(id));
    if (userIndex !== -1) {
      this.data.users.splice(userIndex, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // Group methods
  getAllGroups() {
    return this.data.groups.map(groupData => {
      const group = new Group(groupData.id, groupData.name, groupData.description, groupData.adminId, groupData.members, groupData.channels);
      Object.assign(group, groupData);
      return group;
    });
  }

  getGroupById(id) {
    const groupData = this.data.groups.find(group => group.id === parseInt(id));
    if (groupData) {
      const group = new Group(groupData.id, groupData.name, groupData.description, groupData.adminId, groupData.members, groupData.channels);
      Object.assign(group, groupData);
      return group;
    }
    return null;
  }

  createGroup(groupData) {
    const group = new Group(
      this.getNextId('group'),
      groupData.name,
      groupData.description,
      groupData.adminId,
      groupData.members || [],
      groupData.channels || []
    );
    this.data.groups.push(group);
    this.saveData();
    return group;
  }

  updateGroup(id, updateData) {
    const groupIndex = this.data.groups.findIndex(group => group.id === parseInt(id));
    if (groupIndex !== -1) {
      this.data.groups[groupIndex] = { ...this.data.groups[groupIndex], ...updateData };
      this.saveData();
      return this.getGroupById(id);
    }
    return null;
  }

  deleteGroup(id) {
    const groupIndex = this.data.groups.findIndex(group => group.id === parseInt(id));
    if (groupIndex !== -1) {
      this.data.groups.splice(groupIndex, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // Channel methods
  getAllChannels() {
    return this.data.channels.map(channelData => {
      const channel = new Channel(channelData.id, channelData.name, channelData.description, channelData.groupId, channelData.adminId, channelData.members);
      Object.assign(channel, channelData);
      return channel;
    });
  }

  getChannelById(id) {
    const channelData = this.data.channels.find(channel => channel.id === parseInt(id));
    if (channelData) {
      const channel = new Channel(channelData.id, channelData.name, channelData.description, channelData.groupId, channelData.adminId, channelData.members);
      Object.assign(channel, channelData);
      return channel;
    }
    return null;
  }

  getChannelsByGroupId(groupId) {
    return this.data.channels.filter(channel => channel.groupId === parseInt(groupId));
  }

  createChannel(channelData) {
    const channel = new Channel(
      this.getNextId('channel'),
      channelData.name,
      channelData.description,
      channelData.groupId,
      channelData.adminId,
      channelData.members || []
    );
    this.data.channels.push(channel);
    this.saveData();
    return channel;
  }

  updateChannel(id, updateData) {
    const channelIndex = this.data.channels.findIndex(channel => channel.id === parseInt(id));
    if (channelIndex !== -1) {
      this.data.channels[channelIndex] = { ...this.data.channels[channelIndex], ...updateData };
      this.saveData();
      return this.getChannelById(id);
    }
    return null;
  }

  deleteChannel(id) {
    const channelIndex = this.data.channels.findIndex(channel => channel.id === parseInt(id));
    if (channelIndex !== -1) {
      this.data.channels.splice(channelIndex, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // Message methods
  getMessagesByChannelId(channelId) {
    return this.data.messages.filter(message => message.channelId === parseInt(channelId));
  }

  createMessage(messageData) {
    const message = new Message(
      this.getNextId('message'),
      messageData.channelId,
      messageData.userId,
      messageData.username,
      messageData.content,
      messageData.type || 'text'
    );
    this.data.messages.push(message);
    this.saveData();
    return message;
  }
}

// Create singleton instance
const dataStorage = new DataStorage();

module.exports = dataStorage;
