const express = require('express');
const router = express.Router();
const dataStorage = require('../data/dataStorage');

// Login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = dataStorage.getUserByUsername(username);
  
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  if (!user.isActive) {
    return res.status(401).json({ error: 'Account is deactivated' });
  }

  // Return user data without password
  res.json({
    success: true,
    user: user.toJSON(),
    message: 'Login successful'
  });
});

// Register route
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  // Check if username already exists
  const existingUser = dataStorage.getUserByUsername(username);
  if (existingUser) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  try {
    const newUser = dataStorage.createUser({
      username,
      email,
      password,
      roles: ['user']
    });

    res.status(201).json({
      success: true,
      user: newUser.toJSON(),
      message: 'User created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Logout route (client-side handling mostly)
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logout successful' });
});

module.exports = router;
