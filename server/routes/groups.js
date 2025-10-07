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

// Add member to group (accepts userId or username)
router.post("/:id/members", async (req, res) => {
  const { id } = req.params;
  let { userId, username } = req.body;

  if (!userId && !username) {
    return res
      .status(400)
      .json({ error: "Either userId or username is required" });
  }

  const group = await mongoStorage.getGroupById(id);
  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }

  let user = null;
  if (userId) {
    user = await mongoStorage.getUserById(userId);
  } else if (username) {
    user = await mongoStorage.getUserByUsername(username);
  }

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const numericUserId = parseInt(user.id);
  const updatedMembers = Array.from(
    new Set([...(group.members || []), numericUserId])
  );
  const updatedGroups = Array.from(
    new Set([...(user.groups || []), parseInt(id)])
  );
  await mongoStorage.updateGroup(id, { members: updatedMembers });
  await mongoStorage.updateUser(numericUserId, { groups: updatedGroups });

  res.json({
    success: true,
    message: "User added to group successfully",
    user: { id: user.id, username: user.username },
  });
});

// Request to join group (non-super-admin requires approval)
router.post("/:id/join", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const group = await mongoStorage.getGroupById(id);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const user = await mongoStorage.getUserById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Already a member/admin
  if (
    (group.members || []).includes(user.id) ||
    (group.admins || []).includes(user.id)
  ) {
    return res.json({ success: true, message: "Already in group" });
  }

  const isSuperAdmin = (user.roles || []).includes("super-admin");
  if (isSuperAdmin) {
    // Super admin joins immediately
    const updatedMembers = Array.from(
      new Set([...(group.members || []), user.id])
    );
    const updatedGroups = Array.from(
      new Set([...(user.groups || []), parseInt(id)])
    );
    await mongoStorage.updateGroup(id, { members: updatedMembers });
    await mongoStorage.updateUser(user.id, { groups: updatedGroups });
    return res.json({ success: true, message: "Joined group" });
  }

  // Add to pendingRequests
  const pending = Array.from(
    new Set([...(group.pendingRequests || []), user.id])
  );
  await mongoStorage.updateGroup(id, { pendingRequests: pending });
  return res.json({
    success: true,
    message: "Join request submitted and pending approval",
  });
});

// Cancel own join request
router.post("/:id/join/cancel", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const group = await mongoStorage.getGroupById(id);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const user = await mongoStorage.getUserById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const newPending = (group.pendingRequests || []).filter(
    (u) => u !== parseInt(userId)
  );
  await mongoStorage.updateGroup(id, { pendingRequests: newPending });
  return res.json({ success: true, message: "Join request cancelled" });
});

// List pending join requests (returns user summaries)
router.get("/:id/requests", async (req, res) => {
  const group = await mongoStorage.getGroupById(req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  const allUsers = await mongoStorage.getAllUsers();
  const ids = new Set([...(group.pendingRequests || [])]);
  const users = allUsers
    .filter((u) => ids.has(u.id))
    .map(({ password, ...u }) => u);
  res.json(users);
});

// Approve join request
router.post("/:id/requests/:userId/approve", async (req, res) => {
  const { id, userId } = req.params;
  const group = await mongoStorage.getGroupById(id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  const user = await mongoStorage.getUserById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const newPending = (group.pendingRequests || []).filter(
    (u) => u !== parseInt(userId)
  );
  const newMembers = Array.from(
    new Set([...(group.members || []), parseInt(userId)])
  );
  const updatedGroups = Array.from(
    new Set([...(user.groups || []), parseInt(id)])
  );
  await mongoStorage.updateGroup(id, {
    pendingRequests: newPending,
    members: newMembers,
  });
  await mongoStorage.updateUser(userId, { groups: updatedGroups });
  res.json({ success: true, message: "Join request approved" });
});

// Reject join request
router.post("/:id/requests/:userId/reject", async (req, res) => {
  const { id, userId } = req.params;
  const group = await mongoStorage.getGroupById(id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  const newPending = (group.pendingRequests || []).filter(
    (u) => u !== parseInt(userId)
  );
  await mongoStorage.updateGroup(id, { pendingRequests: newPending });
  res.json({ success: true, message: "Join request rejected" });
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
