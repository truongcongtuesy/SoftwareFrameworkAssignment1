const express = require("express");
const router = express.Router();
const mongoStorage = require("../data/mongoStorage");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Multer storage for avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "uploads", "avatars");
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${Date.now()}${ext}`);
  },
});
const uploadAvatar = multer({ storage: avatarStorage });

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
  // Protect root super admin (id 1) from deletion
  if (parseInt(id) === 1) {
    return res
      .status(403)
      .json({ error: "Root super admin cannot be deleted" });
  }
  const success = await mongoStorage.deleteUser(id);
  if (!success) return res.status(404).json({ error: "User not found" });

  // Cascade cleanup: remove user from all groups/channels/bans
  try {
    const userIdNum = parseInt(id);
    const allGroups = await mongoStorage.getAllGroups();
    for (const group of allGroups) {
      const newMembers = (group.members || []).filter((m) => m !== userIdNum);
      const newAdmins = (group.admins || []).filter((a) => a !== userIdNum);
      const updates = {};
      if (newMembers.length !== (group.members || []).length)
        updates.members = newMembers;
      if (newAdmins.length !== (group.admins || []).length)
        updates.admins = newAdmins;
      if (Object.keys(updates).length > 0) {
        await mongoStorage.updateGroup(group.id, updates);
      }
    }

    const allChannels = await mongoStorage.getAllChannels();
    for (const channel of allChannels) {
      const newChanMembers = (channel.members || []).filter(
        (m) => m !== userIdNum
      );
      const newBanned = (channel.bannedUsers || []).filter(
        (u) => u !== userIdNum
      );
      const updates = {};
      if (newChanMembers.length !== (channel.members || []).length)
        updates.members = newChanMembers;
      if (newBanned.length !== (channel.bannedUsers || []).length)
        updates.bannedUsers = newBanned;
      if (Object.keys(updates).length > 0) {
        await mongoStorage.updateChannel(channel.id, updates);
      }
    }
  } catch (e) {
    // Log but do not fail deletion response
    console.error("Cascade cleanup after user delete failed:", e);
  }

  res.json({ success: true, message: "User deleted successfully" });
});

// Upload avatar
router.post("/:id/avatar", uploadAvatar.single("avatar"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const relativePath = `/uploads/avatars/${req.file.filename}`;
    const updated = await mongoStorage.updateUser(id, {
      avatarUrl: relativePath,
    });
    if (!updated) return res.status(404).json({ error: "User not found" });
    const { password, ...u } = updated;
    res.json({ success: true, user: u, message: "Avatar updated" });
  } catch (e) {
    res.status(500).json({ error: "Failed to upload avatar" });
  }
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
