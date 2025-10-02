const express = require("express");
const router = express.Router();
const mongoStorage = require("../data/mongoStorage");

// Login route
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }
    const user = await mongoStorage.getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    if (!user.isActive) {
      return res.status(401).json({ error: "Account is deactivated" });
    }
    const { password: _pw, ...userWithoutPassword } = user;
    res.json({
      success: true,
      user: userWithoutPassword,
      message: "Login successful",
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Register route
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "Username, email, and password are required" });
    }
    const existingUser = await mongoStorage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }
    const newUser = await mongoStorage.createUser({
      username,
      email,
      password,
      roles: ["user"],
    });
    const { password: _pw, ...userWithoutPassword } = newUser;
    res.status(201).json({
      success: true,
      user: userWithoutPassword,
      message: "User created successfully",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Logout route (client-side handling mostly)
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logout successful" });
});

module.exports = router;
