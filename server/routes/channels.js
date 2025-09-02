const express = require('express');
const router = express.Router();
const dataStorage = require('../data/dataStorage');

// Get all channels
router.get('/', (req, res) => {
  const channels = dataStorage.getAllChannels();
  res.json(channels);
});

// Get channel by ID
router.get('/:id', (req, res) => {
  const channel = dataStorage.getChannelById(req.params.id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }
  res.json(channel);
});

// Create new channel (Group Admin or Super Admin only)
router.post('/', (req, res) => {
  const { name, description, groupId, adminId } = req.body;

  if (!name || !groupId || !adminId) {
    return res.status(400).json({ error: 'Name, groupId, and adminId are required' });
  }

  // Verify group exists
  const group = dataStorage.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  // Verify admin exists and has appropriate permissions
  const admin = dataStorage.getUserById(adminId);
  if (!admin) {
    return res.status(404).json({ error: 'Admin user not found' });
  }

  // Check if user is super admin or group admin of this specific group
  if (!admin.isSuperAdmin() && !group.isAdmin(parseInt(adminId))) {
    return res.status(403).json({ error: 'User does not have permission to create channels in this group' });
  }

  try {
    const newChannel = dataStorage.createChannel({
      name,
      description: description || '',
      groupId: parseInt(groupId),
      adminId: parseInt(adminId),
      members: group.getAllUsers() // All group members can access new channel by default
    });

    // Add channel to group
    group.addChannel(newChannel.id);
    dataStorage.updateGroup(groupId, group);

    res.status(201).json({
      success: true,
      channel: newChannel,
      message: 'Channel created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// Update channel
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Remove sensitive fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.adminId;
  delete updateData.groupId;

  const updatedChannel = dataStorage.updateChannel(id, updateData);
  if (!updatedChannel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  res.json({
    success: true,
    channel: updatedChannel,
    message: 'Channel updated successfully'
  });
});

// Delete channel
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  const channel = dataStorage.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  // Remove channel from group
  const group = dataStorage.getGroupById(channel.groupId);
  if (group) {
    group.removeChannel(parseInt(id));
    dataStorage.updateGroup(channel.groupId, group);
  }

  const success = dataStorage.deleteChannel(id);
  if (!success) {
    return res.status(500).json({ error: 'Failed to delete channel' });
  }

  res.json({
    success: true,
    message: 'Channel deleted successfully'
  });
});

// Get channel messages
router.get('/:id/messages', (req, res) => {
  const channel = dataStorage.getChannelById(req.params.id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const messages = dataStorage.getMessagesByChannelId(req.params.id);
  res.json(messages);
});

// Add member to channel
router.post('/:id/members', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'UserId is required' });
  }

  const channel = dataStorage.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const user = dataStorage.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if user is member of the group
  const group = dataStorage.getGroupById(channel.groupId);
  if (!group || !group.getAllUsers().includes(parseInt(userId))) {
    return res.status(403).json({ error: 'User must be a member of the group to join channel' });
  }

  channel.addMember(parseInt(userId));
  dataStorage.updateChannel(id, channel);

  res.json({
    success: true,
    message: 'User added to channel successfully'
  });
});

// Remove member from channel
router.delete('/:id/members/:userId', (req, res) => {
  const { id, userId } = req.params;

  const channel = dataStorage.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  channel.removeMember(parseInt(userId));
  dataStorage.updateChannel(id, channel);

  res.json({
    success: true,
    message: 'User removed from channel successfully'
  });
});

// Ban user from channel
router.post('/:id/ban', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'UserId is required' });
  }

  const channel = dataStorage.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  channel.banUser(parseInt(userId));
  dataStorage.updateChannel(id, channel);

  res.json({
    success: true,
    message: 'User banned from channel successfully'
  });
});

// Unban user from channel
router.post('/:id/unban', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'UserId is required' });
  }

  const channel = dataStorage.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  channel.unbanUser(parseInt(userId));
  dataStorage.updateChannel(id, channel);

  res.json({
    success: true,
    message: 'User unbanned from channel successfully'
  });
});

module.exports = router;
