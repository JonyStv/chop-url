import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import data from "../data.json" with { type: "json" };
import * as authService from "../services/auth.js";

const originalUsers = structuredClone(data.usuarios);
const originalSessions = structuredClone(data.sesiones);

after(() => {
  data.usuarios.splice(0, data.usuarios.length, ...originalUsers);
  data.sesiones.splice(0, data.sesiones.length, ...originalSessions);
});

describe("auth service", () => {
  test("rejects an incomplete password change", async () => {
    await assert.rejects(
      authService.changePassword(1, { currentPassword: "" }),
      (error) => error.statusCode === 400,
    );
  });

  test("logs in and changes the authenticated user's password", async () => {
    const loginResult = await authService.login({
      email: "juan@email.com",
      password: "123456",
      ip: "127.0.0.1",
      dispositivo: "test",
    });

    assert.ok(loginResult.accessToken);
    assert.ok(loginResult.refreshToken);

    const changeResult = await authService.changePassword(
      1,
      {
        currentPassword: "123456",
        newPassword: "NuevaClave123",
      },
      { ip: "127.0.0.1", dispositivo: "test" },
    );

    assert.ok(changeResult.accessToken);
    assert.ok(changeResult.refreshToken);
    assert.equal(
      data.sesiones.filter(({ usuarioId }) => usuarioId === 1).length,
      1,
    );
  });
});
