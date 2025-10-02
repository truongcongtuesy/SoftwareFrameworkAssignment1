const fs = require("fs");
const path = require("path");
const database = require("../config/database");

async function migrate() {
  try {
    await database.connect();
    const db = database.db;

    const storagePath = path.join(__dirname, "../data/storage.json");
    const data = JSON.parse(fs.readFileSync(storagePath, "utf8"));

    if (data.users?.length) {
      await db.collection("users").deleteMany({});
      await db.collection("users").insertMany(data.users);
      console.log(`Migrated ${data.users.length} users`);
    }

    if (data.groups?.length) {
      await db.collection("groups").deleteMany({});
      await db.collection("groups").insertMany(data.groups);
      console.log(`Migrated ${data.groups.length} groups`);
    }

    if (data.channels?.length) {
      await db.collection("channels").deleteMany({});
      await db.collection("channels").insertMany(data.channels);
      console.log(`Migrated ${data.channels.length} channels`);
    }

    if (data.messages?.length) {
      await db.collection("messages").deleteMany({});
      await db.collection("messages").insertMany(data.messages);
      console.log(`Migrated ${data.messages.length} messages`);
    }

    console.log("Migration completed.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await database.disconnect();
  }
}

migrate();
