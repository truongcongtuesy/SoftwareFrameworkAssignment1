const { MongoClient } = require("mongodb");

class Database {
  constructor() {
    this.client = null;
    this.db = null;
    this.url = process.env.MONGODB_URL || "mongodb://localhost:27017";
    this.dbName = process.env.MONGODB_DB || "chat_system";
  }

  async connect() {
    if (this.db) return this.db;
    this.client = new MongoClient(this.url);
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    console.log("Connected to MongoDB:", this.dbName);
    return this.db;
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log("Disconnected from MongoDB");
    }
  }

  getCollection(name) {
    if (!this.db) throw new Error("Database not connected");
    return this.db.collection(name);
  }
}

module.exports = new Database();
