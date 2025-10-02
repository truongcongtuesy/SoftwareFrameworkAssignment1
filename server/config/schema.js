const database = require("./database");

class Schema {
  async initialize() {
    const db = await database.connect();
    await this.createUsers(db);
    await this.createGroups(db);
    await this.createChannels(db);
    await this.createMessages(db);
    await this.createImages(db);
    await this.ensureCounters(db);
    await this.ensureDefaultSuper(db);
  }

  async createUsers(db) {
    const c = db.collection("users");
    await c.createIndex({ username: 1 }, { unique: true });
    await c.createIndex({ email: 1 }, { unique: true });
  }

  async createGroups(db) {
    const c = db.collection("groups");
    await c.createIndex({ name: 1 });
    await c.createIndex({ adminId: 1 });
  }

  async createChannels(db) {
    const c = db.collection("channels");
    await c.createIndex({ groupId: 1 });
    await c.createIndex({ name: 1, groupId: 1 }, { unique: true });
  }

  async createMessages(db) {
    const c = db.collection("messages");
    await c.createIndex({ channelId: 1, timestamp: -1 });
    await c.createIndex({ userId: 1 });
  }

  async createImages(db) {
    const c = db.collection("images");
    await c.createIndex({ userId: 1 });
    await c.createIndex({ messageId: 1 });
  }

  async ensureCounters(db) {
    const counters = db.collection("counters");
    const entities = ["users", "groups", "channels", "messages"];
    for (const e of entities) {
      await counters.updateOne(
        { _id: e },
        { $setOnInsert: { seq: 0 } },
        { upsert: true }
      );
    }
  }

  async ensureDefaultSuper(db) {
    const users = db.collection("users");
    const count = await users.countDocuments();
    if (count === 0) {
      // Initialize users counter to 1 and insert default super admin
      await db
        .collection("counters")
        .updateOne({ _id: "users" }, { $set: { seq: 1 } }, { upsert: true });
      await users.insertOne({
        id: 1,
        username: "super",
        email: "super@example.com",
        password: "123",
        roles: ["super-admin"],
        groups: [],
        createdAt: new Date(),
        isActive: true,
      });
      console.log("Seeded default super admin user (super/123)");
    }
  }
}

module.exports = new Schema();
