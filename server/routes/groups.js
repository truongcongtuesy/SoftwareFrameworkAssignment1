const express = require('express');
const router = express.Router();
const dataStorage = require('../data/dataStorage');

// Get all groups
router.get('/', (req, res) => {
  const groups = dataStorage.getAllGroups();
  res.json(groups);
});

// Get group by ID
router.get('/:id', (req, res) => {
  const group = dataStorage.getGroupById(req.params.id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }
  res.json(group);
});

// Create new group (Group Admin or Super Admin only)
router.post('/', (req, res) => {
  const { name, description, adminId } = req.body;

  if (!name || !adminId) {
    return res.status(400).json({ error: 'Name and adminId are required' });
  }

  // Verify admin exists and has appropriate role
  const admin = dataStorage.getUserById(adminId);
  if (!admin || (!admin.isGroupAdmin() && !admin.isSuperAdmin())) {
    return res.status(403).json({ error: 'User does not have permission to create groups' });
  }

  try {
    const newGroup = dataStorage.createGroup({
      name,
      description: description || '',
      adminId: parseInt(adminId)
    });

    res.status(201).json({
      success: true,
      group: newGroup,
      message: 'Group created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Update group
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Remove sensitive fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.adminId;

  const updatedGroup = dataStorage.updateGroup(id, updateData);
  if (!updatedGroup) {
    return res.status(404).json({ error: 'Group not found' });
  }

  res.json({
    success: true,
    group: updatedGroup,
    message: 'Group updated successfully'
  });
});

// Delete group
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  const success = dataStorage.deleteGroup(id);
  if (!success) {
    return res.status(404).json({ error: 'Group not found' });
  }

  res.json({
    success: true,
    message: 'Group deleted successfully'
  });
});

// Add member to group
router.post('/:id/members', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'UserId is required' });
  }

  const group = dataStorage.getGroupById(id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const user = dataStorage.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  group.addMember(parseInt(userId));
  user.joinGroup(parseInt(id));

  dataStorage.updateGroup(id, group);
  dataStorage.updateUser(userId, user);

  res.json({
    success: true,
    message: 'User added to group successfully'
  });
});

// Remove member from group
router.delete('/:id/members/:userId', (req, res) => {
  const { id, userId } = req.params;

  const group = dataStorage.getGroupById(id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const user = dataStorage.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  group.removeMember(parseInt(userId));
  user.leaveGroup(parseInt(id));

  dataStorage.updateGroup(id, group);
  dataStorage.updateUser(userId, user);

  res.json({
    success: true,
    message: 'User removed from group successfully'
  });
});

// Get group members
router.get('/:id/members', (req, res) => {
  const group = dataStorage.getGroupById(req.params.id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const allUsers = dataStorage.getAllUsers();
  const members = allUsers.filter(user => group.getAllUsers().includes(user.id));
  const membersWithoutPasswords = members.map(user => user.toJSON());

  res.json(membersWithoutPasswords);
});

// Get group channels
router.get('/:id/channels', (req, res) => {
  const group = dataStorage.getGroupById(req.params.id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const channels = dataStorage.getChannelsByGroupId(req.params.id);
  res.json(channels);
});

module.exports = router;
