import assert from "node:assert/strict";
import { describe, test, mock, afterEach } from "node:test";
import { UserModel } from "../models/user.js";
import { UserController } from "../controllers/users.js";

describe("User Controller - Unit Tests", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  describe("getUserById", () => {
    test("deberia devolver un usuario existente", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        nombre: "Test User",
        activo: true,
        created_at: new Date(),
      };

      mock.method(UserModel, "findById", async () => mockUser);

      const req = { params: { id: "1" } };
      const res = { json: mock.fn() };

      await UserController.getUserById(req, res);

      const calls = UserModel.findById.mock.calls;
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].arguments[0], "1");

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], mockUser);
    });

    test("deberia devolver 404 si el usuario no existe", async () => {
      mock.method(UserModel, "findById", async () => null);

      const req = { params: { id: "999" } };
      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
      };

      await UserController.getUserById(req, res);

      const statusCalls = res.status.mock.calls;
      assert.strictEqual(statusCalls.length, 1);
      assert.strictEqual(statusCalls[0].arguments[0], 404);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], { message: "Usuario no encontrado" });
    });
  });

  describe("updateUser", () => {
    test("deberia actualizar un usuario existente", async () => {
      const mockUpdatedUser = {
        id: "1",
        email: "updated@test.com",
        nombre: "Updated User",
        activo: true,
        created_at: new Date(),
      };

      mock.method(UserModel, "updateUser", async () => mockUpdatedUser);

      const req = {
        params: { id: "1" },
        body: { email: "updated@test.com", nombre: "Updated User" },
      };
      const res = { json: mock.fn() };

      await UserController.updateUser(req, res);

      const calls = UserModel.updateUser.mock.calls;
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].arguments[0], "1");
      assert.deepStrictEqual(calls[0].arguments[1], { email: "updated@test.com", nombre: "Updated User" });

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], mockUpdatedUser);
    });

    test("deberia devolver 404 si el usuario no existe para actualizar", async () => {
      mock.method(UserModel, "updateUser", async () => null);

      const req = {
        params: { id: "999" },
        body: { nombre: "New Name" },
      };
      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
      };

      await UserController.updateUser(req, res);

      const statusCalls = res.status.mock.calls;
      assert.strictEqual(statusCalls.length, 1);
      assert.strictEqual(statusCalls[0].arguments[0], 404);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], { message: "Usuario no encontrado" });
    });
  });

  describe("deleteUser", () => {
    test("deberia eliminar un usuario existente", async () => {
      mock.method(UserModel, "deleteUser", async () => true);

      const req = { params: { id: "1" } };
      const res = { json: mock.fn() };

      await UserController.deleteUser(req, res);

      const calls = UserModel.deleteUser.mock.calls;
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].arguments[0], "1");

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], { message: "Usuario eliminado correctamente" });
    });

    test("deberia devolver 404 si el usuario no existe para eliminar", async () => {
      mock.method(UserModel, "deleteUser", async () => null);

      const req = { params: { id: "999" } };
      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
      };

      await UserController.deleteUser(req, res);

      const statusCalls = res.status.mock.calls;
      assert.strictEqual(statusCalls.length, 1);
      assert.strictEqual(statusCalls[0].arguments[0], 404);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], { message: "Usuario no encontrado" });
    });
  });
});
