const express = require('express');
const router = express.Router();
const dataStorage = require('../data/dataStorage');

// Get all users (Super Admin only)
router.get('/', (req, res) => {
  const users = dataStorage.getAllUsers();
  const usersWithoutPasswords = users.map(user => user.toJSON());
  res.json(usersWithoutPasswords);
});

// Get user by ID
router.get('/:id', (req, res) => {
  const user = dataStorage.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user.toJSON());
});

// Update user
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Remove sensitive fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.password; // Handle password updates separately

  const updatedUser = dataStorage.updateUser(id, updateData);
  if (!updatedUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    success: true,
    user: updatedUser.toJSON(),
    message: 'User updated successfully'
  });
});

// Delete user
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  const success = dataStorage.deleteUser(id);
  if (!success) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// Promote user (Super Admin only)
router.post('/:id/promote', (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['group-admin', 'super-admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const user = dataStorage.getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.addRole(role);
  const updatedUser = dataStorage.updateUser(id, user);

  res.json({
    success: true,
    user: updatedUser.toJSON(),
    message: `User promoted to ${role} successfully`
  });
});

// Demote user (Super Admin only)
router.post('/:id/demote', (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['group-admin', 'super-admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const user = dataStorage.getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.removeRole(role);
  const updatedUser = dataStorage.updateUser(id, user);

  res.json({
    success: true,
    user: updatedUser.toJSON(),
    message: `User demoted from ${role} successfully`
  });
});

// Get user's groups
router.get('/:id/groups', (req, res) => {
  const user = dataStorage.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const allGroups = dataStorage.getAllGroups();
  const userGroups = allGroups.filter(group => 
    group.getAllUsers().includes(user.id)
  );

  res.json(userGroups);
});

module.exports = router;
