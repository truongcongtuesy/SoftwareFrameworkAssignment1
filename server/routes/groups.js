const express = require("express");
const router = express.Router();
const mongoStorage = require("../data/mongoStorage");

// Get all groups
router.get("/", async (req, res) => {
  const groups = await mongoStorage.getAllGroups();
  res.json(groups);
});

// Get group by ID
router.get("/:id", async (req, res) => {
  const group = await mongoStorage.getGroupById(req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  res.json(group);
});

// Create new group (Group Admin or Super Admin only)
router.post("/", async (req, res) => {
  const { name, description, adminId } = req.body;

  if (!name || !adminId) {
    return res.status(400).json({ error: "Name and adminId are required" });
  }

  // Verify admin exists and has appropriate role
  const admin = await mongoStorage.getUserById(adminId);
  if (
    !admin ||
    !(
      (admin.roles || []).includes("group-admin") ||
      (admin.roles || []).includes("super-admin")
    )
  ) {
    return res
      .status(403)
      .json({ error: "User does not have permission to create groups" });
  }

  try {
    const newGroup = await mongoStorage.createGroup({
      name,
      description: description || "",
      adminId: parseInt(adminId),
    });

    res.status(201).json({
      success: true,
      group: newGroup,
      message: "Group created successfully",
    });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
});

// Update group
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Remove sensitive fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.adminId;

  const updatedGroup = await mongoStorage.updateGroup(id, updateData);
  if (!updatedGroup) return res.status(404).json({ error: "Group not found" });
  res.json({
    success: true,
    group: updatedGroup,
    message: "Group updated successfully",
  });
});

// Delete group
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const success = await mongoStorage.deleteGroup(id);
  if (!success) return res.status(404).json({ error: "Group not found" });
  res.json({ success: true, message: "Group deleted successfully" });
});

// Add member to group
router.post("/:id/members", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "UserId is required" });
  }

  const group = await mongoStorage.getGroupById(id);
  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }

  const user = await mongoStorage.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const updatedMembers = Array.from(
    new Set([...(group.members || []), parseInt(userId)])
  );
  const updatedGroups = Array.from(
    new Set([...(user.groups || []), parseInt(id)])
  );
  await mongoStorage.updateGroup(id, { members: updatedMembers });
  await mongoStorage.updateUser(userId, { groups: updatedGroups });

  res.json({
    success: true,
    message: "User added to group successfully",
  });
});

// Remove member from group
router.delete("/:id/members/:userId", async (req, res) => {
  const { id, userId } = req.params;

  const group = await mongoStorage.getGroupById(id);
  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }

  const user = await mongoStorage.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const updatedMembers = (group.members || []).filter(
    (m) => m !== parseInt(userId)
  );
  const updatedUserGroups = (user.groups || []).filter(
    (g) => g !== parseInt(id)
  );
  await mongoStorage.updateGroup(id, { members: updatedMembers });
  await mongoStorage.updateUser(userId, { groups: updatedUserGroups });

  res.json({
    success: true,
    message: "User removed from group successfully",
  });
});

// Get group members
router.get("/:id/members", async (req, res) => {
  const group = await mongoStorage.getGroupById(req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  const allUsers = await mongoStorage.getAllUsers();
  const ids = new Set([...(group.members || []), ...(group.admins || [])]);
  const members = allUsers
    .filter((u) => ids.has(u.id))
    .map(({ password, ...u }) => u);
  res.json(members);
});

// Get group channels
router.get("/:id/channels", async (req, res) => {
  const group = await mongoStorage.getGroupById(req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  const channels = await mongoStorage.getChannelsByGroupId(req.params.id);
  res.json(channels);
});

module.exports = router;
