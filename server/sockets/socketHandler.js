const dataStorage = require("../data/dataStorage");

const connectedUsers = new Map(); // Store connected users: socketId -> userId

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle user authentication
    socket.on("authenticate", (data) => {
      const { userId, username } = data;

      // Store user connection
      connectedUsers.set(socket.id, { userId, username });

      // Join user to their groups' channels
      const user = dataStorage.getUserById(userId);
      if (user) {
        const userGroups = dataStorage
          .getAllGroups()
          .filter((group) => group.getAllUsers().includes(user.id));

        userGroups.forEach((group) => {
          const channels = dataStorage.getChannelsByGroupId(group.id);
          channels.forEach((channel) => {
            if (channel.isMember(user.id)) {
              socket.join(`channel_${channel.id}`);
            }
          });
        });
      }

      socket.emit("authenticated", { success: true });
      console.log(`User ${username} (${userId}) authenticated`);
    });

    // Handle joining a channel
    socket.on("join_channel", (data) => {
      const { channelId, userId } = data;
      const channel = dataStorage.getChannelById(channelId);

      if (channel && channel.isMember(userId)) {
        socket.join(`channel_${channelId}`);

        // Send recent messages to the user
        const messages = dataStorage.getMessagesByChannelId(channelId);
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
      } else {
        socket.emit("error", { message: "Access denied to channel" });
      }
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
    socket.on("send_message", (data) => {
      const { channelId, content, type = "text" } = data;
      const userInfo = connectedUsers.get(socket.id);

      if (!userInfo) {
        socket.emit("error", { message: "User not authenticated" });
        return;
      }

      const channel = dataStorage.getChannelById(channelId);
      if (!channel || !channel.isMember(userInfo.userId)) {
        socket.emit("error", { message: "Access denied to channel" });
        return;
      }

      if (channel.isBanned(userInfo.userId)) {
        socket.emit("error", { message: "You are banned from this channel" });
        return;
      }

      // Create and save message
      const message = dataStorage.createMessage({
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
