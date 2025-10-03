const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const groupRoutes = require("./routes/groups");
const channelRoutes = require("./routes/channels");

// Import socket handlers
const socketHandler = require("./sockets/socketHandler");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"],
  },
});

// Make io available in routes via app
app.set("io", io);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
// Ensure uploads directory exists and serve it statically
const uploadsDir = path.join(__dirname, "uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const avatarsDir = path.join(uploadsDir, "avatars");
  if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });
  const imagesDir = path.join(uploadsDir, "messages");
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
} catch (e) {
  console.error("Failed to ensure uploads directories:", e);
}
app.use("/uploads", express.static(uploadsDir));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/channels", channelRoutes);

// Socket handling
socketHandler(io);

// Default route
app.get("/", (req, res) => {
  res.json({ message: "Chat System Server is running!" });
});

const PORT = process.env.PORT || 3000;

// Mongo init before listen
const mongoStorage = require("./data/mongoStorage");
const schema = require("./config/schema");

async function startServer() {
  try {
    await mongoStorage.init();
    await schema.initialize();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, io };
