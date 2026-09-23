import assert from "node:assert/strict";
import { after, beforeEach, describe, test } from "node:test";
import { prisma } from "../config/db.js";
import { UserModel } from "../models/user.js";
import * as authService from "../services/auth.js";

describe("auth service", () => {
  let testUser;
  const testEmail = "test_auth_service@example.com";
  const testPassword = "InitialPassword123!";

  beforeEach(async () => {
    // Limpiar usuario previo de prueba si existe
    const existing = await UserModel.findByEmail(testEmail);
    if (existing) {
      await UserModel.deleteUser(existing.id);
    }
    // Crear un nuevo usuario de prueba en Prisma
    testUser = await UserModel.create({
      email: testEmail,
      password: testPassword,
      nombre: "Usuario Test",
    });
  });

  after(async () => {
    // Limpiar datos creados en la base de datos al finalizar
    if (testUser?.id) {
      await UserModel.deleteUser(testUser.id);
    }
    await prisma.$disconnect();
  });

  test("rejects an incomplete password change", async () => {
    await assert.rejects(
      authService.changePassword(testUser.id, { currentPassword: "" }),
      (error) => error.statusCode === 400,
    );
  });

  test("logs in and changes the authenticated user's password", async () => {
    const loginResult = await authService.login({
      email: testEmail,
      password: testPassword,
      ip: "127.0.0.1",
      dispositivo: "test",
    });

    assert.ok(loginResult.accessToken);
    assert.ok(loginResult.refreshToken);

    const changeResult = await authService.changePassword(
      testUser.id,
      {
        currentPassword: testPassword,
        newPassword: "NuevaClave123!",
      },
      { ip: "127.0.0.1", dispositivo: "test" },
    );

    assert.ok(changeResult.accessToken);
    assert.ok(changeResult.refreshToken);

    // Verificar en la BD Prisma que existe 1 sesión activa para este usuario
    const activeSessions = await prisma.sesion.findMany({
      where: { usuario_id: testUser.id },
    });
    assert.equal(activeSessions.length, 1);
    assert.equal(activeSessions[0].token, changeResult.refreshToken);
  });
});
