const request = require("supertest");
const { app, server, startServer } = require("../server");
const database = require("../config/database");

describe("Group Routes", () => {
  let adminUser;
  afterAll(async () => {
    await database.disconnect();
    try {
      if (server && server.listening) server.close();
    } catch (_) {}
  });

  beforeAll(async () => {
    await startServer();
    // Ensure default super exists
    const db = await database.connect();
    const users = db.collection("users");
    const counters = db.collection("counters");
    await counters.updateOne(
      { _id: "users" },
      { $setOnInsert: { seq: 1 } },
      { upsert: true }
    );
    await users.updateOne(
      { username: "super" },
      {
        $set: {
          id: 1,
          username: "super",
          email: "super@example.com",
          password: "123",
          roles: ["super-admin"],
          groups: [],
          isActive: true,
        },
      },
      { upsert: true }
    );
  });

  it("creates a super admin via promote and can create group", async () => {
    const uname = `super_test_${Date.now()}`;
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ username: uname, email: `${uname}@ex.com`, password: "123" });
    expect(reg.status).toBe(201);
    const u = reg.body.user;

    const promote = await request(app)
      .post(`/api/users/${u.id}/promote`)
      .send({ role: "super-admin" });
    expect(promote.status).toBe(200);
    adminUser = promote.body.user;

    const resCreate = await request(app)
      .post("/api/groups")
      .send({ name: "Test Group", description: "desc", adminId: adminUser.id });
    expect(resCreate.status).toBe(201);
    expect(resCreate.body.group.name).toBe("Test Group");
  });

  it("lists groups", async () => {
    const res = await request(app).get("/api/groups");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
