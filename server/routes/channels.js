const express = require("express");
const router = express.Router();
const mongoStorage = require("../data/mongoStorage");

// Get all channels
router.get("/", async (req, res) => {
  const channels = await mongoStorage.getAllChannels();
  res.json(channels);
});

// Get channel by ID
router.get("/:id", async (req, res) => {
  const channel = await mongoStorage.getChannelById(req.params.id);
  if (!channel) return res.status(404).json({ error: "Channel not found" });
  res.json(channel);
});

// Create new channel (Group Admin or Super Admin only)
router.post("/", async (req, res) => {
  const { name, description, groupId, adminId } = req.body;

  if (!name || !groupId || !adminId) {
    return res
      .status(400)
      .json({ error: "Name, groupId, and adminId are required" });
  }

  // Verify group exists
  const group = await mongoStorage.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }

  // Verify admin exists and has appropriate permissions
  const admin = await mongoStorage.getUserById(adminId);
  if (!admin) {
    return res.status(404).json({ error: "Admin user not found" });
  }

  // Check if user is super admin or group admin of this specific group
  const isSuper = (admin.roles || []).includes("super-admin");
  const isGroupAdmin = (group.admins || []).includes(parseInt(adminId));
  if (!isSuper && !isGroupAdmin) {
    return res
      .status(403)
      .json({
        error: "User does not have permission to create channels in this group",
      });
  }

  try {
    const newChannel = await mongoStorage.createChannel({
      name,
      description: description || "",
      groupId: parseInt(groupId),
      adminId: parseInt(adminId),
      members: Array.from(
        new Set([...(group.members || []), ...(group.admins || [])])
      ),
    });

    const updatedChannels = Array.from(
      new Set([...(group.channels || []), newChannel.id])
    );
    await mongoStorage.updateGroup(groupId, { channels: updatedChannels });

    res.status(201).json({
      success: true,
      channel: newChannel,
      message: "Channel created successfully",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create channel" });
  }
});

// Update channel
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Remove sensitive fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.adminId;
  delete updateData.groupId;

  const updatedChannel = await mongoStorage.updateChannel(id, updateData);
  if (!updatedChannel)
    return res.status(404).json({ error: "Channel not found" });
  res.json({
    success: true,
    channel: updatedChannel,
    message: "Channel updated successfully",
  });
});

// Delete channel
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const channel = await mongoStorage.getChannelById(id);
  if (!channel) return res.status(404).json({ error: "Channel not found" });
  const group = await mongoStorage.getGroupById(channel.groupId);
  if (group) {
    const updated = (group.channels || []).filter((c) => c !== parseInt(id));
    await mongoStorage.updateGroup(channel.groupId, { channels: updated });
  }
  const success = await mongoStorage.deleteChannel(id);
  if (!success)
    return res.status(500).json({ error: "Failed to delete channel" });
  res.json({ success: true, message: "Channel deleted successfully" });
});

// Get channel messages
router.get("/:id/messages", async (req, res) => {
  const channel = await mongoStorage.getChannelById(req.params.id);
  if (!channel) return res.status(404).json({ error: "Channel not found" });
  const messages = await mongoStorage.getMessagesByChannelId(req.params.id);
  res.json(messages);
});

// Add member to channel
router.post("/:id/members", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "UserId is required" });
  }

  const channel = await mongoStorage.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: "Channel not found" });
  }

  const user = await mongoStorage.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Check if user is member of the group
  const group = await mongoStorage.getGroupById(channel.groupId);
  const groupUsers = new Set([
    ...(group?.members || []),
    ...(group?.admins || []),
  ]);
  if (!group || !groupUsers.has(parseInt(userId))) {
    return res
      .status(403)
      .json({ error: "User must be a member of the group to join channel" });
  }

  const updatedMembers = Array.from(
    new Set([...(channel.members || []), parseInt(userId)])
  );
  await mongoStorage.updateChannel(id, { members: updatedMembers });

  res.json({
    success: true,
    message: "User added to channel successfully",
  });
});

// Remove member from channel
router.delete("/:id/members/:userId", async (req, res) => {
  const { id, userId } = req.params;

  const channel = await mongoStorage.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: "Channel not found" });
  }

  const updatedMembers = (channel.members || []).filter(
    (m) => m !== parseInt(userId)
  );
  await mongoStorage.updateChannel(id, { members: updatedMembers });

  res.json({
    success: true,
    message: "User removed from channel successfully",
  });
});

// Ban user from channel
router.post("/:id/ban", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "UserId is required" });
  }

  const channel = await mongoStorage.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: "Channel not found" });
  }

  const bannedUsers = Array.from(
    new Set([...(channel.bannedUsers || []), parseInt(userId)])
  );
  const members = (channel.members || []).filter((m) => m !== parseInt(userId));
  await mongoStorage.updateChannel(id, { bannedUsers, members });

  res.json({
    success: true,
    message: "User banned from channel successfully",
  });
});

// Unban user from channel
router.post("/:id/unban", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "UserId is required" });
  }

  const channel = await mongoStorage.getChannelById(id);
  if (!channel) {
    return res.status(404).json({ error: "Channel not found" });
  }

  const bannedUsers = (channel.bannedUsers || []).filter(
    (u) => u !== parseInt(userId)
  );
  await mongoStorage.updateChannel(id, { bannedUsers });

  res.json({
    success: true,
    message: "User unbanned from channel successfully",
  });
});

module.exports = router;
