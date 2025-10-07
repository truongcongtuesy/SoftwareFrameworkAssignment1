const request = require("supertest");
const { app, server, startServer } = require("../server");
beforeAll(async () => {
  await startServer();
});

describe("Auth Routes", () => {
  afterAll((done) => {
    try {
      if (server && server.listening) {
        server.close(done);
      } else {
        done();
      }
    } catch (_) {
      done();
    }
  });

  const username = "testuser_" + Date.now();

  it("registers a user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username, email: `${username}@example.com`, password: "123" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe(username);
  });

  it("rejects duplicate username", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username, email: `${username}2@example.com`, password: "123" });
    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username, password: "123" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe(username);
  });

  it("fails login with wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username, password: "wrong" });
    expect(res.status).toBe(401);
  });
});
