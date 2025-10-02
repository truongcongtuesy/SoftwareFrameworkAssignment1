const express = require("express");
const router = express.Router();
const mongoStorage = require("../data/mongoStorage");

// Get all users (Super Admin only)
router.get("/", async (req, res) => {
  const users = await mongoStorage.getAllUsers();
  const usersWithoutPasswords = users.map(({ password, ...u }) => u);
  res.json(usersWithoutPasswords);
});

// Get user by ID
router.get("/:id", async (req, res) => {
  const user = await mongoStorage.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { password, ...u } = user;
  res.json(u);
});

// Update user
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Remove sensitive fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.password; // Handle password updates separately

  const updatedUser = await mongoStorage.updateUser(id, updateData);
  if (!updatedUser) return res.status(404).json({ error: "User not found" });
  const { password, ...u } = updatedUser;
  res.json({ success: true, user: u, message: "User updated successfully" });
});

// Delete user
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const success = await mongoStorage.deleteUser(id);
  if (!success) return res.status(404).json({ error: "User not found" });
  res.json({ success: true, message: "User deleted successfully" });
});

// Promote user (Super Admin only)
router.post("/:id/promote", async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !["group-admin", "super-admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const user = await mongoStorage.getUserById(id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const roles = Array.from(new Set([...(user.roles || []), role]));
  const updatedUser = await mongoStorage.updateUser(id, { roles });
  const { password, ...u } = updatedUser;
  res.json({
    success: true,
    user: u,
    message: `User promoted to ${role} successfully`,
  });
});

// Demote user (Super Admin only)
router.post("/:id/demote", async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !["group-admin", "super-admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const user = await mongoStorage.getUserById(id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const roles = (user.roles || []).filter((r) => r !== role);
  const updatedUser = await mongoStorage.updateUser(id, { roles });
  const { password, ...u } = updatedUser;
  res.json({
    success: true,
    user: u,
    message: `User demoted from ${role} successfully`,
  });
});

// Get user's groups
router.get("/:id/groups", async (req, res) => {
  const user = await mongoStorage.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const allGroups = await mongoStorage.getAllGroups();
  const userGroups = allGroups.filter(
    (group) =>
      (group.members || []).includes(user.id) ||
      (group.admins || []).includes(user.id)
  );
  res.json(userGroups);
});

module.exports = router;
