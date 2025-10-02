const mongoStorage = require("../data/mongoStorage");

const connectedUsers = new Map(); // Store connected users: socketId -> userId

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle user authentication
    socket.on("authenticate", async (data) => {
      const { userId, username } = data;

      // Store user connection
      connectedUsers.set(socket.id, { userId, username });

      // Join user to their groups' channels
      const user = await mongoStorage.getUserById(userId);
      if (user) {
        const allGroups = await mongoStorage.getAllGroups();
        const userGroups = allGroups.filter(
          (group) =>
            (group.members || []).includes(user.id) ||
            (group.admins || []).includes(user.id)
        );

        for (const group of userGroups) {
          const channels = await mongoStorage.getChannelsByGroupId(group.id);
          for (const channel of channels) {
            if ((channel.members || []).includes(user.id)) {
              socket.join(`channel_${channel.id}`);
            }
          }
        }
      }

      socket.emit("authenticated", { success: true });
      console.log(`User ${username} (${userId}) authenticated`);
    });

    // Handle joining a channel
    socket.on("join_channel", async (data) => {
      const { channelId, userId } = data;
      const channel = await mongoStorage.getChannelById(channelId);

      if (!channel) {
        socket.emit("error", { message: "Channel not found" });
        return;
      }

      // Check if user is member of the group that owns this channel
      const group = await mongoStorage.getGroupById(channel.groupId);
      if (!group) {
        socket.emit("error", { message: "Group not found" });
        return;
      }

      const isGroupMember =
        (group.members || []).includes(userId) ||
        (group.admins || []).includes(userId);
      if (!isGroupMember) {
        socket.emit("error", {
          message: "You must be a member of the group to join this channel",
        });
        return;
      }

      // Add user to channel members if not already there
      if (!(channel.members || []).includes(userId)) {
        const updatedMembers = [...(channel.members || []), userId];
        await mongoStorage.updateChannel(channelId, {
          members: updatedMembers,
        });
      }

      socket.join(`channel_${channelId}`);

      // Send recent messages to the user
      const messages = await mongoStorage.getMessagesByChannelId(channelId);
      socket.emit("channel_messages", messages);

      // Notify other users in the channel
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        socket.to(`channel_${channelId}`).emit("user_joined", {
          username: userInfo.username,
          channelId,
        });
      }

      console.log(`User joined channel ${channelId}`);
    });

    // Handle leaving a channel
    socket.on("leave_channel", (data) => {
      const { channelId } = data;
      socket.leave(`channel_${channelId}`);

      // Notify other users in the channel
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        socket.to(`channel_${channelId}`).emit("user_left", {
          username: userInfo.username,
          channelId,
        });
      }

      console.log(`User left channel ${channelId}`);
    });

    // Handle sending messages
    socket.on("send_message", async (data) => {
      const { channelId, content, type = "text" } = data;
      const userInfo = connectedUsers.get(socket.id);

      if (!userInfo) {
        socket.emit("error", { message: "User not authenticated" });
        return;
      }

      const channel = await mongoStorage.getChannelById(channelId);
      if (!channel || !(channel.members || []).includes(userInfo.userId)) {
        socket.emit("error", { message: "Access denied to channel" });
        return;
      }

      if ((channel.bannedUsers || []).includes(userInfo.userId)) {
        socket.emit("error", { message: "You are banned from this channel" });
        return;
      }

      // Create and save message
      const message = await mongoStorage.createMessage({
        channelId: parseInt(channelId),
        userId: userInfo.userId,
        username: userInfo.username,
        content,
        type,
      });

      // Send message to all users in the channel
      io.to(`channel_${channelId}`).emit("new_message", message);

      console.log(
        `Message sent to channel ${channelId} by ${userInfo.username}`
      );
    });

    // Handle typing indicators
    socket.on("typing_start", (data) => {
      const { channelId } = data;
      const userInfo = connectedUsers.get(socket.id);

      if (userInfo) {
        socket.to(`channel_${channelId}`).emit("user_typing", {
          username: userInfo.username,
          channelId,
        });
      }
    });

    socket.on("typing_stop", (data) => {
      const { channelId } = data;
      const userInfo = connectedUsers.get(socket.id);

      if (userInfo) {
        socket.to(`channel_${channelId}`).emit("user_stopped_typing", {
          username: userInfo.username,
          channelId,
        });
      }
    });

    // Handle video call signaling
    socket.on("video_call_offer", (data) => {
      const { channelId, offer, targetUserId } = data;
      const userInfo = connectedUsers.get(socket.id);

      if (userInfo) {
        // Find target user's socket
        for (const [socketId, user] of connectedUsers.entries()) {
          if (user.userId === targetUserId) {
            io.to(socketId).emit("video_call_offer", {
              offer,
              fromUserId: userInfo.userId,
              fromUsername: userInfo.username,
              channelId,
            });
            break;
          }
        }
      }
    });

    socket.on("video_call_answer", (data) => {
      const { answer, targetUserId } = data;
      const userInfo = connectedUsers.get(socket.id);

      if (userInfo) {
        // Find target user's socket
        for (const [socketId, user] of connectedUsers.entries()) {
          if (user.userId === targetUserId) {
            io.to(socketId).emit("video_call_answer", {
              answer,
              fromUserId: userInfo.userId,
              fromUsername: userInfo.username,
            });
            break;
          }
        }
      }
    });

    socket.on("ice_candidate", (data) => {
      const { candidate, targetUserId } = data;
      const userInfo = connectedUsers.get(socket.id);

      if (userInfo) {
        // Find target user's socket
        for (const [socketId, user] of connectedUsers.entries()) {
          if (user.userId === targetUserId) {
            io.to(socketId).emit("ice_candidate", {
              candidate,
              fromUserId: userInfo.userId,
            });
            break;
          }
        }
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        console.log(`User ${userInfo.username} disconnected`);
        connectedUsers.delete(socket.id);
      } else {
        console.log("Unknown user disconnected:", socket.id);
      }
    });
  });
};
