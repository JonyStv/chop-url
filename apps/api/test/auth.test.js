import assert from "node:assert/strict";
import { describe, test, mock, afterEach, beforeEach } from "node:test";
import { prisma } from "../config/db.js ";
import { UserModel } from "../models/user.js";
import * as authService from "../services/auth.js";
import bcrypt from "bcryptjs";
import { refresh as refreshService } from "../services/auth.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";

describe("Auth Service - Unit Tests", () => {
  //Variables Globales
  const passwordParaElTest = "ClaveSuperSecreta123!";
  let passwordHasheada;

  beforeEach(async () => {
    if (!passwordHasheada) {
      passwordHasheada = await bcrypt.hash(passwordParaElTest, 12);
    }
  });
  afterEach(() => {
    mock.restoreAll();
  });
  describe("Flujo de login", () => {
    let prismaSesionCreateOriginal;
    beforeEach(() => {
      // Guardar el método original antes de la prueba
      prismaSesionCreateOriginal = prisma.sesion.create;
    });
    afterEach(() => {
      // Restaurar el método original después de la prueba
      prisma.sesion.create = prismaSesionCreateOriginal;
    });
    test("deberia iniciar sesion correctamente y devolver tokens,", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: await passwordHasheada,
        nombre: "Test User",
        activo: true,
      };
      mock.method(UserModel, "findByEmail", async () => mockUser);

      prisma.sesion.create = async () => ({
        id: "sesion-1",
        token: "mock-refresh-token",
        usuario_id: mockUser.id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const result = await authService.login({
        email: "test@example.com",
        password: passwordParaElTest,
        ip: "127.0.0.1",
        dispositivo: "Test Device",
      });
      assert.ok(result.accessToken, "Debo devolver un accessToken");
      assert.ok(result.refreshToken, "Debo devolver un refreshToken");
    });
    test("deberia fallar si el usuario no existe", async () => {
      mock.method(UserModel, "findByEmail", async () => null);
      await assert.rejects(
        authService.login({
          email: "noexiste@example.com",
          password: passwordParaElTest,
          ip: "127.0.0.1",
          dispositivo: "test",
        }),
        (error) =>
          error.statusCode === 401 || error.message.includes("credenciales"),
      );
    });
    test("deberia fallar si la contraseña es incorrecta", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: await bcrypt.hash("contraseñaIncorrecta", 10),
        nombre: "Test User",
        activo: true,
      };
      mock.method(UserModel, "findByEmail", async () => mockUser);
      await assert.rejects(
        authService.login({
          email: "test@example.com",
          password: passwordParaElTest,
          ip: "127.0.0.1",
          dispositivo: "test",
        }),
        (error) =>
          error.statusCode === 401 || error.message.includes("credenciales"),
      );
    });
  });
  describe("Flujo de Registro", () => {
    let prismaUsuarioCreateOriginal;
    beforeEach(() => {
      // Guardar el método original antes de la prueba
      prismaUsuarioCreateOriginal = prisma.usuario.create;
    });
    afterEach(() => {
      // Restaurar el método original después de la prueba
      prisma.usuario.create = prismaUsuarioCreateOriginal;
    });
    test("deberia registrar un usuario correctamente y encriptar la clave", async () => {
      // 1. ARRANGE
      const plainPassword = "nonHashedPassword";
      const mockDbResponse = {
        id: "user-123",
        email: "test@example.com",
        nombre: "Test User",
        password: "un_hash_simulado_12345", // El hash guardado en la BD
      };

      // El mock ahora es "tonto", solo devuelve lo que la BD devolvería
      mock.method(UserModel, "create", async () => mockDbResponse);
      mock.method(UserModel, "findByEmail", async () => null); // Simulamos que el usuario no existe aún
      mock.method(UserModel, "createSession", async () => ({
        id: "sesion-1",
        token: "mock-refresh-token",
        usuario_id: mockDbResponse.id,
        created_at: new Date(),
      }));

      prisma.sesion.create = async () => ({
        id: "sesion-1",
        token: "mock-refresh-token",
        usuario_id: mockDbResponse.id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      // 2. ACT
      const result = await authService.register({
        email: "test@example.com",
        password: plainPassword,
        nombre: "Test User",
      });

      // 3. ASSERT
      // A) Verificamos lo que el servicio LE ENVIÓ a la base de datos (UserModel.create)
      const llamadasAlModelo = UserModel.create.mock.calls;
      assert.equal(
        llamadasAlModelo.length,
        1,
        "Debe llamar a UserModel.create una vez",
      );

      const datosEnviadosALaBd = llamadasAlModelo[0].arguments[0];
      assert.strictEqual(datosEnviadosALaBd.email, "test@example.com");
      assert.strictEqual(datosEnviadosALaBd.nombre, "Test User");
      assert.notEqual(
        datosEnviadosALaBd.password,
        plainPassword,
        "FATAL: El servicio intentó guardar la contraseña en texto plano en la BD",
      );

      // B) Verificamos lo que el servicio LE DEVUELVE al usuario
      assert.strictEqual(result.user.email, "test@example.com");
      assert.strictEqual(result.user.nombre, "Test User");

      // Validamos que por seguridad, el servicio haya eliminado la contraseña del resultado
      assert.strictEqual(
        result.password,
        undefined,
        "Por seguridad, el register no debe devolver la contraseña (ni siquiera el hash)",
      );
    });
  });
  describe("Flujo de Refresh Token", () => {
    test("deberia refrescar correctamente los tokens", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        nombre: "Test User",
        activo: true,
      };
      const refreshToken = signRefreshToken({
        id: mockUser.id,
        email: mockUser.email,
      });
      // Mock the behavior of the database
      mock.method(UserModel, "findSessionByToken", async () => ({
        id: "sesion-1",
        token: refreshToken,
        usuario_id: mockUser.id,
      }));
      mock.method(UserModel, "findById", async () => mockUser);
      mock.method(UserModel, "removeSession", async () => true);
      mock.method(UserModel, "createSession", async () => ({
        id: "sesion-2",
        token: "new-mock-refresh-token",
      }));

      // 2. ACT
      const result = await refreshService(
        refreshToken,
        "127.0.0.1",
        "Test Device",
      );

      // 3. ASSERT
      assert.ok(result.accessToken);
      assert.ok(result.refreshToken);
    });
    test("deberia fallar si el refresh token es invalido", async () => {
      const invalidRefreshToken = "invalid-token";
      await assert.rejects(
        refreshService(invalidRefreshToken, "127.0.0.1", "Test Device"),
        (error) =>
          error.statusCode === 401 || error.message.includes("inválido"),
      );
    });
    test("deberia fallar si el token no existe en la tabla de sesiones", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@email.es",
        nombre: "Test User",
        activo: true,
      };
      const refreshToken = signRefreshToken({
        id: mockUser.id,
        email: mockUser.email,
      });
      // Mock the behavior of the database
      mock.method(UserModel, "findSessionByToken", async () => null);
      await assert.rejects(
        refreshService(refreshToken, "127.0.0.1", "Test Device"),
        (error) =>
          error.statusCode === 401 || error.message.includes("no existe"),
      );
    });
  });
  describe("Flujo de Change Password", () => {
    test("deberia hashear la nueva contraseña y actualizarla en la base de datos, ademas de cerrar sesiones.", async () => {
      const mockUser = {
        id: 1,
        email: "test@test.com",
        password: "hashedOldPass",
        activo: true,
      };
      const hashedNewPassword = await bcrypt.hash("newSecurePassword456", 10);

      // Mock: updatePassword devuelve el usuario con la nueva contraseña hasheada
      mock.method(UserModel, "updatePassword", async () => {
        return { ...mockUser, password: hashedNewPassword };
      });

      // Mock: findById devuelve el usuario actual
      mock.method(UserModel, "findById", async () => mockUser);

      // Mock: comparePassword verifica la contraseña actual
      mock.method(UserModel, "comparePassword", async () => true);

      // Mock: removeAllSessionsForUser elimina sesiones
      mock.method(UserModel, "removeAllSessionsForUser", async () => {
        /* ... */
      });

      // Mock: createSession crea nueva sesión
      mock.method(UserModel, "createSession", async () => {
        /* ... */
      });

      // Act
      const result = await authService.changePassword(
        1,
        { currentPassword: "oldPass", newPassword: "newSecurePassword456" },
        { ip: "127.0.0.1", dispositivo: "test" },
      );

      // Assert: hash correcto
      await assert.ok(
        await bcrypt.compare("newSecurePassword456", hashedNewPassword),
        "La nueva contraseña no fue hasheada correctamente",
      );

      // Assert: las sesiones se invalidaron
      assert.ok(
        UserModel.removeAllSessionsForUser.mock.calls.length === 1,
        "Se esperaba que se invalidaran todas las sesiones del usuario",
      );

      // Assert: nueva sesión creada
      const createSessionCalls = UserModel.createSession.mock.calls;
      assert.ok(
        createSessionCalls.length === 1,
        "Se esperaba que se creara una nueva sesión para el usuario",
      );
      assert.strictEqual(
        createSessionCalls[0].arguments[0].usuarioId,
        mockUser.id,
        "La nueva sesión no fue creada para el usuario correcto",
      );

      // Assert: retorna los tokens
      assert.ok(
        result.accessToken,
        "Se esperaba un accessToken en el resultado",
      );
      assert.ok(
        result.refreshToken,
        "Se esperaba un refreshToken en el resultado",
      );
    });
    test("deberia fallar si la contraseña actual es incorrecta", async () => {
      const mockUser = {
        id: 1,
        email: "test@test.com",
        password: "hashedOldPass",
        activo: true,
      };

      // Mock: findById devuelve el usuario actual
      mock.method(UserModel, "findById", async () => mockUser);

      // Mock: comparePassword devuelve false (contraseña incorrecta)
      mock.method(UserModel, "comparePassword", async () => false);

      await assert.rejects(
        authService.changePassword(
          1,
          {
            currentPassword: "wrongOldPass",
            newPassword: "newSecurePassword456",
          },
          { ip: "127.0.0.1", dispositivo: "test" },
        ),
        (error) =>
          error.statusCode === 401 ||
          error.message.includes("actual incorrecta"),
      );
    });
  });
  describe("Flujo de Logout", () => {
    let prismaSesionDeleteOriginal;
    beforeEach(() => {
      // Guardar el método original antes de la prueba
      prismaSesionDeleteOriginal = prisma.sesion.delete;
    });
    afterEach(() => {
      // Restaurar el método original después de la prueba
      prisma.sesion.delete = prismaSesionDeleteOriginal;
      mock.restoreAll();
    });
    test("deberia eliminar la sesion correctamente", async () => {
      const mockUser = {
        id: 1,
        email: "test@test.com",
        password: "hashedPass",
        activo: true,
      };
      const mockRefreshToken = signRefreshToken({
        id: mockUser.id,
        email: mockUser.email,
      });

      // Mock: findSessionByToken devuelve la sesión existente
      mock.method(UserModel, "findSessionByToken", async () => ({
        id: "sesion-1",
        token: mockRefreshToken,
        usuario_id: mockUser.id,
      }));

      // Mock: removeSession elimina la sesión
      mock.method(UserModel, "removeSession", async () => true);

      // Act
      const result = await authService.logout(mockRefreshToken);

      // Assert
      assert.strictEqual(
        result,
        true,
        "Se esperaba que la sesión se eliminara correctamente",
      );
    });
    test("deberia fallar si la sesion no existe", async () => {
      const mockRefreshToken = "nonexistent-token";

      // Mock: findSessionByToken devuelve null (sesión no encontrada)
      mock.method(UserModel, "findSessionByToken", async () => null);

      // Mock: prisma.sesion.delete lanza error cuando no encuentra
      prisma.sesion.delete = async () => {
        throw new Error("Sesión no encontrada");
      };
      // Act & Assert
      await assert.rejects(
        authService.logout(mockRefreshToken),
        (error) =>
          error.statusCode === 404 || error.message.includes("no existe"),
      );
    });
  });
});
